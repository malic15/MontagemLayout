using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using MontagemLayout.Services;
using System.Text.Json;

namespace MontagemLayout.Pages
{
    public class LayoutMontagemModel : PageModel
    {
        private readonly BufferService _bufferService;
        private readonly PdtService _pdtService;
        private readonly StatusLineService _statusService;
        private readonly ProdService _prodService;

        public string HistoricalChartJson { get; set; }
        public string InitialStateJson { get; set; }

        public LayoutMontagemModel(BufferService bufferService, PdtService pdtService, StatusLineService statusService, ProdService prodService)
        {
            _bufferService = bufferService;
            _pdtService = pdtService;
            _statusService = statusService;
            _prodService = prodService;
        }
        //public async Task OnGetAsync()
        //{
        //    var hist = _bufferService.GetBufferAcData();
        //    HistoricalChartJson = JsonSerializer.Serialize(hist);
        //}
        public string InitialJson { get; set; }

        public async Task OnGetAsync()
        {
            var initialData = new
            {
                PdtData = _pdtService.GetPdtData(),
                BufferData = _bufferService.GetBufferData(),
                StatusData = _statusService.GetStatusData(),
                ProdData = _prodService.GetAllProdData(),
                BufferAc = _bufferService.GetBufferAcData()
            };

            InitialJson = JsonSerializer.Serialize(initialData);
        }

        //public void OnGet()
        //{
        //    var initialData = new
        //    {
        //        PdtData = _pdtService.GetPdtData(),
        //        BufferData = _bufferService.GetBufferData(),
        //        StatusData = _statusService.GetStatusData(),
        //        ProdData = _prodService.GetAllProdData(),
        //        BufferAc = _bufferService.GetBufferAcData()
        //    };

        //    InitialStateJson = JsonSerializer.Serialize(initialData, new JsonSerializerOptions
        //    {
        //        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        //        WriteIndented = false
        //    });
        //}

    }
}
