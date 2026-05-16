using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FinGuard.API.Models
{
    public class SatisVerisi
    {
        public int Id { get; set; }
        
        [Required]
        public int Yil { get; set; }
        
        [Required]
        [Range(1, 12)]
        public int Ay { get; set; }
        
        [Required]
        public decimal ToplamSatis { get; set; }

        public int UserId { get; set; }
        
        [JsonIgnore]
        public User? User { get; set; }
    }
}
