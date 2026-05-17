using System.Text;
using System.Text.Json;
using FinGuard.API.Data;
using FinGuard.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FinGuard.API.Services
{
    public class GeminiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly IServiceScopeFactory _scopeFactory;

        public GeminiService(HttpClient httpClient, IConfiguration configuration, IServiceScopeFactory scopeFactory)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GeminiOptions:ApiKey"];
            _scopeFactory = scopeFactory;

            if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey == "BURAYA_KOPYALADIGIN_API_ANAHTARINI_YAPISTIR" || _apiKey == "YOUR_GEMINI_API_KEY_HERE")
            {
                throw new Exception("API Key geçersiz veya boş! Lütfen appsettings.Development.json dosyasını kontrol et.");
            }
        }

        // =====================================================================
        // YARDIMCI: Rate Limit (429) hatasında otomatik yeniden deneme
        // =====================================================================
        private async Task<HttpResponseMessage> SendWithRetryAsync(string url, StringContent content, int maxRetries = 3)
        {
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                var response = await _httpClient.PostAsync(url, content);

                if ((int)response.StatusCode == 429 && attempt < maxRetries)
                {
                    // Rate limit aşıldı — üstel bekleme ile yeniden dene
                    var waitSeconds = (int)Math.Pow(2, attempt); // 2s, 4s, 8s
                    await Task.Delay(waitSeconds * 1000);
                    // Content nesnesini yeniden oluştur (çünkü HttpContent sadece 1 kez gönderilebilir)
                    var body = await content.ReadAsStringAsync();
                    content = new StringContent(body, Encoding.UTF8, "application/json");
                    continue;
                }

                return response;
            }

            // Bu noktaya ulaşılmamalı ama güvenlik için
            return await _httpClient.PostAsync(url, content);
        }

        // =====================================================================
        // 1) RİSK ANALİZİ (mevcut, değişiklik yok)
        // =====================================================================
        public async Task<string> AnalyzeRiskAsync(Hesap hesap, List<Fatura> faturalar, List<SatisVerisi> satislar)
        {
            faturalar ??= new List<Fatura>();
            satislar ??= new List<SatisVerisi>();

            if (!faturalar.Any() && !satislar.Any())
            {
                return "{ \"RiskDurumu\": \"Guvende\", \"AcikTutar\": 0, \"Mesaj\": \"FinGuard.AI'a hoş geldiniz! Analizlerin başlayabilmesi için lütfen 'Faturalar' sekmesinden ilk faturanızı ekleyin veya 'Bot Ayarları'ndan geçmiş satış verilerinizi girin. CFO-Bot verilerinizi otonom olarak izlemek için beklemektedir.\", \"OnerilenAksiyon\": \"İlk faturanızı ekleyin veya satış verisi tanımlayın.\" }";
            }

            var promptBuilder = new StringBuilder();
            promptBuilder.AppendLine("Sen KOBİ'ler için çalışan uzman bir Finansal Kontrolörsün (CFO-Bot).");
            promptBuilder.AppendLine($"Şu an şirketin kasasında {hesap.ToplamBakiye} {hesap.ParaBirimi} bulunuyor.");
            var gidenler = faturalar.Where(f => f.FaturaTipi == "Giden").Sum(f => f.Tutar);
            var gelenler = faturalar.Where(f => f.FaturaTipi == "Gelen").Sum(f => f.Tutar);
            var netLikidite = hesap.ToplamBakiye + gelenler - gidenler;

            promptBuilder.AppendLine("Aşağıdaki geçmiş satış verilerini, gelecek borç/alacak faturalarını incele ve şirketin finansal sağlığını analiz et.");
            promptBuilder.AppendLine($"Eğer Net Likidite ({netLikidite} TL) eksiye düşüyorsa veya satışlarda dönemsel bir daralma varsa acil uyarı ver ve stratejik CFO tavsiyelerinde bulun (Kampanya, finansman vs).");
            promptBuilder.AppendLine("KURAL: Eğer giden (borç) faturası hiç yoksa veya kasa bakiyesi + alacaklar (gelen faturalar) toplamı, borçların 3 katından fazla ise RiskDurumu kesinlikle 'Guvende' olmalıdır. Borç yokken veya kasa bakiyesi bu kadar yüksekken asla durumu 'Kritik' veya 'Orta' yapma, her şeyin mükemmel olduğunu belirt.");
            
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

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = promptBuilder.ToString() } } }
                }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var cleanApiKey = _apiKey.Trim();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={cleanApiKey}";

            var response = await SendWithRetryAsync(url, jsonContent);

            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[GEMINI RISK HATA] Status: {response.StatusCode} | Body: {errBody}");
                
                // Return a valid JSON with the actual error detail inside the "Mesaj" field
                var safeErrBody = errBody.Replace("\"", "\\\"").Replace("\n", " ").Replace("\r", "").Trim();
                return $"{{\"RiskDurumu\": \"Hata ({response.StatusCode})\", \"AcikTutar\": 0, \"Mesaj\": \"Gemini API Hatası: {safeErrBody}\", \"OnerilenAksiyon\": \"Lütfen appsettings.Development.json içerisindeki ApiKey anahtarınızı ve console loglarını kontrol edin.\", \"HedefFaturaID\": 0}}";
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var jsonDoc = JsonDocument.Parse(responseString);
            
            var aiResponse = jsonDoc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            // Bazen AI yanıtın başına ve sonuna ```json tagleri koyar, onları temizleyelim
            return aiResponse?.Replace("```json", "").Replace("```", "").Trim();
        }

        // =====================================================================
        // 2) AGENTİC CHATBOT — Function Calling ile Otonom İşlem Yapabilir
        // =====================================================================
        public async Task<string> ChatWithAgentAsync(int userId, string message)
        {
            // --- Kullanıcının güncel finansal verilerini çekiyoruz (Context) ---
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var hesap = await context.Hesaplar.FirstOrDefaultAsync(h => h.UserId == userId);
            var faturalar = await context.Faturalar.Where(f => f.UserId == userId).ToListAsync();
            var satislar = await context.SatisVerileri.Where(s => s.UserId == userId).ToListAsync();

            // --- Sistem Promptu: Ajanın kimliğini ve bağlamını belirliyoruz ---
            var systemPrompt = new StringBuilder();
            systemPrompt.AppendLine("Sen FinGuard AI platformunda çalışan otonom bir CFO-Bot (Finansal Kontrolör Ajanı) yapay zekasısın.");
            systemPrompt.AppendLine("Kullanıcı sana finansal sorular soracak veya veritabanında işlem yapmanı isteyecek.");
            systemPrompt.AppendLine("Eğer kullanıcı bir faturanın vadesini uzatmak, durumunu güncellemek, taksit ödemek, kasa bakiyesini değiştirmek veya tahsilat başlatmak isterse, sana verilen fonksiyonları (tools) kullanarak bu işlemi otonom olarak gerçekleştir.");
            systemPrompt.AppendLine("Kullanıcı sana 'What-If' veya 'Eğer şöyle olursa' tarzında senaryolar sorarsa, mevcut faturaları ve nakit durumunu analiz edip tahmini bir senaryo sonucu (nakit açığı/fazlası) oluştur ve stratejik bir CFO tavsiyesi ver.");
            systemPrompt.AppendLine("Yanıtlarını Türkçe ver ve profesyonel bir CFO gibi konuş.");
            systemPrompt.AppendLine($"\n--- MEVCUT FİNANSAL DURUM ---");
            systemPrompt.AppendLine($"Kasa Nakit Mevcudu: {hesap?.ToplamBakiye ?? 0} {hesap?.ParaBirimi ?? "TRY"}");

            if (faturalar.Any())
            {
                systemPrompt.AppendLine("\n--- SİSTEMDEKİ FATURALAR ---");
                foreach (var f in faturalar)
                {
                    var taksitInfo = f.TaksitliMi ? $"Taksitli({f.OdenenTaksit}/{f.ToplamTaksit} ödendi, taksit başı {(f.Tutar / f.ToplamTaksit):N2} TL)" : "Peşin";
                    systemPrompt.AppendLine($"ID:{f.Id} | No:{f.FaturaNo} | Cari:{f.CariAd} | Tutar:{f.Tutar} TL | Vade:{f.VadeTarihi:yyyy-MM-dd} | Tip:{f.FaturaTipi} | Durum:{f.Durum} | Ödeme:{taksitInfo}");
                }
            }

            if (satislar.Any())
            {
                var sonSatislar = satislar.OrderByDescending(s => s.Yil).ThenByDescending(s => s.Ay).Take(12);
                systemPrompt.AppendLine("\n--- SON 12 AYLIK SATIŞ VERİLERİ ---");
                foreach (var s in sonSatislar)
                {
                    systemPrompt.AppendLine($"{s.Yil}/{s.Ay}: {s.ToplamSatis} TL");
                }
            }

            // --- Gemini API İsteği: Function Calling (Tools) tanımlamaları ---
            var requestBody = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemPrompt.ToString() } }
                },
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = message } }
                    }
                },
                tools = new[]
                {
                    new
                    {
                        function_declarations = new object[]
                        {
                            new
                            {
                                name = "fatura_vade_uzat",
                                description = "Belirtilen faturanın vade tarihini istenilen gün sayısı kadar ileri erteler. Örn: 'FTR-001 faturasının vadesini 15 gün uzat'",
                                parameters = new
                                {
                                    type = "object",
                                    properties = new
                                    {
                                        fatura_no = new { type = "string", description = "Vade tarihi uzatılacak faturanın numarası (Örn: FTR-001)" },
                                        gun_sayisi = new { type = "integer", description = "Vade tarihinin kaç gün ileri alınacağı" }
                                    },
                                    required = new[] { "fatura_no", "gun_sayisi" }
                                }
                            },
                            new
                            {
                                name = "fatura_durum_guncelle",
                                description = "Belirtilen faturanın ödeme durumunu günceller. Durum 'Ödendi', 'Bekliyor' veya 'İptal' olabilir.",
                                parameters = new
                                {
                                    type = "object",
                                    properties = new
                                    {
                                        fatura_no = new { type = "string", description = "Durumu güncellenecek faturanın numarası" },
                                        yeni_durum = new { type = "string", description = "Yeni durum. 'Ödendi', 'Bekliyor' veya 'İptal' olabilir.", @enum = new[] { "Ödendi", "Bekliyor", "İptal" } }
                                    },
                                    required = new[] { "fatura_no", "yeni_durum" }
                                }
                            },
                            new
                            {
                                name = "kasa_bakiye_guncelle",
                                description = "Şirketin kasa nakit mevcudunu günceller.",
                                parameters = new
                                {
                                    type = "object",
                                    properties = new
                                    {
                                        yeni_bakiye = new { type = "number", description = "Kasanın yeni bakiye tutarı (TL cinsinden)" }
                                    },
                                    required = new[] { "yeni_bakiye" }
                                }
                            },
                            new
                            {
                                name = "taksit_ode",
                                description = "Taksitli bir faturanın bir sonraki taksitini ödenmiş olarak işaretler. Ödenen taksit sayısını 1 artırır. Tüm taksitler ödendiyse faturayı 'Ödendi' olarak işaretler.",
                                parameters = new
                                {
                                    type = "object",
                                    properties = new
                                    {
                                        fatura_no = new { type = "string", description = "Taksiti ödenecek faturanın numarası" }
                                    },
                                    required = new[] { "fatura_no" }
                                }
                            },
                            new
                            {
                                name = "tahsilat_baslat",
                                description = "Gecikmiş veya vadesi yaklaşan bir fatura için otonom tahsilat sürecini başlatır. Tahsilat e-posta taslağı ve ödeme linki üretir.",
                                parameters = new
                                {
                                    type = "object",
                                    properties = new
                                    {
                                        fatura_no = new { type = "string", description = "Tahsilatı başlatılacak faturanın numarası" }
                                    },
                                    required = new[] { "fatura_no" }
                                }
                            }
                        }
                    }
                }
            };

            var cleanApiKey = _apiKey.Trim();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={cleanApiKey}";
            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await SendWithRetryAsync(url, jsonContent);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[GEMINI HATA] Status: {response.StatusCode} | Body: {errorBody}");
                return $"⚠️ Gemini API hatası ({response.StatusCode}): {errorBody}";
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var jsonDoc = JsonDocument.Parse(responseString);

            var candidate = jsonDoc.RootElement.GetProperty("candidates")[0];
            var parts = candidate.GetProperty("content").GetProperty("parts");
            var firstPart = parts[0];

            // --- Gemini bir fonksiyon çağırmak istiyor mu kontrol ediyoruz ---
            if (firstPart.TryGetProperty("functionCall", out var functionCall))
            {
                var funcName = functionCall.GetProperty("name").GetString();
                var args = functionCall.GetProperty("args");

                string functionResult = await ExecuteFunctionAsync(userId, funcName!, args, context);

                // --- Fonksiyon sonucunu Gemini'ye geri besliyoruz ---
                var followUpBody = new
                {
                    system_instruction = new
                    {
                        parts = new[] { new { text = systemPrompt.ToString() } }
                    },
                    contents = new object[]
                    {
                        new { role = "user", parts = new[] { new { text = message } } },
                        new
                        {
                            role = "model",
                            parts = new[]
                            {
                                new
                                {
                                    functionCall = new
                                    {
                                        name = funcName,
                                        args = JsonSerializer.Deserialize<Dictionary<string, object>>(args.GetRawText())
                                    }
                                }
                            }
                        },
                        new
                        {
                            role = "function",
                            parts = new[]
                            {
                                new
                                {
                                    functionResponse = new
                                    {
                                        name = funcName,
                                        response = new { result = functionResult }
                                    }
                                }
                            }
                        }
                    },
                    tools = requestBody.tools
                };

                var followUpContent = new StringContent(JsonSerializer.Serialize(followUpBody), Encoding.UTF8, "application/json");
                var followUpResponse = await _httpClient.PostAsync(url, followUpContent);

                if (followUpResponse.IsSuccessStatusCode)
                {
                    var followUpString = await followUpResponse.Content.ReadAsStringAsync();
                    using var followUpDoc = JsonDocument.Parse(followUpString);
                    var finalText = followUpDoc.RootElement
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString();
                    return finalText ?? functionResult;
                }

                return functionResult;
            }

            // --- Normal metin yanıtı (fonksiyon çağrısı yoksa) ---
            if (firstPart.TryGetProperty("text", out var textProp))
            {
                return textProp.GetString() ?? "Yanıt alınamadı.";
            }

            return "Beklenmeyen bir yanıt formatı alındı.";
        }

        // =====================================================================
        // 3) FONKSİYON YÜRÜTÜCÜ — Gemini'nin çağırdığı fonksiyonları çalıştırır
        // =====================================================================
        private async Task<string> ExecuteFunctionAsync(int userId, string functionName, JsonElement args, AppDbContext context)
        {
            switch (functionName)
            {
                case "fatura_vade_uzat":
                {
                    var faturaNo = args.GetProperty("fatura_no").GetString();
                    var gunSayisi = args.GetProperty("gun_sayisi").GetInt32();

                    var fatura = await context.Faturalar
                        .FirstOrDefaultAsync(f => f.FaturaNo == faturaNo && f.UserId == userId);

                    if (fatura == null)
                        return $"Hata: '{faturaNo}' numaralı fatura bulunamadı.";

                    var eskiVade = fatura.VadeTarihi;
                    fatura.VadeTarihi = fatura.VadeTarihi.AddDays(gunSayisi);
                    await context.SaveChangesAsync();

                    return $"Başarılı: '{faturaNo}' numaralı faturanın vadesi {eskiVade:dd.MM.yyyy} tarihinden {fatura.VadeTarihi:dd.MM.yyyy} tarihine ({gunSayisi} gün) uzatıldı.";
                }
                case "fatura_durum_guncelle":
                {
                    var faturaNo = args.GetProperty("fatura_no").GetString();
                    var yeniDurum = args.GetProperty("yeni_durum").GetString();

                    var fatura = await context.Faturalar
                        .FirstOrDefaultAsync(f => f.FaturaNo == faturaNo && f.UserId == userId);

                    if (fatura == null)
                        return $"Hata: '{faturaNo}' numaralı fatura bulunamadı.";

                    var eskiDurum = fatura.Durum;
                    fatura.Durum = yeniDurum!;
                    await context.SaveChangesAsync();

                    return $"Başarılı: '{faturaNo}' numaralı faturanın durumu '{eskiDurum}' → '{yeniDurum}' olarak güncellendi.";
                }
                case "kasa_bakiye_guncelle":
                {
                    var yeniBakiye = args.GetProperty("yeni_bakiye").GetDecimal();

                    var hesap = await context.Hesaplar
                        .FirstOrDefaultAsync(h => h.UserId == userId);

                    if (hesap == null)
                        return "Hata: Hesap bilgisi bulunamadı.";

                    var eskiBakiye = hesap.ToplamBakiye;
                    hesap.ToplamBakiye = yeniBakiye;
                    hesap.SonGuncellenmeTarihi = DateTime.Now;
                    await context.SaveChangesAsync();

                    return $"Başarılı: Kasa bakiyesi {eskiBakiye:N2} TL → {yeniBakiye:N2} TL olarak güncellendi.";
                }
                case "taksit_ode":
                {
                    var faturaNo = args.GetProperty("fatura_no").GetString();

                    var fatura = await context.Faturalar
                        .FirstOrDefaultAsync(f => f.FaturaNo == faturaNo && f.UserId == userId);

                    if (fatura == null)
                        return $"Hata: '{faturaNo}' numaralı fatura bulunamadı.";

                    if (!fatura.TaksitliMi)
                        return $"Hata: '{faturaNo}' numaralı fatura taksitli değil, peşin bir faturadır.";

                    if (fatura.OdenenTaksit >= fatura.ToplamTaksit)
                        return $"Hata: '{faturaNo}' numaralı faturanın tüm taksitleri zaten ödenmiş.";

                    fatura.OdenenTaksit++;
                    var taksitTutari = fatura.Tutar / fatura.ToplamTaksit;

                    if (fatura.OdenenTaksit >= fatura.ToplamTaksit)
                    {
                        fatura.Durum = "Ödendi";
                        await context.SaveChangesAsync();
                        return $"Başarılı: '{faturaNo}' faturasının son taksiti ({fatura.OdenenTaksit}/{fatura.ToplamTaksit}) ödendi! Taksit tutarı: {taksitTutari:N2} TL. Fatura tamamen kapatıldı.";
                    }

                    await context.SaveChangesAsync();
                    return $"Başarılı: '{faturaNo}' faturasının {fatura.OdenenTaksit}. taksiti ödendi ({fatura.OdenenTaksit}/{fatura.ToplamTaksit}). Taksit tutarı: {taksitTutari:N2} TL. Kalan taksit: {fatura.ToplamTaksit - fatura.OdenenTaksit}";
                }
                case "tahsilat_baslat":
                {
                    var faturaNo = args.GetProperty("fatura_no").GetString();

                    var fatura = await context.Faturalar
                        .FirstOrDefaultAsync(f => f.FaturaNo == faturaNo && f.UserId == userId);

                    if (fatura == null)
                        return $"Hata: '{faturaNo}' numaralı fatura bulunamadı.";

                    if (fatura.Durum == "Ödendi")
                        return $"Hata: '{faturaNo}' numaralı fatura zaten ödenmiş durumda, tahsilat başlatılamaz.";

                    // Tahsilat için e-posta taslağı ve simüle edilmiş link oluştur
                    var odemeLinki = $"https://pay.finguard.ai/checkout/inv-{Guid.NewGuid().ToString().Substring(0,8)}";
                    
                    return $@"Başarılı: '{faturaNo}' numaralı {fatura.CariAd} faturası için tahsilat süreci başlatıldı. 
                    
Aşağıdaki e-posta taslağı ve ödeme linki hazırlandı:

**Kime:** muhasebe@{fatura.CariAd.ToLower().Replace(" ", "").Replace(".", "").Replace("ş","s").Replace("ı","i")}.com
**Konu:** {faturaNo} Nolu Fatura Ödeme Hatırlatması
**Mesaj:** 
Sayın İlgili,
Kayıtlarımıza göre {fatura.VadeTarihi:dd.MM.yyyy} vadeli, {fatura.Tutar:N2} TL tutarındaki faturanızın ödemesi henüz tarafımıza ulaşmamıştır. Ödemenizi aşağıdaki güvenli ödeme linki üzerinden kredi kartınızla hızlıca gerçekleştirebilirsiniz:

Hızlı Ödeme Linki: {odemeLinki}

FinGuard Otonom Tahsilat Sistemi";
                }
                default:
                    return $"Hata: Bilinmeyen fonksiyon: {functionName}";
            }
        }
    }
}