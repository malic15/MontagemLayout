using System.Collections.Concurrent;

namespace MontagemLayout.Services
{
    public class PdtInfo
    {
        public int StopCount { get; set; }
        public bool IsActive { get; set; }
        public TimeSpan TotalActiveTime { get; set; } = TimeSpan.Zero;
        public DateTime? LastActivatedTime { get; set; }
    }
    public class PdtService
    {
        private ConcurrentDictionary<string, ConcurrentDictionary<int, PdtInfo>> _pdtData = new ConcurrentDictionary<string, ConcurrentDictionary<int, PdtInfo>>();

        public event Action<ConcurrentDictionary<string, ConcurrentDictionary<int, PdtInfo>>> OnPdtDataChanged;

        public ConcurrentDictionary<string, ConcurrentDictionary<int, PdtInfo>> GetPdtData()
        {
            return _pdtData;
        }
        public void ResetPdtData()
        {
            _pdtData.Clear();
        }
        public void ResetCountPdtData()
        {
            foreach (var lineEntry in _pdtData)
            {
                foreach (var pdtEntry in lineEntry.Value)
                {
                    if (pdtEntry.Value.IsActive)
                    {
                        pdtEntry.Value.StopCount = 1;
                        pdtEntry.Value.TotalActiveTime = TimeSpan.Zero;
                        pdtEntry.Value.LastActivatedTime = DateTime.Now;
                    }
                    else
                    {
                        pdtEntry.Value.StopCount = 0;
                        pdtEntry.Value.TotalActiveTime = TimeSpan.Zero;
                    }
                }
            }
            OnPdtDataChanged?.Invoke(_pdtData);
        }
        public void UpdatePdtStopCount(string line, int pdt, bool isActive)
        {
            if (!_pdtData.ContainsKey(line))
            {
                _pdtData[line] = new ConcurrentDictionary<int, PdtInfo>();
            }

            PdtInfo previous = null;
            _pdtData[line].TryGetValue(pdt, out previous);
            previous = previous != null
                ? new PdtInfo
                {
                    StopCount = previous.StopCount,
                    IsActive = previous.IsActive,
                    LastActivatedTime = previous.LastActivatedTime,
                    TotalActiveTime = previous.TotalActiveTime
                }
                : null;

            if (!_pdtData[line].ContainsKey(pdt))
            {
                if (isActive)
                {
                    _pdtData[line][pdt] = new PdtInfo { StopCount = 1, IsActive = isActive, LastActivatedTime = DateTime.Now };
                }
                else
                {
                    _pdtData[line][pdt] = new PdtInfo { StopCount = 0, IsActive = isActive };
                }
            }
            else
            {
                var pdtInfo = _pdtData[line][pdt];
                if (!pdtInfo.IsActive && isActive)
                {
                    pdtInfo.StopCount++;
                    pdtInfo.LastActivatedTime = DateTime.Now;
                }
                else if (pdtInfo.IsActive && !isActive && pdtInfo.LastActivatedTime.HasValue)
                {
                    var activeDuration = DateTime.Now - pdtInfo.LastActivatedTime.Value;
                    pdtInfo.TotalActiveTime += activeDuration;
                    pdtInfo.LastActivatedTime = null;
                }
                pdtInfo.IsActive = isActive;
            }
            var current = _pdtData[line][pdt];
            bool mudou =
                previous == null ||
                previous.IsActive != current.IsActive ||
                previous.StopCount != current.StopCount ||
                previous.TotalActiveTime != current.TotalActiveTime;

            if (mudou)
            {
                OnPdtDataChanged?.Invoke(_pdtData);
            }
        }
        public void PrintPdtStatusForLine(string line)
        {
            var pdtData = GetPdtData();

            if (pdtData.ContainsKey(line))
            {

                foreach (var pdt in pdtData[line])
                {
                    Console.WriteLine($"PDT: {pdt.Key}, Contagem: {pdt.Value.StopCount}, Ativo: {pdt.Value.IsActive}, Tempo: {pdt.Value.TotalActiveTime}");
                }
            }
            else
            {
                Console.WriteLine($"A linha '{line}' não foi encontrada.");
            }
        }
        public void LogDictionaryPDTSize()
        {
            Console.WriteLine($"Tamanho do dicionário _pdtData: {_pdtData.Count}");
            foreach (var entry in _pdtData)
            {
                Console.WriteLine($"Chave: {entry.Key}, Tamanho da lista: {entry.Value.Count}");
            }
        }

    }
}