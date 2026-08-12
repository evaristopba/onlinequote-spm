import{useState}from'react'
import{formatarQuantidade,parseQuantidadeExistente}from'../utils/ptBR.js'
const CATEGORIAS=['Alimentos','Bebidas','Limpeza','Higiene','Frios e Laticínios','Padaria','Açougue','Outros']
export default function ProdutoModal({titulo,inicial,onConfirmar,onCancelar}){
  const qtdInicial=parseQuantidadeExistente(inicial?.quantidade)
  const[nome,setNome]=useState(inicial?.nome||'')
  const[valorQtd,setValorQtd]=useState(qtdInicial.valor)
  const[unidadeQtd,setUnidadeQtd]=useState(qtdInicial.unidade)
  const[categoria,setCategoria]=useState(inicial?.categoria||'Outros')
  const[salvando,setSalvando]=useState(false)

  const handleConfirmar=async()=>{
    if(!nome.trim())return
    const v=parseFloat(String(valorQtd).replace(',','.'))
    if(isNaN(v)||v<=0)return alert('Quantidade precisa ser um número maior que zero')
    setSalvando(true)
    try{
      await onConfirmar({nome:nome.trim(),quantidade:formatarQuantidade(v,unidadeQtd.trim()||'un'),categoria,codigo:inicial?.codigo||null})
    }catch(e){
      alert('Erro ao adicionar produto: '+e.message)
      setSalvando(false)
    }
  }
  const handleKeyDown=(e)=>{if(e.key==='Enter'){e.preventDefault();handleConfirmar()}}

  return<div style={overlay}>
    <div style={card}>
      <h3 style={{margin:'0 0 16px',fontSize:'1.1rem'}}>{titulo}</h3>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div>
          <label style={label}>Nome do produto</label>
          <input autoFocus value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={handleKeyDown} style={inp} placeholder="Ex: Arroz 5kg"/>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1}}>
            <label style={label}>Quantidade</label>
            <input type="number" step="0.001" min="0.001" value={valorQtd} onChange={e=>setValorQtd(e.target.value)} onKeyDown={handleKeyDown} style={inp}/>
          </div>
          <div style={{flex:1}}>
            <label style={label}>Unidade</label>
            <input value={unidadeQtd} onChange={e=>setUnidadeQtd(e.target.value)} onKeyDown={handleKeyDown} style={inp} placeholder="kg, L, un..."/>
          </div>
          <div style={{flex:1}}>
            <label style={label}>Categoria</label>
            <select value={categoria} onChange={e=>setCategoria(e.target.value)} style={inp}>
              {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{fontSize:'0.75rem',color:'#94a3b8'}}>Prévia: {formatarQuantidade(valorQtd,unidadeQtd)}</div>
        {inicial?.codigo&&<div style={{fontSize:'0.78rem',color:'#94a3b8'}}>📷 Código de barras: {inicial.codigo}</div>}
      </div>
      <div style={{display:'flex',gap:10,marginTop:20}}>
        <button onClick={handleConfirmar} disabled={!nome.trim()||salvando} style={{...btnPrim,opacity:(!nome.trim()||salvando)?0.6:1}}>{salvando?'Salvando...':'✓ Adicionar'}</button>
        <button onClick={onCancelar} disabled={salvando} style={btnSec}>Cancelar</button>
      </div>
    </div>
  </div>
}
const overlay={position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}
const card={width:'100%',maxWidth:420,background:'white',borderRadius:16,padding:24,boxShadow:'0 20px 40px rgba(0,0,0,0.2)'}
const label={display:'block',fontSize:'0.78rem',color:'#64748b',marginBottom:4,fontWeight:600}
const inp={padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.9rem',outline:'none',width:'100%',boxSizing:'border-box'}
const btnPrim={flex:1,padding:'12px',borderRadius:8,border:'none',background:'#10b981',color:'white',fontWeight:700}
const btnSec={flex:1,padding:'12px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#64748b',fontWeight:600}
