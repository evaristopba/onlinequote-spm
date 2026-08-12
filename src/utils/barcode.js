export const buscarProdutoPorCodigo=async(codigo)=>{
  if(!codigo||codigo.length<8)return null
  try{
    const resBR=await fetch(`https://br.openfoodfacts.org/api/v0/product/${codigo}.json`,{headers:{'User-Agent':'CotacaoOnline/1.0'}})
    const dBR=await resBR.json()
    if(dBR.status===1&&dBR.product)return extrair(dBR.product)
    const resW=await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`,{headers:{'User-Agent':'CotacaoOnline/1.0'}})
    const dW=await resW.json()
    if(dW.status===1&&dW.product)return extrair(dW.product)
    return null
  }catch(e){console.error(e);return null}
}
function extrair(p){
  const nome=p.product_name_pt||p.product_name||'Produto sem nome'
  const marca=p.brands||''
  const qtd=p.quantity||p.serving_size||''
  const nomeComp=marca?`${nome} (${marca})${qtd?' — '+qtd:''}`:`${nome}${qtd?' — '+qtd:''}`
  return{nome:nomeComp,nomeBase:nome,marca,quantidade:qtd,codigo:p.code,imagem:p.image_url||p.image_front_url||null}
}
