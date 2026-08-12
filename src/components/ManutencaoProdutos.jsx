import{useEffect,useState}from'react'
import{useNavigate}from'react-router-dom'
import{listarBasePropria,definirAtivoBasePropria}from'../firebase.js'
import EditarProdutoBase from'./EditarProdutoBase.jsx'
export default function ManutencaoProdutos(){
  const nav=useNavigate()
  const[produtos,setProdutos]=useState(null)
  const[erro,setErro]=useState(null)
  const[busca,setBusca]=useState('')
  const[mostrarInativos,setMostrarInativos]=useState(false)
  const[editando,setEditando]=useState(null)
  const[alternando,setAlternando]=useState(null)

  const carregar=()=>{
    listarBasePropria()
      .then(lista=>setProdutos(lista.sort((a,b)=>(a.nome||'').localeCompare(b.nome||'','pt-BR'))))
      .catch(e=>setErro(e.message))
  }
  useEffect(()=>{carregar()},[])

  const handleSalvo=(atualizado)=>{
    setProdutos(p=>p.map(x=>x.id===atualizado.id?atualizado:x))
    setEditando(null)
  }
  const handleAlternarAtivo=async(p)=>{
    setAlternando(p.id)
    try{
      await definirAtivoBasePropria(p.id,!p.ativo)
      setProdutos(ps=>ps.map(x=>x.id===p.id?{...x,ativo:!p.ativo}:x))
    }catch(e){alert('Erro: '+e.message)}
    setAlternando(null)
  }

  const filtrados=(produtos||[]).filter(p=>{
    if(!mostrarInativos&&p.ativo===false)return false
    if(!busca.trim())return true
    const b=busca.toLowerCase()
    return(p.nome||'').toLowerCase().includes(b)||(p.codigoBarras||'').includes(b)||(p.marca||'').toLowerCase().includes(b)
  })

  return<div style={{maxWidth:720,margin:'0 auto',padding:'24px 16px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
      <h2 style={{margin:0}}>🛠️ Manutenção de Produtos</h2>
      <button onClick={()=>nav('/')} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#1e293b',fontWeight:600,fontSize:'0.85rem'}}>← Início</button>
    </div>
    <p style={{fontSize:'0.8rem',color:'#64748b',marginBottom:16}}>Base compartilhada de produtos cadastrados via código de barras. Corrija nome, categoria ou quantidade de itens já cadastrados, ou desative os que não fazem mais sentido.</p>
    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
      <input placeholder="🔍 Buscar por nome, marca ou código de barras" value={busca} onChange={e=>setBusca(e.target.value)} style={{flex:1,minWidth:220,padding:'10px 14px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.9rem',outline:'none'}}/>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.85rem',color:'#64748b'}}>
        <input type="checkbox" checked={mostrarInativos} onChange={e=>setMostrarInativos(e.target.checked)}/>
        Mostrar desativados
      </label>
    </div>
    {erro&&<p style={{color:'#ef4444'}}>Erro ao carregar: {erro}</p>}
    {!erro&&produtos===null&&<p style={{color:'#64748b',textAlign:'center'}}>Carregando...</p>}
    {produtos&&filtrados.length===0&&<p style={{color:'#94a3b8',textAlign:'center',padding:'20px 0'}}>Nenhum produto encontrado.</p>}
    {produtos&&filtrados.length>0&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
      {filtrados.map(p=><div key={p.id} style={{background:'white',borderRadius:12,padding:'12px 16px',boxShadow:'0 1px 3px rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,opacity:p.ativo===false?0.55:1}}>
        <div>
          <div style={{fontSize:'0.92rem',fontWeight:600}}>{p.nome}{p.ativo===false&&<span style={{marginLeft:8,fontSize:'0.7rem',color:'#ef4444',fontWeight:700}}>DESATIVADO</span>}</div>
          <div style={{fontSize:'0.78rem',color:'#94a3b8'}}>
            {p.marca&&`${p.marca} · `}{p.quantidade}{p.categoria&&` · ${p.categoria}`} · Cód: {p.codigoBarras}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setEditando(p)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #93c5fd',background:'white',color:'#3b82f6',fontWeight:600,fontSize:'0.78rem'}}>✏️ Editar</button>
          <button onClick={()=>handleAlternarAtivo(p)} disabled={alternando===p.id} style={{padding:'7px 12px',borderRadius:8,border:`1px solid ${p.ativo===false?'#86efac':'#fca5a5'}`,background:'white',color:p.ativo===false?'#16a34a':'#ef4444',fontWeight:600,fontSize:'0.78rem'}}>
            {alternando===p.id?'...':p.ativo===false?'✓ Reativar':'🚫 Desativar'}
          </button>
        </div>
      </div>)}
    </div>}
    {editando&&<EditarProdutoBase produto={editando} onSalvo={handleSalvo} onCancelar={()=>setEditando(null)}/>}
  </div>
}
