# 🛡️ FinGuard.AI — Otonom KOBİ Finansal Kontrolör (CFO-Bot)

> **BTK Akademi Hackathon 2026** — Finans Temalı Yapay Zeka Uygulaması  
> Gemini 2.5 Flash + Function Calling + Voice-to-Action (Agentic AI)

---

## 📋 Proje Özeti

**FinGuard.AI**, küçük ve orta ölçekli işletmelerin (KOBİ) nakit akışını analiz eden, fatura ve borç/alacak yönetimini yapay zeka desteğiyle otonom hale getiren bir **CFO-Bot (Finansal Kontrolör Ajanı)** platformudur.

Yapay zeka sadece analiz yapmakla kalmaz, aynı zamanda **Function Calling** özelliği sayesinde fatura vadelerini uzatabilir, durum güncelleyebilir, kasa bakiyesini değiştirebilir ve otonom tahsilat süreçleri başlatabilir — tamamen otonom bir şekilde.

### 🎯 Çözdüğü Problem
Türkiye'de KOBİ'lerin **%68'i** nakit akışı sorunları yaşıyor. FinGuard.AI, gelecek borç ve alacakları analiz edip nakit sıkışıklığını **önceden tespit eder** ve işletme sahibine stratejik önerilerde bulunur.

---

## ✨ Temel Özellikler

| Özellik | Açıklama |
|---|---|
| 🤖 **Agentic CFO-Bot** | Gemini 2.5 Flash + Function Calling ile otonom fatura, kasa ve tahsilat işlemleri |
| 🎙️ **Voice-to-Action (Sesli Komut)** | `Web Speech API` ile konuşulanları anında metne döküp bota komut olarak gönderme |
| 💸 **Otonom Tahsilat Ajanı** | Geciken alacaklar için profesyonel e-posta taslağı ve Stripe simülasyonlu güvenli ödeme linki oluşturma |
| 🔮 **What-If Finansal Simülasyonu** | Farklı finansal senaryoları (ör. "100.000 TL kredi alırsam nakit akışım nasıl değişir?") anında simüle etme |
| 📊 **Finansal Dashboard** | Kasa bakiyesi, borç/alacak analizi, satış trendi grafikleri |
| 💬 **Sohbet Arayüzü** | Chatbot ile doğal dilde finansal soru sorma ve işlem yapma |
| 🧾 **Fatura Yönetimi** | CRUD işlemleri, vade takibi, durum güncelleme |
| 📈 **Satış Analizi** | Son 5 yıllık satış verisi takibi ve trend görselleştirmesi |
| 🔐 **JWT Kimlik Doğrulama** | Güvenli oturum yönetimi + Google OAuth desteği (Üretim sürümüne uygun biçimde test butonlarından arındırılmış temiz kimlik doğrulama) |

---

## 🏗️ Mimari ve Teknoloji Yığını

