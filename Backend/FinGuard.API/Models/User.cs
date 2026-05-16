using System.ComponentModel.DataAnnotations;

namespace FinGuard.API.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }
        
        public string Name { get; set; } = string.Empty;
        
        public string Email { get; set; } = string.Empty;
        public string? PasswordHash { get; set; }
        public string? GoogleSubjectId { get; set; }

        public string Role { get; set; } = "User";

        // Navigation properties
        public ICollection<Hesap> Hesaplar { get; set; } = new List<Hesap>();
        public ICollection<Fatura> Faturalar { get; set; } = new List<Fatura>();
    }
}
