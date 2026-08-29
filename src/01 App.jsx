import{useEffect,useState}from'react'
import{Routes,Route,useNavigate}from'react-router-dom'
import{loginAnonimo,auth}from'./firebase.js'
import{useOnline,lerUltimaSala,limparUltimaSala}from'./utils/conexao.js'
import CriarSala from'./components/CriarSala.jsx'
import EntrarSala from'./components/EntrarSala.jsx'
import Sala from'./components/Sala.jsx'
import MinhasSalas from'./components/MinhasSalas.jsx'
import ManutencaoProdutos from'./components/ManutencaoProdutos.jsx'

function App(){
  const[carregando,setCarregando]=useState(true)
  const[erro,setErro]=useState(null)
  const online=useOnline()
  useEffect(()=>{
    loginAnonimo().then(()=>setCarregando(false)).catch(e=>{
      // Sem internet o login anônimo falha, mas a sessão anterior segue válida
      // no cache — nesse caso entramos em modo offline em vez de travar na tela de erro.
      if(auth?.currentUser){setCarregando(false);return}
      setErro(e)
    })
  },[])
  if(erro)return<div style={{display:'flex',flexDirection:'column',gap:10,justifyContent:'center',alignItems:'center',height:'100vh',padding:'0 24px',textAlign:'center',color:'#64748b'}}><div style={{fontSize:'1.5rem'}}>⚠️</div><p>Erro ao conectar ao Firebase.</p><p style={{fontSize:'0.85rem'}}>{online?'Verifique .env e login anônimo.':'Você está sem internet. Reconecte e tente de novo.'}</p><button onClick={()=>window.location.reload()} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#10b981',color:'white',fontWeight:700}}>Tentar novamente</button></div>
  if(carregando)return<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',color:'#64748b'}}>Conectando...</div>
  return<Routes><Route path="/" element={<Home/>}/><Route path="/criar" element={<CriarSala/>}/><Route path="/entrar" element={<EntrarSala/>}/><Route path="/sala/:codigo" element={<Sala/>}/><Route path="/minhas-salas" element={<MinhasSalas/>}/><Route path="/manutencao" element={<ManutencaoProdutos/>}/></Routes>
}

function Home(){
  const nav=useNavigate()
  const online=useOnline()
  const[ultima,setUltima]=useState(()=>lerUltimaSala())
  return<div style={{maxWidth:420,margin:'0 auto',padding:'40px 16px',textAlign:'center'}}><h1 style={{fontSize:'1.8rem',color:'#1e293b',marginBottom:8}}>🛒 Cotação Online</h1><p style={{color:'#64748b',marginBottom:16}}>Compare preços entre supermercados</p>
  {!online&&<div style={{background:'#fef3c7',border:'1px solid #fcd34d',color:'#92400e',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:'0.82rem',fontWeight:600}}>📴 Sem internet — dá pra reabrir a última sala com os dados já baixados.</div>}
  {ultima&&<div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,padding:14,marginBottom:16,textAlign:'left',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
    <div style={{fontSize:'0.75rem',color:'#64748b',fontWeight:600}}>Continuar de onde parou</div>
    <div style={{fontFamily:'monospace',fontWeight:700,color:'#f59e0b',letterSpacing:2}}>#{ultima.codigo}</div>
    <div style={{fontSize:'0.85rem',fontWeight:600,marginBottom:8}}>{ultima.nome||'Cotação'}</div>
    <div style={{display:'flex',gap:8}}>
      <button onClick={()=>nav(`/sala/${ultima.codigo}`)} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#3b82f6',color:'white',fontWeight:700,fontSize:'0.85rem'}}>↩️ Retomar sala</button>
      <button onClick={()=>{limparUltimaSala();setUltima(null)}} style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#64748b',fontWeight:600,fontSize:'0.8rem'}}>Dispensar</button>
    </div>
  </div>}
  <div style={{display:'flex',flexDirection:'column',gap:12}}><button onClick={()=>nav('/criar')} style={btnPrim}>➕ Criar Nova Cotação</button><button onClick={()=>nav('/entrar')} style={btnSec}>🔐 Entrar com Código</button><button onClick={()=>nav('/minhas-salas')} style={btnLink}>🗂️ Minhas Salas</button><button onClick={()=>nav('/manutencao')} style={btnLink}>🛠️ Manutenção de Produtos</button></div><p style={{marginTop:24,fontSize:'0.8rem',color:'#94a3b8'}}>🌎 Brasil · Fuso: America/Sao_Paulo · Base Própria + Open Food Facts</p></div>
}
const btnPrim={padding:'14px 24px',borderRadius:10,border:'none',background:'#10b981',color:'white',fontWeight:700,fontSize:'1rem'}
const btnSec={padding:'14px 24px',borderRadius:10,border:'2px solid #e2e8f0',background:'white',color:'#1e293b',fontWeight:700,fontSize:'1rem'}
const btnLink={padding:'10px 24px',borderRadius:10,border:'none',background:'transparent',color:'#64748b',fontWeight:600,fontSize:'0.9rem'}
export default App
