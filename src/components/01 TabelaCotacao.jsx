import{formatarInputPreco}from'../utils/ptBR.js'
import{infoPreco}from'../utils/precos.js'
export default function TabelaCotacao({produtos,precos,participantes,meuMercado,onPrecoChange,onEditarProduto,onRemoverProduto,onEditarOferta,vazioTexto}){
  // Ordena alfabeticamente: o Firestore não garante a ordem das chaves de um
  // campo mapa, então sem isso cada participante via as colunas em ordem diferente.
  const mercados=[...new Set(Object.values(participantes).map(p=>p.mercado))].sort((a,b)=>a.localeCompare(b,'pt-BR'))
  if(!produtos||produtos.length===0)return<p style={{color:'#94a3b8',textAlign:'center',padding:'24px 0',fontSize:'0.9rem'}}>{vazioTexto||'Nenhum produto por aqui ainda.'}</p>
  return<div style={{overflowX:'auto'}}>
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.88rem'}}>
      <thead><tr>
        <th style={th}>Produto</th>
        {mercados.map(m=><th key={m} style={th}>{m}{m===meuMercado&&<span style={{color:'#3b82f6'}}> (você)</span>}</th>)}
        <th style={th}>Menor Preço</th>
      </tr></thead>
      <tbody>
        {produtos.map(p=>{
          let menor=Infinity,mercMenor='-',infoMenor=null
          mercados.forEach(m=>{const i=infoPreco(precos[p.id]?.[m]);if(i&&i.preco&&i.preco<menor){menor=i.preco;mercMenor=m;infoMenor=i}})
          return<tr key={p.id}>
            <td style={td}>
              <div style={{display:'flex',alignItems:'start',gap:6}}>
                <div style={{flex:1}}>
                  <strong>{p.nome}</strong>
                  <div style={{fontSize:'0.78rem',color:'#64748b'}}>{p.quantidade}{p.categoria&&` · ${p.categoria}`}</div>
                </div>
                {(onEditarProduto||onRemoverProduto)&&<div style={{display:'flex',gap:2,flexShrink:0}}>
                  {onEditarProduto&&<button onClick={()=>onEditarProduto(p)} style={iconBtn} title="Editar produto">✏️</button>}
                  {onRemoverProduto&&<button onClick={()=>onRemoverProduto(p)} style={{...iconBtn,color:'#ef4444'}} title="Remover produto">🗑️</button>}
                </div>}
              </div>
            </td>
            {mercados.map(m=>{
              const info=infoPreco(precos[p.id]?.[m])
              const v=info?.preco
              const best=m===mercMenor&&menor!==Infinity
              const mine=m===meuMercado
              return<td key={m} style={td}>
                <div style={{display:'flex',flexDirection:'column',gap:3,alignItems:'flex-end'}}>
                  {mine
                    ?<input key={`${p.id}-${m}-${v??''}`} type="text" inputMode="decimal" defaultValue={formatarInputPreco(v)} onBlur={e=>onPrecoChange(p.id,m,e.target.value)} placeholder="0,00"
                      style={{width:85,padding:'6px 8px',border:`1px solid ${best?'#10b981':'#93c5fd'}`,borderRadius:6,textAlign:'right',fontSize:'0.85rem',background:best?'#ecfdf5':'#eff6ff',fontWeight:best?700:400,boxShadow:'0 0 0 2px #dbeafe',outline:'none'}}/>
                    :<div title="Somente quem cadastrou esse mercado pode editar" style={{width:85,padding:'6px 8px',border:`1px solid ${best?'#10b981':'#e2e8f0'}`,borderRadius:6,textAlign:'right',fontSize:'0.85rem',background:best?'#ecfdf5':'#f8fafc',color:v?'#1e293b':'#cbd5e1',fontWeight:best?700:400,boxSizing:'border-box'}}>
                      {v?formatarInputPreco(v):'—'}
                    </div>}
                  {info?.oferta&&<span title={info.obsOferta||`Preço com ${info.tipoOferta}`} style={selo}>🏷️ {info.tipoOferta}</span>}
                  {mine&&v&&onEditarOferta&&<button onClick={()=>onEditarOferta(p)} style={linkBtn}>{info?.oferta?'alterar oferta':'marcar oferta'}</button>}
                </div>
              </td>
            })}
            <td style={{...td,color:'#059669',fontWeight:700,background:'#ecfdf5'}}>
              {menor!==Infinity?`R$ ${menor.toFixed(2).replace('.',',')}`:'—'}
              {mercMenor!=='-'&&<div style={{fontSize:'0.72rem',fontWeight:400,color:'#047857'}}>{mercMenor}</div>}
              {infoMenor?.oferta&&<div style={{fontSize:'0.7rem',fontWeight:600,color:'#b45309'}} title={infoMenor.obsOferta}>🏷️ exige {infoMenor.tipoOferta}</div>}
            </td>
          </tr>
        })}
      </tbody>
    </table>
    {!mercados.includes(meuMercado)&&<p style={{fontSize:'0.78rem',color:'#94a3b8',marginTop:8}}>Você ainda não está associado a nenhum mercado nessa sala.</p>}
  </div>
}
const th={padding:'10px',textAlign:'left',borderBottom:'1px solid #e2e8f0',color:'#64748b',fontWeight:600,fontSize:'0.75rem',textTransform:'uppercase',whiteSpace:'nowrap'}
const td={padding:'10px',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap',verticalAlign:'top'}
const iconBtn={background:'none',border:'none',color:'#3b82f6',fontSize:'0.85rem',cursor:'pointer',padding:2}
const selo={display:'inline-block',background:'#fef3c7',color:'#92400e',border:'1px solid #fcd34d',borderRadius:999,padding:'1px 7px',fontSize:'0.68rem',fontWeight:700,maxWidth:110,overflow:'hidden',textOverflow:'ellipsis'}
const linkBtn={background:'none',border:'none',color:'#94a3b8',fontSize:'0.68rem',cursor:'pointer',padding:0,textDecoration:'underline'}
