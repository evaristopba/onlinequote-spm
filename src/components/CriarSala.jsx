import{useState}from'react'
import{useNavigate}from'react-router-dom'
import{criarSala,buscarProdutoBasePropria,lancarPreco}from'../firebase.js'
import{buscarProdutoPorCodigo}from'../utils/barcode.js'
import BarcodeScanner from'./BarcodeScanner.jsx'
import CadastrarProduto from'./CadastrarProduto.jsx'
import ProdutoModal from'./ProdutoModal.jsx'
export default function CriarSala(){
  const nav=useNavigate()
  const[nome,setNome]=useState('')
  const[mercado,setMercado]=useState('')
  const[nomeSala,setNomeSala]=useState('')
  const[produtos,setProdutos]=useState([])
  const[mostrarScanner,setMostrarScanner]=useState(false)
  const[mostrarCadastro,setMostrarCadastro]=useState(null)
  const[mostrarProdutoModal,setMostrarProdutoModal]=useState(null)
  const[carregando,setCarregando]=useState(false)
  const[buscando,setBuscando]=useState(false)

  const addManual=()=>{
    setMostrarProdutoModal({titulo:'➕ Adicionar produto',inicial:{nome:'',quantidade:'',categoria:'Outros'}})
  }

  const processarCodigo=async(codigo)=>{
    setBuscando(true)
    // 1. Busca na base própria
    const proprio=await buscarProdutoBasePropria(codigo)
    if(proprio){
      setMostrarProdutoModal({titulo:'✅ Produto encontrado na base própria',inicial:{nome:proprio.nome,quantidade:proprio.quantidade||'',categoria:proprio.categoria||'Outros',codigo:proprio.codigoBarras}})
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
    setMostrarProdutoModal({titulo:`🔎 Código ${codigo} não encontrado — cadastre manualmente`,inicial:{nome:'',quantidade:'',categoria:'Outros',codigo}})
    setBuscando(false)
  }

  const handleScan=(codigo)=>{setMostrarScanner(false);processarCodigo(codigo)}
  const handleSalvoNaBase=(dados)=>{
    setMostrarCadastro(null)
    setMostrarProdutoModal({titulo:'Confirmar produto',inicial:{nome:dados.nome,quantidade:dados.quantidade||'',categoria:dados.categoria,codigo:dados.codigo}})
  }
  const editar=(idx)=>{
    const p=produtos[idx]
    setMostrarProdutoModal({titulo:'✏️ Editar produto',inicial:{nome:p.nome,quantidade:p.quantidade,categoria:p.categoria,codigo:p.codigo,preco:p.preco},editandoIdx:idx})
  }
  const handleConfirmarProduto=(dados)=>{
    if(mostrarProdutoModal?.editandoIdx!=null){
      setProdutos(p=>p.map((item,i)=>i===mostrarProdutoModal.editandoIdx?{...item,...dados}:item))
    }else{
      setProdutos(p=>[...p,dados])
    }
    setMostrarProdutoModal(null)
  }
  const remover=(idx)=>setProdutos(p=>p.filter((_,i)=>i!==idx))
  const handleCriar=async()=>{
    if(!nome.trim()||!mercado.trim())return alert('Preencha nome e mercado')
    if(produtos.length===0)return alert('Adicione pelo menos um produto')
    setCarregando(true)
    try{
      const c=await criarSala(nomeSala||'Cotação',produtos,nome,mercado)
      // Lança os preços já digitados no modal (os ids seguem a mesma ordem: p0,p1,...)
      await Promise.all(produtos.map((p,i)=>p.preco!=null?lancarPreco(c,`p${i}`,mercado,p.preco):null))
      nav(`/sala/${c}`)
    }catch(e){alert('Erro: '+e.message);setCarregando(false)}
  }
  return<div style={{maxWidth:560,margin:'0 auto',padding:'24px 16px'}}>
    <h2 style={{marginBottom:20}}>➕ Criar Cotação</h2>
    <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
      <input placeholder="Seu nome" value={nome} onChange={e=>setNome(e.target.value)} style={inp}/>
      <input placeholder="Mercado (ex: Carrefour)" value={mercado} onChange={e=>setMercado(e.target.value)} style={inp}/>
      <input placeholder="Nome da cotação (opcional)" value={nomeSala} onChange={e=>setNomeSala(e.target.value)} style={inp}/>
    </div>
    <div style={{background:'white',borderRadius:12,padding:16,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <h3 style={{margin:0,fontSize:'1rem'}}>📦 Produtos ({produtos.length})</h3>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setMostrarScanner(true)} style={btnA}>📷 Escanear</button>
          <button onClick={addManual} style={btnB}>✏️ Manual</button>
        </div>
      </div>
      {buscando&&<p style={{color:'#64748b',fontSize:'0.85rem',textAlign:'center'}}>🔍 Buscando...</p>}
      {produtos.length===0?<p style={{color:'#94a3b8',textAlign:'center',fontSize:'0.9rem',padding:'10px 0'}}>Nenhum produto. Escaneie ou adicione manualmente.</p>:
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
          <thead><tr>
            <th style={th}>Produto</th>
            <th style={th}>Quantidade</th>
            <th style={th}>Categoria</th>
            <th style={th}>Preço</th>
            <th style={{...th,width:36}}></th>
          </tr></thead>
          <tbody>
            {produtos.map((p,i)=><tr key={i}>
              <td style={td}><strong>{p.nome}</strong>{p.codigo&&<div style={{fontSize:'0.7rem',color:'#94a3b8'}}>Cód: {p.codigo}</div>}</td>
              <td style={td}>{p.quantidade}</td>
              <td style={td}>{p.categoria}</td>
              <td style={td}>{p.preco!=null?`R$ ${p.preco.toFixed(2).replace('.',',')}`:<span style={{color:'#cbd5e1'}}>—</span>}</td>
              <td style={{...td,textAlign:'right',whiteSpace:'nowrap'}}>
                <button onClick={()=>editar(i)} style={editBtn} title="Editar">✏️</button>
                <button onClick={()=>remover(i)} style={delBtn} title="Remover">🗑️</button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </div>
    <button onClick={handleCriar} disabled={carregando} style={{width:'100%',padding:'14px',borderRadius:10,border:'none',background:'#10b981',color:'white',fontWeight:700,fontSize:'1rem',opacity:carregando?0.6:1}}>{carregando?'Criando...':'🚀 Criar Sala'}</button>
    {mostrarScanner&&<BarcodeScanner onScan={handleScan} onClose={()=>setMostrarScanner(false)}/>}
    {mostrarCadastro&&<CadastrarProduto dadosIniciais={mostrarCadastro} onSalvo={handleSalvoNaBase} onCancelar={()=>setMostrarCadastro(null)}/>}
    {mostrarProdutoModal&&<ProdutoModal titulo={mostrarProdutoModal.titulo} inicial={mostrarProdutoModal.inicial} meuMercado={mercado.trim()||null} onConfirmar={handleConfirmarProduto} onCancelar={()=>setMostrarProdutoModal(null)}/>}
  </div>
}
const inp={padding:'12px 14px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.95rem',outline:'none',width:'100%',boxSizing:'border-box'}
const btnA={padding:'8px 14px',borderRadius:8,border:'none',background:'#f59e0b',color:'white',fontWeight:600,fontSize:'0.85rem'}
const btnB={padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#1e293b',fontWeight:600,fontSize:'0.85rem'}
const th={padding:'8px 10px',textAlign:'left',borderBottom:'1px solid #e2e8f0',color:'#64748b',fontWeight:600,fontSize:'0.72rem',textTransform:'uppercase',whiteSpace:'nowrap'}
const td={padding:'8px 10px',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}
const delBtn={background:'none',border:'none',color:'#ef4444',fontSize:'1.05rem',cursor:'pointer'}
const editBtn={background:'none',border:'none',color:'#3b82f6',fontSize:'1.05rem',cursor:'pointer',marginRight:6}
