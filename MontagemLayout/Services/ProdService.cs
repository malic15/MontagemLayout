using MontagemLayout.Services;
using System.Collections.Concurrent;
using System.Text.Json;

using static MontagemLayout.Services.ProdService;
using static MontagemLayout.Services.StatusLineService;



namespace MontagemLayout.Services
{
    public class ProdService
    {
        private readonly MySqlService _mysqlService;
        private readonly GlobalShift _globalShift;

        public ProdService(GlobalShift globalShift, MySqlService mysqlService)
        {
            _globalShift = globalShift;
            _mysqlService = mysqlService;
        }
        public class ProdInfo
        {
            public int ActualProd { get; set; }
            public int GapProd { get; set; }
            public int InitValue { get; set; }
            public int ActualShift = 0;
            public int LossAnomalia { get; set; }
            public int LossProducao { get; set; }
            public int LossOutros { get; set; }
        }
        public class LossAccum
        {
            public int SumAnomalia = 0;
            public int SumProducao = 0;
            public int SumOutros = 0;
            public int SumTotal = 0;
            public DateTime? LastTimestamp = null;
            public int LastState = 0;
        }
        private ConcurrentDictionary<string, LossAccum> _lossByLine = new();

        private ConcurrentDictionary<string, ProdInfo> _prodData = new ConcurrentDictionary<string, ProdInfo>();

        public event Action<ConcurrentDictionary<string, ProdInfo>> OnProdDataChanged;

        public int TargetProd { get; set; }
        public int TheoreticalProd { get; set; }

        //private int actualShift = 0;
        public ConcurrentDictionary<string, ProdInfo> GetProdData()
        {
            return _prodData;
        }
        public ConcurrentDictionary<string, LossAccum> GetLossAccum()
        {
            return _lossByLine;
        }
        public object GetAllProdData()
        {
            return new
            {
                TargetProd = TargetProd,
                TheoreticalProd = TheoreticalProd,
                ProdData = _prodData
            };
        }
        private async Task UpdateInitProd(string line, int initValue)
        {
            _prodData.AddOrUpdate(line,
                _ => new ProdInfo { InitValue = initValue },
                (_, existingLineProdInfo) =>
                {
                    if (existingLineProdInfo.InitValue != initValue)
                    {
                        existingLineProdInfo.InitValue = initValue;
                    }
                    return existingLineProdInfo;
                });
        }
        public async Task UpdateProd(string line, int actualProd)
        {
            bool changed = false;

            int prod = 0;
            
            _prodData.AddOrUpdate(line,
                _ => new ProdInfo { ActualProd = 1 },
                (_, existingLineProdInfo) =>
                {
                    if (existingLineProdInfo.InitValue != actualProd)
                    {
                        existingLineProdInfo.ActualProd += 1;
                        UpdateInitProd(line, actualProd);
                        changed = true;
                    }
                    return existingLineProdInfo;
                });

            var prodInfo = _prodData[line];

            if (changed)
            {
                OnProdDataChanged?.Invoke(_prodData);

                var payloadProd = new MySqlService.ProdHourlyDto
                {
                    LineSlug = line.ToString(),
                    EventTs = DateTime.Now,
                    QtyDelta = 1,
                    ShiftCode = _globalShift.ActualShift,
                    ShiftDate = DateTime.SpecifyKind(_globalShift.currentShiftStart, DateTimeKind.Unspecified).Date
                };
                string jsonProd = JsonSerializer.Serialize(payloadProd);
                //await _mysqlService.StoreProdHourlyAsync(jsonProd);
            }
            
            int gapProd = prodInfo.GapProd;

            var (lossAnomalia, lossProducao, lossOutros) = GetLossForLine(line, gapProd);
            prodInfo.LossAnomalia = lossAnomalia;
            prodInfo.LossProducao = lossProducao;
            prodInfo.LossOutros = lossOutros;
            
            //Console.WriteLine("Produção: " + _prodData[line].InitValue);
        }
        public async Task TheoreticalProdUpdateAsync()
        {
            bool changed = false;
            if (TargetProd!=0)
            {
                TimeSpan elapsedTime;
                elapsedTime = DateTime.Now - _globalShift.currentShiftStart;
                TheoreticalProd = (int)Math.Floor((elapsedTime.TotalMinutes / _globalShift.ShiftTotalTime.TotalMinutes) * TargetProd);
                foreach (var line in _prodData.Keys)
                {
                    _prodData.AddOrUpdate(line,
                    _ => new ProdInfo { GapProd = 0 },
                    (_, existingLineProdInfo) =>
                    {
                        var newGapProd = existingLineProdInfo.ActualProd - TheoreticalProd;
                        if(newGapProd != existingLineProdInfo.GapProd)
                        {
                            existingLineProdInfo.GapProd = newGapProd;
                            changed = true;
                        }
                        

                        return existingLineProdInfo;
                    });
                }
            }
            if (changed)
            {
                OnProdDataChanged?.Invoke(_prodData);
            }
        }
        public void ResetProdData()
        {
            foreach (var key in _prodData.Keys)
            {
                _prodData[key] = new ProdInfo
                {
                    ActualProd = 0,
                    GapProd = 0,
                    InitValue = 0
                };
            }
            OnProdDataChanged?.Invoke(_prodData);
        }
        public void UpdateLosses(string line, int gapProd, List<(int state, int duration)> durations)
        {
            // Defina as prioridades
            var anomaliaPrio = new[] { 1, 2, 15, 16 };
            var producaoPrio = new[] { 5, 7, 8, 10, 11, 12, 17 };
            var outrosPrio = new[] { 6, 9 };

            double sumAnomalia = 0, sumProducao = 0, sumOutros = 0, sumTotal = 0;
            foreach (var (state, duration) in durations)
            {
                if (anomaliaPrio.Contains(state)) sumAnomalia += duration;
                if (producaoPrio.Contains(state)) sumProducao += duration;
                if (outrosPrio.Contains(state)) sumOutros += duration;
            }
            sumTotal = sumAnomalia + sumProducao + sumOutros;
            var ngapProd = -gapProd; // negativo indica carros perdidos

            // Proporcional (igual ao JS), usando double para precisão
            double realLossAnomalia = sumTotal == 0 ? 0 : (sumAnomalia / sumTotal) * ngapProd;
            double realLossProducao = sumTotal == 0 ? 0 : (sumProducao / sumTotal) * ngapProd;
            double realLossOutros = sumTotal == 0 ? 0 : (sumOutros / sumTotal) * ngapProd;

            int lossAnomalia = Math.Max(0, (int)Math.Floor(realLossAnomalia));
            int lossProducao = Math.Max(0, (int)Math.Floor(realLossProducao));
            int lossOutros = Math.Max(0, (int)Math.Floor(realLossOutros));
            int somaLoss = lossAnomalia + lossProducao + lossOutros;
            int diff = ngapProd - somaLoss;

            // Distribua o resto de maneira proporcional (maior decimal ganha)
            var decimais = new List<(string key, double value)> {
        ("anomalia", realLossAnomalia - Math.Floor(realLossAnomalia)),
        ("producao", realLossProducao - Math.Floor(realLossProducao)),
        ("outros",   realLossOutros   - Math.Floor(realLossOutros))
    };
            decimais = decimais.OrderByDescending(d => d.value).ToList();

            for (int i = 0; i < diff; i++)
            {
                if (decimais[i % 3].key == "anomalia") lossAnomalia++;
                else if (decimais[i % 3].key == "producao") lossProducao++;
                else if (decimais[i % 3].key == "outros") lossOutros++;
            }

            if (_prodData.TryGetValue(line, out var prodInfo))
            {
                prodInfo.LossAnomalia = lossAnomalia;
                prodInfo.LossProducao = lossProducao;
                prodInfo.LossOutros = lossOutros;
            }
        }


