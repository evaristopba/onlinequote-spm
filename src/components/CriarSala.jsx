import{useState}from'react'
import{useNavigate}from'react-router-dom'
import{criarSala,buscarProdutoBasePropria}from'../firebase.js'
import{buscarProdutoPorCodigo}from'../utils/barcode.js'
import BarcodeScanner from'./BarcodeScanner.jsx'
import CadastrarProduto from'./CadastrarProduto.jsx'
export default function CriarSala(){
  const nav=useNavigate()
  const[nome,setNome]=useState('')
  const[mercado,setMercado]=useState('')
  const[nomeSala,setNomeSala]=useState('')
  const[produtos,setProdutos]=useState([])
  const[mostrarScanner,setMostrarScanner]=useState(false)
  const[mostrarCadastro,setMostrarCadastro]=useState(null)
  const[carregando,setCarregando]=useState(false)
  const[buscando,setBuscando]=useState(false)

  const addManual=()=>{const n=prompt('Nome:');if(!n)return;const q=prompt('Quantidade:','1 unidade')||'1 unidade';setProdutos(p=>[...p,{nome:n,quantidade:q,categoria:'Outros'}])}

  const processarCodigo=async(codigo)=>{
    setBuscando(true)
    // 1. Busca na base própria
    const proprio=await buscarProdutoBasePropria(codigo)
    if(proprio){
      const q=prompt(`Produto (base própria): ${proprio.nome}\nQuantidade:`,proprio.quantidade||'1 unidade')||'1 unidade'
      setProdutos(p=>[...p,{nome:proprio.nome,quantidade:q,codigo:proprio.codigoBarras,categoria:proprio.categoria||'Outros'}])
      setBuscando(false);return
    }
    // 2. Busca na Open Food Facts
    const off=await buscarProdutoPorCodigo(codigo)
    if(off){
      // Pergunta se quer salvar na base
      setMostrarCadastro({...off,codigoBarras:codigo})
      setBuscando(false);return
    }
    // 3. Manual
    const n=prompt(`Código ${codigo} não encontrado. Nome do produto:`)
    if(n){const q=prompt('Quantidade:','1 unidade')||'1 unidade';setProdutos(p=>[...p,{nome:n,quantidade:q,codigo,categoria:'Outros'}])}
    setBuscando(false)
  }

  const handleScan=(codigo)=>{setMostrarScanner(false);processarCodigo(codigo)}
  const handleSalvoNaBase=(dados)=>{
    setMostrarCadastro(null)
    const q=prompt(`Produto: ${dados.nome}\nQuantidade:`,dados.quantidade||'1 unidade')||'1 unidade'
    setProdutos(p=>[...p,{nome:dados.nome,quantidade:q,codigo:dados.codigo,categoria:dados.categoria}])
  }
  const remover=(idx)=>setProdutos(p=>p.filter((_,i)=>i!==idx))
  const handleCriar=async()=>{
    if(!nome.trim()||!mercado.trim())return alert('Preencha nome e mercado')
    if(produtos.length===0)return alert('Adicione pelo menos um produto')
    setCarregando(true)
    try{const c=await criarSala(nomeSala||'Cotação',produtos,nome,mercado);nav(`/sala/${c}`)}
    catch(e){alert('Erro: '+e.message);setCarregando(false)}
  }
  return<div style={{maxWidth:520,margin:'0 auto',padding:'24px 16px'}}>
    <h2 style={{marginBottom:20}}>➕ Criar Cotação</h2>
    <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
      <input placeholder="Seu nome" value={nome} onChange={e=>setNome(e.target.value)} style={inp}/>
      <input placeholder="Mercado (ex: Carrefour)" value={mercado} onChange={e=>setMercado(e.target.value)} style={inp}/>
      <input placeholder="Nome da cotação (opcional)" value={nomeSala} onChange={e=>setNomeSala(e.target.value)} style={inp}/>
    </div>
    <div style={{background:'white',borderRadius:12,padding:16,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h3 style={{margin:0,fontSize:'1rem'}}>📦 Produtos ({produtos.length})</h3>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setMostrarScanner(true)} style={btnA}>📷 Escanear</button>
          <button onClick={addManual} style={btnB}>✏️ Manual</button>
        </div>
      </div>
      {buscando&&<p style={{color:'#64748b',fontSize:'0.85rem',textAlign:'center'}}>🔍 Buscando...</p>}
      {produtos.length===0?<p style={{color:'#94a3b8',textAlign:'center',fontSize:'0.9rem',padding:'10px 0'}}>Nenhum produto. Escaneie ou adicione manualmente.</p>:<div style={{display:'flex',flexDirection:'column',gap:8}}>
        {produtos.map((p,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:'#f8fafc',borderRadius:8}}>
          <div><strong style={{fontSize:'0.9rem'}}>{p.nome}</strong><div style={{fontSize:'0.78rem',color:'#64748b'}}>{p.quantidade}{p.categoria&&` · ${p.categoria}`}{p.codigo&&` · Cód: ${p.codigo}`}</div></div>
          <button onClick={()=>remover(i)} style={{background:'none',border:'none',color:'#ef4444',fontSize:'1.1rem',cursor:'pointer'}}>🗑️</button>
        </div>)}
      </div>}
    </div>
    <button onClick={handleCriar} disabled={carregando} style={{width:'100%',padding:'14px',borderRadius:10,border:'none',background:'#10b981',color:'white',fontWeight:700,fontSize:'1rem',opacity:carregando?0.6:1}}>{carregando?'Criando...':'🚀 Criar Sala'}</button>
    {mostrarScanner&&<BarcodeScanner onScan={handleScan} onClose={()=>setMostrarScanner(false)}/>}
    {mostrarCadastro&&<CadastrarProduto dadosIniciais={mostrarCadastro} onSalvo={handleSalvoNaBase} onCancelar={()=>setMostrarCadastro(null)}/>}
  </div>
}
const inp={padding:'12px 14px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.95rem',outline:'none',width:'100%'}
const btnA={padding:'8px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'white',fontWeight:600,fontSize:'0.85rem'}
const btnB={padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#1e293b',fontWeight:600,fontSize:'0.85rem'}
