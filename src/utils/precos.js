// A subcolecao de precos passou a guardar um objeto por mercado
// ({preco, oferta, tipoOferta, obsOferta}) em vez de so o numero.
// Estes helpers isolam a leitura e mantem compatibilidade com dados antigos.
export const valorPreco=(x)=>{
  if(x==null)return null
  if(typeof x==='number')return x
  return typeof x.preco==='number'?x.preco:null
}
export const infoPreco=(x)=>{
  if(x==null)return null
  if(typeof x==='number')return{preco:x,oferta:false,tipoOferta:'',obsOferta:''}
  return{preco:x.preco,oferta:!!x.oferta,tipoOferta:x.tipoOferta||'',obsOferta:x.obsOferta||''}
}
export const TIPOS_OFERTA=['Convênio','Fidelidade','Clube/App','Promoção']
