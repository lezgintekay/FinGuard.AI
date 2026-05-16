using FinGuard.API.Models;

namespace FinGuard.API.Services
{
    public interface IAiService
    {
        Task<string> AnalyzeRiskAsync(Hesap hesap, List<Fatura> faturalar, List<SatisVerisi> satislar);
        Task<string> ChatWithAgentAsync(int userId, string message);
    }
}
