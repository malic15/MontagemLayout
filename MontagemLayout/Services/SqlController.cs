using Microsoft.AspNetCore.Mvc;

namespace MontagemLayout.Services
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly MySqlService _repositoryMySql;
        private readonly SQLService _repositorySql;

        public EventsController(MySqlService repositoryMySql, SQLService repositorySql)
        {
            _repositoryMySql = repositoryMySql;
            _repositorySql = repositorySql;
        }
        [HttpGet("events")]
        public async Task<IActionResult> GetProducts([FromQuery] string line = null, [FromQuery] string filterDateTimeInit = null, [FromQuery] string filterDateTimeFinal = null)
        {
            Console.WriteLine("GetProducts");
            var products = await _repositoryMySql.GetAllFaults(line, filterDateTimeInit, filterDateTimeFinal);
            return Ok(products);
        }

        [HttpGet("top-events")]
        public async Task<IActionResult> GetTopEvents([FromQuery] string line = null, [FromQuery] string dataFilterInit = null, [FromQuery] string dataFilterFinal = null)
        {
            try
            {
                var topEvents = await _repositoryMySql.GetTopEvents(line, dataFilterInit, dataFilterFinal);
                return Ok(topEvents);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erro ao buscar os top eventos: {ex.Message}");
                return StatusCode(500, "Erro interno do servidor");
            }
        }
        [HttpGet("status-durations")]
        public async Task<IActionResult> GetStateDurations([FromQuery] string line)
        {
            Console.WriteLine("status-durations");
            if (string.IsNullOrEmpty(line))
                return BadRequest("A linha deve ser informada.");

            var result = await _repositoryMySql.GetStateDurationsAsync(line);
            return Ok(result);
        }
    }
}
