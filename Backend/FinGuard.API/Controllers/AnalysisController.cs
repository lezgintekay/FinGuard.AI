using FinGuard.API.Data;
using FinGuard.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinGuard.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalysisController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly GeminiService _geminiService;

        public AnalysisController(AppDbContext context, GeminiService geminiService)
        {
            _context = context;
            _geminiService = geminiService;
        }

        [HttpGet("risk")]
        public async Task<IActionResult> GetRiskAnalysis()
        {
            // 1. Veritabanından mevcut durumu çekiyoruz
            var hesap = await _context.Hesaplar.FirstOrDefaultAsync();
            var faturalar = await _context.Faturalar.ToListAsync();

            if (hesap == null)
            {
                return NotFound("Sistemde analiz edilecek hesap bilgisi bulunamadı.");
            }

            // 2. Verileri yapay zeka ajanımıza (Gemini) gönderiyoruz
            var aiResponse = await _geminiService.AnalyzeRiskAsync(hesap, faturalar);

            // 3. Gemini'den gelen yanıt zaten JSON formatında olduğu için doğrudan dışarı basıyoruz
            return Content(aiResponse, "application/json");
        }
    }
}