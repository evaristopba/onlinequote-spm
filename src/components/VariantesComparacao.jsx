import { infoPreco } from '../utils/precos.js'
import { calcularPrecoPorUnidade, formatarMoeda } from '../utils/ptBR.js'

// Mostra, pra produtos da cotação já vinculados como variantes um do
// outro na base (ex: creme dental 75g e 180g), qual tamanho sai mais em
// conta por kg/L/unidade — usando o menor preço já lançado de cada um.
// Só aparece quando 2+ variantes do mesmo grupo estão na cotação atual
// E já têm pelo menos um preço lançado (senão não dá pra comparar nada).
export default function VariantesComparacao({ produtos, precos, mercados, grupoPorCodigo }) {
  const grupos = {}
  produtos.forEach((p) => {
    const grupo = p.codigo ? grupoPorCodigo[p.codigo] : null
    if (!grupo) return
    let menor = Infinity
    mercados.forEach((m) => {
      const v = infoPreco(precos[p.id]?.[m])?.preco
      if (v && v < menor) menor = v
    })
    if (menor === Infinity) return
    const porUnidade = calcularPrecoPorUnidade(menor, p.quantidade, p.unidade || 'un')
    if (!porUnidade) return
    if (!grupos[grupo]) grupos[grupo] = []
    grupos[grupo].push({
      nome: p.nome,
      quantidade: p.quantidade,
      unidade: p.unidade || 'un',
      preco: menor,
      custoPorUnidade: porUnidade.valor,
      unidadeBase: porUnidade.unidade,
    })
  })

  const gruposComparaveis = Object.values(grupos).filter((itens) => itens.length >= 2)
  if (gruposComparaveis.length === 0) return null

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: 18, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>🔁 Comparar tamanhos/embalagens</h3>
      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 14 }}>
        Produtos vinculados como o mesmo item em tamanhos diferentes (base própria), comparando o custo real por unidade.
      </p>
      {gruposComparaveis.map((itens, i) => {
        const ordenado = [...itens].sort((a, b) => a.custoPorUnidade - b.custoPorUnidade)
        const melhor = ordenado[0]
        const pior = ordenado[ordenado.length - 1]
        const economia = pior.custoPorUnidade > 0 ? Math.round((1 - melhor.custoPorUnidade / pior.custoPorUnidade) * 100) : 0
        return (
          <div key={i} style={{ marginBottom: 14, padding: 14, background: '#f8fafc', borderRadius: 8 }}>
            {ordenado.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: idx < ordenado.length - 1 ? '1px dashed #e2e8f0' : 'none',
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{item.nome}</strong>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}> — {item.quantidade}{item.unidade}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: idx === 0 ? '#059669' : '#1e293b', fontSize: '0.9rem' }}>{formatarMoeda(item.preco)}</div>
                  <div style={{ fontSize: '0.75rem', color: idx === 0 ? '#059669' : '#94a3b8', fontWeight: idx === 0 ? 700 : 400 }}>
                    {formatarMoeda(item.custoPorUnidade)}/{item.unidadeBase}
                    {idx === 0 && ' 🏆'}
                  </div>
                </div>
              </div>
            ))}
            {economia > 0 && (
              <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                💡 Levar "{melhor.nome}" sai até {economia}% mais em conta por {melhor.unidadeBase} do que "{pior.nome}".
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
