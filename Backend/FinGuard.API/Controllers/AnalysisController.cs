using FinGuard.API.Data;
using FinGuard.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace FinGuard.API.Controllers
{
    [Authorize]
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
        public async Task<IActionResult> GetRiskAnalysis([FromQuery] decimal? overrideKasa)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            // 1. Veritabanından mevcut durumu çekiyoruz
            var hesap = await _context.Hesaplar.FirstOrDefaultAsync(h => h.UserId == userId);
            var faturalar = await _context.Faturalar.Where(f => f.UserId == userId).ToListAsync();

            // Fetch user-specific sales data
            var satislar = await _context.SatisVerileri.Where(s => s.UserId == userId).ToListAsync();

            if (hesap == null)
            {
                return NotFound("Sistemde analiz edilecek hesap bilgisi bulunamadı.");
            }

            if (overrideKasa.HasValue)
            {
                hesap.ToplamBakiye = overrideKasa.Value;
            }

            // 2. Verileri yapay zeka ajanımıza (Gemini) gönderiyoruz
            var aiResponse = await _geminiService.AnalyzeRiskAsync(hesap, faturalar, satislar);

            // 3. Gemini'den gelen yanıt zaten JSON formatında olduğu için doğrudan dışarı basıyoruz
            return Content(aiResponse, "application/json");
        }
    }
}