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
            var snapshots = await _mysqlService.GetBufferSnapshotsReplayAsync(start, end);
            return Ok(snapshots);
        }
        [HttpGet("replay")]
        public async Task<IActionResult> GetReplay([FromQuery] DateTime start, [FromQuery] DateTime end)
        {
            var bufferSnapshots = await _mysqlService.GetBufferSnapshotsReplayAsync(start, end);
            var statusUpdates = await _mysqlService.GetStatusReplayAsync(start, end);

            return Ok(new
            {
                buffer = bufferSnapshots,
                status = statusUpdates
            });
        }
        [HttpGet("prod-hour-day")]
        public async Task<IActionResult> GetProdHourByDay([FromQuery] DateTime day)
        {
            var phbd = await _mysqlService.GetProdHourMatrixByDayAsync(day);
            return Ok(phbd);
        }
    }
}
