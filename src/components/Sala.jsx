import{useEffect,useState}from'react'
import{useParams,useNavigate}from'react-router-dom'
import{escutarSala,lancarPreco,adicionarProduto,auth,buscarProdutoBasePropria}from'../firebase.js'
import{parsePreco,formatarDataRelativa}from'../utils/ptBR.js'
import{buscarProdutoPorCodigo}from'../utils/barcode.js'
import TabelaCotacao from'./TabelaCotacao.jsx'
import ListaOtimizada from'./ListaOtimizada.jsx'
import Participantes from'./Participantes.jsx'
import BarcodeScanner from'./BarcodeScanner.jsx'
import CadastrarProduto from'./CadastrarProduto.jsx'
export default function Sala(){
  const{codigo}=useParams()
  const nav=useNavigate()
  const[sala,setSala]=useState(null)
  const[naoEncontrada,setNaoEncontrada]=useState(false)
  const[meuMercado,setMeuMercado]=useState('')
  const[meuNome,setMeuNome]=useState('')
  const[mostrarScanner,setMostrarScanner]=useState(false)
  const[mostrarCadastro,setMostrarCadastro]=useState(null)
  const[buscando,setBuscando]=useState(false)

  useEffect(()=>{
    const unsub=escutarSala(codigo,(d)=>{if(!d){setNaoEncontrada(true);setSala(null);return}setNaoEncontrada(false);setSala(d);const u=auth.currentUser?.uid;if(u&&d.participantes[u]){setMeuMercado(d.participantes[u].mercado);setMeuNome(d.participantes[u].nome)}})
    return()=>unsub()
  },[codigo])

  const handlePreco=async(pid,m,v)=>{const n=parsePreco(v);if(n===null)return;await lancarPreco(codigo,pid,m,n)}
  const handleAddManual=async()=>{const n=prompt('Nome:');if(!n)return;const q=prompt('Quantidade:','1 unidade')||'1 unidade';await adicionarProduto(codigo,n,q)}

  const processarCodigo=async(cb)=>{
    setBuscando(true)
    const proprio=await buscarProdutoBasePropria(cb)
    if(proprio){const q=prompt(`Base própria: ${proprio.nome}\nQuantidade:`,proprio.quantidade||'1 unidade')||'1 unidade';await adicionarProduto(codigo,proprio.nome,q,proprio.codigoBarras,proprio.categoria||'Outros');setBuscando(false);return}
    const off=await buscarProdutoPorCodigo(cb)
    if(off){setMostrarCadastro({...off,codigoBarras:cb});setBuscando(false);return}
    const n=prompt(`Código ${cb} não encontrado. Nome:`)
    if(n){const q=prompt('Quantidade:','1 unidade')||'1 unidade';await adicionarProduto(codigo,n,q,cb)}
    setBuscando(false)
  }
  const handleScan=(cb)=>{setMostrarScanner(false);processarCodigo(cb)}
  const handleSalvoNaBase=async(dados)=>{
    setMostrarCadastro(null)
    const q=prompt(`Produto: ${dados.nome}\nQuantidade:`,dados.quantidade||'1 unidade')||'1 unidade'
    await adicionarProduto(codigo,dados.nome,q,dados.codigo,dados.categoria)
  }

  if(naoEncontrada)return<div style={{padding:40,textAlign:'center',color:'#64748b'}}><p>❌ Sala <strong>#{codigo}</strong> não encontrada.</p><button onClick={()=>nav('/entrar')} style={{marginTop:12,padding:'10px 20px',borderRadius:8,border:'none',background:'#3b82f6',color:'white',fontWeight:700}}>Voltar</button></div>
  if(!sala)return<div style={{padding:40,textAlign:'center',color:'#64748b'}}>Carregando...</div>

  return<div style={{maxWidth:960,margin:'0 auto',padding:'16px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:16}}>
      <div><div style={{fontSize:'0.8rem',color:'#64748b'}}>Sala · Criada {formatarDataRelativa(sala.criadoEm)}</div><div style={{fontFamily:'monospace',fontSize:'1.5rem',fontWeight:700,color:'#f59e0b',letterSpacing:3}}>#{codigo}</div></div>
      <div style={{textAlign:'right'}}><div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.85rem',color:'#10b981',fontWeight:600}}><span style={{width:8,height:8,background:'#10b981',borderRadius:'50%',display:'inline-block',animation:'pulse 1.5s infinite'}}></span>AO VIVO</div><div style={{fontSize:'0.78rem',color:'#94a3b8',marginTop:2}}>Você: <strong>{meuNome}</strong> · Mercado: <strong>{meuMercado}</strong></div></div>
    </div>
    <Participantes participantes={sala.participantes}/>
    <div style={{background:'white',borderRadius:12,padding:18,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <h3 style={{margin:0,fontSize:'1.05rem'}}>📊 Cotação em Tempo Real</h3>
        <div style={{display:'flex',gap:8}}>
          {buscando&&<span style={{color:'#64748b',fontSize:'0.85rem',alignSelf:'center'}}>🔍 Buscando...</span>}
          <button onClick={()=>setMostrarScanner(true)} style={btnY}>📷 Escanear</button>
          <button onClick={handleAddManual} style={btnW}>➕ Manual</button>
        </div>
      </div>
      <TabelaCotacao produtos={sala.produtos} precos={sala.precos||{}} participantes={sala.participantes} meuMercado={meuMercado} onPrecoChange={handlePreco}/>
    </div>
    <ListaOtimizada produtos={sala.produtos} precos={sala.precos||{}} participantes={sala.participantes}/>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    {mostrarScanner&&<BarcodeScanner onScan={handleScan} onClose={()=>setMostrarScanner(false)}/>}
    {mostrarCadastro&&<CadastrarProduto dadosIniciais={mostrarCadastro} onSalvo={handleSalvoNaBase} onCancelar={()=>setMostrarCadastro(null)}/>}
  </div>
}
const btnY={padding:'8px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'white',fontWeight:600,fontSize:'0.85rem'}
const btnW={padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#1e293b',fontWeight:600,fontSize:'0.85rem'}
