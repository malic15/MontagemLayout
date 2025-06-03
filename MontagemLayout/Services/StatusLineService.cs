using Mysqlx.Crud;
using System.Collections.Concurrent;
using System.Text.Json;

namespace MontagemLayout.Services
{
    public class StatusUpdate
    {
        public string line { get; set; } = "";
        public int state { get; set; }
        public DateTime? timestamp { get; set; }
    }
    public class StatusLineService
    {
        public class LineInfo
        {
            public int lowestStatusActive { get; set; }
            public string lastMessage { get; set; } = "";
            public DateTime? lastFaultTime { get; set; }
        }
        
        private ConcurrentDictionary<string, LineInfo> _statusData = new ConcurrentDictionary<string, LineInfo>();
        private ConcurrentDictionary<string, ConcurrentDictionary<string,int>> _statusDbsData = new ConcurrentDictionary<string, ConcurrentDictionary<string, int>>();

        private readonly ConcurrentQueue<(string, string, int, string, DateTime)> _statusUpdateQueue = new ConcurrentQueue<(string, string, int, string, DateTime)>();

        public event Func<string, Task> OnStatusChanged;

        public event Action<ConcurrentDictionary<string, LineInfo>> OnStatusLineDataChanged;

        public ConcurrentDictionary<string, LineInfo> GetStatusData()
        {
            return _statusData;
        }
        public ConcurrentDictionary<string, ConcurrentDictionary<string, int>> GetStatusDbsData()
        {
            return _statusDbsData;
        }
        public StatusLineService()
        {
            Task.Run(ProcessQueue);
        }
        public void ResetStatusData()
        {
            _statusData.Clear();
        }
        public void UpdateStatusDbsActive(string line, string db, int status, string message, DateTime time)
        {
            _statusUpdateQueue.Enqueue((line, db, status, message, time));
            
        }
        private async Task ProcessQueue()
        {
            while (true)
            {
                await Task.Delay(200);
                
                while (_statusUpdateQueue.TryDequeue(out var update))
                {
                    
                    _statusDbsData.AddOrUpdate(update.Item1,
                        _ => new ConcurrentDictionary<string, int> { [update.Item2] = update.Item3 },
                        (_, innerDict) =>
                        {
                            innerDict[update.Item2] = update.Item3;
                            return innerDict;
                        });
                    if (!string.IsNullOrEmpty(update.Item4))
                    {
                        _statusData.AddOrUpdate(update.Item1,
                            _ => new LineInfo
                            {
                                lastMessage = update.Item4,
                                lastFaultTime = update.Item5 // time enviado junto
                            },
                            (_, existingLineInfo) =>
                            {
                                if (existingLineInfo.lastMessage != update.Item4)
                                {
                                    existingLineInfo.lastMessage = update.Item4;
                                    existingLineInfo.lastFaultTime = update.Item5;
                                }
                                return existingLineInfo;
                            });
                    }
                }
                GetLowestStatus();
            }
        }
        public void UpdateStatusActive(string line ,int status)
        {
            _statusData.AddOrUpdate(line,
                        _ => new LineInfo { lowestStatusActive = status },
                        (_, existingLineInfo) =>
                        {
                            if (existingLineInfo.lowestStatusActive != status)
                            {
                                if (OnStatusChanged != null)
                                {
                                    var lineStatus = JsonSerializer.Serialize(new
                                    {
                                        Line = line,
                                        Status = status
                                    });
                                    Task.Run(async () => await OnStatusChanged.Invoke(lineStatus));
                                    OnStatusLineDataChanged?.Invoke(_statusData);
                                }
                            }
                            existingLineInfo.lowestStatusActive = status;
                            return existingLineInfo;
                        });

        }
        public void LogDictionaryStatusSize()
        {
            Console.WriteLine($"Tamanho do dicionário _statusData: {_statusData.Count}");
            Console.WriteLine($"Tamanho do dicionário _statusDbsData: {_statusDbsData.Count}");
            foreach (var entry in _statusDbsData)
            {
                Console.WriteLine($"Chave: {entry.Key}, Tamanho da lista: {entry.Value.Count}");
            }
        }
        public void LogLastMessages()
        {
            foreach (var line in _statusData)
            {
                var lineName = line.Key;
                var lastMessage = line.Value.lastMessage;
                Console.WriteLine($"Linha: {lineName}, Última Mensagem: {lastMessage}");
            }
        }

        private DateTime _lastPrintTime = DateTime.MinValue;
        private void GetLowestStatus()
        {
            foreach (var lineDbs in _statusDbsData)
            {
                int? lowestPriority = null;
                foreach (var statusDbs in lineDbs.Value)
                {
                    if (lowestPriority == null || statusDbs.Value < lowestPriority)
                    {
                        lowestPriority = statusDbs.Value;
                    }
                    //Console.WriteLine($"Line: {lineDbs.Key}, DB: {statusDbs.Key}, Prioridade: {statusDbs.Value}");
                }
                
                if (lowestPriority.HasValue)
                {
                    UpdateStatusActive(lineDbs.Key, lowestPriority.Value);
                    //Console.WriteLine($"Line: {lineDbs.Key} Prioridade: {lowestPriority.Value}");
                }
            }
        }
    }
}