import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { loginAnonimo } from './firebase.js'
import CriarSala from './components/CriarSala.jsx'
import EntrarSala from './components/EntrarSala.jsx'
import Sala from './components/Sala.jsx'

function App() {
  const [carregando, setCarregando] = useState(true)
  const [erroLogin, setErroLogin] = useState(null)

  useEffect(() => {
    loginAnonimo()
      .then(() => setCarregando(false))
      .catch(err => setErroLogin(err))
  }, [])

  if (erroLogin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '0 24px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '1.5rem' }}>⚠️</div>
        <p style={{ margin: 0 }}>Não foi possível conectar ao Firebase.</p>
        <p style={{ margin: 0, fontSize: '0.85rem' }}>Verifique se as credenciais em <code>.env</code> estão corretas e se o login anônimo está ativado no console do Firebase.</p>
        <button onClick={() => window.location.reload()}
          style={{ marginTop: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', fontWeight: 700 }}>
          Tentar novamente
        </button>
      </div>
    )
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>
        Conectando ao Firebase...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/criar" element={<CriarSala />} />
      <Route path="/entrar" element={<EntrarSala />} />
      <Route path="/sala/:codigo" element={<Sala />} />
    </Routes>
  )
}

function Home() {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: 8 }}>🛒 Cotação Online</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Compare preços entre supermercados em grupo</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => navigate('/criar')}
          style={{ padding: '14px 24px', borderRadius: 10, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, fontSize: '1rem' }}>
          ➕ Criar Nova Cotação
        </button>
        <button onClick={() => navigate('/entrar')}
          style={{ padding: '14px 24px', borderRadius: 10, border: '2px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 700, fontSize: '1rem' }}>
          🔐 Entrar com Código
        </button>
      </div>
    </div>
  )
}

export default App
