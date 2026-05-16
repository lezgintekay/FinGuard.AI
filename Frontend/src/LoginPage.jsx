import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import './index.css';

function LoginPage({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStandardLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error('Lütfen e-posta ve şifrenizi girin.');
      return;
    }
    setLoading(true);

    try {
      const res = await axios.post('/auth/login', { email, password });
      onLogin(res.data);
    } catch (err) {
      toast.error(err.response?.data || 'Giriş başarısız oldu. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const loginAsTestUser = async (testEmail, testPassword) => {
    setLoading(true);
    try {
      const res = await axios.post('/auth/login', { email: testEmail, password: testPassword });
      onLogin(res.data);
    } catch (err) {
      toast.error('Test kullanıcısı girişi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post('/auth/google', { token: credentialResponse.credential });
      onLogin(res.data);
    } catch (err) {
      toast.error(err.response?.data || 'Google ile giriş başarısız.');
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
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>CFO-Bot Giriş Ekranı</p>
        </div>

        <form onSubmit={handleStandardLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '8px' }}>
                <div className="loading-pulse" style={{ width: '16px', height: '16px', background: '#fff' }}></div>
                Giriş Yapılıyor...
              </div>
            ) : "Giriş Yap"}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
           <GoogleLogin
             onSuccess={handleGoogleSuccess}
             onError={() => {
               toast.error('Google Girişi Başarısız Oldu.');
             }}
             theme="filled_black"
             text="signin_with"
             shape="pill"
           />
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            type="button"
            onClick={onSwitchToRegister} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            Hesabın yok mu? <span style={{ color: 'var(--accent-primary)' }}>Kayıt Ol</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></div>
          <span style={{ padding: '0 12px' }}>veya test kullanıcıları</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }}></div>
        </div>

        <button className="auth-button" onClick={() => loginAsTestUser("lezgin@test.com", "123456")}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>admin_panel_settings</span>
          Admin (Lezgin Tekay)
        </button>
        <button className="auth-button" onClick={() => loginAsTestUser("ahmet@test.com", "123456")}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
          Senaryo A (Kritik Risk)
        </button>
        <button className="auth-button" onClick={() => loginAsTestUser("ayse@test.com", "123456")}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
          Senaryo B (Güvenli)
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
