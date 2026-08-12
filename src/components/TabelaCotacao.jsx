import{formatarInputPreco}from'../utils/ptBR.js'
export default function TabelaCotacao({produtos,precos,participantes,meuMercado,onPrecoChange}){
  const mercados=[...new Set(Object.values(participantes).map(p=>p.mercado))]
  return<div style={{overflowX:'auto'}}>
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.88rem'}}>
      <thead><tr>
        <th style={th}>Produto</th>
        {mercados.map(m=><th key={m} style={th}>{m}{m===meuMercado&&<span style={{color:'#3b82f6'}}> (você)</span>}</th>)}
        <th style={th}>Menor Preço</th>
      </tr></thead>
      <tbody>
        {produtos.map(p=>{
          let menor=Infinity,mercMenor='-'
          mercados.forEach(m=>{const v=precos[p.id]?.[m];if(v&&v<menor){menor=v;mercMenor=m}})
          return<tr key={p.id}>
            <td style={td}><strong>{p.nome}</strong><div style={{fontSize:'0.78rem',color:'#64748b'}}>{p.quantidade}{p.categoria&&` · ${p.categoria}`}</div></td>
            {mercados.map(m=>{
              const v=precos[p.id]?.[m]
              const best=m===mercMenor&&menor!==Infinity
              const mine=m===meuMercado
              return<td key={m} style={td}>
                {mine
                  ?<input key={`${p.id}-${m}-${v??''}`} type="text" inputMode="decimal" defaultValue={formatarInputPreco(v)} onBlur={e=>onPrecoChange(p.id,m,e.target.value)} placeholder="0,00"
                    style={{width:85,padding:'6px 8px',border:`1px solid ${best?'#10b981':'#93c5fd'}`,borderRadius:6,textAlign:'right',fontSize:'0.85rem',background:best?'#ecfdf5':'#eff6ff',fontWeight:best?700:400,boxShadow:'0 0 0 2px #dbeafe',outline:'none'}}/>
                  :<div title="Somente quem cadastrou esse mercado pode editar" style={{width:85,padding:'6px 8px',border:`1px solid ${best?'#10b981':'#e2e8f0'}`,borderRadius:6,textAlign:'right',fontSize:'0.85rem',background:best?'#ecfdf5':'#f8fafc',color:v?'#1e293b':'#cbd5e1',fontWeight:best?700:400,boxSizing:'border-box'}}>
                    {v?formatarInputPreco(v):'—'}
                  </div>}
              </td>
            })}
            <td style={{...td,color:'#059669',fontWeight:700,background:'#ecfdf5'}}>{menor!==Infinity?`R$ ${menor.toFixed(2).replace('.',',')}`:'—'}{mercMenor!=='-'&&<div style={{fontSize:'0.72rem',fontWeight:400,color:'#047857'}}>{mercMenor}</div>}</td>
          </tr>
        })}
      </tbody>
    </table>
    {!mercados.includes(meuMercado)&&<p style={{fontSize:'0.78rem',color:'#94a3b8',marginTop:8}}>Você ainda não está associado a nenhum mercado nessa sala.</p>}
  </div>
}
const th={padding:'10px',textAlign:'left',borderBottom:'1px solid #e2e8f0',color:'#64748b',fontWeight:600,fontSize:'0.75rem',textTransform:'uppercase',whiteSpace:'nowrap'}
const td={padding:'10px',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}
