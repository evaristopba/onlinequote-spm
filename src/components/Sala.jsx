import{useEffect,useState}from'react'
import{useParams,useNavigate}from'react-router-dom'
import{escutarSala,escutarPrecos,lancarPreco,adicionarProduto,editarProduto,removerProduto,excluirSala,auth,buscarProdutoBasePropria}from'../firebase.js'
import{parsePreco,formatarDataRelativa}from'../utils/ptBR.js'
import{buscarProdutoPorCodigo}from'../utils/barcode.js'
import TabelaCotacao from'./TabelaCotacao.jsx'
import ListaOtimizada from'./ListaOtimizada.jsx'
import Participantes from'./Participantes.jsx'
import BarcodeScanner from'./BarcodeScanner.jsx'
import CadastrarProduto from'./CadastrarProduto.jsx'
import ProdutoModal from'./ProdutoModal.jsx'
export default function Sala(){
  const{codigo}=useParams()
  const nav=useNavigate()
  const[sala,setSala]=useState(null)
  const[precos,setPrecos]=useState({})
  const[naoEncontrada,setNaoEncontrada]=useState(false)
  const[meuMercado,setMeuMercado]=useState('')
  const[meuNome,setMeuNome]=useState('')
  const[mostrarScanner,setMostrarScanner]=useState(false)
  const[mostrarCadastro,setMostrarCadastro]=useState(null)
  const[mostrarProdutoModal,setMostrarProdutoModal]=useState(null)
  const[buscando,setBuscando]=useState(false)
  const[excluindo,setExcluindo]=useState(false)

  useEffect(()=>{
    const unsub=escutarSala(codigo,(d)=>{if(!d){setNaoEncontrada(true);setSala(null);return}setNaoEncontrada(false);setSala(d);const u=auth.currentUser?.uid;if(u&&d.participantes[u]){setMeuMercado(d.participantes[u].mercado);setMeuNome(d.participantes[u].nome)}})
    return()=>unsub()
  },[codigo])

  useEffect(()=>{
    const unsub=escutarPrecos(codigo,setPrecos)
    return()=>unsub()
  },[codigo])

  const souCriador=sala&&auth.currentUser&&(
    'criadorUid'in sala?sala.criadorUid===auth.currentUser.uid:!!sala.participantes?.[auth.currentUser.uid]
  )
  const handleExcluir=async()=>{
    if(!confirm('Excluir essa sala e todos os preços lançados? Essa ação não pode ser desfeita.'))return
    setExcluindo(true)
    try{await excluirSala(codigo);nav('/')}
    catch(e){alert('Erro ao excluir: '+e.message);setExcluindo(false)}
  }

  const handlePreco=async(pid,m,v)=>{const n=parsePreco(v);if(n===null)return;await lancarPreco(codigo,pid,m,n)}
  const handleAddManual=()=>{
    setMostrarProdutoModal({titulo:'➕ Adicionar produto',inicial:{nome:'',quantidade:'',categoria:'Outros'}})
  }

  const processarCodigo=async(cb)=>{
    setBuscando(true)
    const proprio=await buscarProdutoBasePropria(cb)
    if(proprio){
      setMostrarProdutoModal({titulo:'✅ Produto encontrado na base própria',inicial:{nome:proprio.nome,quantidade:proprio.quantidade||'',categoria:proprio.categoria||'Outros',codigo:proprio.codigoBarras}})
      setBuscando(false);return
    }
    const off=await buscarProdutoPorCodigo(cb)
    if(off){setMostrarCadastro({...off,codigoBarras:cb});setBuscando(false);return}
    setMostrarProdutoModal({titulo:`🔎 Código ${cb} não encontrado — cadastre manualmente`,inicial:{nome:'',quantidade:'',categoria:'Outros',codigo:cb}})
    setBuscando(false)
  }
  const handleScan=(cb)=>{setMostrarScanner(false);processarCodigo(cb)}
  const handleSalvoNaBase=(dados)=>{
    setMostrarCadastro(null)
    setMostrarProdutoModal({titulo:'Confirmar produto',inicial:{nome:dados.nome,quantidade:dados.quantidade||'',categoria:dados.categoria,codigo:dados.codigo}})
  }
  const handleConfirmarProduto=async(dados)=>{
    if(mostrarProdutoModal?.editandoProdutoId){
      await editarProduto(codigo,mostrarProdutoModal.editandoProdutoId,dados)
    }else{
      await adicionarProduto(codigo,dados.nome,dados.quantidade,dados.codigo,dados.categoria)
    }
    setMostrarProdutoModal(null)
  }
  const handleEditarProduto=(p)=>{
    setMostrarProdutoModal({titulo:'✏️ Editar produto',inicial:{nome:p.nome,quantidade:p.quantidade,categoria:p.categoria,codigo:p.codigo},editandoProdutoId:p.id})
  }
  const handleRemoverProduto=async(p)=>{
    if(!confirm(`Remover "${p.nome}" da cotação? Os preços já lançados desse produto também somem.`))return
    try{await removerProduto(codigo,p.id)}
    catch(e){alert('Erro ao remover: '+e.message)}
  }

  if(naoEncontrada)return<div style={{padding:40,textAlign:'center',color:'#64748b'}}><p>❌ Sala <strong>#{codigo}</strong> não encontrada.</p><button onClick={()=>nav('/entrar')} style={{marginTop:12,padding:'10px 20px',borderRadius:8,border:'none',background:'#3b82f6',color:'white',fontWeight:700}}>Voltar</button></div>
  if(!sala)return<div style={{padding:40,textAlign:'center',color:'#64748b'}}>Carregando...</div>

  return<div style={{maxWidth:960,margin:'0 auto',padding:'16px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:16}}>
      <div><div style={{fontSize:'0.8rem',color:'#64748b'}}>Sala · Criada {formatarDataRelativa(sala.criadoEm)}</div><div style={{fontFamily:'monospace',fontSize:'1.5rem',fontWeight:700,color:'#f59e0b',letterSpacing:3}}>#{codigo}</div></div>
      <div style={{textAlign:'right'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.85rem',color:'#10b981',fontWeight:600,justifyContent:'flex-end'}}><span style={{width:8,height:8,background:'#10b981',borderRadius:'50%',display:'inline-block',animation:'pulse 1.5s infinite'}}></span>AO VIVO</div>
        <div style={{fontSize:'0.78rem',color:'#94a3b8',marginTop:2}}>Você: <strong>{meuNome}</strong> · Mercado: <strong>{meuMercado}</strong></div>
        {souCriador&&<button onClick={handleExcluir} disabled={excluindo} style={{marginTop:6,padding:'5px 10px',borderRadius:6,border:'1px solid #fca5a5',background:'white',color:'#ef4444',fontSize:'0.75rem',fontWeight:600}}>{excluindo?'Excluindo...':'🗑️ Encerrar sala'}</button>}
      </div>
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
      <TabelaCotacao produtos={sala.produtos} precos={precos} participantes={sala.participantes} meuMercado={meuMercado} onPrecoChange={handlePreco} onEditarProduto={handleEditarProduto} onRemoverProduto={handleRemoverProduto}/>
    </div>
    <ListaOtimizada produtos={sala.produtos} precos={precos} participantes={sala.participantes}/>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    {mostrarScanner&&<BarcodeScanner onScan={handleScan} onClose={()=>setMostrarScanner(false)}/>}
    {mostrarCadastro&&<CadastrarProduto dadosIniciais={mostrarCadastro} onSalvo={handleSalvoNaBase} onCancelar={()=>setMostrarCadastro(null)}/>}
    {mostrarProdutoModal&&<ProdutoModal titulo={mostrarProdutoModal.titulo} inicial={mostrarProdutoModal.inicial} onConfirmar={handleConfirmarProduto} onCancelar={()=>setMostrarProdutoModal(null)}/>}
  </div>
}
const btnY={padding:'8px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'white',fontWeight:600,fontSize:'0.85rem'}
const btnW={padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#1e293b',fontWeight:600,fontSize:'0.85rem'}
