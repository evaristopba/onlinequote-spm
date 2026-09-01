import{useState}from'react'
import{editarProdutoBasePropria}from'../firebase.js'
import{formatarQuantidade,parseQuantidadeExistente}from'../utils/ptBR.js'
import{avisar}from'../utils/dialog.js'
const CATEGORIAS=['Alimentos','Bebidas','Limpeza','Higiene','Frios e Laticínios','Padaria','Açougue','Outros']
export default function EditarProdutoBase({produto,onSalvo,onCancelar}){
  const qtdInicial=parseQuantidadeExistente(produto.quantidade)
  const[nome,setNome]=useState(produto.nome||'')
  const[marca,setMarca]=useState(produto.marca||'')
  const[categoria,setCategoria]=useState(produto.categoria||'Outros')
  const[valorQtd,setValorQtd]=useState(qtdInicial.valor)
  const[unidade,setUnidade]=useState(produto.unidade||qtdInicial.unidade)
  const[salvando,setSalvando]=useState(false)

  const handleSalvar=async()=>{
    if(!nome.trim()){avisar('Nome é obrigatório');return}
    const v=parseFloat(String(valorQtd).replace(',','.'))
    if(isNaN(v)||v<=0){avisar('Quantidade precisa ser um número maior que zero');return}
    setSalvando(true)
    try{
      const dados={nome:nome.trim(),marca:marca.trim(),categoria,quantidade:formatarQuantidade(v,unidade.trim()||'un'),unidade:unidade.trim()}
      await editarProdutoBasePropria(produto.id,dados)
      onSalvo({...produto,...dados})
    }catch(e){avisar('Erro ao salvar: '+e.message);setSalvando(false)}
  }

  return<div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
    <div style={{width:'100%',maxWidth:420,background:'white',borderRadius:16,padding:24,boxShadow:'0 20px 40px rgba(0,0,0,0.2)'}}>
      <h3 style={{margin:'0 0 4px',fontSize:'1.1rem'}}>✏️ Editar produto</h3>
      <p style={{fontSize:'0.75rem',color:'#94a3b8',marginBottom:16}}>Cód. de barras: {produto.codigoBarras} (não pode ser alterado)</p>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <input placeholder="Nome do produto *" value={nome} onChange={e=>setNome(e.target.value)} style={inp}/>
        <input placeholder="Marca" value={marca} onChange={e=>setMarca(e.target.value)} style={inp}/>
        <select value={categoria} onChange={e=>setCategoria(e.target.value)} style={inp}>
          {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{display:'flex',gap:8}}>
          <input type="number" step="0.001" min="0.001" placeholder="Quantidade" value={valorQtd} onChange={e=>setValorQtd(e.target.value)} style={{...inp,flex:1}}/>
          <input placeholder="Unidade (kg, L, un...)" value={unidade} onChange={e=>setUnidade(e.target.value)} style={{...inp,flex:1}}/>
        </div>
        <div style={{fontSize:'0.75rem',color:'#94a3b8'}}>Prévia: {formatarQuantidade(valorQtd,unidade)}</div>
      </div>
      <div style={{display:'flex',gap:10,marginTop:20}}>
        <button onClick={handleSalvar} disabled={salvando} style={{flex:1,padding:'12px',borderRadius:8,border:'none',background:'#10b981',color:'white',fontWeight:700,opacity:salvando?0.6:1}}>{salvando?'Salvando...':'💾 Salvar'}</button>
        <button onClick={onCancelar} disabled={salvando} style={{flex:1,padding:'12px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#64748b',fontWeight:600}}>Cancelar</button>
      </div>
    </div>
  </div>
}
const inp={padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.9rem',outline:'none',width:'100%',boxSizing:'border-box'}
