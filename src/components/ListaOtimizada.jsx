import{formatarMoeda}from'../utils/ptBR.js'
import{infoPreco}from'../utils/precos.js'
export default function ListaOtimizada({produtos,precos,participantes}){
  const mercados=[...new Set(Object.values(participantes).map(p=>p.mercado))].sort((a,b)=>a.localeCompare(b,'pt-BR'))
  const grupos={};let totalOpt=0,totalMax=0,mercadosUsados=new Set();const categorias={}
  produtos.forEach(p=>{
    let menor=Infinity,mercMenor=null,maior=0,ofertaMenor=null
    mercados.forEach(m=>{const i=infoPreco(precos[p.id]?.[m]);const v=i?.preco;if(v){if(v<menor){menor=v;mercMenor=m;ofertaMenor=i.oferta?i:null}if(v>maior)maior=v}})
    if(mercMenor){
      if(!grupos[mercMenor])grupos[mercMenor]=[]
      grupos[mercMenor].push({nome:p.nome,qtd:p.quantidade,preco:menor,categoria:p.categoria||'Outros',oferta:ofertaMenor})
      totalOpt+=menor;totalMax+=maior||menor;mercadosUsados.add(mercMenor)
      const cat=p.categoria||'Outros';if(!categorias[cat])categorias[cat]=[]
      categorias[cat].push({nome:p.nome,qtd:p.quantidade,preco:menor,mercado:mercMenor})
    }
  })
  return<div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:16}}>
      <div style={{background:'linear-gradient(135deg,#10b981,#059669)',color:'white',padding:16,borderRadius:10,textAlign:'center'}}><h3 style={{margin:'0 0 4px',fontSize:'1.4rem'}}>{formatarMoeda(totalOpt)}</h3><p style={{margin:0,opacity:0.9,fontSize:'0.82rem'}}>Total Otimizado</p></div>
      <div style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)',color:'white',padding:16,borderRadius:10,textAlign:'center'}}><h3 style={{margin:'0 0 4px',fontSize:'1.4rem'}}>{formatarMoeda(totalMax-totalOpt)}</h3><p style={{margin:0,opacity:0.9,fontSize:'0.82rem'}}>Economia</p></div>
      <div style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'white',padding:16,borderRadius:10,textAlign:'center'}}><h3 style={{margin:'0 0 4px',fontSize:'1.4rem'}}>{mercadosUsados.size}</h3><p style={{margin:0,opacity:0.9,fontSize:'0.82rem'}}>Mercados</p></div>
    </div>
    <div style={{background:'white',borderRadius:12,padding:18,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
      <h3 style={{margin:'0 0 14px',fontSize:'1.05rem'}}>✅ Lista por Mercado</h3>
      {Object.keys(grupos).length===0?<p style={{color:'#64748b',textAlign:'center',padding:'20px 0'}}>Aguardando preços...</p>:Object.entries(grupos).map(([mercado,itens])=>{const sub=itens.reduce((s,i)=>s+i.preco,0);return<div key={mercado} style={{marginBottom:14,padding:14,background:'#f8fafc',borderRadius:8}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><strong style={{color:'#1e293b',fontSize:'1rem'}}>🏪 {mercado}</strong><span style={{color:'#059669',fontWeight:700,fontSize:'1.05rem'}}>{formatarMoeda(sub)}</span></div>{itens.map((i,idx)=><div key={idx} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:idx<itens.length-1?'1px dashed #e2e8f0':'none',fontSize:'0.88rem'}}><span>{i.nome}<small style={{color:'#64748b'}}>({i.qtd})</small><span style={{fontSize:'0.7rem',color:'#94a3b8',marginLeft:6}}>{i.categoria}</span>{i.oferta&&<span title={i.oferta.obsOferta} style={{marginLeft:6,background:'#fef3c7',color:'#92400e',border:'1px solid #fcd34d',borderRadius:999,padding:'1px 6px',fontSize:'0.65rem',fontWeight:700}}>🏷️ {i.oferta.tipoOferta}</span>}</span><span style={{fontWeight:600}}>{formatarMoeda(i.preco)}</span></div>)}</div>})}
    </div>
    {Object.keys(categorias).length>0&&<div style={{background:'white',borderRadius:12,padding:18,boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
      <h3 style={{margin:'0 0 14px',fontSize:'1.05rem'}}>📂 Lista por Categoria</h3>
      {Object.entries(categorias).map(([cat,itens])=>{const sub=itens.reduce((s,i)=>s+i.preco,0);return<div key={cat} style={{marginBottom:12,padding:12,background:'#f8fafc',borderRadius:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><strong style={{color:'#1e293b'}}>{cat}</strong><span style={{color:'#3b82f6',fontWeight:700}}>{formatarMoeda(sub)}</span></div>{itens.map((i,idx)=><div key={idx} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:'0.85rem',color:'#475569'}}><span>{i.nome} ({i.qtd})</span><span>{i.mercado} · {formatarMoeda(i.preco)}</span></div>)}</div>})}
    </div>}
  </div>
}
