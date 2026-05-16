using FinGuard.API.Data;
using FinGuard.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FinGuard.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SatisController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SatisController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetSatisVerileri()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var satislar = await _context.SatisVerileri
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.Yil)
                .ThenByDescending(s => s.Ay)
                .ToListAsync();
                
            return Ok(satislar);
        }

        [HttpPost]
        public async Task<IActionResult> AddSatisVerisi([FromBody] SatisVerisi yeniSatis)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var existing = await _context.SatisVerileri.FirstOrDefaultAsync(s => s.Yil == yeniSatis.Yil && s.Ay == yeniSatis.Ay && s.UserId == userId);
            if (existing != null)
            {
                return BadRequest("Bu ay ve yıl için zaten bir satış verisi girilmiş. Lütfen güncelleyin.");
            }

            yeniSatis.UserId = userId;
            _context.SatisVerileri.Add(yeniSatis);
            await _context.SaveChangesAsync();

            return Ok(yeniSatis);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSatisVerisi(int id)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var satis = await _context.SatisVerileri.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
            if (satis == null) return NotFound();

            _context.SatisVerileri.Remove(satis);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
