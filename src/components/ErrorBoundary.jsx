import{Component}from'react'
export default class ErrorBoundary extends Component{
  constructor(props){super(props);this.state={erro:null}}
  static getDerivedStateFromError(erro){return{erro}}
  componentDidCatch(erro,info){console.error('Erro capturado pelo ErrorBoundary:',erro,info)}
  render(){
    if(this.state.erro){
      return<div style={{display:'flex',flexDirection:'column',gap:12,justifyContent:'center',alignItems:'center',height:'100vh',padding:'0 24px',textAlign:'center',color:'#64748b'}}>
        <div style={{fontSize:'2rem'}}>⚠️</div>
        <p style={{margin:0,fontWeight:600,color:'#1e293b'}}>Algo deu errado.</p>
        <p style={{margin:0,fontSize:'0.85rem',maxWidth:360}}>{this.state.erro.message||'Erro inesperado.'}</p>
        <button onClick={()=>{this.setState({erro:null});window.location.href='/'}} style={{marginTop:8,padding:'10px 20px',borderRadius:8,border:'none',background:'#10b981',color:'white',fontWeight:700}}>Voltar ao início</button>
      </div>
    }
    return this.props.children
  }
}
