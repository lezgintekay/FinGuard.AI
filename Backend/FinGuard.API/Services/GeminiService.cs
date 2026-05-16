using System.Text;
using System.Text.Json;
using FinGuard.API.Models;

namespace FinGuard.API.Services
{
    public class GeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GeminiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GeminiOptions:ApiKey"];
    
            // Sadece null değil, boş olup olmadığını da kontrol edelim
            if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey == "BURAYA_KOPYALADIGIN_API_ANAHTARINI_YAPISTIR")
            {
                throw new Exception("API Key geçersiz veya boş! Lütfen appsettings.Development.json dosyasını kontrol et.");
            }
        }

        public async Task<string> AnalyzeRiskAsync(Hesap hesap, List<Fatura> faturalar)
        {
            // 1. PROMPT MÜHENDİSLİĞİ: Ajanın Rolünü ve Hedefini Belirliyoruz
            var promptBuilder = new StringBuilder();
            promptBuilder.AppendLine("Sen KOBİ'ler için çalışan uzman bir Finansal Kontrolörsün (CFO-Bot).");
            promptBuilder.AppendLine($"Şu an şirketin kasasında {hesap.ToplamBakiye} {hesap.ParaBirimi} bulunuyor.");
            promptBuilder.AppendLine("Aşağıdaki faturaları incele ve önümüzdeki 30 gün içinde bir nakit darboğazı olup olmayacağını analiz et.");
            
            // Hackathon için kilit nokta: API'den sadece JSON istiyoruz!
            promptBuilder.AppendLine("Lütfen SADECE aşağıdaki JSON formatında yanıt ver, ekstra hiçbir karşılama veya açıklama metni ekleme:");
            promptBuilder.AppendLine("{ \"RiskDurumu\": \"Kritik/Orta/Dusuk\", \"AcikTutar\": 0, \"Mesaj\": \"...\", \"OnerilenAksiyon\": \"...\", \"HedefFaturaID\": 0 }");
            promptBuilder.AppendLine("\nSistemdeki Faturalar:");
            
            foreach (var f in faturalar)
            {
                promptBuilder.AppendLine($"- ID: {f.Id}, Fatura No: {f.FaturaNo}, Tutar: {f.Tutar}, Vade: {f.VadeTarihi:yyyy-MM-dd}, Tip: {f.FaturaTipi}, Durum: {f.Durum}");
            }

            // 2. İstek Gövdesini (Payload) Oluşturma
            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = promptBuilder.ToString() } } }
                }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            
            var cleanApiKey = _apiKey.Trim();

// Listemizdeki en stabil ve yetenekli modellerden biri olan gemini-2.5-flash'ı kullanıyoruz
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={cleanApiKey}";

// 2. API'ye İstek Atma
            var response = await _httpClient.PostAsync(url, jsonContent);

// 3. HATA YAKALAMA (Google'ın asıl mesajını okuyoruz)
            if (!response.IsSuccessStatusCode)
            {
                // Google'ın bize gönderdiği detaylı hata mesajını alıp ekrana yazdırıyoruz
                var errorDetail = await response.Content.ReadAsStringAsync();
                throw new Exception($"Gemini API Hatası: {(int)response.StatusCode} - {errorDetail}");
            }

// 4. Gelen Yanıtı İşleme (Eski kodlar aynı kalıyor)
            var responseString = await response.Content.ReadAsStringAsync();
            using var jsonDoc = JsonDocument.Parse(responseString);
            
            // Gemini API'nin karmaşık JSON yapısının içinden sadece bize dönen metni çekiyoruz
            var aiResponse = jsonDoc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            // Bazen AI yanıtın başına ve sonuna ```json tagleri koyar, onları temizleyelim
            return aiResponse?.Replace("```json", "").Replace("```", "").Trim();
        }
    }
}