export default function ListaOtimizada({ produtos, precos, participantes }) {
  const mercados = [...new Set(Object.values(participantes).map(p => p.mercado))]
  let grupos = {}
  let totalOpt = 0, totalMax = 0, mercadosUsados = new Set()

  produtos.forEach(p => {
    let menor = Infinity, mercMenor = null, maior = 0
    mercados.forEach(m => {
      const v = precos[p.id]?.[m]
      if (v) {
        if (v < menor) { menor = v; mercMenor = m }
        if (v > maior) maior = v
      }
    })
    if (mercMenor) {
      if (!grupos[mercMenor]) grupos[mercMenor] = []
      grupos[mercMenor].push({ nome: p.nome, qtd: p.quantidade, preco: menor })
      totalOpt += menor
      totalMax += maior || menor
      mercadosUsados.add(mercMenor)
    }
  })

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: 16, borderRadius: 10, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.5rem' }}>R$ {totalOpt.toFixed(2).replace('.', ',')}</h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.85rem' }}>Total Otimizado</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', padding: 16, borderRadius: 10, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.5rem' }}>R$ {(totalMax - totalOpt).toFixed(2).replace('.', ',')}</h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.85rem' }}>Economia</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: 16, borderRadius: 10, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.5rem' }}>{mercadosUsados.size}</h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.85rem' }}>Mercados</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem' }}>✅ Lista Otimizada — Onde Comprar</h3>
        {Object.keys(grupos).length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center' }}>Aguardando preços...</p>
        ) : (
          Object.entries(grupos).map(([mercado, itens]) => {
            const sub = itens.reduce((s, i) => s + i.preco, 0)
            return (
              <div key={mercado} style={{ marginBottom: 14, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ color: '#1e293b' }}>🏪 {mercado}</strong>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>R$ {sub.toFixed(2).replace('.', ',')}</span>
                </div>
                {itens.map((i, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0', fontSize: '0.88rem' }}>
                    <span>{i.nome} <small style={{ color: '#64748b' }}>({i.qtd})</small></span>
                    <span style={{ fontWeight: 600 }}>R$ {i.preco.toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
