import{useState}from'react'
import{useNavigate}from'react-router-dom'
import{entrarSala}from'../firebase.js'
import{avisar}from'../utils/dialog.js'
export default function EntrarSala(){
  const nav=useNavigate()
  const[codigo,setCodigo]=useState('')
  const[nome,setNome]=useState('')
  const[mercado,setMercado]=useState('')
  const[carregando,setCarregando]=useState(false)
  const handleEntrar=async()=>{
    if(!codigo.trim()||!nome.trim()||!mercado.trim()){avisar('Preencha todos os campos');return}
    setCarregando(true)
    try{await entrarSala(codigo.toUpperCase(),nome,mercado);nav(`/sala/${codigo.toUpperCase()}`)}
    catch(e){avisar(e.message);setCarregando(false)}
  }
  return<div style={{maxWidth:420,margin:'0 auto',padding:'40px 16px'}}>
    <h2 style={{marginBottom:20}}>🔐 Entrar na Cotação</h2>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <input placeholder="Código da sala (ex: X7K9P2)" value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())} style={inp}/>
      <input placeholder="Seu nome" value={nome} onChange={e=>setNome(e.target.value)} style={inp}/>
      <input placeholder="Mercado que você vai cotar" value={mercado} onChange={e=>setMercado(e.target.value)} style={inp}/>
      <button onClick={handleEntrar} disabled={carregando} style={{padding:'14px',borderRadius:10,border:'none',background:'#3b82f6',color:'white',fontWeight:700,fontSize:'1rem'}}>{carregando?'Entrando...':'Entrar na Sala'}</button>
    </div>
    <p style={{marginTop:16,fontSize:'0.85rem',color:'#94a3b8',textAlign:'center'}}>💡 Peça o código de 6 letras para quem criou a cotação</p>
  </div>
}
const inp={padding:'12px 14px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.95rem',outline:'none'}
