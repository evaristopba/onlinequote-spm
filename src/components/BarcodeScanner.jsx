import{useEffect,useRef,useState}from'react'
import{Html5Qrcode}from'html5-qrcode'
export default function BarcodeScanner({onScan,onClose}){
  const scannerRef=useRef(null)
  const[erro,setErro]=useState(null)
  const[carregando,setCarregando]=useState(true)
  useEffect(()=>{
    Html5Qrcode.getCameras().then(cameras=>{
      if(cameras.length===0){setErro('Nenhuma câmera encontrada.');setCarregando(false);return}
      const camera=cameras.find(c=>c.label.toLowerCase().includes('back'))||cameras[cameras.length-1]
      scannerRef.current=new Html5Qrcode('barcode-scanner')
      scannerRef.current.start(camera.id,{fps:10,qrbox:{width:250,height:150}},(decodedText)=>{onScan(decodedText);scannerRef.current?.stop().catch(()=>{})},()=>{}).then(()=>setCarregando(false)).catch(err=>{setErro('Erro: '+err.message);setCarregando(false)})
    }).catch(err=>{setErro('Erro: '+err.message);setCarregando(false)})
    return()=>{scannerRef.current?.stop().catch(()=>{})}
  },[onScan])
  return<div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:16}}>
    <div style={{width:'100%',maxWidth:400,background:'white',borderRadius:16,overflow:'hidden'}}>
      <div style={{padding:'14px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3 style={{margin:0,fontSize:'1rem'}}>📷 Escanear Código de Barras</h3>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.3rem',color:'#64748b'}}>✕</button>
      </div>
      <div style={{padding:16,textAlign:'center'}}>
        {carregando&&<p style={{color:'#64748b'}}>Iniciando câmera...</p>}
        {erro&&<p style={{color:'#ef4444',fontSize:'0.9rem'}}>{erro}</p>}
        <div id="barcode-scanner" style={{width:'100%',minHeight:200,borderRadius:8,overflow:'hidden'}}></div>
        <p style={{marginTop:12,fontSize:'0.8rem',color:'#94a3b8'}}>Aponte para o código de barras</p>
      </div>
    </div>
  </div>
}
