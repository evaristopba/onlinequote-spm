import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { escutarSala, lancarPreco, adicionarProduto, auth } from '../firebase.js'
import TabelaCotacao from './TabelaCotacao.jsx'
import ListaOtimizada from './ListaOtimizada.jsx'
import Participantes from './Participantes.jsx'

export default function Sala() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const [sala, setSala] = useState(null)
  const [naoEncontrada, setNaoEncontrada] = useState(false)
  const [meuMercado, setMeuMercado] = useState('')

  useEffect(() => {
    const unsub = escutarSala(codigo, (data) => {
      if (!data) {
        setNaoEncontrada(true)
        setSala(null)
        return
      }
      setNaoEncontrada(false)
      setSala(data)
      const uid = auth.currentUser?.uid
      if (uid && data.participantes[uid]) {
        setMeuMercado(data.participantes[uid].mercado)
      }
    })
    return () => unsub()
  }, [codigo])

  const handlePreco = async (produtoId, mercado, valor) => {
    const num = parseFloat(valor.replace(',', '.'))
    if (isNaN(num) || num <= 0) return
    await lancarPreco(codigo, produtoId, mercado, num)
  }

  const handleAddProduto = async () => {
    const nome = prompt('Nome do produto:')
    if (!nome) return
    const qtd = prompt('Quantidade:', '1 un') || '1 un'
    await adicionarProduto(codigo, nome, qtd)
  }

  if (naoEncontrada) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        <p>❌ Sala <strong>#{codigo}</strong> não encontrada. Verifique o código e tente novamente.</p>
        <button onClick={() => navigate('/entrar')}
          style={{ marginTop: 12, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700 }}>
          Voltar
        </button>
      </div>
    )
  }

  if (!sala) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Carregando sala...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Sala de Cotação</div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b', letterSpacing: 2 }}>#{codigo}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
          AO VIVO — Firestore
        </div>
      </div>

      <Participantes participantes={sala.participantes} />

      <div style={{ background: 'white', borderRadius: 12, padding: 18, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>📊 Cotação em Tempo Real</h3>
          <button onClick={handleAddProduto} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
            ➕ Produto
          </button>
        </div>
        <TabelaCotacao produtos={sala.produtos} precos={sala.precos || {}} participantes={sala.participantes} meuMercado={meuMercado} onPrecoChange={handlePreco} />
      </div>

      <ListaOtimizada produtos={sala.produtos} precos={sala.precos || {}} participantes={sala.participantes} />
    </div>
  )
}
