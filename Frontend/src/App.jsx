import { useState, useEffect } from 'react';

function App() {
  const [riskData, setRiskData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const riskRes = await fetch('http://localhost:5155/api/Analysis/risk');
        if (riskRes.ok) {
          const riskJson = await riskRes.json();
          setRiskData(riskJson);
        }

        const invRes = await fetch('http://localhost:5155/api/Fatura');
        if (invRes.ok) {
          const invJson = await invRes.json();
          setInvoices(invJson);
        }
      } catch (error) {
        console.error("Veri çekme hatası:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="dashboard-container">
      
      {/* Sidebar */}
      <div className="sidebar">
        <h1 style={{fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#fff'}}>FinArchitect</h1>
        <p style={{fontSize: '12px', color: '#a0a0a0', margin: '0 0 32px 0'}}>CFO-Bot Edition</p>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#2b2a2a', borderRadius: '8px', color: '#fff', fontWeight: 'bold'}}>
          <span className="material-symbols-outlined">dashboard</span>
          <span>Overview</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <div style={{fontSize: '16px', fontWeight: '500', color: '#a0a0a0'}}>KOBİ Finansal Kontrol Paneli</div>
          <div style={{fontSize: '14px'}}>
            Yapay Zeka Durumu: <span style={{color: '#10b981', fontWeight: 'bold'}}>Çevrimiçi</span>
          </div>
        </div>

        {/* Upper Layout */}
        <div className="grid-layout">
          
          {/* Kasa Nakit Kartı */}
          <div className="card" style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
            <div>
              <span style={{fontSize: '12px', color: '#a0a0a0', textTransform: 'uppercase'}}>Toplam Kasa Nakit Mevcudu</span>
              <h2 style={{fontSize: '36px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#fff'}}>₺50.000,00</h2>
            </div>
            <div style={{borderTop: '1px solid #2d2d2d', paddingTop: '16px', marginTop: '16px', fontSize: '14px', color: '#c4c7c7'}}>
              Vadesi Gelen Toplam Yükümlülük: <span style={{fontWeight: 'bold', color: '#fff'}}>₺445.000,00</span>
            </div>
          </div>

          {/* AI Risk Durum Kartı */}
          <div>
            {loading ? (
              <div className="card" style={{textAlign: 'center', color: '#a0a0a0'}}>CFO-Bot analiz ediyor...</div>
            ) : (
              <div className={riskData?.RiskDurumu === 'Kritik' ? 'ai-card-critical' : 'ai-card-success'}>
                <span style={{fontSize: '11px', fontWeight: 'bold', tracking: '1px', opacity: 0.8}}>CFO-BOT RISK RAPORU</span>
                <h3 style={{fontSize: '20px', fontWeight: 'bold', margin: '8px 0'}}>
                  Durum: <span style={{color: riskData?.RiskDurumu === 'Kritik' ? '#f87171' : '#34d399'}}>{riskData?.RiskDurumu || "Güvenli"}</span>
                </h3>
                <p style={{fontSize: '13px', lineHeight: '1.5', color: '#e5e2e1', margin: '0 0 16px 0'}}>{riskData?.Mesaj}</p>
                
                {riskData?.AcikTutar > 0 && (
                  <div style={{backgroundColor: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', fontSize: '13px'}}>
                    <p style={{fontWeight: 'bold', color: '#f87171', margin: '0 0 4px 0'}}>Öngörülen Toplam Açık: ₺{riskData.AcikTutar.toLocaleString('tr-TR')}</p>
                    <p style={{margin: 0, color: '#c4c7c7'}}><span style={{color: '#fff', fontWeight: 'bold'}}>Eylem Planı:</span> {riskData.OnerilenAksiyon}</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Faturalar Tablosu */}
        <div className="card" style={{padding: '0', overflow: 'hidden'}}>
          <div style={{padding: '20px', borderBottom: '1px solid #2d2d2d'}}>
            <h3 style={{margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#fff'}}>Sistemde Kayıtlı Vadeli Faturalar</h3>
          </div>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Fatura No</th>
                <th>Cari Unvan</th>
                <th>Vade Tarihi</th>
                <th>Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {/* Güvenli Map Kontrolü (Dizi boşsa veya null ise asla çökmez) */}
              {Array.isArray(invoices) && invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id || inv.faturaNo}>
                    <td style={{fontFamily: 'monospace', color: '#c8c6c5'}}>{inv.faturaNo}</td>
                    <td style={{fontWeight: '500', color: '#fff'}}>{inv.cariAd}</td>
                    <td style={{color: '#a0a0a0'}}>{inv.vadeTarihi ? new Date(inv.vadeTarihi).toLocaleDateString('tr-TR') : '-'}</td>
                    <td style={{fontWeight: 'bold', color: '#fff'}}>₺{inv.tutar ? inv.tutar.toLocaleString('tr-TR') : '0'}</td>
                    <td>
                      <span className="status-badge">{inv.durum || 'Bekliyor'}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '24px', color: '#a0a0a0'}}>
                    Faturalar yükleniyor veya kayıt bulunamadı...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default App;