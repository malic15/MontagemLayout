using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MontagemLayout.Services;
using MQTTnet;
using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Dynamic;
using System.Net.WebSockets;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;
using static System.Runtime.InteropServices.JavaScript.JSType;
using System.Globalization;
using System.Timers;
using System.Net.Mail;
using System.Numerics;
using static Mysqlx.Datatypes.Scalar.Types;
using Google.Protobuf.WellKnownTypes;


internal class Program
{
    private static bool firstIgnore = true;
    public static string currentShift = "";
    //private static int countPortas=0;
    private static DateTime _lastAlertTime = DateTime.MinValue;
    private static readonly TimeSpan _cooldownPeriod = TimeSpan.FromSeconds(20);
    private static ConcurrentDictionary<string, ConcurrentDictionary<string, DateTime>> _LineActivationTimes = new ConcurrentDictionary<string, ConcurrentDictionary<string, DateTime>>();
    private static ConcurrentDictionary<string, System.Threading.Timer> _connectionTimers = new ConcurrentDictionary<string, System.Threading.Timer>();

    private static System.Timers.Timer _shiftTimer;
    private static System.Timers.Timer _minuteProcess;
    private static System.Timers.Timer _milisecProcess;
    private static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Host.UseWindowsService();

        builder.WebHost.UseKestrel(options =>
        {
            options.Limits.MaxConcurrentConnections = 100;
            options.Limits.MaxConcurrentUpgradedConnections = 100;
            options.Limits.MaxRequestBodySize = 104857600;
            options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(5);
        });
        builder.WebHost.UseKestrel().UseUrls("http://0.0.0.0:29053");

        // Add services to the container.
        builder.Services.AddRazorPages();

        builder.Services.AddSingleton<MqttService>();

        builder.Services.AddSingleton<AudioCache>();

        builder.Services.AddSignalR(options =>
        {
            options.MaximumReceiveMessageSize = 102400000;
            options.ClientTimeoutInterval = TimeSpan.FromSeconds(600);
            options.KeepAliveInterval = TimeSpan.FromSeconds(10);
        });

        builder.Services.AddSingleton<AwlFileProcessor>();

        builder.Services.AddSingleton<CooldownManager>();

        builder.Services.AddSingleton<DataService>();

        builder.Services.AddSingleton<PdtService>();
        
        builder.Services.AddSingleton<BufferService>();

        builder.Services.AddSingleton<StatusLineService>();

        builder.Services.AddSingleton<MySqlService>();

        builder.Services.AddSingleton<SQLService>();

        builder.Services.AddSingleton<GlobalShift>();

        builder.Services.AddSingleton<GlobalDateTime>();

        builder.Services.AddSingleton<SQLService>();

        builder.Services.AddSingleton<ProdService>();

