import { useState } from 'react'
import { formatarDataRelativa } from '../utils/ptBR.js'
import { linkParticipante, copiarTexto } from '../utils/linkParticipante.js'

// Cada sessão anônima nova (outro navegador/aparelho, ou cache limpo)
// gera um uid novo — se a pessoa reabrir seu link pessoal várias vezes
// em sessões diferentes, cada uma vira uma entrada própria em
// participantes (o Firestore não tem como saber que são "a mesma
// pessoa"). Aqui só juntamos visualmente entradas com nome+mercado
// idênticos, mantendo a mais recente — não apaga nada do banco, é só
// a lista parar de parecer lotada de gente que não existe de verdade.
// Limpeza de verdade (apagar as entradas antigas) só o admin faz, na
// tela /admin — ver README.
function agruparPorIdentidade(lista) {
  const porChave = new Map()
  for (const p of lista) {
    const chave = `${(p.nome || '').trim().toLowerCase()}|${(p.mercado || '').trim().toLowerCase()}`
    const atual = porChave.get(chave)
    if (!atual) {
      porChave.set(chave, { ...p, _duplicatas: 0 })
    } else if (new Date(p.entrouEm || 0) > new Date(atual.entrouEm || 0)) {
      porChave.set(chave, { ...p, _duplicatas: atual._duplicatas + 1 })
    } else {
      atual._duplicatas += 1
    }
  }
  return [...porChave.values()]
}

export default function Participantes({ participantes, codigo }) {
  const lista = agruparPorIdentidade(Object.values(participantes))
  const [copiadoUid, setCopiadoUid] = useState(null)

  const handleCopiar = async (p) => {
    const ok = await copiarTexto(linkParticipante(codigo, p.nome, p.mercado))
    if (ok) {
      setCopiadoUid(p.uid)
      setTimeout(() => setCopiadoUid(null), 1800)
    }
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 10 }}>👥 Participantes online ({lista.length})</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {lista.map(p => (
          <span key={p.uid} style={{ padding: '6px 6px 6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
            {p.nome} — {p.mercado}
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>
              {formatarDataRelativa(p.entrouEm)}
              {p._duplicatas > 0 && ` · +${p._duplicatas} sessão(ões) antiga(s)`}
            </span>
            {codigo && (
              <button
                onClick={() => handleCopiar(p)}
                title={`Copiar o link de acesso de ${p.nome} (útil se essa pessoa perder o acesso e precisar reentrar)`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 4px', color: copiadoUid === p.uid ? '#10b981' : '#94a3b8' }}
              >
                {copiadoUid === p.uid ? '✅' : '🔗'}
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
