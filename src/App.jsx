import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { loginAnonimo, observarAuth, auth, isFirebaseConfigured } from './firebase.js'
import { useOnline, lerUltimaSala, limparUltimaSala } from './utils/conexao.js'
import CriarSala from './components/CriarSala.jsx'
import EntrarSala from './components/EntrarSala.jsx'
import Sala from './components/Sala.jsx'
import MinhasSalas from './components/MinhasSalas.jsx'
import ManutencaoProdutos from './components/ManutencaoProdutos.jsx'
import Admin from './components/Admin.jsx'

function App() {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [ignorarErro, setIgnorarErro] = useState(false)
  const online = useOnline()

  useEffect(() => {
    // Observa a sessão em vez de logar anônimo direto: se já existe uma
    // sessão restaurada (anônima OU de admin logado com e-mail/senha),
    // não mexe nela. Só loga anônimo quando realmente não há ninguém —
    // assim o admin não é derrubado pra uma sessão anônima nova toda
    // vez que recarrega a página.
    const unsub = observarAuth((user) => {
      if (user) {
        setCarregando(false)
        return
      }
      loginAnonimo()
        .then(() => setCarregando(false))
        .catch(e => {
          if (auth?.currentUser) {
            setCarregando(false)
            return
          }
          setErro(e)
          setCarregando(false)
        })
    })
    return () => unsub()
  }, [])

  const handleBaixarZip = async (e) => {
    e?.preventDefault?.()
    try {
      const res = await fetch('/cotacao-online.zip')
      if (!res.ok) throw new Error('Status ' + res.status)
      const blob = await res.blob()
      if (blob.size < 20000) {
        alert('Atenção: O download foi interceptado pelo proxy do navegador (' + blob.size + ' bytes). Use a opção de exportar pelo menu do AI Studio!')
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cotacao-online.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (err) {
      console.error('Erro ao baixar zip:', err)
      window.open('/cotacao-online.zip', '_blank')
    }
  }

  if (erro && !ignorarErro) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '2rem' }}>⚠️</div>
        <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '1.1rem', margin: 0 }}>Erro ao conectar ao Firebase.</p>
        <p style={{ fontSize: '0.85rem', maxWidth: 360, margin: 0 }}>{online ? 'Verifique .env e login anônimo.' : 'Você está sem internet. Reconecte e tente de novo.'}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280, marginTop: 8 }}>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
            Tentar novamente
          </button>
          <button onClick={() => setIgnorarErro(true)} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            Entrar em modo demonstração
          </button>
          {import.meta.env.DEV && (
            <button
              id="btn-download-error-screen"
              onClick={handleBaixarZip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#1e293b',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                marginTop: 6,
              }}
            >
              📦 Baixar Projeto (.zip)
            </button>
          )}
        </div>
      </div>
    )
  }

  if (carregando) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>Conectando...</div>

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/criar" element={<CriarSala />} />
        <Route path="/entrar" element={<EntrarSala />} />
        <Route path="/sala/:codigo" element={<Sala />} />
        <Route path="/minhas-salas" element={<MinhasSalas />} />
        <Route path="/manutencao" element={<ManutencaoProdutos />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>

      {/* Botão flutuante para download rápido em desenvolvimento */}
      {import.meta.env.DEV && (
        <button
          id="btn-download-flutuante"
          onClick={handleBaixarZip}
          title="Baixar código fonte empacotado para o Git"
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 99999,
            background: '#0f172a',
            color: '#f8fafc',
            padding: '10px 16px',
            borderRadius: 30,
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid #334155',
          }}
        >
          📦 Baixar .ZIP
        </button>
      )}
    </>
  )
}

function Home() {
  const nav = useNavigate()
  const online = useOnline()
  const [ultima, setUltima] = useState(() => lerUltimaSala())
  return <div style={{ maxWidth: 420, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}><h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: 8 }}>🛒 Cotação Online</h1><p style={{ color: '#64748b', marginBottom: 16 }}>Compare preços entre supermercados</p>
    {!online && <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', fontWeight: 600 }}>📴 Sem internet — dá pra reabrir a última sala com os dados já baixados.</div>}
    {!isFirebaseConfigured && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', fontWeight: 600, textAlign: 'left' }}>⚡ <strong>Modo demonstração local ativo:</strong> Todas as funções estão disponíveis para teste. Para persistência remota no Firebase, configure o arquivo <code>.env</code>.</div>}
    {ultima && <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 16, textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Continuar de onde parou</div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b', letterSpacing: 2 }}>#{ultima.codigo}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>{ultima.nome || 'Cotação'}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => nav(`/sala/${ultima.codigo}`)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>↩️ Retomar sala</button>
        <button onClick={() => { limparUltimaSala(); setUltima(null) }} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>Dispensar</button>
      </div>
    </div>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><button onClick={() => nav('/criar')} style={btnPrim}>➕ Criar Nova Cotação</button><button onClick={() => nav('/entrar')} style={btnSec}>🔐 Entrar com Código</button><button onClick={() => nav('/minhas-salas')} style={btnLink}>🗂️ Minhas Salas</button><button onClick={() => nav('/manutencao')} style={btnLink}>🛠️ Manutenção de Produtos</button></div>
    {import.meta.env.DEV && (
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed #cbd5e1' }}>
        <a
          id="btn-download-app-zip"
          href="/cotacao-online.zip"
          download="cotacao-online.zip"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 8,
            background: '#475569',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.85rem',
            textDecoration: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        >
          📦 Baixar Projeto (.zip)
        </a>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
          (Visível apenas em ambiente de desenvolvimento)
        </div>
      </div>
    )}
    <p style={{ marginTop: 24, fontSize: '0.8rem', color: '#94a3b8' }}>🌎 Brasil · Fuso: America/Sao_Paulo · Base Própria + Open Food Facts</p>
  </div>
}
const btnPrim = { padding: '14px 24px', borderRadius: 10, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, fontSize: '1rem' }
const btnSec = { padding: '14px 24px', borderRadius: 10, border: '2px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 700, fontSize: '1rem' }
const btnLink = { padding: '10px 24px', borderRadius: 10, border: 'none', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }
export default App