using Microsoft.Extensions.Logging;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Concurrent;
using System.Data;
using System.Diagnostics.Metrics;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MontagemLayout.Services
{
    public class MySqlService
    {
        private readonly string connectionString = "Server=172.29.151.26;Port=3307;Database=lisinc;Uid=LiSincServer;Pwd=mathe;CharSet=latin1;";
        public class Product
        {
            public string Line { get; set; }
            public string Events { get; set; }
            public int State { get; set; }
            public string Zone { get; set; }
            public string Element { get; set; }
            public TimeSpan Duration { get; set; }
            public DateTime Data { get; set; }
            public int Shift { get; set; }
        }
        public sealed class ProdHourlyDto
        {
            public string LineSlug { get; init; } = default!;
            public DateTime EventTs { get; init; }              // quando o evento aconteceu
            public int QtyDelta { get; init; }                  // delta a somar na hora
            public int ShiftCode { get; init; }       // 'A'/'B'/'C'
            public DateTime ShiftDate { get; init; }    // data “do turno”
        }
        public sealed class ProdHourMatrix
        {
            public List<string> Hours { get; init; } = default!; // ["00:00","01:00",...,"23:00"]
            public List<ProdHourRow> Rows { get; init; } = default!;
        }
        public sealed class ProdHourRow
        {
            public string Line { get; init; } = default!;
            public int[] Values { get; init; } = default!;       // 24 posições
            public int Total => Values.Sum();
        }

        private (string Start, string End) ShiftConsult()
        {
            DateTime now = DateTime.Now;
            DateTime filterStart;
            DateTime filterEnd;

            if (now.TimeOfDay >= TimeSpan.FromHours(6) && now.TimeOfDay <= TimeSpan.FromHours(15).Add(TimeSpan.FromMinutes(47)))
            {
                // Primeiro turno: 6:00 às 15:47
                filterStart = new DateTime(now.Year, now.Month, now.Day, 6, 0, 0);
                filterEnd = filterStart.AddHours(9).AddMinutes(47);
            }
            else if (now.TimeOfDay > TimeSpan.FromHours(15).Add(TimeSpan.FromMinutes(47)) || now.TimeOfDay <= TimeSpan.FromHours(1).Add(TimeSpan.FromMinutes(8)))
            {
                // Segundo turno: 15:48 às 1:08 (pode cruzar meia-noite)
                if (now.TimeOfDay <= TimeSpan.FromHours(1).Add(TimeSpan.FromMinutes(8)))
                {
                    now = now.AddDays(-1); // Voltar para o dia anterior se cruzar a meia-noite
                }
                filterStart = new DateTime(now.Year, now.Month, now.Day, 15, 48, 0);
                filterEnd = filterStart.AddHours(9).AddMinutes(20); // Vai até 1:08 do próximo dia
            }
            else
            {
                // Terceiro turno: 1:10 às 5:59
                filterStart = new DateTime(now.Year, now.Month, now.Day, 1, 9, 0);
                filterEnd = new DateTime(now.Year, now.Month, now.Day, 5, 59, 0);
            }
            return (filterStart.ToString("yyyy-MM-dd HH:mm:ss"), filterEnd.ToString("yyyy-MM-dd HH:mm:ss"));
        }
        public async Task StorePayloadDataAsync(string tableName, string jsonPayload)
        {
            try
            {
                var payloadData = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonPayload);

                if (payloadData == null || payloadData.Count == 0)
                {
                    throw new ArgumentException("O payload JSON é inválido ou não pôde ser deserializado.");
                }

                using var connection = new MySqlConnection(connectionString);
                await connection.OpenAsync();

                var columns = string.Join(", ", payloadData.Keys);
                var parameters = string.Join(", ", payloadData.Keys.Select(key => "@" + key));

                var query = $"INSERT INTO {tableName} ({columns}) VALUES ({parameters});";

                using var command = new MySqlCommand(query, connection);

                foreach (var keyValuePair in payloadData)
                {
                    command.Parameters.AddWithValue("@" + keyValuePair.Key, keyValuePair.Value);
                }

                await command.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao armazenar dados: {ex.Message}");
            }
        }
        public async Task StoreStatusUpdateAsync(string line, int state, DateTime timestamp)
        {
            try
            {
                using var connection = new MySqlConnection(connectionString);
                await connection.OpenAsync();

                string query = "INSERT INTO lisinc.status_updates (line, state, data) VALUES (@line, @state, @timestamp);";

                using var command = new MySqlCommand(query, connection);
                command.Parameters.AddWithValue("@line", line);
                command.Parameters.AddWithValue("@state", state);
                command.Parameters.AddWithValue("@timestamp", timestamp);

                await command.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao armazenar status da linha: {ex.Message}");
            }
        }
        public async Task StoreProdHourlyAsync(string jsonPayload)
        {
            var dto = JsonSerializer.Deserialize<ProdHourlyDto>(jsonPayload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            if (dto is null) throw new ArgumentException("Payload inválido.");

            var tsHour = new DateTime(dto.EventTs.Year, dto.EventTs.Month, dto.EventTs.Day, dto.EventTs.Hour, 0, 0, DateTimeKind.Unspecified);

            const string sql = @"
                INSERT INTO prod_hourly
                    (line, ts_hour, shift_code, shift_date, qty)
                VALUES
                    (@line, @ts_hour, @shift_code, @shift_date, @delta)
                ON DUPLICATE KEY UPDATE
                    qty = qty + VALUES(qty),
                    shift_code = VALUES(shift_code),
                    shift_date = VALUES(shift_date),
                    updated_at = CURRENT_TIMESTAMP;";

            try
            {
                using var conn = new MySqlConnection(connectionString);
                await conn.OpenAsync();

                using var cmd = new MySqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@line", dto.LineSlug);
                cmd.Parameters.AddWithValue("@ts_hour", tsHour);                         // DATETIME
                cmd.Parameters.AddWithValue("@shift_code", dto.ShiftCode);
                cmd.Parameters.AddWithValue("@shift_date", dto.ShiftDate.Date);  // DATE
                cmd.Parameters.AddWithValue("@delta", dto.QtyDelta);

                await cmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao upsert prod_hourly: {ex.Message}");
                throw;
            }
        }

        public async Task StoreBufferSnapshotBatchAsync(List<BufferSnapshot> snapshots)
        {
            try
            {
                using var connection = new MySqlConnection(connectionString);
                await connection.OpenAsync();

                using var transaction = await connection.BeginTransactionAsync();

                string query = @"INSERT INTO lisinc.buffer_snapshots (line, position, is_active, is_fault, timestamp)
                         VALUES (@line, @position, @is_active, @is_fault, @timestamp);";

                foreach (var snapshot in snapshots)
                {
                    using var command = new MySqlCommand(query, connection, transaction);
                    command.Parameters.AddWithValue("@line", snapshot.Line);
                    command.Parameters.AddWithValue("@position", snapshot.Position);
                    command.Parameters.AddWithValue("@is_active", snapshot.IsActive);
                    command.Parameters.AddWithValue("@is_fault", snapshot.IsFault);
                    command.Parameters.AddWithValue("@timestamp", snapshot.Timestamp);

                    await command.ExecuteNonQueryAsync();
                }

                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao armazenar snapshots do buffer: {ex.Message}");
            }
        }
        public async Task<IEnumerable<object>> GetAllFaults(string line, string dataFilterInit, string dataFilterFinal)
        {
            try
            {
                //Console.WriteLine("Carregando...!");
                var query = new StringBuilder("SELECT Line, Events, State, Zone, Element, Duration, Data, Shift FROM lisinc.events WHERE 1=1");
                var commandParameters = new List<MySqlParameter>();

                //using var connection = new MySqlConnection(connectionString);
                //await connection.OpenAsync();
                //Console.WriteLine($"Filtro de data: {dataFilter}");
                

                if (!string.IsNullOrEmpty(line))
                {
                    query.Append(" AND Line = @line");
                    commandParameters.Add(new MySqlParameter("@line", line));

                }
                if (!string.IsNullOrEmpty(dataFilterInit))
                {
                    if (!string.IsNullOrEmpty(dataFilterFinal))
                    {
                        query.Append(" AND Data >= @dataFilterInit");
                        commandParameters.Add(new MySqlParameter("@dataFilterInit", dataFilterInit));
                        query.Append(" AND Data <= @dataFilterFinal");
                        commandParameters.Add(new MySqlParameter("@dataFilterFinal", dataFilterFinal));
                    }
                    else
                    {
                        query.Append(" AND Data >= @dataFilterInit");
                        commandParameters.Add(new MySqlParameter("@dataFilterInit", dataFilterInit));
                    }
                    query.Append(" ORDER BY Data DESC");

                }
                else
                {
                    query.Append(" ORDER BY Data DESC LIMIT 100");
                }
 
                //if (!string.IsNullOrEmpty(dataFilterInit))
                //{
                //    if (!string.IsNullOrEmpty(dataFilterFinal))
                //    {
                //        query += $" AND Data >= '{dataFilterInit}' AND Data <= '{dataFilterFinal}' ORDER BY Data DESC";
                //    }
                //    else
                //    {
                //        query += $" AND Data >= '{dataFilterInit}' ORDER BY Data DESC";
                //    }

                //}
                //else
                //{
                //    query += " ORDER BY Data DESC LIMIT 100";
                //}

                //if (!string.IsNullOrEmpty(line) && !string.IsNullOrEmpty(dataFilter))
                //{
                //    query = $"SELECT Line, Events, State, Zone, Element, Duration, Data, Shift FROM lisinc.events WHERE Line = '{line}' AND Data >= '{dataFilter}' ORDER BY Data DESC LIMIT 100;";
                //}
                //else
                //{
                //    query = "SELECT Line, Events, State, Zone, Element, Duration, Data, Shift FROM lisinc.events ORDER BY Data DESC LIMIT 100;";
                //}

                using var connection = new MySqlConnection(connectionString);
                await connection.OpenAsync();

                using var command = new MySqlCommand(query.ToString(), connection);
                foreach (var param in commandParameters)
                    command.Parameters.Add(param);

                //Console.WriteLine("Carregou!!!");
                using var reader = await command.ExecuteReaderAsync();
                var results = new List<object>();
                
                while (await reader.ReadAsync())
                {
                    results.Add(new
                    {
                        Line = reader["line"],
                        Events = reader["events"],
                        State = reader["state"],
                        Zone = reader["zone"],
                        Element = reader["element"],
                        Duration = reader["duration"] is TimeSpan duration ? duration.ToString(@"hh\:mm\:ss") : null,
                        Data = reader["data"] is DateTime data ? data.ToString("yyyy-MM-dd HH:mm:ss") : null,
                        Shift = reader["shift"]
                    });
                }
                //Console.WriteLine("Carregou!");
                return results;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro no método GetAllFaults: {ex.Message}");
                throw;
            }
        }
        public async Task<IEnumerable<object>> GetTopEvents(string line, string dataFilterInit, string dataFilterFinal, bool filterBreak, bool filterProd)
        {
            try
            {
                var query = @"
            SELECT 
                IF(Element = 'Elemento desconhecido', 
                    CONCAT(Zone, ' - ', Events), 
                    CONCAT(Element, ' - ', Zone, ' - ', Events)
                ) AS Event,
                SUM(TotalSeconds) AS TotalDuration,
                State AS Status,
                COUNT(DISTINCT CONCAT(Line, Data, Events, Zone, State, Element, Shift)) AS EventCount
            FROM (
                SELECT 
                    Line, Data, Element, Zone, Events, State, Shift, 
                    MIN(TIME_TO_SEC(Duration)) AS TotalSeconds
                FROM lisinc.events
                GROUP BY Line, Data, Element, Zone, Events, State, Shift
            ) AS subquery";

                if(!filterBreak && !filterProd)
                {
                    query += $" WHERE State < 19";
                }else if(filterBreak && !filterProd)
                {
                    query += $" WHERE State < 2";
                }
                else if (filterProd && !filterBreak)
                {
                    query += $" WHERE State IN (5, 7, 8, 10, 11, 12, 17)";
                }

                using var connection = new MySqlConnection(connectionString);
                await connection.OpenAsync();
                if (string.IsNullOrEmpty(dataFilterInit))
                {
                    (dataFilterInit, dataFilterFinal) = ShiftConsult();
                    //Console.WriteLine("Linha: " + line);
                    //Console.WriteLine("Data Inicial: "+ dataFilterInit);
                    //Console.WriteLine("Data Final: " + dataFilterFinal);
                }

                if (!string.IsNullOrEmpty(line))
                {
                    query += $" AND Line = @line";
                }
                if (!string.IsNullOrEmpty(dataFilterInit))
                {
                    query += " AND Data >= @dataFilterInit";
                }
                if (!string.IsNullOrEmpty(dataFilterFinal))
                {
                    query += " AND Data <= @dataFilterFinal";
                }

                query += " GROUP BY Element, Zone, Events, Status ORDER BY TotalDuration DESC LIMIT 10";

                using var command = new MySqlCommand(query, connection);

                if (!string.IsNullOrEmpty(line))
                {
                    command.Parameters.AddWithValue("@line", line);
                }
                if (!string.IsNullOrEmpty(dataFilterInit))
                {
                    command.Parameters.AddWithValue("@dataFilterInit", dataFilterInit);
                }
                if (!string.IsNullOrEmpty(dataFilterFinal))
                {
                    command.Parameters.AddWithValue("@dataFilterFinal", dataFilterFinal);
                }

                using var reader = await command.ExecuteReaderAsync();
                var results = new List<object>();

                while (await reader.ReadAsync())
                {
                    results.Add(new
                    {
                        Event = reader["Event"],
                        TotalDuration = reader["TotalDuration"],
                        EventCount = reader["EventCount"],
                        Status = reader["Status"]
                    });
                }

                return results;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro no método GetTopEvents: {ex.Message}");
                throw;
            }
        }
        public async Task<ConcurrentDictionary<string, List<int>>> GetLineBitCountsLastHourAsync()
        {
            var result = new ConcurrentDictionary<string, List<int>>();
            var now = DateTime.Now;
            var twoHoursAgo = now.AddHours(-0.6);

            try
            {
                using var connection = new MySqlConnection(connectionString);
                await connection.OpenAsync();

                string query = @"
            SELECT line, DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:00') as minute_group, SUM(is_active) as active_count
            FROM buffer_snapshots
            WHERE timestamp >= @startTime AND timestamp <= @endTime
            GROUP BY line, minute_group
            ORDER BY minute_group;
        ";

                using var command = new MySqlCommand(query, connection);
                command.Parameters.AddWithValue("@startTime", twoHoursAgo);
                command.Parameters.AddWithValue("@endTime", now);

                using var reader = await command.ExecuteReaderAsync();
                var tempData = new ConcurrentDictionary<string, ConcurrentDictionary<DateTime, int>>();

                while (await reader.ReadAsync())
                {
                    var line = reader.GetString("line");
                    var minute = DateTime.Parse(reader.GetString("minute_group"));
                    var activeCount = reader.GetInt32("active_count");

                    if (!tempData.ContainsKey(line))
                        tempData[line] = new ConcurrentDictionary<DateTime, int>();

                    tempData[line][minute] = activeCount;
                }

                foreach (var line in tempData.Keys)
                {
                    var values = new List<int>();

                    foreach (var counts in tempData[line])
                    {
                        values.Add(counts.Value);
                    }

                    result[line] = values;
                }
            }
            catch (MySqlException ex)
            {
                Console.WriteLine($"Erro ao acessar o banco de dados do MySQL: {ex.Message}");
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro inesperado: {ex.Message}");
                throw;
            }
            return result;
        }
        public async Task<List<BufferSnapshot>> GetBufferSnapshotsReplayAsync(DateTime start, DateTime end)
        {
            
            var snapshots = new List<BufferSnapshot>();
            //Console.WriteLine($"DEBUG Start: {start:yyyy-MM-dd HH:mm:ss}, End: {end:yyyy-MM-dd HH:mm:ss}");

            using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync();

            string query = @"SELECT line, position, is_active, is_fault, timestamp 
                     FROM buffer_snapshots
                     WHERE timestamp BETWEEN @start AND @end
                     ORDER BY timestamp ASC";
            using var command = new MySqlCommand(query, connection);
            command.Parameters.AddWithValue("@start", start);
            command.Parameters.AddWithValue("@end", end);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                snapshots.Add(new BufferSnapshot
                {
                    Line = reader.GetString("line"),
                    Position = reader.GetInt32("position"),
                    IsActive = reader.GetBoolean("is_active"),
                    IsFault = reader.GetBoolean("is_fault"),
                    Timestamp = reader.GetDateTime("timestamp")
                });
            }
            return snapshots;
        }
        public async Task<List<StatusUpdate>> GetStatusReplayAsync(DateTime start, DateTime end)
        {
            var updates = new List<StatusUpdate>();
            using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync();

            string query = @"SELECT line, state, data
                     FROM lisinc.status_updates
                     WHERE data BETWEEN @start AND @end
                     ORDER BY data ASC";
            using var command = new MySqlCommand(query, connection);
            command.Parameters.AddWithValue("@start", start);
            command.Parameters.AddWithValue("@end", end);

            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                updates.Add(new StatusUpdate
                {
                    line = reader.GetString("line"),
                    state = reader.GetInt32("state"),
                    timestamp = reader.GetDateTime("data")
                });
            }
            return updates;
        }

        public async Task<IEnumerable<object>> GetStateDurationsAsync(string line)
        {
            try
            {
                using var connection = new MySqlConnection(connectionString);
                try
                {
                    await connection.OpenAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erro ao conectar no MySQL: {ex.Message}");
                    return new List<object>(); // Retorna lista vazia se a conexão falhar
                }

                // --- Montando os filtros dinamicamente ---
                var filters = new List<string>();
                if (!string.IsNullOrEmpty(line))
                    filters.Add("line = @line");

                var (dataFilterInit, dataFilterFinal) = ShiftConsult();
                if (!string.IsNullOrEmpty(dataFilterInit))
                    filters.Add("data >= @dataFilterInit");
                if (!string.IsNullOrEmpty(dataFilterFinal))
                    filters.Add("data <= @dataFilterFinal");

                // WHERE dinâmico
                string whereClause = filters.Count > 0 ? "WHERE " + string.Join(" AND ", filters) : "";
                // --- Query principal ---
                string query = $@"
        SELECT 
            state,
            SUM(duration) AS total_duration
        FROM (
            SELECT 
                state,
                TIMESTAMPDIFF(SECOND, data, LEAD(data) OVER (PARTITION BY line ORDER BY data)) AS duration
            FROM lisinc.status_updates
            {whereClause}
        ) AS subquery
        WHERE duration IS NOT NULL
        GROUP BY state
        ORDER BY state;
        ";

                // --- Query para o último status ---
                string lastStatusWhere = "";
                if (!string.IsNullOrEmpty(line))
                    lastStatusWhere = "WHERE line = @line";
                
                string lastStatusQuery = $@"
                    SELECT state, data 
                    FROM lisinc.status_updates 
                    {lastStatusWhere}
                    ORDER BY data DESC 
                    LIMIT 1;
                    ";


                using var command = new MySqlCommand(query, connection);
                if (!string.IsNullOrEmpty(line))
                    command.Parameters.AddWithValue("@line", line);
                if (!string.IsNullOrEmpty(dataFilterInit))
                    command.Parameters.AddWithValue("@dataFilterInit", dataFilterInit);
                if (!string.IsNullOrEmpty(dataFilterFinal))
                    command.Parameters.AddWithValue("@dataFilterFinal", dataFilterFinal);

                // --- Execução principal ---
                using var reader = await command.ExecuteReaderAsync();
                var results = new List<object>();
                while (await reader.ReadAsync())
                {
                    int state = reader.GetInt32(0);
                    int duration = reader.IsDBNull(1) ? 0 : reader.GetInt32(1);
                    results.Add(new { State = state, Duration = duration });
                }
                await reader.CloseAsync();

                // --- Último status ---
                using var lastStatusCommand = new MySqlCommand(lastStatusQuery, connection);
                if (!string.IsNullOrEmpty(line))
                    lastStatusCommand.Parameters.AddWithValue("@line", line);

                using var lastStatusReader = await lastStatusCommand.ExecuteReaderAsync();
                DateTime? lastStatusDate = null;
                int? lastState = null;

                if (await lastStatusReader.ReadAsync())
                {
                    lastState = lastStatusReader.GetInt32(0);
                    lastStatusDate = lastStatusReader.GetDateTime(1);
                }

                if (results.Count == 0)
                {
                    //Console.WriteLine("Nenhum dado encontrado!");
                }
                return new List<object> {
                    new {
                        StatusDurations = results,
                        LastStatus = lastState,
                        LastStatusDate = lastStatusDate?.ToString("yyyy-MM-dd HH:mm:ss")
                    }
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao obter duração dos estados: {ex.Message}");
                throw;
            }
        }
        public async Task<ProdHourMatrix> GetProdHourMatrixByDayAsync(DateTime day)
        {
            // labels "00:00"..."23:00"
            var hours = Enumerable.Range(0, 24).Select(h => $"{h:00}:00").ToList();

            // dia fechado [00:00, 24:00)
            var start = new DateTime(day.Year, day.Month, day.Day, 0, 0, 0, DateTimeKind.Unspecified);
            var end = start.AddDays(1);

            const string sql = @"
        SELECT line, HOUR(ts_hour) AS h, SUM(qty) AS qty
        FROM prod_hourly
        WHERE ts_hour >= @start AND ts_hour < @end
        GROUP BY line, h
        ORDER BY line, h;";

            var dict = new Dictionary<string, int[]>();

            using var conn = new MySqlConnection(connectionString);
            await conn.OpenAsync();

            using var cmd = new MySqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@start", start);
            cmd.Parameters.AddWithValue("@end", end);

            using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                var line = rdr.GetString("line");
                var h = rdr.GetInt32("h");   // 0..23
                var qty = rdr.GetInt32("qty");

                if (!dict.TryGetValue(line, out var arr))
                {
                    arr = new int[24];    // zera todas as 24 horas
                    dict[line] = arr;
                }
                if (h >= 0 && h <= 23)
                    arr[h] += qty;        // soma da hora (já agregado por turno)
            }

            var rows = dict
                .OrderBy(kv => kv.Key)
                .Select(kv => new ProdHourRow { Line = kv.Key, Values = kv.Value })
                .ToList();

            return new ProdHourMatrix { Hours = hours, Rows = rows };
        }

    }
}