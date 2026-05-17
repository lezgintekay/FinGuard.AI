import { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import './index.css';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

// Axios global setup
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5155/api';
axios.defaults.baseURL = API_URL;

// Request interceptor to add token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // { id, name, role }
  const [showRegister, setShowRegister] = useState(false);

  const [activeTab, setActiveTab] = useState("genel-bakis");
  const [riskData, setRiskData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [addingInvoice, setAddingInvoice] = useState(false);
  const [simText, setSimText] = useState("");
  const [kasaNakit, setKasaNakit] = useState(50000);

  // CFO-Bot Sohbet State
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: 'Merhaba! Ben FinGuard CFO-Bot. Size faturalarınız, nakit akışınız ve finansal durumunuz hakkında yardımcı olabilirim. Ayrıca fatura vadesi uzatma, durum güncelleme ve kasa bakiyesi değiştirme gibi işlemleri otonom olarak gerçekleştirebilirim. Nasıl yardımcı olabilirim?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
      setInitialLoading(true);
      fetchData(kasaNakit);
    }
  }, []);

  // Fatura Ekleme Form State'leri
  const [formFaturaNo, setFormFaturaNo] = useState("");
  const [formCariAd, setFormCariAd] = useState("");
  const [formTutar, setFormTutar] = useState("");
  const [formVade, setFormVade] = useState("");
  const [formTip, setFormTip] = useState("Giden");
  const [formTaksit, setFormTaksit] = useState(1);

  // Satış Ekleme Form State'leri
  const [formYil, setFormYil] = useState(new Date().getFullYear());
  const [formAy, setFormAy] = useState(new Date().getMonth() + 1);
  const [formSatisTutar, setFormSatisTutar] = useState("");

  const fetchData = async (currentBalance) => {
    try {
      const hesapRes = await axios.get('/Hesap');
      const guncelBakiye = currentBalance !== undefined ? currentBalance : hesapRes.data.toplamBakiye;
      setKasaNakit(guncelBakiye);

      const riskRes = await axios.get(`/Analysis/risk?overrideKasa=${guncelBakiye}`);
      setRiskData(riskRes.data);
      setSimText(riskRes.data.mesaj); // Auto-fill simtext with AI message

      const invoiceRes = await axios.get('/Fatura');
      setInvoices(invoiceRes.data);

      const salesRes = await axios.get('/Satis');
      setSalesData(salesRes.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        handleLogout();
        toast.error("Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.");
      } else {
        toast.error("Veriler çekilirken bir hata oluştu.");
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const handleLogin = async (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setIsAuthenticated(true);
    setInitialLoading(true);
    // Oturum güvenliği: Yeni kullanıcı için sohbet geçmişini sıfırla
    setChatMessages([
      { role: 'bot', text: `Merhaba ${data.user.name}! Ben FinGuard CFO-Bot. Faturalarınız, nakit akışınız ve finansal durumunuz hakkında yardımcı olabilirim. Ayrıca fatura vadesi uzatma, durum güncelleme ve kasa bakiyesi değiştirme gibi işlemleri otonom olarak gerçekleştirebilirim. Nasıl yardımcı olabilirim?` }
    ]);
    setChatInput('');
    setChatLoading(false);
    await fetchData(kasaNakit);
    toast.success(`Hoş geldin, ${data.user.name}!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setIsAuthenticated(false);
    setUser(null);
    setRiskData(null);
    setInvoices([]);
    setSalesData([]);
    setKasaNakit(50000); // reset to default
    setSimText("");
    setActiveTab("genel-bakis");
    setShowRegister(false);
    // Oturum güvenliği: Önceki kullanıcının sohbet geçmişini temizle
    setChatMessages([
      { role: 'bot', text: 'Merhaba! Ben FinGuard CFO-Bot. Size faturalarınız, nakit akışınız ve finansal durumunuz hakkında yardımcı olabilirim. Nasıl yardımcı olabilirim?' }
    ]);
    setChatInput('');
    setChatLoading(false);
  };

  const handleSimulation = (e) => {
    e.preventDefault();
    const match = simText.match(/\d+/g);
    if (match && user) {
      const eklenenPara = parseInt(match[0]);
      const yeniNakit = kasaNakit + eklenenPara;
      setKasaNakit(yeniNakit);
      fetchData(yeniNakit);
    }
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!formFaturaNo || !formCariAd || !formTutar || !formVade) {
      toast.error("Lütfen vade tarihi dahil tüm alanları doldurun!");
      return;
    }

    setAddingInvoice(true);
    const taksitSayisi = parseInt(formTaksit) || 1;
    const newFatura = {
      faturaNo: formFaturaNo,
      cariAd: formCariAd,
      tutar: parseFloat(formTutar),
      kesimTarihi: new Date().toISOString(),
      vadeTarihi: new Date(formVade).toISOString(),
      faturaTipi: formTip,
      durum: "Bekliyor",
      taksitliMi: taksitSayisi > 1,
      toplamTaksit: taksitSayisi,
      odenenTaksit: 0
    };

    try {
      await axios.post('/Fatura', newFatura);
      setFormFaturaNo(""); setFormCariAd(""); setFormTutar(""); setFormVade(""); setFormTip("Giden"); setFormTaksit(1);
      toast.success("Yeni fatura eklendi!");
      await fetchData();
    } catch (err) {
      toast.error("Fatura eklenemedi.");
    } finally {
      setAddingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      await axios.delete(`/Fatura/${id}`);
      toast.success("Fatura başarıyla silindi.");
      await fetchData();
    } catch (err) {
      toast.error("Fatura silinemedi.");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.put(`/Fatura/${id}/durum`, `"${newStatus}"`, { headers: { 'Content-Type': 'application/json' } });
      toast.success(`Fatura durumu "${newStatus}" olarak güncellendi.`);
      await fetchData();
    } catch (err) {
      toast.error("Fatura durumu güncellenemedi.");
    }
  };

  const handleUpdateKasa = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/Hesap', kasaNakit, { headers: { 'Content-Type': 'application/json' } });
      toast.success("Kasa mevcudu güncellendi!");
      await fetchData();
    } catch (err) {
      toast.error("Kasa mevcudu güncellenemedi.");
    }
  };

  const handleAddSales = async (e) => {
    e.preventDefault();
    if (!formSatisTutar) {
      toast.error("Lütfen satış tutarını girin.");
      return;
    }
    try {
      await axios.post('/Satis', { yil: formYil, ay: formAy, toplamSatis: parseFloat(formSatisTutar) });
      toast.success("Satış verisi eklendi!");
      setFormSatisTutar("");
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data || "Satış verisi eklenemedi.");
    }
  };

  const handleDeleteSales = async (id) => {
    try {
      await axios.delete(`/Satis/${id}`);
      toast.success("Satış verisi silindi.");
      await fetchData();
    } catch (err) {
      toast.error("Satış verisi silinemedi.");
    }
  };

  // CFO-Bot Sohbet fonksiyonu
  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await axios.post('/Chat/message', { message: userMessage });
      setChatMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
      // Fatura veya kasa değişikliği yapılmış olabilir, verileri tazele
      await fetchData();
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'bot', text: '⚠️ Bir hata oluştu. Lütfen tekrar deneyin.' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // Sesle Komut (Voice-to-Action) Entegrasyonu
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Tarayıcınız ses tanıma özelliğini desteklemiyor (Chrome önerilir).");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.interimResults = true; // Konuşurken ekranda anlık (canlı) görünsün
    recognition.maxAlternatives = 1;

    let existingInput = chatInput; // Mevcut yazılanları kaybetmemek için

    recognition.onstart = () => {
      console.log("[Mic] Dinleme başladı...");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      console.log("[Mic] Algılanan metin:", transcript);
      setChatInput(existingInput ? `${existingInput} ${transcript}` : transcript);
    };

    recognition.onerror = (event) => {
      console.error("[Mic] Hata oluştu:", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error("Mikrofon izni verilmedi.");
      } else {
        toast.error(`Mikrofon hatası: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log("[Mic] Dinleme bitti.");
      setIsListening(false);
    };

    recognition.start();
  };

  if (!isAuthenticated) {
    return (
      <GoogleOAuthProvider clientId="BURAYA_GOOGLE_CLIENT_ID_YAZILACAK">
        <Toaster position="top-right" />
        {showRegister ? (
          <RegisterPage
            onSwitchToLogin={() => setShowRegister(false)}
            onRegister={handleLogin}
          />
        ) : (
          <LoginPage
            onLogin={handleLogin}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
      </GoogleOAuthProvider>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="dashboard-wrapper">
        {/* Sol Menü */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <h1>FIN GUARD AI</h1>
            <p>Institutional Grade CFO-Bot</p>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a onClick={() => setActiveTab('genel-bakis')} className={`nav-link ${activeTab === 'genel-bakis' ? 'active' : ''}`}>
              <span className="material-symbols-outlined">grid_view</span> Genel Bakış
            </a>
            <a onClick={() => setActiveTab('faturalar')} className={`nav-link ${activeTab === 'faturalar' ? 'active' : ''}`}>
              <span className="material-symbols-outlined">receipt_long</span> Faturalar
            </a>
            <a onClick={() => setActiveTab('nakit-akisi')} className={`nav-link ${activeTab === 'nakit-akisi' ? 'active' : ''}`}>
              <span className="material-symbols-outlined">payments</span> Nakit Akışı & AI
            </a>
            <a onClick={() => setActiveTab('cfo-bot')} className={`nav-link ${activeTab === 'cfo-bot' ? 'active' : ''}`}>
              <span className="material-symbols-outlined">forum</span> CFO-Bot Sohbet
            </a>
            <a onClick={() => setActiveTab('bot-ayarlari')} className={`nav-link ${activeTab === 'bot-ayarlari' ? 'active' : ''}`}>
              <span className="material-symbols-outlined">smart_toy</span> Bot Ayarları
            </a>
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-primary)', display: 'grid', placeItems: 'center', color: '#fff' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{user?.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.role}</div>
              </div>
            </div>
            <button className="auth-button" onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-error)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
              Çıkış Yap
            </button>
          </div>
        </aside>

        {/* Ana İçerik */}
        <main className="main-content">
          <header className="top-header">
            <div className="page-title">{activeTab.replace('-', ' ')} Paneli</div>
            <div className="ai-status">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span>
              <span>Gemini 2.5 Flash Aktif</span>
            </div>
          </header>

          {activeTab === 'genel-bakis' && (
            <>
              <div className="glass-card simulation-container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)' }}>science</span>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>Yapay Zeka Nakit Akışı Teşvik Simülatörü</span>
                </div>
                <form onSubmit={handleSimulation} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="sim-input"
                    placeholder="Örn: Yarın TÜBİTAK'tan 400000 TL hibe girişi olacak..."
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                  />
                  <button type="submit" className="sim-btn">Senaryoyu Çalıştır</button>
                </form>
              </div>

              <div className="bento-grid">
                <div className="glass-card" style={{ gridColumn: 'span 7' }}>
                  <span className="card-label">Kasa Nakit Mevcudu</span>
                  <h2 className="card-value">₺{kasaNakit.toLocaleString('tr-TR')}</h2>

                  {(() => {
                    const gidenToplam = invoices.filter(i => i.faturaTipi === 'Giden' && i.durum !== 'Ödendi').reduce((acc, curr) => acc + curr.tutar, 0);
                    const gelenToplam = invoices.filter(i => i.faturaTipi === 'Gelen' && i.durum !== 'Ödendi').reduce((acc, curr) => acc + curr.tutar, 0);
                    const netLikidite = kasaNakit + gelenToplam - gidenToplam;

                    return (
                      <div style={{ marginTop: '40px', display: 'flex', gap: '48px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Gelecek Borçlar (Giden)</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-error)', marginTop: '4px' }}>₺{gidenToplam.toLocaleString('tr-TR')}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Gelecek Alacaklar (Gelen)</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-success)', marginTop: '4px' }}>₺{gelenToplam.toLocaleString('tr-TR')}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Net Likidite Dengesi</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: netLikidite < 0 ? 'var(--accent-error)' : 'var(--accent-success)', marginTop: '4px' }}>
                            ₺{netLikidite.toLocaleString('tr-TR')}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className={`glass-card ai-report-card ${riskData?.RiskDurumu === 'Kritik' ? 'critical' : 'success'}`} style={{ gridColumn: 'span 5' }}>
                  <div>
                    <div className="ai-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>auto_awesome</span>
                      CFO-BOT ANALİZİ
                    </div>
                    {initialLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '24px 0' }}>
                        <div className="loading-pulse"></div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>Cevap Bekleniyor...</span>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 800, color: '#fff' }}>
                          Durum: <span style={{ color: riskData?.RiskDurumu === 'Kritik' ? 'var(--accent-error)' : 'var(--accent-success)' }}>
                            {riskData?.RiskDurumu || "Bilinmiyor"}
                          </span>
                        </h3>
                        <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#d1d1d6', margin: 0 }}>
                          {riskData?.Mesaj || "Yapay zeka analizi burada görüntülenecektir."}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Satış Trendi Grafiği */}
              {salesData.length > 0 && (
                <div className="bento-grid" style={{ marginTop: '24px' }}>
                  <div className="glass-card" style={{ gridColumn: 'span 8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)' }}>trending_up</span>
                      <span className="card-label" style={{ margin: 0 }}>Aylık Satış Trendi</span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={salesData
                        .sort((a, b) => a.yil === b.yil ? a.ay - b.ay : a.yil - b.yil)
                        .slice(-24)
                        .map(s => ({ name: `${s.ay}/${s.yil}`, satis: s.toplamSatis }))}
                      >
                        <defs>
                          <linearGradient id="colorSatis" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip
                          contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                          formatter={(value) => [`₺${Number(value).toLocaleString('tr-TR')}`, 'Satış']}
                        />
                        <Area type="monotone" dataKey="satis" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSatis)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="glass-card" style={{ gridColumn: 'span 4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>bar_chart</span>
                      <span className="card-label" style={{ margin: 0 }}>Fatura Dağılımı</span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[
                        {
                          name: 'Bekleyen',
                          giden: invoices.filter(i => i.faturaTipi === 'Giden' && i.durum !== 'Ödendi').reduce((a, c) => a + c.tutar, 0),
                          gelen: invoices.filter(i => i.faturaTipi === 'Gelen' && i.durum !== 'Ödendi').reduce((a, c) => a + c.tutar, 0),
                        },
                        {
                          name: 'Ödenen',
                          giden: invoices.filter(i => i.faturaTipi === 'Giden' && i.durum === 'Ödendi').reduce((a, c) => a + c.tutar, 0),
                          gelen: invoices.filter(i => i.faturaTipi === 'Gelen' && i.durum === 'Ödendi').reduce((a, c) => a + c.tutar, 0),
                        }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip
                          contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '13px' }}
                          formatter={(value) => [`₺${Number(value).toLocaleString('tr-TR')}`]}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                        <Bar dataKey="giden" name="Borç (Giden)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="gelen" name="Alacak (Gelen)" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'faturalar' && (
            <div className="bento-grid">
              <div className="glass-card" style={{ gridColumn: 'span 4' }}>
                <span className="card-label" style={{ color: 'var(--accent-primary)' }}>Yeni Fatura Girişi</span>
                <form onSubmit={handleAddInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <input className="sim-input" placeholder="Fatura No (Örn: FTR-004)" value={formFaturaNo} onChange={(e) => setFormFaturaNo(e.target.value)} disabled={addingInvoice} />
                  <input className="sim-input" placeholder="Cari Unvan (Örn: Aselsan A.Ş.)" value={formCariAd} onChange={(e) => setFormCariAd(e.target.value)} disabled={addingInvoice} />
                  <input className="sim-input" type="number" placeholder="Tutar (₺)" value={formTutar} onChange={(e) => setFormTutar(e.target.value)} disabled={addingInvoice} />
                  <input className="sim-input" type="date" value={formVade} onChange={(e) => setFormVade(e.target.value)} disabled={addingInvoice} required />
                  <select className="sim-input" value={formTip} onChange={(e) => setFormTip(e.target.value)} disabled={addingInvoice}>
                    <option value="Giden">Giden Fatura (Borç/Ödenecek)</option>
                    <option value="Gelen">Gelen Fatura (Alacak/Tahsil Edilecek)</option>
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>Taksit:</label>
                    <select className="sim-input" value={formTaksit} onChange={(e) => setFormTaksit(e.target.value)} disabled={addingInvoice} style={{ flex: 1 }}>
                      <option value={1}>Peşin (Tek Ödeme)</option>
                      <option value={2}>2 Taksit</option>
                      <option value={3}>3 Taksit</option>
                      <option value={4}>4 Taksit</option>
                      <option value={6}>6 Taksit</option>
                      <option value={9}>9 Taksit</option>
                      <option value={12}>12 Taksit</option>
                    </select>
                  </div>
                  <button className="sim-btn" type="submit" style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={addingInvoice}>
                    {addingInvoice ? (
                      <>
                        <div className="loading-pulse" style={{ width: '14px', height: '14px', background: '#fff' }}></div>
                        <span>Veritabanına Kaydediliyor...</span>
                      </>
                    ) : (
                      "Faturayı Ekle"
                    )}
                  </button>
                </form>
              </div>

              <div className="glass-card" style={{ gridColumn: 'span 8', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--card-border)' }}>
                  <span className="card-label">Sistemdeki Faturalar</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Fatura No</th>
                        <th style={{ padding: '12px' }}>Cari</th>
                        <th style={{ padding: '12px' }}>Tip</th>
                        <th style={{ padding: '12px' }}>Vade Tarihi</th>
                        <th style={{ padding: '12px' }}>Tutar</th>
                        <th style={{ padding: '12px' }}>Taksit</th>
                        <th style={{ padding: '12px' }}>Durum</th>
                        <th style={{ padding: '12px' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id || inv.faturaNo} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{inv.faturaNo}</td>
                          <td style={{ padding: '12px', fontWeight: 700 }}>{inv.cariAd}</td>
                          <td style={{ padding: '12px' }}><span className="status-badge" style={{ background: inv.faturaTipi === 'Giden' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: inv.faturaTipi === 'Giden' ? 'var(--accent-error)' : 'var(--accent-success)' }}>{inv.faturaTipi}</span></td>
                          <td style={{ padding: '12px' }}>{inv.vadeTarihi ? new Date(inv.vadeTarihi).toLocaleDateString('tr-TR') : '-'}</td>
                          <td style={{ padding: '12px', fontWeight: 800 }}>₺{inv.tutar?.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '12px' }}>
                            {inv.taksitliMi ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '11px' }}>
                                  {inv.odenenTaksit}/{inv.toplamTaksit} Taksit
                                </span>
                                <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }}>
                                  <div style={{ width: `${(inv.odenenTaksit / inv.toplamTaksit) * 100}%`, height: '100%', borderRadius: '2px', background: inv.odenenTaksit >= inv.toplamTaksit ? 'var(--accent-success)' : '#818cf8', transition: 'width 0.3s ease' }}></div>
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>₺{(inv.tutar / inv.toplamTaksit).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}/taksit</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Peşin</span>
                            )}
                          </td>
                          <td style={{ padding: '12px' }}><span className="status-badge" style={{ background: inv.durum === 'Ödendi' ? 'rgba(16, 185, 129, 0.1)' : '', color: inv.durum === 'Ödendi' ? 'var(--accent-success)' : '' }}>{inv.durum || 'Bekliyor'}</span></td>
                          <td style={{ padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {inv.durum !== 'Ödendi' && (
                              <button onClick={() => handleUpdateStatus(inv.id, 'Ödendi')} style={{ background: 'transparent', border: '1px solid var(--accent-success)', color: 'var(--accent-success)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>Ödendi Yap</button>
                            )}
                            <button onClick={() => handleDeleteInvoice(inv.id)} style={{ background: 'transparent', border: '1px solid var(--accent-error)', color: 'var(--accent-error)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>Sil</button>
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr><td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Henüz fatura bulunmuyor.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'nakit-akisi' && (
            <div className="glass-card">
              <span className="card-label">Yapay Zeka Otonom İletişim Raporu</span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                Mevcut Risk Durumu: <span style={{ color: riskData?.RiskDurumu === 'Kritik' ? 'var(--accent-error)' : 'var(--accent-success)' }}>{riskData?.RiskDurumu || 'Hesaplanıyor'}</span>
              </h3>
              {riskData?.RiskDurumu === 'Kritik' && (
                <div className="action-plan" style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-error)', marginBottom: '8px' }}>OTONOM MUTABAKAT MEKTUBU</div>
                  <div className="email-box">
                    {`Konu: Fatura Vade Esnetme Talebi\n\nSayın Yetkili,\nŞirketimizin likidite optimizasyonu doğrultusunda, tarafımıza kesilmiş vadeli ödemelerin planını revize etmeyi talep ediyoruz.\n\nSaygılarımızla,\nFinGuard AI Otonom CFO Ajanı`}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cfo-bot' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', padding: 0, overflow: 'hidden' }}>
              {/* Chat Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)', display: 'grid', placeItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '22px' }}>smart_toy</span>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>FinGuard CFO-Bot</div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block' }}></span>
                    Otonom Ajan Aktif • Gemini 2.5 Flash
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                  <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '10px', padding: '4px 8px' }}>Function Calling</span>
                  <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)', fontSize: '10px', padding: '4px 8px' }}>Agentic</span>
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-start' }}>
                    {msg.role === 'bot' && (
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '16px' }}>smart_toy</span>
                      </div>
                    )}
                    <div style={{
                      maxWidth: '70%',
                      padding: '14px 18px',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)'
                        : 'rgba(255,255,255,0.06)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
                      color: '#e4e4e7',
                      fontSize: '13.5px',
                      lineHeight: '1.65',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent-primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '16px' }}>person</span>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '16px' }}>smart_toy</span>
                    </div>
                    <div style={{ padding: '14px 18px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="loading-pulse" style={{ width: '12px', height: '12px' }}></div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>CFO-Bot düşünüyor...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={sendChatMessage} style={{ padding: '16px 24px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                <input
                  className="sim-input"
                  style={{ flex: 1, margin: 0 }}
                  placeholder="CFO-Bot'a bir mesaj yazın... (Örn: FTR-001 faturasının vadesini 10 gün uzat)"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="button"
                  onClick={startListening}
                  disabled={chatLoading || isListening}
                  className="sim-btn"
                  style={{
                    padding: '12px',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: isListening ? 'var(--accent-error)' : 'rgba(255,255,255,0.1)',
                    animation: isListening ? 'pulse 1.5s infinite' : 'none'
                  }}
                  title="Sesle Komut Ver"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: isListening ? '#fff' : 'var(--text-muted)' }}>
                    mic
                  </span>
                </button>
                <button type="submit" className="sim-btn" disabled={chatLoading || !chatInput.trim()} style={{ padding: '12px 24px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                  Gönder
                </button>
              </form>
            </div>
          )}

          {activeTab === 'bot-ayarlari' && (
            <div className="bento-grid">
              <div className="glass-card" style={{ gridColumn: 'span 12', marginBottom: '24px' }}>
                <span className="card-label" style={{ color: 'var(--accent-primary)' }}>Finansal Veriler & CFO Ayarları</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Yapay zekanın doğru analiz yapabilmesi için Kasa Nakit Mevcudunuzu ve geçmiş satış verilerinizi buradan güncelleyin.</p>
              </div>

              <div className="glass-card" style={{ gridColumn: 'span 4' }}>
                <span className="card-label">Kasa Nakit Güncelleme</span>
                <form onSubmit={handleUpdateKasa} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <input className="sim-input" type="number" placeholder="Güncel Kasa Nakiti (₺)" value={kasaNakit} onChange={(e) => setKasaNakit(Number(e.target.value))} />
                  <button className="sim-btn" type="submit">Nakit Mevcudunu Kaydet</button>
                </form>

                <span className="card-label" style={{ marginTop: '32px' }}>Geçmiş Satış Ekle</span>
                <form onSubmit={handleAddSales} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="sim-input" type="number" placeholder="Yıl" value={formYil} onChange={(e) => setFormYil(e.target.value)} style={{ flex: 1 }} />
                    <input className="sim-input" type="number" placeholder="Ay" value={formAy} onChange={(e) => setFormAy(e.target.value)} style={{ flex: 1 }} min="1" max="12" />
                  </div>
                  <input className="sim-input" type="number" placeholder="Satış Tutarı (₺)" value={formSatisTutar} onChange={(e) => setFormSatisTutar(e.target.value)} />
                  <button className="sim-btn" type="submit" style={{ background: 'var(--accent-success)' }}>Satış Verisini Ekle</button>
                </form>
              </div>

              <div className="glass-card" style={{ gridColumn: 'span 8', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--card-border)' }}>
                  <span className="card-label">Satış Geçmişi Tablosu</span>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Yıl</th>
                        <th style={{ padding: '12px' }}>Ay</th>
                        <th style={{ padding: '12px' }}>Satış Tutarı</th>
                        <th style={{ padding: '12px' }}>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.map((satis) => (
                        <tr key={satis.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', fontWeight: 700 }}>{satis.yil}</td>
                          <td style={{ padding: '12px' }}>{satis.ay}. Ay</td>
                          <td style={{ padding: '12px', fontWeight: 800, color: 'var(--accent-success)' }}>₺{satis.toplamSatis.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '12px' }}>
                            <button onClick={() => handleDeleteSales(satis.id)} style={{ background: 'transparent', border: '1px solid var(--accent-error)', color: 'var(--accent-error)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>Sil</button>
                          </td>
                        </tr>
                      ))}
                      {salesData.length === 0 && (
                        <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Kayıtlı satış verisi bulunmuyor.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default App;