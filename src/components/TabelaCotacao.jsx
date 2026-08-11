export default function TabelaCotacao({ produtos, precos, participantes, meuMercado, onPrecoChange }) {
  const mercados = [...new Set(Object.values(participantes).map(p => p.mercado))]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
        <thead>
          <tr>
            <th style={thStyle}>Produto</th>
            {mercados.map(m => <th key={m} style={thStyle}>{m}</th>)}
            <th style={thStyle}>Menor Preço</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map(p => {
            let menor = Infinity, mercMenor = '-'
            mercados.forEach(m => {
              const v = precos[p.id]?.[m]
              if (v && v < menor) { menor = v; mercMenor = m }
            })
            return (
              <tr key={p.id}>
                <td style={tdStyle}>
                  <strong>{p.nome}</strong>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{p.quantidade}</div>
                </td>
                {mercados.map(m => {
                  const v = precos[p.id]?.[m]
                  const isBest = m === mercMenor && menor !== Infinity
                  const isMine = m === meuMercado
                  return (
                    <td key={m} style={tdStyle}>
                      <input
                        key={`${p.id}-${m}-${v ?? ''}`}
                        type="text"
                        defaultValue={v ? v.toFixed(2).replace('.', ',') : ''}
                        onBlur={e => onPrecoChange(p.id, m, e.target.value)}
                        placeholder="0,00"
                        style={{
                          width: 80, padding: '6px 8px', border: `1px solid ${isBest ? '#10b981' : '#e2e8f0'}`,
                          borderRadius: 6, textAlign: 'right', fontSize: '0.85rem',
                          background: isBest ? '#ecfdf5' : isMine ? '#eff6ff' : 'white',
                          fontWeight: isBest ? 700 : 400,
                          boxShadow: isMine ? '0 0 0 2px #93c5fd' : 'none',
                        }}
                      />
                    </td>
                  )
                })}
                <td style={{ ...tdStyle, color: '#10b981', fontWeight: 700, background: '#ecfdf5' }}>
                  {menor !== Infinity ? `R$ ${menor.toFixed(2).replace('.', ',')}` : '-'}
                  {mercMenor !== '-' && <div style={{ fontSize: '0.75rem', fontWeight: 400 }}>{mercMenor}</div>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const thStyle = { padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }
const tdStyle = { padding: '10px', borderBottom: '1px solid #e2e8f0' }
