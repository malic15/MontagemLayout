using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Text.Json;
using static MontagemLayout.Services.StatusLineService;

namespace MontagemLayout.Services
{
    public class DataService
    {
        private readonly IHubContext<DataHub> _hubContext;
        private readonly PdtService _pdtService;
        private readonly BufferService _bufferService;
        private readonly StatusLineService _statusService;
        private readonly ProdService _prodService;
        private readonly MySqlService _mysqlService;
        private readonly GlobalDateTime _globalDateTime;
        public DataService(IHubContext<DataHub> hubContext, PdtService pdtService, BufferService bufferService, StatusLineService statusService, ProdService prodService, MySqlService mysqlService)
        {
            _hubContext = hubContext;
            _pdtService = pdtService;
            _bufferService = bufferService;
            _statusService = statusService;
            _prodService = prodService;
            _mysqlService = mysqlService;

            _pdtService.OnPdtDataChanged += async (data) =>
            {
                ConcurrentDictionary<string, ConcurrentDictionary<int, PdtInfo>> pdtData = _pdtService.GetPdtData();
                //Console.WriteLine("Diahsdiuahsbdkajnsdkand");
                await _hubContext.Clients.All.SendAsync("ReceiveApplicationStatePDT", pdtData);
            };
            _bufferService.OnBufferDataChanged += async (data) =>
            {  
                ConcurrentDictionary<string, ConcurrentDictionary<int, BufferInfo>> bufferData = _bufferService.GetBufferData();
                await _hubContext.Clients.All.SendAsync("ReceiveApplicationStateBuffer", bufferData);
            };
            _statusService.OnStatusLineDataChanged += async (data) =>
            {
                ConcurrentDictionary<string, LineInfo> statusData = _statusService.GetStatusData();
                await _hubContext.Clients.All.SendAsync("ReceiveApplicationStateStatus", statusData);
            };
            _prodService.OnProdDataChanged += async (data) =>
            {
                var prodData = _prodService.GetAllProdData();
                await _hubContext.Clients.All.SendAsync("ReceiveApplicationProdData", prodData);
            };


            StartSendingDateTime();
        }
        public async Task UpdateDataAsync()
        {
            ConcurrentDictionary<string, ConcurrentDictionary<int, PdtInfo>> pdtData = _pdtService.GetPdtData();
            ConcurrentDictionary<string, ConcurrentDictionary<int, BufferInfo>> bufferData = _bufferService.GetBufferData();
            ConcurrentDictionary<string, LineInfo> statusData = _statusService.GetStatusData();
            var prodData = _prodService.GetAllProdData();
            var bufferAc = _bufferService.GetBufferAcData();

            _hubContext.Clients.All.SendAsync("ReceiveApplicationBufferAc", bufferAc);
            _hubContext.Clients.All.SendAsync("ReceiveApplicationStatePDT", pdtData);
            _hubContext.Clients.All.SendAsync("ReceiveApplicationStateBuffer", bufferData);
            _hubContext.Clients.All.SendAsync("ReceiveApplicationStateStatus", statusData);
            _hubContext.Clients.All.SendAsync("ReceiveApplicationProdData", prodData);
        }
        public async Task UpdatePDTData()
        {
            ConcurrentDictionary<string, ConcurrentDictionary<int, PdtInfo>> pdtData = _pdtService.GetPdtData();
            await _hubContext.Clients.All.SendAsync("ReceiveApplicationStatePDT", pdtData);
        }
        public async Task UpdateBufferData()
        {
            ConcurrentDictionary<string, ConcurrentDictionary<int, BufferInfo>> bufferData = _bufferService.GetBufferData();
            await _hubContext.Clients.All.SendAsync("ReceiveApplicationStateBuffer", bufferData);
        }
        public async Task UpdateSatusLineData()
        {
            ConcurrentDictionary<string, LineInfo> statusData = _statusService.GetStatusData();
            await _hubContext.Clients.All.SendAsync("ReceiveApplicationStateStatus", statusData);
        }
        public async Task UpdateProdData()
        {
            var prodData = _prodService.GetAllProdData();
            await _hubContext.Clients.All.SendAsync("ReceiveApplicationProdData", prodData);
        }
        public async Task UpdateBufferAcData()
        {
            var bufferAc = _bufferService.GetBufferAcData();
            await _hubContext.Clients.All.SendAsync("ReceiveApplicationBufferAc", bufferAc);
        }
        public async Task GlobalDateTimeUp()
        {
            var globalDateTime = _globalDateTime.GetCurrentDateTime();
            Console.WriteLine(globalDateTime);
            await _hubContext.Clients.All.SendAsync("ReceiveApplicationGlobalDateTime", globalDateTime);
        }
        private void StartSendingDateTime()
        {
            Task.Run(async () =>
            {
                while (true)
                {
                    string currentDateTime = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
                    //await _hubContext.Clients.All.SendAsync("ReceiveCurrentDateTime", DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss"));

                    await _hubContext.Clients.All.SendAsync("ReceiveCurrentDateTime", currentDateTime);
                    await Task.Delay(1000);
                }
            });
        }
    }
}