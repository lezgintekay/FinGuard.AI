using FinGuard.API.Models;

namespace FinGuard.API.Data
{
    public static class DbSeeder
    {
        public static void SeedData(AppDbContext context)
        {
            // Seed Users
            if (!context.Users.Any())
            {
                context.Users.AddRange(
                    new User { Id = 1, Name = "Lezgin Tekay", Email = "lezgin@test.com", Role = "Admin", PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456") },
                    new User { Id = 2, Name = "Ahmet Yılmaz", Email = "ahmet@test.com", Role = "Test User", PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456") },
                    new User { Id = 3, Name = "Ayşe Demir", Email = "ayse@test.com", Role = "Test User", PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456") }
                );
                context.SaveChanges();
            }

            // Seed Hesaplar
            if (!context.Hesaplar.Any())
            {
                context.Hesaplar.AddRange(
                    new Hesap { ToplamBakiye = 50000, ParaBirimi = "TRY", SonGuncellenmeTarihi = DateTime.Now, UserId = 1 },
                    new Hesap { ToplamBakiye = 10000, ParaBirimi = "TRY", SonGuncellenmeTarihi = DateTime.Now, UserId = 2 }, // Low cash
                    new Hesap { ToplamBakiye = 500000, ParaBirimi = "TRY", SonGuncellenmeTarihi = DateTime.Now, UserId = 3 } // High cash
                );
                context.SaveChanges();
            }

            // Seed Faturalar (Taksitli ve Peşin karışık)
            if (!context.Faturalar.Any())
            {
                context.Faturalar.AddRange(
                    // === User 1: Admin ===
                    // Peşin fatura
                    new Fatura { FaturaNo = "FTR-001", CariAd = "ABC Lojistik", Tutar = 15000, KesimTarihi = DateTime.Now.AddDays(-10), VadeTarihi = DateTime.Now.AddDays(20), FaturaTipi = "Giden", Durum = "Bekliyor", TaksitliMi = false, ToplamTaksit = 1, OdenenTaksit = 0, UserId = 1 },
                    // 6 taksitli fatura — 2 taksit ödenmiş
                    new Fatura { FaturaNo = "FTR-002", CariAd = "XYZ Hammadde", Tutar = 30000, KesimTarihi = DateTime.Now.AddDays(-60), VadeTarihi = DateTime.Now.AddDays(3), FaturaTipi = "Giden", Durum = "Bekliyor", TaksitliMi = true, ToplamTaksit = 6, OdenenTaksit = 2, UserId = 1 },
                    // 3 taksitli alacak faturası — 1 taksit tahsil edilmiş
                    new Fatura { FaturaNo = "FTR-003", CariAd = "DEF Müşteri", Tutar = 45000, KesimTarihi = DateTime.Now.AddDays(-30), VadeTarihi = DateTime.Now.AddDays(10), FaturaTipi = "Gelen", Durum = "Bekliyor", TaksitliMi = true, ToplamTaksit = 3, OdenenTaksit = 1, UserId = 1 },
                    
                    // === User 2: Scenario A - Critical Risk ===
                    // 12 taksitli dev fatura — sadece 1 taksit ödenmiş
                    new Fatura { FaturaNo = "FTR-101", CariAd = "Tedarikçi AŞ", Tutar = 180000, KesimTarihi = DateTime.Now.AddDays(-15), VadeTarihi = DateTime.Now.AddDays(2), FaturaTipi = "Giden", Durum = "Bekliyor", TaksitliMi = true, ToplamTaksit = 12, OdenenTaksit = 1, UserId = 2 },
                    // Peşin kira faturası
                    new Fatura { FaturaNo = "FTR-102", CariAd = "Kira", Tutar = 25000, KesimTarihi = DateTime.Now.AddDays(-5), VadeTarihi = DateTime.Now.AddDays(5), FaturaTipi = "Giden", Durum = "Bekliyor", TaksitliMi = false, ToplamTaksit = 1, OdenenTaksit = 0, UserId = 2 },
                    
                    // === User 3: Scenario B - Safe ===
                    // Peşin küçük fatura
                    new Fatura { FaturaNo = "FTR-201", CariAd = "Ofis Kırtasiye", Tutar = 5000, KesimTarihi = DateTime.Now.AddDays(-10), VadeTarihi = DateTime.Now.AddDays(15), FaturaTipi = "Giden", Durum = "Bekliyor", TaksitliMi = false, ToplamTaksit = 1, OdenenTaksit = 0, UserId = 3 },
                    // 4 taksitli, 3'ü ödenmiş (neredeyse bitmek üzere)
                    new Fatura { FaturaNo = "FTR-202", CariAd = "Danışmanlık", Tutar = 20000, KesimTarihi = DateTime.Now.AddDays(-90), VadeTarihi = DateTime.Now.AddDays(25), FaturaTipi = "Giden", Durum = "Bekliyor", TaksitliMi = true, ToplamTaksit = 4, OdenenTaksit = 3, UserId = 3 }
                );
                context.SaveChanges();
            }

            // Seed Satis Verileri (Son 5 yıl - Basit bir simülasyon)
            if (!context.SatisVerileri.Any())
            {
                var sales = new List<SatisVerisi>();
                var currentYear = DateTime.Now.Year;
                var random = new Random();

                for (int userId = 1; userId <= 3; userId++)
                {
                    for (int year = currentYear - 5; year <= currentYear; year++)
                    {
                        // Sadece geçmiş ayları veya mevcut ayı ekle
                        int maxMonth = (year == currentYear) ? DateTime.Now.Month : 12;
                        
                        for (int month = 1; month <= maxMonth; month++)
                        {
                            // Yaz aylarında (6,7,8) düşüş trendi simülasyonu
                            decimal baseSales = (userId == 2) ? 100000 : 250000; // Kullanıcı 2'nin satışları daha düşük
                            decimal seasonalMultiplier = (month >= 6 && month <= 8) ? 0.6m : 1.1m;
                            decimal randomFactor = (decimal)(random.NextDouble() * 0.4 + 0.8); // 0.8 ile 1.2 arası
                            
                            sales.Add(new SatisVerisi 
                            { 
                                Yil = year, 
                                Ay = month, 
                                ToplamSatis = Math.Round(baseSales * seasonalMultiplier * randomFactor, 2),
                                UserId = userId 
                            });
                        }
                    }
                }
                context.SatisVerileri.AddRange(sales);
                context.SaveChanges();
            }
        }
    }
}