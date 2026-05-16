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
    public class HesapController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HesapController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetHesap()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var hesap = await _context.Hesaplar.FirstOrDefaultAsync(h => h.UserId == userId);
            if (hesap == null) return NotFound();

            return Ok(hesap);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateBakiye([FromBody] decimal yeniBakiye)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            var hesap = await _context.Hesaplar.FirstOrDefaultAsync(h => h.UserId == userId);
            if (hesap == null) return NotFound();

            hesap.ToplamBakiye = yeniBakiye;
            hesap.SonGuncellenmeTarihi = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(hesap);
        }
    }
}
