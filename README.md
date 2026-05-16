# 🛡️ FinGuard.AI — Otonom KOBİ Finansal Kontrolör (CFO-Bot)

> **BTK Akademi Hackathon 2026** — Finans Temalı Yapay Zeka Uygulaması  
> Gemini 2.0 Flash + Function Calling (Agentic AI)

---

## 📋 Proje Özeti

**FinGuard.AI**, küçük ve orta ölçekli işletmelerin (KOBİ) nakit akışını analiz eden, fatura ve borç/alacak yönetimini yapay zeka desteğiyle otonom hale getiren bir **CFO-Bot (Finansal Kontrolör Ajanı)** platformudur.

Yapay zeka sadece analiz yapmakla kalmaz, aynı zamanda **Function Calling** özelliği sayesinde fatura vadelerini uzatabilir, durum güncelleyebilir ve kasa bakiyesini değiştirebilir — tamamen otonom bir şekilde.

### 🎯 Çözdüğü Problem
Türkiye'de KOBİ'lerin **%68'i** nakit akışı sorunları yaşıyor. FinGuard.AI, gelecek borç ve alacakları analiz edip nakit sıkışıklığını **önceden tespit eder** ve işletme sahibine stratejik önerilerde bulunur.

---

## ✨ Temel Özellikler

| Özellik | Açıklama |
|---|---|
| 🤖 **Agentic CFO-Bot** | Gemini 2.0 Flash + Function Calling ile otonom fatura/kasa işlemleri |
| 📊 **Finansal Dashboard** | Kasa bakiyesi, borç/alacak analizi, satış trendi grafikleri |
| 💬 **Sohbet Arayüzü** | Chatbot ile doğal dilde finansal soru sorma ve işlem yapma |
| 🧾 **Fatura Yönetimi** | CRUD işlemleri, vade takibi, durum güncelleme |
| 📈 **Satış Analizi** | Son 5 yıllık satış verisi takibi ve trend görselleştirmesi |
| 🔐 **JWT Kimlik Doğrulama** | Güvenli oturum yönetimi + Google OAuth desteği |
| 🎭 **Test Senaryoları** | 3 farklı kullanıcı profili (Admin, Kritik Risk, Güvenli) |

---

## 🏗️ Mimari ve Teknoloji Yığını

```
┌─────────────────────────────────┐
│         Frontend (React)        │
│  Vite + Recharts + Axios        │
└──────────────┬──────────────────┘
               │ REST API (JWT)
┌──────────────▼──────────────────┐
│     Backend (.NET 8 Web API)    │
│  Controllers → Services → DB   │
│                                 │
│  ┌───────────────────────────┐  │
│  │     GeminiService         │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  Function Calling   │  │  │
│  │  │  • fatura_vade_uzat │  │  │
│  │  │  • fatura_durum_güncelle│ │
│  │  │  • kasa_bakiye_güncelle │ │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│      SQLite Database            │
│  Users, Hesaplar, Faturalar,    │
│  SatisVerileri                  │
└─────────────────────────────────┘
               │
┌──────────────▼──────────────────┐
│    Google Gemini 2.0 Flash API  │
│    (Generative AI + Tools)      │
└─────────────────────────────────┘
```

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- [Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Backend
```bash
cd Backend/FinGuard.API

# appsettings.Development.json dosyasına Gemini API Key'inizi ekleyin
# "GeminiOptions": { "ApiKey": "SIZIN_API_KEYINIZ" }

dotnet run --urls "http://localhost:5155"
```

### 2. Frontend
```bash
cd Frontend
npm install
npm run dev
```

### 3. Tarayıcıdan Erişim
`http://localhost:5173` adresini açın ve test kullanıcılarından biriyle giriş yapın:

| Kullanıcı | E-posta | Şifre | Senaryo |
|---|---|---|---|
| Lezgin Tekay (Admin) | lezgin@test.com | 123456 | Normal |
| Ahmet Yılmaz | ahmet@test.com | 123456 | Kritik Risk (10K kasa, 205K borç) |
| Ayşe Demir | ayse@test.com | 123456 | Güvenli (500K kasa, 25K borç) |

---

## 🤖 Agentic Yapı (Function Calling)

FinGuard.AI'ın en güçlü özelliği **otonom ajan** yapısıdır. CFO-Bot sadece metin üretmez, veritabanında gerçek işlemler yapabilir:

### Desteklenen Otonom Fonksiyonlar

| Fonksiyon | Açıklama | Örnek Komut |
|---|---|---|
| `fatura_vade_uzat` | Fatura vadesini X gün ileri alır | *"FTR-001 faturasının vadesini 15 gün uzat"* |
| `fatura_durum_guncelle` | Fatura durumunu değiştirir | *"FTR-002'yi ödendi olarak işaretle"* |
| `kasa_bakiye_guncelle` | Kasa nakit mevcudunu günceller | *"Kasa bakiyemi 75.000 TL yap"* |

### Nasıl Çalışır?

```
Kullanıcı: "FTR-001 faturasının vadesini 10 gün uzat"
    ↓
Gemini API: functionCall { name: "fatura_vade_uzat", args: { fatura_no: "FTR-001", gun_sayisi: 10 } }
    ↓
GeminiService: Veritabanında fatura güncellenir
    ↓
Gemini API: "FTR-001 numaralı faturanın vadesi başarıyla 10 gün uzatıldı."
    ↓
Kullanıcıya final mesaj gösterilir
```

---

## 📂 Proje Yapısı

```
FinGuard.AI/
├── Backend/
│   └── FinGuard.API/
│       ├── Controllers/
│       │   ├── AnalysisController.cs   # Risk analizi endpoint'i
│       │   ├── AuthController.cs       # JWT + Google OAuth
│       │   ├── ChatController.cs       # Agentic chatbot endpoint'i
│       │   ├── FaturaController.cs     # Fatura CRUD
│       │   └── SatisController.cs      # Satış verisi CRUD
│       ├── Services/
│       │   ├── IAiService.cs           # AI servis arayüzü
│       │   └── GeminiService.cs        # Gemini + Function Calling
│       ├── Models/
│       │   ├── User.cs, Hesap.cs, Fatura.cs, SatisVerisi.cs
│       ├── Data/
│       │   ├── AppDbContext.cs         # Entity Framework Context
│       │   └── DbSeeder.cs            # Test verileri
│       └── Program.cs                 # Uygulama giriş noktası
├── Frontend/
│   └── src/
│       ├── App.jsx                    # Ana uygulama + Dashboard
│       ├── LoginPage.jsx              # Giriş ekranı
│       ├── RegisterPage.jsx           # Kayıt ekranı
│       └── index.css                  # Tasarım sistemi
└── README.md
```

---

## 👨‍💻 Geliştirici

**Lezgin Tekay**  
BTK Akademi Hackathon 2026

---

## 📄 Lisans

Bu proje BTK Akademi Hackathon 2026 kapsamında geliştirilmiştir.
