// "Carrefour", "carrefour" e " Carrefour " devem ser tratados como o
// MESMO mercado — sem isso, cada variação de digitação vira uma coluna
// duplicada na tabela e um documento de preço separado no Firestore.
// Aqui centralizamos a normalização (chave de comparação) mantendo o
// texto original (a primeira grafia vista) pra exibição.

export const chaveMercado = (mercado) => (mercado || '').trim().toLowerCase()

export const mercadosIguais = (a, b) => chaveMercado(a) === chaveMercado(b)

// Recebe o mapa `participantes` de uma sala e retorna a lista de
// mercados únicos, na grafia da primeira pessoa que os registrou.
export function listarMercadosUnicos(participantes) {
  const vistos = new Map() // chave normalizada -> grafia de exibição
  for (const p of Object.values(participantes || {})) {
    const chave = chaveMercado(p?.mercado)
    if (!chave) continue
    if (!vistos.has(chave)) vistos.set(chave, p.mercado.trim())
  }
  return [...vistos.values()]
}
