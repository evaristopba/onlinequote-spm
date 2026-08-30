import { useEffect, useState } from 'react'
import { buscarProdutosPorNome, vincularVariante } from '../firebase.js'

export default function VincularVariante({ produto, onVinculado, onCancelar }) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (termo.trim().length < 2) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const r = await buscarProdutosPorNome(termo, 10)
        setResultados(r.filter((p) => p.id !== produto.id))
      } catch (e) {
        console.error('Erro ao buscar produtos:', e)
        setResultados([])
      }
      setBuscando(false)
    }, 300)
    return () => clearTimeout(t)
  }, [termo, produto.id])

  const handleVincular = async (outro) => {
    setSalvando(true)
    try {
      await vincularVariante(produto.id, outro.id)
      onVinculado()
    } catch (e) {
      alert('Erro ao vincular: ' + e.message)
      setSalvando(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>🔗 Vincular variante</h3>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 14 }}>
          Ligando <strong>{produto.nome}</strong> ({produto.quantidade} {produto.unidade || 'un'}) a outro
          tamanho/embalagem do mesmo produto. Isso passa a comparar o custo por kg/L entre os dois em
          qualquer cotação onde os dois aparecerem.
        </p>
        <input
          autoFocus
          placeholder="Buscar o outro produto pelo nome..."
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          style={inp}
        />
        {buscando && <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 8 }}>🔍 Buscando...</p>}
        <div style={{ marginTop: 10, maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {resultados.map((r) => (
            <button key={r.id} onClick={() => handleVincular(r)} disabled={salvando} style={itemBtn}>
              <div>
                <strong style={{ fontSize: '0.88rem' }}>{r.nome}</strong>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {r.quantidade} {r.unidade || 'un'}
                  {r.grupoVariante && r.grupoVariante === produto.grupoVariante ? ' · já é variante deste' : r.grupoVariante ? ' · já tem outra(s) variante(s) vinculada(s)' : ''}
                </div>
              </div>
              <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Vincular →</span>
            </button>
          ))}
          {!buscando && termo.trim().length >= 2 && resultados.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nenhum produto encontrado.</p>
          )}
        </div>
        <button onClick={onCancelar} disabled={salvando} style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600 }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const card = { width: '100%', maxWidth: 440, background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }
const inp = { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
const itemBtn = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer', textAlign: 'left', width: '100%' }
