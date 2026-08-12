import{useEffect,useState}from'react'
import{useNavigate}from'react-router-dom'
import{listarMinhasSalas,excluirSala,auth}from'../firebase.js'
import{formatarDataRelativa}from'../utils/ptBR.js'
export default function MinhasSalas(){
  const nav=useNavigate()
  const[salas,setSalas]=useState(null)
  const[excluindo,setExcluindo]=useState(null)
  const[erro,setErro]=useState(null)

  const carregar=()=>{
    listarMinhasSalas()
      .then(lista=>setSalas(lista.sort((a,b)=>new Date(b.criadoEm)-new Date(a.criadoEm))))
      .catch(e=>setErro(e.message))
  }
  useEffect(()=>{carregar()},[])

  const handleExcluir=async(codigo)=>{
    if(!confirm(`Excluir a sala #${codigo}? Essa ação não pode ser desfeita.`))return
    setExcluindo(codigo)
    try{
      await excluirSala(codigo)
      setSalas(s=>s.filter(x=>x.codigo!==codigo))
    }catch(e){alert('Erro ao excluir: '+e.message)}
    setExcluindo(null)
  }

  return<div style={{maxWidth:640,margin:'0 auto',padding:'24px 16px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h2 style={{margin:0}}>🗂️ Minhas Salas</h2>
      <button onClick={()=>nav('/')} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#1e293b',fontWeight:600,fontSize:'0.85rem'}}>← Início</button>
    </div>
    {erro&&<p style={{color:'#ef4444'}}>Erro ao carregar: {erro}</p>}
    <p style={{fontSize:'0.78rem',color:'#94a3b8',marginBottom:16}}>Como o login é anônimo, essa lista mostra as salas em que você participou neste navegador/dispositivo — em outro celular ou depois de limpar os dados do navegador, elas não aparecem aqui (mas continuam acessíveis pelo código).</p>
    {!erro&&salas===null&&<p style={{color:'#64748b',textAlign:'center'}}>Carregando...</p>}
    {salas&&salas.length===0&&<p style={{color:'#94a3b8',textAlign:'center',padding:'20px 0'}}>Nenhuma sala encontrada neste navegador.</p>}
    {salas&&salas.length>0&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
      {salas.map(s=>{
        const uid=auth.currentUser?.uid
        const podeExcluir='criadorUid'in s?s.criadorUid===uid:!!s.participantes?.[uid]
        return<div key={s.codigo} style={{background:'white',borderRadius:12,padding:16,boxShadow:'0 1px 3px rgba(0,0,0,0.08)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontFamily:'monospace',fontWeight:700,color:'#f59e0b',letterSpacing:2}}>#{s.codigo}</div>
            <div style={{fontSize:'0.9rem',fontWeight:600}}>{s.nome}</div>
            <div style={{fontSize:'0.78rem',color:'#94a3b8'}}>
              Criada {formatarDataRelativa(s.criadoEm)} · {Object.keys(s.participantes||{}).length} participante(s) · {(s.produtos||[]).length} produto(s)
              {!('criadorUid'in s)&&<span style={{marginLeft:6,color:'#f59e0b'}}>· sala antiga</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>nav(`/sala/${s.codigo}`)} style={{padding:'8px 14px',borderRadius:8,border:'none',background:'#3b82f6',color:'white',fontWeight:600,fontSize:'0.82rem'}}>Abrir</button>
            {podeExcluir&&<button onClick={()=>handleExcluir(s.codigo)} disabled={excluindo===s.codigo} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #fca5a5',background:'white',color:'#ef4444',fontWeight:600,fontSize:'0.82rem'}}>{excluindo===s.codigo?'Excluindo...':'🗑️ Excluir'}</button>}
          </div>
        </div>
      })}
    </div>}
  </div>
}
