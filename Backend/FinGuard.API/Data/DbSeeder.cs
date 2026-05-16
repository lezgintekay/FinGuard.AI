using FinGuard.API.Models;

namespace FinGuard.API.Data
{
    public static class DbSeeder
    {
        public static void SeedData(AppDbContext context)
        {
            // Eğer hesap yoksa, kasaya 50.000 TL koyalım
            if (!context.Hesaplar.Any())
            {
                context.Hesaplar.Add(new Hesap 
                { 
                    ToplamBakiye = 50000, 
                    ParaBirimi = "TRY", 
                    SonGuncellenmeTarihi = DateTime.Now 
                });
            }

            // Eğer fatura yoksa, ajanımızın analiz edeceği senaryoları girelim
            if (!context.Faturalar.Any())
            {
                context.Faturalar.AddRange(
                    // 1. Fatura: Ufak ve vadesine var, risk yaratmaz
                    new Fatura { FaturaNo = "FTR-001", CariAd = "ABC Lojistik", Tutar = 15000, KesimTarihi = DateTime.Now.AddDays(-10), VadeTarihi = DateTime.Now.AddDays(20), FaturaTipi = "Giden", Durum = "Bekliyor" },
                    
                    // 2. Fatura: KRİTİK! Vadesine çok az kalmış ve kasadaki paradan (50.000) çok daha büyük bir ödeme! Ajan bunu yakalamalı.
                    new Fatura { FaturaNo = "FTR-002", CariAd = "XYZ Hammadde", Tutar = 180000, KesimTarihi = DateTime.Now.AddDays(-5), VadeTarihi = DateTime.Now.AddDays(3), FaturaTipi = "Giden", Durum = "Bekliyor" }
                );
            }
            
            context.SaveChanges();
        }
    }
}