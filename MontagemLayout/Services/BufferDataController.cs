//using MQTTnet;
//using MQTTnet.Client;
//using MQTTnet.Client.Options;
//using System;
//using System.Text;
//using System.Threading;
//using System.Threading.Tasks;
//using Microsoft.AspNetCore.SignalR;
//using Microsoft.AspNetCore.Mvc;
//using static System.Runtime.InteropServices.JavaScript.JSType;

//namespace MontagemLayout.Services
//{
//    [ApiController]
//    [Route("api/[controller]")]
//    public class BufferDataController : ControllerBase
//    {
//        private readonly BufferService _bufferService;

//        public BufferDataController(BufferService bufferService)
//        {
//            _bufferService = bufferService;
//        }

//        [HttpGet("line-bit-counts")]
//        public IActionResult GetLineBitCounts()
//        {
//            var lineBitCounts = _bufferService.GetLineBitCounts();

//            foreach (var bitCount in lineBitCounts)
//            {
//                Console.WriteLine($"Line: {bitCount.Key}, Count: {bitCount.Value.Count}");

//                foreach (var count in bitCount.Value)
//                {
//                    Console.WriteLine($"  Count: {count}");
//                }
//            }

//            if (lineBitCounts == null || !lineBitCounts.Any())
//            {
//                return NoContent();
//            }
//            return Ok(lineBitCounts);
//        }
//    }

//}
