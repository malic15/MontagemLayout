using Microsoft.AspNetCore.DataProtection.KeyManagement;
using System;
using System.Collections.Concurrent;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace MontagemLayout.Services
{
    public class BufferInfo
    {
        public bool IsFault { get; set; } = false;
        public bool IsActive { get; set; } = false;
        public string CIS { get; set; } = "";
    }
    public class BufferSnapshot
    {
        public long Id { get; set; }
        public string Line { get; set; }
        public int Position { get; set; }
        public bool IsActive { get; set; }
        public bool IsFault { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class BufferService
    {
        ConcurrentDictionary<string, ConcurrentDictionary<int, BufferInfo>> _bufferData = new ConcurrentDictionary<string, ConcurrentDictionary<int, BufferInfo>>();
        public List<BufferSnapshot> _bufferAcData = new List<BufferSnapshot>();
        public ConcurrentDictionary<string, List<int>> _bufferMySqlData = new();
        private ConcurrentDictionary<string, List<int>> _lineBitCounts = new ConcurrentDictionary<string, List<int>>();
        private ConcurrentQueue<string> _cisQueue = new ConcurrentQueue<string>();

        public event Action<ConcurrentDictionary<string, ConcurrentDictionary<int, BufferInfo>>> OnBufferDataChanged;

        private System.Timers.Timer _throttleTimer;
        private readonly object _throttleLock = new();
        private bool _pendingUpdate = false;

        private const int MaxHistorySize = 40;
        private const int MaxDictionarySize = 1000;
        private string[] bufferFlow = new string[] { "ch1", "decking", "ch2", "ch3", "glazing", "ch4", "final"};

        public BufferService()
        {
            _throttleTimer = new System.Timers.Timer(500);
            _throttleTimer.Elapsed += ThrottleTimerElapsed;
            _throttleTimer.AutoReset = true; // importante: ele vai executar sempre
            _throttleTimer.Start();
        }
        public ConcurrentDictionary<string, ConcurrentDictionary<int, BufferInfo>> GetBufferData()
        {
            return _bufferData;
        }
        public async Task StoreBufferAcData(ConcurrentDictionary<string, List<int>> bufferMySqlData)
        {
            _bufferMySqlData = bufferMySqlData;
        }
        public ConcurrentDictionary<string, List<int>> GetBufferAcData()
        {
            return _bufferMySqlData;
        }
        public ConcurrentDictionary<string, List<int>> GetLineBitCounts()
        {
            return _lineBitCounts;
        }
        public void ResetBufferData()
        {
            _bufferData.Clear();
        }
        public async Task UpdateBufferActive(string line, int pos, bool isActive)
        {
            var lineBuffers = _bufferData.GetOrAdd(line, _ => new ConcurrentDictionary<int, BufferInfo>());
            var buffer = lineBuffers.GetOrAdd(pos, _ => new BufferInfo());

            buffer.IsActive = isActive;

            //await UpdateCisBuffer();

            while (lineBuffers.Count > MaxDictionarySize)
            {
                var firstKey = lineBuffers.Keys.First();
                lineBuffers.TryRemove(firstKey, out _);
            }

            lock (_throttleLock)
            {
                _pendingUpdate = true;
            }
        }
        public void PrintBufferData()
        {
            foreach (var lineEntry in _bufferData)
            {
                Console.WriteLine($"Line: {lineEntry.Key}");
                foreach (var posEntry in lineEntry.Value)
                {
                    Console.WriteLine($"  Position: {posEntry.Key}, Active: {posEntry.Value.IsActive}, Fault: {posEntry.Value.IsFault}");
                }
            }
        }
        public Task UpdateLineBitCount()
        {
            foreach (var lineEntry in _bufferData)
            {
                string line = lineEntry.Key;
                int activeBitCount = lineEntry.Value.Values.Count(buffer => buffer.IsActive);

                _lineBitCounts.AddOrUpdate(
                    line,
                    _ => new List<int> { activeBitCount },
                    (_, list) =>
                    {
                        list.Add(activeBitCount);
                        if (list.Count > MaxHistorySize)
                        {
                            list.RemoveAt(0);
                        }
                        return list;
                    });
            }
            return Task.CompletedTask;
        }
        public int CountActiveBitsForLine(string line)
        {
            switch (line)
            {
                case "chassis4":
                    line = "ch4";
                    break;
                case "chassis3":
                    line = "ch3";
                    break;
                case "chassis2":
                    line = "ch2";
                    break;
                case "chassis1":
                    line = "ch1";
                    break;
            }
            return _bufferData.ContainsKey(line) ? _bufferData[line].Values.Count(isActive => isActive.IsActive) : 0;
        }
        public async Task<List<BufferSnapshot>> SaveBufferSnapshotAsync()
        {
            try
            {
                var snapshotTime = DateTime.Now;
                var snapshotList = new List<BufferSnapshot>();
                var bufferData = _bufferData;

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
                _bufferAcData = snapshotList;
                return _bufferAcData;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Erro ao salvar snapshot do buffer: " + ex.Message);
                return _bufferAcData;
            }
        }
        public async Task AddCI(string cis)
        {
            _cisQueue.Enqueue(cis);
            
        }
        public void PrintQueueStatus()
        {
            Console.WriteLine("CIs na fila:");
            foreach (var ci in _cisQueue)
            {
                Console.WriteLine($"CI: {ci}");
            }
        }
        private async Task UpdateCisBuffer()
        {
            var cisArray = _cisQueue.Reverse().ToArray();
            int cisIndex = 0;
            foreach (var lineEntry in bufferFlow)
            {
                if (_bufferData.ContainsKey(lineEntry)){
                    foreach (var bufferEntry in _bufferData[lineEntry])
                    {
                        if (bufferEntry.Value.IsActive && cisIndex < cisArray.Length)
                        {
                            bufferEntry.Value.CIS = cisArray[cisIndex];
                            //Console.WriteLine($"Carro com CI {cisArray[cisIndex]} atribuído à linha {lineEntry}, posição {bufferEntry.Key}");
                            cisIndex++;
                        }
                        else
                        {
                            bufferEntry.Value.CIS = "";
                        }
                    }
                }
            }
        }
        private void ThrottleTimerElapsed(object sender, System.Timers.ElapsedEventArgs e)
        {
            lock (_throttleLock)
            {
                if (_pendingUpdate)
                {
                    _pendingUpdate = false;
                    OnBufferDataChanged?.Invoke(_bufferData);
                }
            }
        }
        public void LogDictionaryBufferSize()
        {
            Console.WriteLine($"Tamanho do dicionário _statusData: {_bufferData.Count}");
            foreach (var entry in _bufferData)
            {
                Console.WriteLine($"Chave: {entry.Key}, Tamanho da lista: {entry.Value.Count}");
            }
            Console.WriteLine($"Tamanho do dicionário _lineBitCounts: {_lineBitCounts.Count}");
            foreach (var entry in _lineBitCounts)
            {
                Console.WriteLine($"Chave: {entry.Key}, Tamanho da lista: {entry.Value.Count}");
            }
        }
    }
}