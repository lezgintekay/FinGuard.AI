namespace FinGuard.API.Models;

public class Fatura
{
        public int Id { get; set; }
        public string FaturaNo { get; set; }
        public string CariAd { get; set; }
        public decimal Tutar { get; set; }
        public DateTime KesimTarihi { get; set; }
        public DateTime VadeTarihi { get; set; }
        public string FaturaTipi { get; set; }
        public string Durum { get; set; } = "Bekliyor";

        public int UserId { get; set; }
        public User? User { get; set; }
}