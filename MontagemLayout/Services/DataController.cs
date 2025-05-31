using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Client.Options;
using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Mvc;
using static System.Runtime.InteropServices.JavaScript.JSType;
using System.Text.Json;

namespace MontagemLayout.Services
{
    [ApiController]
    [Route("[controller]")]
    public class DataController: Controller
    {
        private readonly IHubContext<DataHub> _hubContext;
        private readonly PdtService _pdtService;
        private readonly BufferService _bufferService;
        private readonly StatusLineService _statusService;
        private readonly ProdService _prodService;
        private readonly MySqlService _mysqlService;
        private readonly DataService _dataService;
        public DataController(DataService dataService, BufferService bufferService, MySqlService mysqlService)
        {
            _dataService = dataService;
            _bufferService = bufferService;
            _mysqlService = mysqlService;
        }
        [HttpPost("update-state")]
        public async Task<IActionResult> UpdateState()
        {
            await _dataService.UpdateDataAsync();
            return Ok();
        }

        [HttpGet("line-bit-counts")]
        public IActionResult GetLineBitCounts()
        {
            var lineBitCounts = _bufferService.GetLineBitCounts();
            var keys = lineBitCounts.Keys.ToList();
            if (lineBitCounts != null || lineBitCounts.Any())
            {
                //foreach (var key in keys)
                //{
                //    var bitCount = lineBitCounts[key];
                //    Console.WriteLine($"Line: {lineBitCounts[key]}, Count: {bitCount.Count}");

                //    foreach (var count in bitCount)
                //    {
                //        Console.WriteLine($"  Count: {count}");
                //    }
                //}
            }
            else
            {
                return NoContent();
            }
            return Ok(lineBitCounts);
        }
        [HttpGet("buffer-replay")]
        public async Task<IActionResult> GetBufferReplay([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            var snapshots = await _mysqlService.GetBufferSnapshotsAsync(start, end);
            return Ok(snapshots);
        }

        //public IActionResult Index()
        //{
        //    var initialData = new
        //    {
        //        PdtData = _pdtService.GetPdtData(),
        //        BufferData = _bufferService.GetBufferData(),
        //        StatusData = _statusService.GetStatusData(),
        //        ProdData = _prodService.GetAllProdData(),
        //        BufferAc = _bufferService.GetBufferAcData()
        //    };

        //    ViewData["InitialState"] = JsonSerializer.Serialize(initialData);
        //    return View();
        //}
    }
}