```
┌─────────────────────────────────┐
│         Frontend (React)        │
│  Vite + Recharts + Web Speech   │
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
│  │  │  • fatura_durum_günc│  │  │
│  │  │  • kasa_bakiye_günc │  │  │
│  │  │  • tahsilat_baslat  │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│     PostgreSQL Database         │
│  (EF Core + Npgsql Integration) │
│  Users, Hesaplar, Faturalar,    │
│  SatisVerileri                  │
└─────────────────────────────────┘
               │
┌──────────────▼──────────────────┐
│    Google Gemini 2.5 Flash API  │
│    (Generative AI + Tools)      │
└─────────────────────────────────┘
```

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (Backend Web API)
- [npm (Node Package Manager)](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) (React & Vite Frontend Paket Yönetimi)
- [PostgreSQL](https://www.postgresql.org/) (Canlı ortam uyumluluğu için SQLite yerine entegre edilmiştir)
- [Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Backend
`appsettings.Development.json` dosyasına PostgreSQL bağlantı dizesini (Connection String) ve Gemini API Key'inizi ekleyin.

```bash
cd Backend/FinGuard.API

# Veritabanını oluşturun ve şemaları uygulayın
dotnet ef database update

# Uygulamayı Linux dosya izleyici limitlerine takılmadan çalıştırın
DOTNET_USE_POLLING_FILE_WATCHER=1 dotnet run --urls "http://localhost:5155"
```

### 2. Frontend
```bash
cd Frontend
npm install
npm run dev
```

### 3. Tarayıcıdan Erişim
`http://localhost:5173` adresini açarak yeni bir hesap oluşturup sisteme anında dahil olabilirsiniz. Üretim sürümü güvenliği ve profesyonelliği kapsamında demo giriş butonları kaldırılmıştır.

---

## 🤖 Agentic Yapı (Function Calling)

FinGuard.AI'ın en güçlü özelliği **otonom ajan** yapısıdır. CFO-Bot sadece metin üretmez, veritabanında gerçek işlemler yapabilir:

### Desteklenen Otonom Fonksiyonlar

| Fonksiyon | Açıklama | Örnek Komut |
|---|---|---|
| `fatura_vade_uzat` | Fatura vadesini X gün ileri alır | *"FTR-001 faturasının vadesini 15 gün uzat"* |
| `fatura_durum_guncelle` | Fatura durumunu değiştirir | *"FTR-002'yi ödendi olarak işaretle"* |
| `kasa_bakiye_guncelle` | Kasa nakit mevcudunu günceller | *"Kasa bakiyemi 75.000 TL yap"* |
| `tahsilat_baslat` | Gecikmiş alacaklar için otonom tahsilat başlatır | *"FTR-003 numaralı fatura için tahsilat başlat"* |

---

## 📂 Proje Yapısı

```
FinGuard.AI/
├── Backend/
│   └── FinGuard.API/
│       ├── Controllers/
│       │   ├── AnalysisController.cs   # Risk ve nakit akışı analizi
│       │   ├── AuthController.cs       # JWT + Google OAuth
│       │   ├── ChatController.cs       # Agentic chatbot endpoint'i
│       │   ├── FaturaController.cs     # Fatura CRUD
│       │   └── SatisController.cs      # Satış verisi CRUD
│       ├── Services/
│       │   ├── IAiService.cs           # AI servis arayüzü
│       │   └── GeminiService.cs        # Gemini + Advanced Tool Calling
│       ├── Models/
│       │   ├── User.cs, Hesap.cs, Fatura.cs, SatisVerisi.cs
│       ├── Data/
│       │   ├── AppDbContext.cs         # Entity Framework Context
│       │   └── DbSeeder.cs            # PostgreSQL uyumlu tohumlama (Seed Data)
│       └── Program.cs                 # Giriş noktası ve global Npgsql konfigürasyonları
├── Frontend/
│   └── src/
│       ├── App.jsx                    # Ana Dashboard + Sohbet Ekranı
│       ├── LoginPage.jsx              # Üretim uyumlu Giriş Ekranı
│       ├── RegisterPage.jsx           # Kayıt Ekranı
│       └── index.css                  # Vanilya CSS Tasarım Sistemi
└── README.md
```

## 🔑 Test Kullanıcı Bilgileri

Jürinin uygulamayı farklı finansal risk senaryolarıyla anında test edebilmesi için PostgreSQL veritabanı tohumlama (seed) sürecinde 3 adet hazır test kullanıcısı oluşturulmuştur. Aşağıdaki bilgilerle giriş yaparak hazır fatura ve satış senaryolarını test edebilirsiniz:

| Kullanıcı Adı | E-posta (E-mail) | Şifre (Password) | Başlangıç Durumu / Senaryo |
|---|---|---|---|
| **Lezgin Tekay** | `lezgin@test.com` | `123456` | **Normal / Dengeli Durum:** 50.000 TL bakiye, taksitli borçlar ve alacaklar dengede. |
| **Ahmet Yılmaz** | `ahmet@test.com` | `123456` | **Kritik Risk Senaryosu:** 10.000 TL düşük bakiye, vadesi hemen dolacak 180.000 TL borç (CFO-Bot anında nakit sıkışıklığı alarmı verir). |
| **Ayşe Demir** | `ayse@test.com` | `123456` | **Güvenli / Güçlü Finansal Senaryo:** 500.000 TL yüksek bakiye ve yüklü alacak faturaları var (Gelen faturalar). Durumu tamamen güvendedir. |

---


