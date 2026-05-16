using FinGuard.API.Data;
using FinGuard.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinGuard.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FaturaController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FaturaController(AppDbContext context)
        {
            _context = context;
        }

        // Tüm faturaları listelemek için (Frontend'de tabloya basarken lazım olacak)
        [HttpGet]
        public async Task<IActionResult> GetFaturalar()
        {
            var faturalar = await _context.Faturalar.ToListAsync();
            return Ok(faturalar);
        }

        // Dışarıdan sisteme yeni fatura eklemek için
        [HttpPost]
        public async Task<IActionResult> YeniFaturaEkle([FromBody] Fatura yeniFatura)
        {
            if (yeniFatura == null)
            {
                return BadRequest("Fatura verisi boş olamaz.");
            }

            // Gelen faturayı veritabanına ekliyoruz
            _context.Faturalar.Add(yeniFatura);
            await _context.SaveChangesAsync();

            // Kayıt başarılı olduktan sonra 201 Created dönüyoruz
            return CreatedAtAction(nameof(GetFaturalar), new { id = yeniFatura.Id }, yeniFatura);
        }
    }
}