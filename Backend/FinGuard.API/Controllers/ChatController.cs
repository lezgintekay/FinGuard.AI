using FinGuard.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace FinGuard.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IAiService _aiService;

        public ChatController(IAiService aiService)
        {
            _aiService = aiService;
        }

        public class ChatRequest
        {
            [Required(ErrorMessage = "Mesaj boş olamaz.")]
            public string Message { get; set; } = "";
        }

        /// <summary>
        /// Kullanıcıdan gelen mesajı Gemini Function Calling (Agentic) API'ye iletir.
        /// Gemini gerekirse fatura erteleme, durum güncelleme gibi otonom işlemler yapar.
        /// </summary>
        [HttpPost("message")]
        public async Task<IActionResult> SendMessage([FromBody] ChatRequest request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out int userId)) return Unauthorized();

            try
            {
                var aiResponse = await _aiService.ChatWithAgentAsync(userId, request.Message);
                return Ok(new { response = aiResponse });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { response = $"CFO-Bot hata verdi: {ex.Message}" });
            }
        }
    }
}
