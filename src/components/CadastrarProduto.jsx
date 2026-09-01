import{useState}from'react'
import{salvarProdutoBasePropria}from'../firebase.js'
import{formatarQuantidade,parseQuantidadeExistente}from'../utils/ptBR.js'
import{avisar}from'../utils/dialog.js'
const CATEGORIAS=['Alimentos','Bebidas','Limpeza','Higiene','Frios e Laticínios','Padaria','Açougue','Outros']
export default function CadastrarProduto({dadosIniciais,onSalvo,onCancelar}){
  const qtdInicial=parseQuantidadeExistente(dadosIniciais?.quantidade)
  const[nome,setNome]=useState(dadosIniciais?.nome||'')
  const[marca,setMarca]=useState(dadosIniciais?.marca||'')
  const[categoria,setCategoria]=useState('Alimentos')
  const[valorQtd,setValorQtd]=useState(qtdInicial.valor)
  const[unidade,setUnidade]=useState(qtdInicial.unidade)
  const[carregando,setCarregando]=useState(false)
  const handleSalvar=async()=>{
    if(!nome.trim()){avisar('Nome é obrigatório');return}
    const v=parseFloat(String(valorQtd).replace(',','.'))
    if(isNaN(v)||v<=0){avisar('Quantidade precisa ser um número maior que zero');return}
    const quantidadeFormatada=formatarQuantidade(v,unidade.trim()||'un')
    setCarregando(true)
    try{
      await salvarProdutoBasePropria({
        codigoBarras:dadosIniciais?.codigoBarras||'',
        nome:nome.trim(),
        marca:marca.trim(),
        categoria,
        quantidade:quantidadeFormatada,
        unidade:unidade.trim(),
        imagem:dadosIniciais?.imagem||null,
      })
      onSalvo({nome:nome.trim(),marca:marca.trim(),categoria,quantidade:quantidadeFormatada,unidade:unidade.trim(),codigo:dadosIniciais?.codigoBarras||null})
    }catch(e){avisar('Erro ao salvar: '+e.message);setCarregando(false)}
  }
  return<div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
    <div style={{width:'100%',maxWidth:420,background:'white',borderRadius:16,padding:24,boxShadow:'0 20px 40px rgba(0,0,0,0.2)'}}>
      <h3 style={{margin:'0 0 16px',fontSize:'1.1rem'}}>💾 Salvar Produto na Base</h3>
      <p style={{fontSize:'0.85rem',color:'#64748b',marginBottom:16}}>Esse produto não estava na base própria. Preencha os dados para salvá-lo e reutilizar nas próximas cotações.</p>
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
        {dadosIniciais?.imagem&&<img src={dadosIniciais.imagem} alt="" style={{width:80,height:80,objectFit:'contain',borderRadius:8,alignSelf:'center'}}/>}
      </div>
      <div style={{display:'flex',gap:10,marginTop:20}}>
        <button onClick={handleSalvar} disabled={carregando} style={{flex:1,padding:'12px',borderRadius:8,border:'none',background:'#10b981',color:'white',fontWeight:700,opacity:carregando?0.6:1}}>{carregando?'Salvando...':'💾 Salvar na Base'}</button>
        <button onClick={onCancelar} style={{flex:1,padding:'12px',borderRadius:8,border:'1px solid #e2e8f0',background:'white',color:'#64748b',fontWeight:600}}>Pular</button>
      </div>
    </div>
  </div>
}
const inp={padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.9rem',outline:'none'}
