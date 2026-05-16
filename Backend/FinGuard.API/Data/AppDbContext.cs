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
        public DbSet<User> Users { get; set; }
        public DbSet<Hesap> Hesaplar { get; set; }
        public DbSet<Fatura> Faturalar { get; set; }
        public DbSet<SatisVerisi> SatisVerileri { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Hesap>()
                .HasOne(h => h.User)
                .WithMany(u => u.Hesaplar)
                .HasForeignKey(h => h.UserId);

            modelBuilder.Entity<Fatura>()
                .HasOne(f => f.User)
                .WithMany(u => u.Faturalar)
                .HasForeignKey(f => f.UserId);
        }
    }
}