namespace FinGuard.API.Models;

public class Hesap
{
    public int Id { get; set; }
    public decimal ToplamBakiye { get; set; }
    public string ParaBirimi { get; set; }
    public DateTime SonGuncellenmeTarihi { get; set; }

    public int UserId { get; set; }
    public User User { get; set; }
}