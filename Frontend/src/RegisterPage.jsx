import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import './index.css';

function RegisterPage({ onSwitchToLogin, onRegister }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }
    setLoading(true);

    try {
      const res = await axios.post('/auth/register', { name, email, password });
      onRegister(res.data);
    } catch (err) {
      toast.error(err.response?.data?.title || err.response?.data || 'Kayıt başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100vw' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            background: 'linear-gradient(to right, #fff, #a1a1aa)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            margin: '0 0 8px 0' 
          }}>FIN GUARD AI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>CFO-Bot Kayıt Ekranı</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" 
            className="sim-input" 
            placeholder="Ad Soyad" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          <input 
            type="email" 
            className="sim-input" 
            placeholder="E-posta" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            className="sim-input" 
            placeholder="Şifre" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button type="submit" className="auth-button primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="loading-pulse" style={{ width: '16px', height: '16px', background: '#fff' }}></div>
                Kayıt Olunuyor...
              </div>
            ) : "Kayıt Ol"}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button 
            type="button"
            onClick={onSwitchToLogin} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            Zaten hesabın var mı? <span style={{ color: 'var(--accent-primary)' }}>Giriş Yap</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