        public void PrintProdData()
        {
            Console.WriteLine("=======================================");
            Console.WriteLine($"TargetProd: {TargetProd}");
            Console.WriteLine($"TheoreticalProd: {TheoreticalProd}");
            Console.WriteLine("=======================================");
            Console.WriteLine("Lista de Produção (_prodData):");

            if (_prodData.Count == 0)
            {
                Console.WriteLine("Nenhum dado disponível.");
                return;
            }

            foreach (var kvp in _prodData)
            {
                string line = kvp.Key;
                ProdInfo prodInfo = kvp.Value;

                Console.WriteLine($"Linha: {line}");
                Console.WriteLine($"   → ActualProd: {prodInfo.ActualProd}");
                Console.WriteLine($"   → GapProd: {prodInfo.GapProd}");
                Console.WriteLine($"   → InitValue: {prodInfo.InitValue}");
                Console.WriteLine("---------------------------------------");
            }
        }
        public (int lossAnomalia, int lossProducao, int lossOutros) GetLossForLine(string line, int gapProd)
        {
            if (!_lossByLine.TryGetValue(line, out var loss) || loss.SumTotal == 0)
                return (0, 0, 0);
            if (gapProd > 0) return (0, 0, 0);
            int ngapProd = (gapProd*(-1)); // garantir positivo

            

            double realLossAnomalia = (loss.SumAnomalia / (double)loss.SumTotal) * ngapProd;
            double realLossProducao = (loss.SumProducao / (double)loss.SumTotal) * ngapProd;
            double realLossOutros = (loss.SumOutros / (double)loss.SumTotal) * ngapProd;

            int lossAnomalia = Math.Max(0, (int)Math.Floor(realLossAnomalia));
            int lossProducao = Math.Max(0, (int)Math.Floor(realLossProducao));
            int lossOutros = Math.Max(0, (int)Math.Floor(realLossOutros));
            //Console.WriteLine(line + " loss.SumAnomalia: " + loss.SumAnomalia + " loss.SumProducao: " + loss.SumProducao + " loss.SumOutros: " + loss.SumOutros + " loss.SumTotal: " + loss.SumTotal);
            int somaLoss = lossAnomalia + lossProducao + lossOutros;
            int diff = ngapProd - somaLoss;
            //Console.WriteLine(line + " diff: " + diff + " ngapProd: " + ngapProd + " somaLoss: " + somaLoss);
            // Distribua o resto de maneira proporcional (maior decimal ganha)
            var decimais = new List<(string key, double value)> {
        ("anomalia", realLossAnomalia - Math.Floor(realLossAnomalia)),
        ("producao", realLossProducao - Math.Floor(realLossProducao)),
        ("outros",   realLossOutros   - Math.Floor(realLossOutros))
    };
            decimais = decimais.OrderByDescending(d => d.value).ToList();

            for (int i = 0; i < diff; i++)
            {
                if (decimais[i % 3].key == "anomalia") lossAnomalia++;
                else if (decimais[i % 3].key == "producao") lossProducao++;
                else if (decimais[i % 3].key == "outros") lossOutros++;
            }
            //Console.WriteLine(line+ " lossAnomalia: "+ lossAnomalia+ " lossProducao: "+ lossProducao+ " lossOutros: " + lossOutros);
            return (lossAnomalia, lossProducao, lossOutros);
        }
    }
}