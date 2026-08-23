import{useEffect,useState}from'react'

// ===== Estado de conexao =====
export function useOnline(){
  const[online,setOnline]=useState(typeof navigator==='undefined'?true:navigator.onLine)
  useEffect(()=>{
    const up=()=>setOnline(true),down=()=>setOnline(false)
    window.addEventListener('online',up)
    window.addEventListener('offline',down)
    return()=>{window.removeEventListener('online',up);window.removeEventListener('offline',down)}
  },[])
  return online
}

// ===== Ultima sala aberta =====
// Guardada no localStorage pra permitir retomar a sala depois de queda de
// internet, fechamento do navegador ou recarregamento da PWA.
const CHAVE='cotacao:ultimaSala'
export function salvarUltimaSala(codigo,nome){
  try{localStorage.setItem(CHAVE,JSON.stringify({codigo,nome:nome||'',em:new Date().toISOString()}))}catch(e){}
}
export function lerUltimaSala(){
  try{
    const raw=localStorage.getItem(CHAVE)
    if(!raw)return null
    const d=JSON.parse(raw)
    return d&&d.codigo?d:null
  }catch(e){return null}
}
export function limparUltimaSala(){
  try{localStorage.removeItem(CHAVE)}catch(e){}
}
