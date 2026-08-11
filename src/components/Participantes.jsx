export default function Participantes({ participantes }) {
  const lista = Object.values(participantes)
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 8 }}>👥 Participantes ({lista.length})</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {lista.map(p => (
          <span key={p.uid} style={{ padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
            {p.nome} — {p.mercado}
          </span>
        ))}
      </div>
    </div>
  )
}
