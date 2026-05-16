using FinGuard.API.Data;
using FinGuard.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Google.Apis.Auth;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.ComponentModel.DataAnnotations;

namespace FinGuard.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("Name", user.Name),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(24),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public class RegisterRequest
        {
            [Required(ErrorMessage = "Ad Soyad gereklidir.")]
            public string Name { get; set; }
            
            [Required(ErrorMessage = "E-posta gereklidir.")]
            [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
            public string Email { get; set; }
            
            [Required(ErrorMessage = "Şifre gereklidir.")]
            [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır.")]
            public string Password { get; set; }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest("Bu e-posta adresi zaten kullanılıyor.");
            }

            var user = new User
            {
                Name = request.Name,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "User"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Kasa verelim
            var hesap = new Hesap
            {
                ToplamBakiye = 50000,
                ParaBirimi = "TRY",
                SonGuncellenmeTarihi = DateTime.Now,
                UserId = user.Id
            };
            _context.Hesaplar.Add(hesap);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return Ok(new { token, user = new { id = user.Id, name = user.Name, email = user.Email, role = user.Role } });
        }

        public class LoginRequest
        {
            [Required(ErrorMessage = "E-posta gereklidir.")]
            [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
            public string Email { get; set; }
            
            [Required(ErrorMessage = "Şifre gereklidir.")]
            public string Password { get; set; }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            
            if (user == null || user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized("Geçersiz e-posta veya şifre.");
            }

            var token = GenerateJwtToken(user);
            return Ok(new { token, user = new { id = user.Id, name = user.Name, email = user.Email, role = user.Role } });
        }

        public class GoogleLoginRequest
        {
            [Required(ErrorMessage = "Token gereklidir.")]
            public string Token { get; set; }
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            try
            {
                // Validate Google Token
                var payload = await GoogleJsonWebSignature.ValidateAsync(request.Token);

                var user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleSubjectId == payload.Subject || u.Email == payload.Email);

                if (user == null)
                {
                    // Register new user from Google
                    user = new User
                    {
                        Name = payload.Name,
                        Email = payload.Email,
                        GoogleSubjectId = payload.Subject,
                        Role = "User"
                    };
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();

                    var hesap = new Hesap
                    {
                        ToplamBakiye = 50000,
                        ParaBirimi = "TRY",
                        SonGuncellenmeTarihi = DateTime.Now,
                        UserId = user.Id
                    };
                    _context.Hesaplar.Add(hesap);
                    await _context.SaveChangesAsync();
                }
                else if (user.GoogleSubjectId == null)
                {
                    // Link existing account
                    user.GoogleSubjectId = payload.Subject;
                    await _context.SaveChangesAsync();
                }

                var jwt = GenerateJwtToken(user);
                return Ok(new { token = jwt, user = new { id = user.Id, name = user.Name, email = user.Email, role = user.Role } });
            }
            catch (InvalidJwtException)
            {
                return Unauthorized("Geçersiz Google Token.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Google girişi sırasında bir hata oluştu: " + ex.Message);
            }
        }
    }
}
