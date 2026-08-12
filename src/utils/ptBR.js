export const formatarQuantidade=(v,u)=>{const n=parseFloat(v);return`${isNaN(n)?'1.000':n.toFixed(3)} ${u||'un'}`.trim()}
export const parseQuantidadeExistente=(q)=>{
  if(!q)return{valor:1,unidade:'un'}
  const m=String(q).trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  if(m)return{valor:parseFloat(m[1].replace(',','.'))||1,unidade:m[2]||'un'}
  return{valor:1,unidade:String(q)}
}
export const formatarMoeda=(v)=>{if(v==null||isNaN(v))return'—';return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)}
export const formatarInputPreco=(v)=>{if(v==null||isNaN(v))return'';return v.toFixed(2).replace('.',',')}
export const parsePreco=(v)=>{const n=parseFloat(String(v).replace(/[^\d,]/g,'').replace(',','.'));return isNaN(n)||n<=0?null:n}
export const formatarData=(s)=>{if(!s)return'—';return new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
export const formatarDataRelativa=(s)=>{if(!s)return'—';const a=new Date(),d=new Date(s),ms=a-d,mn=Math.floor(ms/60000),hr=Math.floor(ms/3600000),di=Math.floor(ms/86400000);if(mn<1)return'agora mesmo';if(mn<60)return`há ${mn} min`;if(hr<24)return`há ${hr}h`;if(di===1)return'ontem';if(di<7)return`há ${di} dias`;return formatarData(s)}
