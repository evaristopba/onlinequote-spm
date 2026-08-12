import{useEffect,useState}from'react'
import{Routes,Route,useNavigate}from'react-router-dom'
import{loginAnonimo}from'./firebase.js'
import CriarSala from'./components/CriarSala.jsx'
import EntrarSala from'./components/EntrarSala.jsx'
import Sala from'./components/Sala.jsx'
import MinhasSalas from'./components/MinhasSalas.jsx'

function App(){
  const[carregando,setCarregando]=useState(true)
  const[erro,setErro]=useState(null)
  useEffect(()=>{loginAnonimo().then(()=>setCarregando(false)).catch(e=>setErro(e))},[])
  if(erro)return<div style={{display:'flex',flexDirection:'column',gap:10,justifyContent:'center',alignItems:'center',height:'100vh',padding:'0 24px',textAlign:'center',color:'#64748b'}}><div style={{fontSize:'1.5rem'}}>⚠️</div><p>Erro ao conectar ao Firebase.</p><p style={{fontSize:'0.85rem'}}>Verifique .env e login anônimo.</p><button onClick={()=>window.location.reload()} style={{padding:'10px 20px',borderRadius:8,border:'none',background:'#10b981',color:'white',fontWeight:700}}>Tentar novamente</button></div>
  if(carregando)return<div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',color:'#64748b'}}>Conectando...</div>
  return<Routes><Route path="/" element={<Home/>}/><Route path="/criar" element={<CriarSala/>}/><Route path="/entrar" element={<EntrarSala/>}/><Route path="/sala/:codigo" element={<Sala/>}/><Route path="/minhas-salas" element={<MinhasSalas/>}/></Routes>
}

function Home(){
  const nav=useNavigate()
  return<div style={{maxWidth:420,margin:'0 auto',padding:'40px 16px',textAlign:'center'}}><h1 style={{fontSize:'1.8rem',color:'#1e293b',marginBottom:8}}>🛒 Cotação Online</h1><p style={{color:'#64748b',marginBottom:32}}>Compare preços entre supermercados</p><div style={{display:'flex',flexDirection:'column',gap:12}}><button onClick={()=>nav('/criar')} style={btnPrim}>➕ Criar Nova Cotação</button><button onClick={()=>nav('/entrar')} style={btnSec}>🔐 Entrar com Código</button><button onClick={()=>nav('/minhas-salas')} style={btnLink}>🗂️ Minhas Salas</button></div><p style={{marginTop:24,fontSize:'0.8rem',color:'#94a3b8'}}>🌎 Brasil · Fuso: America/Sao_Paulo · Base Própria + Open Food Facts</p></div>
}
const btnPrim={padding:'14px 24px',borderRadius:10,border:'none',background:'#10b981',color:'white',fontWeight:700,fontSize:'1rem'}
const btnSec={padding:'14px 24px',borderRadius:10,border:'2px solid #e2e8f0',background:'white',color:'#1e293b',fontWeight:700,fontSize:'1rem'}
const btnLink={padding:'10px 24px',borderRadius:10,border:'none',background:'transparent',color:'#64748b',fontWeight:600,fontSize:'0.9rem'}
export default App
