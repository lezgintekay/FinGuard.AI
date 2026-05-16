using FinGuard.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FinGuard.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Veritabanında oluşacak tablolarımız
        public DbSet<Hesap> Hesaplar { get; set; }
        public DbSet<Fatura> Faturalar { get; set; }
    }
}