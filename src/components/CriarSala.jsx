import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { criarSala } from '../firebase.js'

export default function CriarSala() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [mercado, setMercado] = useState('')
  const [nomeSala, setNomeSala] = useState('')
  const [produtosTexto, setProdutosTexto] = useState('Arroz 5kg, 2 un\nFeijão 1kg, 3 un\nLeite Integral 1L, 6 un\nÓleo de Soja 900ml, 2 un\nAçúcar 5kg, 1 un\nCafé 500g, 2 un')
  const [carregando, setCarregando] = useState(false)

  const handleCriar = async () => {
    if (!nome.trim() || !mercado.trim()) return alert('Preencha seu nome e mercado')
    setCarregando(true)

    const produtos = produtosTexto.split('\n').filter(l => l.trim()).map(l => {
      const [nomeProd, qtd] = l.split(',').map(s => s.trim())
      return { nome: nomeProd, quantidade: qtd || '1 un' }
    })

    try {
      const codigo = await criarSala(nomeSala || 'Cotação', produtos, nome, mercado)
      navigate(`/sala/${codigo}`)
    } catch (err) {
      alert('Não foi possível criar a sala: ' + err.message)
      setCarregando(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ marginBottom: 20 }}>➕ Criar Cotação</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} />
        <input placeholder="Mercado que você vai cotar (ex: Carrefour)" value={mercado} onChange={e => setMercado(e.target.value)} style={inputStyle} />
        <input placeholder="Nome da cotação (opcional)" value={nomeSala} onChange={e => setNomeSala(e.target.value)} style={inputStyle} />
        <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Lista de produtos (um por linha: nome, quantidade)</label>
        <textarea value={produtosTexto} onChange={e => setProdutosTexto(e.target.value)}
          rows={8} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
        <button onClick={handleCriar} disabled={carregando}
          style={{ padding: '14px', borderRadius: 10, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, fontSize: '1rem', opacity: carregando ? 0.6 : 1 }}>
          {carregando ? 'Criando...' : '🚀 Criar Sala'}
        </button>
      </div>
    </div>
  )
}

const inputStyle = { padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.95rem', outline: 'none' }
