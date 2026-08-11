import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { entrarSala } from '../firebase.js'

export default function EntrarSala() {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [mercado, setMercado] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleEntrar = async () => {
    if (!codigo.trim() || !nome.trim() || !mercado.trim()) return alert('Preencha todos os campos')
    setCarregando(true)
    try {
      await entrarSala(codigo.toUpperCase(), nome, mercado)
      navigate(`/sala/${codigo.toUpperCase()}`)
    } catch (err) {
      alert(err.message)
      setCarregando(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '40px 16px' }}>
      <h2 style={{ marginBottom: 20 }}>🔐 Entrar na Cotação</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input placeholder="Código da sala (ex: X7K9P2)" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} style={inputStyle} />
        <input placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} />
        <input placeholder="Mercado que você vai cotar" value={mercado} onChange={e => setMercado(e.target.value)} style={inputStyle} />
        <button onClick={handleEntrar} disabled={carregando}
          style={{ padding: '14px', borderRadius: 10, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, fontSize: '1rem' }}>
          {carregando ? 'Entrando...' : 'Entrar na Sala'}
        </button>
      </div>
    </div>
  )
}

const inputStyle = { padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.95rem', outline: 'none' }
