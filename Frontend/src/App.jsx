import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
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
      if(err.response && err.response.status === 401) {
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
    setKasaNakit(50000); // reset to default
    setSimText("");
    setActiveTab("genel-bakis");
    setShowRegister(false);
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
    const newFatura = {
      faturaNo: formFaturaNo,
      cariAd: formCariAd,
      tutar: parseFloat(formTutar),
      kesimTarihi: new Date().toISOString(),
      vadeTarihi: new Date(formVade).toISOString(),
      faturaTipi: formTip,
      durum: "Bekliyor"
    };

    try {
      await axios.post('/Fatura', newFatura);
      setFormFaturaNo(""); setFormCariAd(""); setFormTutar(""); setFormVade(""); setFormTip("Giden");
      toast.success("Yeni fatura eklendi!");
      await fetchData();
    } catch(err) {
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
    } catch(err) {
      toast.error("Fatura silinemedi.");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.put(`/Fatura/${id}/durum`, `"${newStatus}"`, { headers: { 'Content-Type': 'application/json' } });
      toast.success(`Fatura durumu "${newStatus}" olarak güncellendi.`);
      await fetchData();
    } catch(err) {
      toast.error("Fatura durumu güncellenemedi.");
    }
  };

  const handleUpdateKasa = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/Hesap', kasaNakit, { headers: { 'Content-Type': 'application/json' } });
      toast.success("Kasa mevcudu güncellendi!");
      await fetchData();
    } catch(err) {
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
    } catch(err) {
      toast.error(err.response?.data || "Satış verisi eklenemedi.");
    }
  };

  const handleDeleteSales = async (id) => {
    try {
      await axios.delete(`/Satis/${id}`);
      toast.success("Satış verisi silindi.");
      await fetchData();
    } catch(err) {
      toast.error("Satış verisi silinemedi.");
    }
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
            <span>Gemini 1.5 Flash Aktif</span>
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
                        <td style={{ padding: '12px' }}><span className="status-badge" style={{ background: inv.durum === 'Ödendi' ? 'rgba(16, 185, 129, 0.1)' : '', color: inv.durum === 'Ödendi' ? 'var(--accent-success)' : '' }}>{inv.durum || 'Bekliyor'}</span></td>
                        <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                          {inv.durum !== 'Ödendi' && (
                            <button onClick={() => handleUpdateStatus(inv.id, 'Ödendi')} style={{ background: 'transparent', border: '1px solid var(--accent-success)', color: 'var(--accent-success)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>Ödendi Yap</button>
                          )}
                          <button onClick={() => handleDeleteInvoice(inv.id)} style={{ background: 'transparent', border: '1px solid var(--accent-error)', color: 'var(--accent-error)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>Sil</button>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Henüz fatura bulunmuyor.</td></tr>
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