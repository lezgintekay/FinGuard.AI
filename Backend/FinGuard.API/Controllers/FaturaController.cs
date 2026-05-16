using FinGuard.API.Data;
using FinGuard.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace FinGuard.API.Controllers
{
    [Authorize]
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
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var faturalar = await _context.Faturalar.Where(f => f.UserId == userId).ToListAsync();
            return Ok(faturalar);
        }

        // Dışarıdan sisteme yeni fatura eklemek için
        [HttpPost]
        public async Task<IActionResult> YeniFaturaEkle([FromBody] Fatura yeniFatura)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            if (yeniFatura == null)
            {
                return BadRequest("Fatura verisi boş olamaz.");
            }

            yeniFatura.UserId = userId; // Ensure it's linked to the correct user
            _context.Faturalar.Add(yeniFatura);
            await _context.SaveChangesAsync();

            return Ok(yeniFatura);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> FaturaSil(int id)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var fatura = await _context.Faturalar.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
            if (fatura == null) return NotFound("Fatura bulunamadı.");

            _context.Faturalar.Remove(fatura);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("{id}/durum")]
        public async Task<IActionResult> DurumGuncelle(int id, [FromBody] string yeniDurum)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var fatura = await _context.Faturalar.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
            if (fatura == null) return NotFound("Fatura bulunamadı.");

            fatura.Durum = yeniDurum;
            await _context.SaveChangesAsync();

            return Ok(fatura);
        }
    }
}