        //builder.Services.AddSingleton<MarriageFaults>();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("CorsPolicy", builder =>
            {
                builder
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials()
                    .WithOrigins("http://172.29.151.26:29053/");
            });
        });

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (!app.Environment.IsDevelopment())
        {
            app.UseExceptionHandler("/Error");
        }

        app.UseCors("CorsPolicy");

        ThreadPool.SetMinThreads(100, 100);
        ThreadPool.SetMaxThreads(500, 500);

        app.UseStaticFiles();

        // No Program.cs antes de UseRouting()
        app.Use(async (context, next) =>
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            Console.WriteLine($"[Middleware] Início request: {context.Request.Path}");
            await next();
            Console.WriteLine($"[Middleware] Fim request: {context.Request.Path} - {sw.ElapsedMilliseconds} ms");
        });


        app.UseRouting();

        app.UseAuthorization();

        app.MapRazorPages();

        app.MapHub<AudioHub>("/audiohub");

        app.MapHub<MqttHub>("/mqtthub");

        app.MapHub<DataHub>("/datahub");

        app.MapControllers();

        var dataService = app.Services.GetRequiredService<DataService>();

        var pdtService = app.Services.GetRequiredService<PdtService>();

        var bufferService = app.Services.GetRequiredService<BufferService>();

        var statusLineService = app.Services.GetRequiredService<StatusLineService>();

        var mysqlservice = app.Services.GetRequiredService<MySqlService>();

        var sqlservice = app.Services.GetRequiredService<SQLService>();

        var globalShift = app.Services.GetRequiredService<GlobalShift>();

        var globalDateTime = app.Services.GetRequiredService<GlobalDateTime>();

        var pordservice = app.Services.GetRequiredService<ProdService>();

        var mqttService = app.Services.GetRequiredService<MqttService>();

        //var marriageFault = app.Services.GetRequiredService<MarriageFaults>();

        var pdtData = pdtService.GetPdtData();
        
        var bufferData = bufferService.GetBufferData();

        var statusData = statusLineService.GetStatusDbsData();

        _shiftTimer = new System.Timers.Timer(1000);
        _shiftTimer.Elapsed += (sender, e) => CheckAndResetShift(sender, e, pdtService, dataService, bufferService, statusLineService, globalShift, globalDateTime, sqlservice, pordservice);
        _shiftTimer.AutoReset = true;
        _shiftTimer.Start();

        _minuteProcess = new System.Timers.Timer(60000);
        _minuteProcess.Elapsed += (sender, e) => CheckMinuteProcess(sender, e, pdtService, dataService, bufferService, statusLineService, sqlservice, pordservice, globalShift, mysqlservice);
        CheckMinuteProcess(null, null, pdtService, dataService, bufferService, statusLineService, sqlservice, pordservice, globalShift, mysqlservice);
        _minuteProcess.AutoReset = true;
        _minuteProcess.Start();

        //_milisecProcess = new System.Timers.Timer(200);
        //_milisecProcess.Elapsed += (sender, e) => CheckMiliSec(sender, e, dataService);
        //_milisecProcess.AutoReset = true;
        //_milisecProcess.Start();

        var webSocketOptions = new WebSocketOptions
        {
            KeepAliveInterval = TimeSpan.FromMinutes(2)
        };
        app.UseWebSockets(webSocketOptions);

        
        mqttService.StartAsync().GetAwaiter().GetResult();
        var cooldownManager = new CooldownManager();
        cooldownManager.SetCoolDown("AudioMessageAlert", TimeSpan.FromSeconds(20));


        app.Lifetime.ApplicationStopping.Register(() =>
        {
            //Console.Write("ApplicationStopping");
            mqttService.StopAsync().GetAwaiter().GetResult();
        });

        var AwlFile = app.Services.GetRequiredService<AwlFileProcessor>();
        var audioService = app.Services.GetRequiredService<AudioCache>();
        mqttService.OnMqttMessageReceived += async (message) =>
        {
            try {
                var json = JsonDocument.Parse(message);
                if (json.RootElement.TryGetProperty("connection", out JsonElement connectionElement))
                {
                    var lineConnection = json.RootElement.GetProperty("line").ToString();
                    int connection = connectionElement.GetString() == "1" ? 19 : 0;
                    //string faultMessage = connection == 19 ? "" : "";
                    
                    statusLineService.UpdateStatusDbsActive(lineConnection.ToString(), "0", connection, "", DateTime.Now);
                    ResetConnectionTimer(lineConnection, statusLineService);
                    return;
                }
                var line = json.RootElement.GetProperty("line");
                var db = json.RootElement.GetProperty("db");
                var mqttData = json.RootElement.GetProperty("data").EnumerateArray()
                                .Select(x => x.GetInt32())
                                .ToArray();
                string lineContent = line.GetString();
                string dbContent = db.GetString();
                int priority = 19;
                string faultStatus = "";
                if (dbContent == "576" || dbContent == "459")
                {
                    byte[] dataPosition = mqttData.Select(x => (byte)x).ToArray();
                    Array.Reverse(dataPosition);
                    int positionSHL = BitConverter.ToInt32(dataPosition, 0);
                    string shlinfo = "{" + positionSHL + "," + lineContent + "," + dbContent + "}";
                    Task.Run(()=> mqttService.ProcessMqttMessage(shlinfo));
                    return;
                }
                if (dbContent == "3301" || dbContent == "3302" || dbContent == "3303" || dbContent == "3304" || dbContent == "3305" || dbContent == "3306")
                {
                    byte[] dataProd = mqttData.Select(x => (byte)x).ToArray();
                    Array.Reverse(dataProd);
                    int prod = BitConverter.ToInt16(dataProd, 0);
                    //Console.WriteLine("dataProd: " + prod);
                    pordservice.UpdateProd(line.ToString(), prod);
                    pordservice.TheoreticalProdUpdateAsync();
                    return;
                }
                if ((db.GetString() == "3325" && line.GetString() == "deckingup"))
                {
                    string lineString = line.ToString();

                    void CheckAndUpdatePdtStopCount(int value, int[] bitPositions, int stopCount)
                    {
                        bool shouldUpdate = bitPositions.Any(pos => (value & (1 << pos)) != 0);
                        pdtService.UpdatePdtStopCount(lineString, stopCount, shouldUpdate);
                    }

                    int value37 = mqttData[37];
                    CheckAndUpdatePdtStopCount(value37, new[] { 0, 1, 2, 3 }, 5);
                    CheckAndUpdatePdtStopCount(value37, new[] { 4, 5, 6, 7 }, 6);

                    int value56 = mqttData[56];
                    CheckAndUpdatePdtStopCount(value56, new[] { 0, 1 }, 7);
                    CheckAndUpdatePdtStopCount(value56, new[] { 2, 3 }, 8);
                    return;
                }
                if (db.GetString() == "3770" || db.GetString() == "3771" || db.GetString() == "3772")
                {
                    string lineString = line.ToString();

                    int listLength = mqttData.Length * 3;

                    int index = 0;
                    for (int i = 0; i < mqttData.Length; i++)
                    {
                        int value = mqttData[i];

                        bool bit0 = (value & (1 << 0)) != 0;
                        bool bit2 = (value & (1 << 2)) != 0;
                        bool pdtActive0 = bit0 || bit2;

                        bool bit4 = (value & (1 << 4)) != 0;
                        bool bit6 = (value & (1 << 6)) != 0;
                        bool pdtActive1 = bit4 || bit6;

                        int pdt0 = GetPDT(index);
                        index++;
                        int pdt1 = GetPDT(index);
                        index++;

                        pdtService.UpdatePdtStopCount(lineString, pdt0, pdtActive0);
                        pdtService.UpdatePdtStopCount(lineString, pdt1, pdtActive1);
                        //pdtActive[pdt0] = pdtActive0;
                        //pdtActive[pdt1] = pdtActive1;
                    }
                    return;
                }
                if (db.GetString() == "70")
                {
                    string lineString = line.ToString();
                    List<bool> positions = new List<bool>();

                    Task.Run(() => ProcessBuffer(lineString, mqttData, bufferService, dataService));
                    return;
                }
                //if (db.GetString() == "100")
                //{
                //    string cis = new string(mqttData.Select(value => Convert.ToChar(value)).ToArray());
                //    Console.WriteLine("CIS: " + cis);
                //    bufferService.AddCI(cis);
                //    return;
                //}

                lineContent = System.Text.RegularExpressions.Regex.Replace(lineContent, @"(\d+)", " $1");
                TextInfo textInfo = new CultureInfo("en-US", false).TextInfo;

                lineContent = lineContent.Replace("deckingup", "decking up")
                                            .Replace("deckingdown", "decking down");
                lineContent = textInfo.ToTitleCase(lineContent.ToLower());

                var AwlMessage = AwlFile.GetAwlMessagesFromPayload($"wwwroot/files/{line}/DB{db}.AWL", message) as ObjectResult;
                if (AwlMessage != null)
                {
                    var notes = AwlMessage.Value as List<(string message, string priority, string zone, string element)>;
                    int? lowestPriority = null;
                    string lineString = line.ToString();
                    string dbString = db.ToString();
                    string messageNote = null;
                    string currentMessage = null;
                    int zone = 0;
                    if (notes != null)
                    {
                        ProcessStorageData(lineString, dbString, notes, _LineActivationTimes, mysqlservice, globalShift);
                        foreach (var note in notes)
                        {
                            messageNote = note.message;
                            if (int.TryParse(note.priority, out int pnumber))
                            {
                                if (lowestPriority == null || pnumber < lowestPriority)
                                {
                                    lowestPriority = pnumber;
                                    currentMessage = note.message;
                                }
                            }
                            if (note.priority == "1" || note.priority == "2")
                            {
                                if ((DateTime.Now - _lastAlertTime) >= _cooldownPeriod)
                                {
                                    _lastAlertTime = DateTime.Now;

                                    string fault = $"{lineContent} {note.zone}: {note.message}";
                                    faultStatus = $"{note.zone}: {note.message}";
                                    Task.Run(async () =>
                                    {
                                        try
                                        {
                                            mqttService.MessageAlert(fault);
                                            audioService.SendAudioMessage(fault);
                                        }
                                        catch (Exception ex)
                                        {
                                            Console.WriteLine($"Erro ao enviar alerta ou áudio: {ex.Message}");
                                        }
                                    });
                                }
                                //Console.WriteLine($"Mensagem: {note.message} - Prioridade: {note.priority}");
                            }
                        }
                        if (lowestPriority.HasValue)
                        {
                            priority = lowestPriority.Value;
                        }
                    }
                    else
                    {
                        Console.WriteLine("Nenhuma nota ativa encontrada.");
                    }
                }
                if (mqttData.All(value => value == 0))
                {
                    //Console.WriteLine("Todos os bits são 0 da "+db.GetString()+" linha " +line.ToString()+". Definindo a prioridade como 19.");
                    priority = 19;
                }
                statusLineService.UpdateStatusDbsActive(line.ToString(), db.ToString(), priority, faultStatus, DateTime.Now);
                //pdtService.PrintPdtStatusForLine("trim1");
            }
            catch (Exception ex)
            {
            Console.WriteLine($"Erro ao processar mensagem MQTT: {ex.Message}");
            }
        };

        statusLineService.OnStatusChanged += async (lineStatus) =>
        {
            var json = JsonDocument.Parse(lineStatus);
            string lineName = json.RootElement.GetProperty("Line").ToString();
            int statusLine = json.RootElement.GetProperty("Status").GetInt32();
            //await mysqlservice.StoreStatusUpdateAsync(lineName, statusLine, DateTime.Now);
        };
        
        await app.RunAsync();
    }
    private static int GetPDT(int n)
    {
        int pdt = (int)Math.Round(3 + n+2*(Math.Cos(n*Math.PI/2)+Math.Sin(n*Math.PI/2) - 1));
        return pdt;
    }
    private static async void CheckAndResetShift(object sender, ElapsedEventArgs e, PdtService pdtService, DataService dataService, BufferService bufferService, StatusLineService statusLineService, GlobalShift globalShift, GlobalDateTime globalDateTime, SQLService sqlService, ProdService prodService)
    {

        var now = DateTime.Now.TimeOfDay;

        TimeSpan firstShiftStart = new TimeSpan(6, 0, 0);
        TimeSpan firstShiftEnd = new TimeSpan(15, 48, 0);
        TimeSpan secondShiftStart = new TimeSpan(15, 48, 0);
        TimeSpan secondShiftStart2 = new TimeSpan(0, 0, 0);
        TimeSpan secondShiftEnd = new TimeSpan(23, 59, 59);
        TimeSpan secondShiftEnd2 = new TimeSpan(1, 9, 0);
        TimeSpan thirdShiftStart = new TimeSpan(1, 9, 0);
        TimeSpan thirdShiftEnd = new TimeSpan(6, 0, 0);

        string newShift = "";
        int actualShift = 0;
        TimeSpan totalTimeShift = TimeSpan.FromMinutes(0);

        if (now >= firstShiftStart && now < firstShiftEnd)
        {
            newShift = "Primeiro Turno";
            actualShift = 1;
            totalTimeShift = TimeSpan.FromMinutes(588);
        }
        else if (now >= secondShiftStart)
        {
            newShift = "Segundo Turno";
            actualShift = 2;
            totalTimeShift = TimeSpan.FromMinutes(561);
        }
        else if (now >= secondShiftStart2 && now < secondShiftEnd2)
        {
            newShift = "Segundo Turno";
            actualShift = 2;
            totalTimeShift = TimeSpan.FromMinutes(561);
        }
        else if (now >= thirdShiftStart && now < thirdShiftEnd)
        {
            newShift = "Terceiro Turno";
            actualShift = 3;
            totalTimeShift = TimeSpan.FromMinutes(291);
        }
        //Console.WriteLine($"Turno atual: "+ newShift);
        if (newShift != globalShift.Shift)
        {
            lock (pdtService.GetPdtData())
            {
                pdtService.ResetCountPdtData();
            }
            prodService.ResetProdData();
            //Console.WriteLine("Dicionário pdtData zerado devido a mudança de turno.");

            globalShift.ActualShift = actualShift;
            globalShift.Shift = newShift;
            globalShift.ShiftTotalTime = totalTimeShift;
            globalShift.currentShiftStart = DateTime.Now;

            Console.WriteLine($"Mudança de turno detectada: {globalShift.Shift} -> {newShift}");

            prodService.TargetProd = await sqlService.GetProdLineDataAsync();
        }
        globalDateTime.currentDateTime = DateTime.Now;
        // await dataService.GlobalDateTimeUp();
        //await dataService.UpdateDataAsync();
    }
    private static async void CheckMinuteProcess(object sender, ElapsedEventArgs e, PdtService pdtService, DataService dataService, BufferService bufferService, StatusLineService statusLineService, SQLService sqlService, ProdService prodService, GlobalShift globalShift, MySqlService mySqlService)
    {
        //Console.WriteLine("Check Minute");
        //await bufferService.UpdateLineBitCount();
            //pdtService.PrintPdtStatusForLine("deckingup");
            //pdtService.LogDictionaryPDTSize();
            //bufferService.LogDictionaryBufferSize();
        //bufferService.PrintBufferData();
        //statusLineService.LogDictionaryStatusSize();
        //statusLineService.LogLastMessages();
        //bufferService.PrintQueueStatus();
        await prodService.TheoreticalProdUpdateAsync();
        //prodService.PrintProdData();
        if (prodService.TargetProd == 0 || sqlService.shiftNow != globalShift.ActualShift)
        {
            int prodTargetNew = await sqlService.GetProdLineDataAsync();
            sqlService.shiftNow = prodTargetNew == prodService.TargetProd ? sqlService.shiftNow : globalShift.ActualShift;
            prodService.TargetProd = prodTargetNew;
        }
        if (firstIgnore)
        {
            firstIgnore = false;
            return;
        }

        //mySqlService.StoreBufferSnapshotBatchAsync(await bufferService.SaveBufferSnapshotAsync());
        var historico = await mySqlService.GetLineBitCountsLastHourAsync();
        await bufferService.StoreBufferAcData(historico);
        dataService.UpdateBufferAcData();
    }
    //private static async void CheckMiliSec(object sender, ElapsedEventArgs e, DataService dataService)
    //{
    //    await dataService.UpdateDataAsync();
    //}
    public static async Task ProcessBuffer(string line, int[] mqttData, BufferService bufferService, DataService dataService)
    {
        int index = 0;
        for (int i = 0; i < mqttData.Length; i++)
        {
            int value = mqttData[i];
            for (int bitPosition = 0; bitPosition < 8; bitPosition++)
            {
                bool bitActive = (value & (1 << bitPosition)) != 0;
                
                // Acumulo CH5
                if (line == "chassis5")
                {
                    
                    if (index >= 36 && index < 52)
                    {
                        await bufferService.UpdateBufferActive("final", index - 36, bitActive);
                    }
                    if (index >= 1 && index < 23 && index != 6 && index != 8)
                    {
                        if(index>6 && index <=8)
                        {
                            await bufferService.UpdateBufferActive("trim", index - 2, bitActive);
                        }
                        else if(index > 8)
                        {
                            await bufferService.UpdateBufferActive("trim", index - 3, bitActive);
                        }
                        else
                        {
                            await bufferService.UpdateBufferActive("trim", index - 1, bitActive);
                        }                        
                    }
                    if (index >= 23 && index < 36)
                    {
                        await bufferService.UpdateBufferActive("trim", index - 4, bitActive);
                    }
                }

                // Acumulo CH1
                if (line == "chassis1")
                {
                    if (index >= 0 && index < 17)
                    {
                        await bufferService.UpdateBufferActive("ch1", index, bitActive);
                    }
                }

                // Acumulo Decking
                if (line == "chassis2")
                {
                    if (index >= 0 && index < 16)
                    {
                        await bufferService.UpdateBufferActive("decking", index, bitActive);
                    }
                }

                // Acumulo CH2
                if (line == "chassis2")
                {
                    if (index >= 16 && index < 33)
                    {
                        await bufferService.UpdateBufferActive("ch2", index-16, bitActive);
                    }
                }

                // Acumulo CH3
                if (line == "chassis2")
                {
                    if (index >= 36 && index < 38)
                    {
                        await bufferService.UpdateBufferActive("ch3", index - 36, bitActive);
                    }
                }
                if (line == "chassis3")
                {
                    if (index >= 0 && index < 7)
                    {
                        await  bufferService.UpdateBufferActive("ch3", index + 2, bitActive);
                    }
                }

                // Acumulo Glazing
                if (line == "chassis3")
                {
                    if (index >= 11 && index < 27)
                    {
                        await bufferService.UpdateBufferActive("glazing", index - 11, bitActive);
                    }
                    if (index >= 27 && index < 35)
                    {
                        await bufferService.UpdateBufferActive("glazing", index - 11, bitActive);
                    }
                }

                // Acumulo CH4
                if (line == "chassis4")
                {
                    if (index >= 0 && index < 27)
                    {
                        await bufferService.UpdateBufferActive("ch4", index, bitActive);
                    }
                }

                if (line == "pb1")
                {
                    if (index >= 153 && index <= 170)
                    {
                        await bufferService.UpdateBufferActive("PbsToTrim0", index - 130, bitActive);
                    }
                    else if (index >= 201 && index <= 217)
                    {
                        await bufferService.UpdateBufferActive("PbsToPint", index - 164, bitActive);
                    }
                    else if (index >= 136 && index <= 152)
                    {
                        await bufferService.UpdateBufferActive("PbsToTrim1", index - 115, bitActive);
                    }
                    else if (index <= 135)
                    {
                        await bufferService.UpdateBufferActive("PbsToDif", index, bitActive);
                    }
                    else if (index >= 171 && index <= 219)
                    {
                        await bufferService.UpdateBufferActive("PbsToDif", index - 35, bitActive);
                    }
                }
                if (line == "pb2")
                {
                    if (index <= 22)
                    {
                        await bufferService.UpdateBufferActive("PbsToTrim0", index, bitActive);
                    }
                    else if (index >= 44 && index <= 68)
                    {
                        await bufferService.UpdateBufferActive("PbsToTrim0", index - 3, bitActive);
                    }
                    else if (index >= 159 && index <= 195)
                    {
                        await bufferService.UpdateBufferActive("PbsToPint", index - 159, bitActive);
                    }
                    else if (index >= 23 && index <= 43)
                    {
                        await bufferService.UpdateBufferActive("PbsToTrim1", index - 23, bitActive);
                    }
                    else if (index >= 69 && index <= 158)
                    {
                        await bufferService.UpdateBufferActive("PbsToTrim1", index - 31, bitActive);
                    }
                }
                index++;
            }
        }
    }
    private static async Task SaveBufferSnapshotAsync( MySqlService mySqlService, BufferService bufferService)
    {
        try
        {
            var snapshotTime = DateTime.Now;
            var snapshotList = new List<BufferSnapshot>();
            var bufferData = bufferService.GetBufferData();

            foreach (var (line, positions) in bufferData)
            {
                foreach (var (position, buffer) in positions)
                {
                    snapshotList.Add(new BufferSnapshot
                    {
                        Line = line,
                        Position = position,
                        IsActive = buffer.IsActive,
                        IsFault = buffer.IsFault,
                        Timestamp = snapshotTime
                    });
                }
            }

            //await mySqlService.StoreBufferSnapshotBatchAsync(snapshotList);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Erro ao salvar snapshot do buffer: " + ex.Message);
        }
    }
    private static async Task ProcessStorageData(string LineString, string dbString, List<(string message, string priority, string zone, string element)> notes, ConcurrentDictionary<string, ConcurrentDictionary<string, DateTime>> _LineActivationTimes, MySqlService mysqlService, GlobalShift globalShift)
    {
        string dbLine = LineString + "_" + dbString;
        
        

        if (!_LineActivationTimes.ContainsKey(dbLine))
        {
            _LineActivationTimes[dbLine] = new ConcurrentDictionary<string, DateTime>();
        }
        else
        {
            var noteMessages = new HashSet<string>(notes.Select(note => $"{note.message};{note.zone};{note.element};{note.priority}"));

            foreach (var messageZone in _LineActivationTimes[dbLine].Keys)
            {
                if (!noteMessages.Contains(messageZone))
                {
                    if (_LineActivationTimes[dbLine].TryRemove(messageZone, out DateTime startTime))
                    {
                        TimeSpan duration = DateTime.Now - startTime;
                        string formattedDuration = duration.ToString(@"hh\:mm\:ss");
                        //int shift;
                        //switch (currentShift)
                        //{
                        //    case "Primeiro Turno":
                        //        shift = 1;
                        //        break;
                        //    case "Segundo Turno":
                        //        shift = 2;
                        //        break;
                        //    case "Terceiro Turno":
                        //        shift = 3;
                        //        break;
                        //    default:
                        //        shift=0;
                        //        break;
                        //}
                        var partZone = messageZone.Split(';');

                        dynamic payload = new ExpandoObject();
                        payload.line = LineString;
                        payload.events = partZone[0];
                        payload.state = partZone[3];
                        payload.zone = partZone[1];
                        payload.element = partZone[2];
                        payload.duration = formattedDuration;
                        payload.data = startTime.ToString("yyyy-MM-ddTHH:mm:ss");
                        payload.shift = globalShift.ActualShift;
                        string jsonPayload = JsonSerializer.Serialize(payload);
                        //Console.WriteLine(jsonPayload);
                        //await mysqlService.StorePayloadDataAsync("events", jsonPayload);
                    }
                }
            }
        }
        foreach (var note in notes) {
            //if (!note.message.Contains("BOOL") && !note.zone.Contains("Zona desconhecida"))
            if (!note.message.Contains("BOOL"))
            {
                string messageStruct = $"{note.message};{note.zone};{note.element};{note.priority}";
                if (!_LineActivationTimes[dbLine].ContainsKey(messageStruct))
                {
                    _LineActivationTimes[dbLine].TryAdd(messageStruct, DateTime.Now);
                }
            }
        }
    }
    private static async Task ResetConnectionTimer(string line, StatusLineService statusLineService)
    {
        if (_connectionTimers.TryGetValue(line, out System.Threading.Timer existingTimer))
        {
            existingTimer.Change(4000, Timeout.Infinite); // Reinicia o timer
        }
        else
        {
            _connectionTimers[line] = new System.Threading.Timer(_ =>
            {
                statusLineService.UpdateStatusDbsActive(line, "0", 0, "", DateTime.Now);
            }, null, 4000, Timeout.Infinite);
        }

        //var allLines = statusLineService.GetStatusData();

        //foreach (var storedLine in allLines.Keys)
        //{
        //    if (!_connectionTimers.ContainsKey(storedLine))
        //    {
        //        //Console.WriteLine($"Linha {storedLine} não tem mensagens recentes. Definindo connection = 0.");
        //        statusLineService.UpdateStatusDbsActive(storedLine, "0", 0, "", DateTime.Now);
        //    }
        //}
    }
}