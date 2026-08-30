import{useEffect,useMemo,useState}from'react'
import{useNavigate}from'react-router-dom'
import{listarBasePropria,definirAtivoBasePropria,desvincularVariante}from'../firebase.js'
import EditarProdutoBase from'./EditarProdutoBase.jsx'
import VincularVariante from'./VincularVariante.jsx'
export default function ManutencaoProdutos(){
  const nav=useNavigate()
  const[produtos,setProdutos]=useState(null)
  const[erro,setErro]=useState(null)
  const[busca,setBusca]=useState('')
  const[mostrarInativos,setMostrarInativos]=useState(false)
  const[editando,setEditando]=useState(null)
  const[vinculando,setVinculando]=useState(null)
  const[alternando,setAlternando]=useState(null)
  const[desvinculando,setDesvinculando]=useState(null)

  const carregar=()=>{
    listarBasePropria()
      .then(lista=>setProdutos(lista.sort((a,b)=>(a.nome||'').localeCompare(b.nome||'','pt-BR'))))
      .catch(e=>setErro(e.message))
  }
  useEffect(()=>{carregar()},[])

  // Nome dos "irmãos de variante" de cada produto (mesmo grupoVariante),
  // pra mostrar o badge sem precisar de outra consulta ao Firestore —
  // já temos a base inteira carregada em `produtos`.
  const variantesPorId=useMemo(()=>{
    const mapa={}
    const grupos={}
    ;(produtos||[]).forEach(p=>{
      if(!p.grupoVariante)return
      if(!grupos[p.grupoVariante])grupos[p.grupoVariante]=[]
      grupos[p.grupoVariante].push(p)
    })
    Object.values(grupos).forEach(itens=>{
      itens.forEach(p=>{mapa[p.id]=itens.filter(x=>x.id!==p.id)})
    })
    return mapa
  },[produtos])

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
  const handleVinculado=()=>{
    setVinculando(null)
    carregar()
  }
  const handleDesvincular=async(p)=>{
    if(!confirm(`Desvincular "${p.nome}" das variantes ligadas a ele?`))return
    setDesvinculando(p.id)
    try{
      await desvincularVariante(p.id)
      carregar()
    }catch(e){alert('Erro ao desvincular: '+e.message)}
    setDesvinculando(null)
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
    <p style={{fontSize:'0.8rem',color:'#64748b',marginBottom:16}}>Base compartilhada de produtos cadastrados via código de barras. Corrija nome, categoria ou quantidade de itens já cadastrados, desative os que não fazem mais sentido, ou vincule tamanhos/embalagens diferentes do mesmo produto (ex: 75g e 180g) pra comparar o custo por kg/L nas cotações.</p>
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
      {filtrados.map(p=>{
        const variantes=variantesPorId[p.id]||[]
        return<div key={p.id} style={{background:'white',borderRadius:12,padding:'12px 16px',boxShadow:'0 1px 3px rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,opacity:p.ativo===false?0.55:1}}>
        <div>
          <div style={{fontSize:'0.92rem',fontWeight:600}}>{p.nome}{p.ativo===false&&<span style={{marginLeft:8,fontSize:'0.7rem',color:'#ef4444',fontWeight:700}}>DESATIVADO</span>}</div>
          <div style={{fontSize:'0.78rem',color:'#94a3b8'}}>
            {p.marca&&`${p.marca} · `}{p.quantidade}{p.categoria&&` · ${p.categoria}`} · Cód: {p.codigoBarras}
          </div>
          {variantes.length>0&&<div style={{marginTop:4,fontSize:'0.72rem',color:'#7c3aed',fontWeight:600}}>
            🔗 variante de: {variantes.map(v=>`${v.nome} (${v.quantidade}${v.unidade||''})`).join(', ')}
          </div>}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={()=>setEditando(p)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #93c5fd',background:'white',color:'#3b82f6',fontWeight:600,fontSize:'0.78rem'}}>✏️ Editar</button>
          <button onClick={()=>setVinculando(p)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #c4b5fd',background:'white',color:'#7c3aed',fontWeight:600,fontSize:'0.78rem'}}>🔗 Variante</button>
          {variantes.length>0&&<button onClick={()=>handleDesvincular(p)} disabled={desvinculando===p.id} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#64748b',fontWeight:600,fontSize:'0.78rem'}}>
            {desvinculando===p.id?'...':'✂️ Desvincular'}
          </button>}
          <button onClick={()=>handleAlternarAtivo(p)} disabled={alternando===p.id} style={{padding:'7px 12px',borderRadius:8,border:`1px solid ${p.ativo===false?'#86efac':'#fca5a5'}`,background:'white',color:p.ativo===false?'#16a34a':'#ef4444',fontWeight:600,fontSize:'0.78rem'}}>
            {alternando===p.id?'...':p.ativo===false?'✓ Reativar':'🚫 Desativar'}
          </button>
        </div>
      </div>})}
    </div>}
    {editando&&<EditarProdutoBase produto={editando} onSalvo={handleSalvo} onCancelar={()=>setEditando(null)}/>}
    {vinculando&&<VincularVariante produto={vinculando} onVinculado={handleVinculado} onCancelar={()=>setVinculando(null)}/>}
  </div>
}
