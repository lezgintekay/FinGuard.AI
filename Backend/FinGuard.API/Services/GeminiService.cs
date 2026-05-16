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

        public async Task<string> AnalyzeRiskAsync(Hesap hesap, List<Fatura> faturalar, List<SatisVerisi> satislar)
        {
            // 1. PROMPT MÜHENDİSLİĞİ: Ajanın Rolünü ve Hedefini Belirliyoruz
            var promptBuilder = new StringBuilder();
            promptBuilder.AppendLine("Sen KOBİ'ler için çalışan uzman bir Finansal Kontrolörsün (CFO-Bot).");
            promptBuilder.AppendLine($"Şu an şirketin kasasında {hesap.ToplamBakiye} {hesap.ParaBirimi} bulunuyor.");
            var gidenler = faturalar.Where(f => f.FaturaTipi == "Giden").Sum(f => f.Tutar);
            var gelenler = faturalar.Where(f => f.FaturaTipi == "Gelen").Sum(f => f.Tutar);
            var netLikidite = hesap.ToplamBakiye + gelenler - gidenler;

            promptBuilder.AppendLine("Aşağıdaki geçmiş satış verilerini, gelecek borç/alacak faturalarını incele ve şirketin finansal sağlığını analiz et.");
            promptBuilder.AppendLine($"Eğer Net Likidite ({netLikidite} TL) eksiye düşüyorsa veya satışlarda dönemsel bir daralma varsa acil uyarı ver ve stratejik CFO tavsiyelerinde bulun (Kampanya, finansman vs).");
            
            promptBuilder.AppendLine("Lütfen SADECE aşağıdaki JSON formatında yanıt ver, ekstra hiçbir açıklama ekleme:");
            promptBuilder.AppendLine("{ \"RiskDurumu\": \"Kritik/Orta/Dusuk/Guvende\", \"AcikTutar\": 0, \"Mesaj\": \"...\", \"OnerilenAksiyon\": \"...\" }");
            
            promptBuilder.AppendLine("\n--- SON 5 YILLIK SATIŞ VERİLERİ ---");
            if (satislar != null && satislar.Any())
            {
                foreach (var s in satislar.OrderBy(x => x.Yil).ThenBy(x => x.Ay))
                {
                    promptBuilder.AppendLine($"{s.Yil} Yılı {s.Ay}. Ay: {s.ToplamSatis} TL");
                }
            }
            else
            {
                promptBuilder.AppendLine("Geçmiş satış verisi bulunmamaktadır.");
            }

            promptBuilder.AppendLine("\n--- BEKLEYEN FATURALAR (BORÇ VE ALACAKLAR) ---");
            foreach (var f in faturalar.Where(f => f.Durum != "Ödendi"))
            {
                var tipLabel = f.FaturaTipi == "Giden" ? "Borç (Ödenecek)" : "Alacak (Tahsil Edilecek)";
                promptBuilder.AppendLine($"- Tutar: {f.Tutar} TL | Vade: {f.VadeTarihi:yyyy-MM-dd} | Tip: {tipLabel} | Cari: {f.CariAd}");
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

// Listemizdeki ücretsiz kullanıma (Free Tier) en uygun ve hızlı model olan gemini-1.5-flash'ı kullanıyoruz
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={cleanApiKey}";

// 2. API'ye İstek Atma
            var response = await _httpClient.PostAsync(url, jsonContent);

// 3. HATA YAKALAMA (Google'ın asıl mesajını okuyoruz)
            if (!response.IsSuccessStatusCode)
            {
                // Kotası dolmuş veya hata almışsa uygulamanın çökmesini önleyip sahte (mock) veri dönüyoruz
                return "{ \"RiskDurumu\": \"Hata (Kota Doldu)\", \"AcikTutar\": 0, \"Mesaj\": \"Yapay zeka analiz API limitiniz (Gemini API) dolmuş görünüyor. Uygulamayı kullanmaya devam edebilirsiniz ancak yapay zeka analizleri şu an çalışmıyor.\", \"OnerilenAksiyon\": \"API Anahtarınızı yenileyin\", \"HedefFaturaID\": 0 }";
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