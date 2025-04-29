using System.Collections.Concurrent;
using static MontagemLayout.Services.StatusLineService;

namespace MontagemLayout.Services
{
    public class ProdService
    {
        public class ProdInfo
        {
            public int ActualProd { get; set; }
            public int GapProd { get; set; }
            public int InitValue { get; set; }
            public int ActualShift = 0;
        }
        private ConcurrentDictionary<string, ProdInfo> _prodData = new ConcurrentDictionary<string, ProdInfo>();

        public event Action<ConcurrentDictionary<string, ProdInfo>> OnProdDataChanged;

        public int TargetProd { get; set; }
        public int TheoreticalProd { get; set; }

        //private int actualShift = 0;

        private readonly GlobalShift _globalShift;

        public ProdService(GlobalShift globalShift)
        {
            _globalShift = globalShift;
        }
        public ConcurrentDictionary<string, ProdInfo> GetProdData()
        {
            return _prodData;
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
            int prod = 0;
            //if (!_prodData.ContainsKey(line))
            //{
            //    _prodData[line] = new ProdInfo { ActualShift = _globalShift.ActualShift, InitValue = actualProd };
            //}

            //if (_prodData[line].ActualShift != _globalShift.ActualShift)
            //{
            //    Console.WriteLine($"[Turno Mudou] Linha: {line}, Novo Turno: {_globalShift.ActualShift}");
            //    await UpdateInitProd(line, actualProd);
            //    _prodData[line].ActualShift = _globalShift.ActualShift;
            //}

            //if (_prodData.ContainsKey(line))
            //{
            //    prod = (actualProd - _prodData[line].InitValue);
            //}

            
            _prodData.AddOrUpdate(line,
                _ => new ProdInfo { ActualProd = 1 },
                (_, existingLineProdInfo) =>
                {
                    if (existingLineProdInfo.InitValue != actualProd)
                    {
                        existingLineProdInfo.ActualProd += 1;
                        UpdateInitProd(line, actualProd);
                    }
                    return existingLineProdInfo;
                });
            OnProdDataChanged?.Invoke(_prodData);
            //Console.WriteLine("Produção: " + _prodData[line].InitValue);
        }
        public async Task TheoreticalProdUpdateAsync()
        {
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
                        existingLineProdInfo.GapProd = existingLineProdInfo.ActualProd - TheoreticalProd;

                        return existingLineProdInfo;
                    });
                }
            }
            OnProdDataChanged?.Invoke(_prodData);
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

    }
}