// Link pessoal de um participante numa sala: reabrir esse link em
// qualquer aparelho (mesmo sem sessão anterior) recoloca a pessoa como
// participante daquele mercado, sem precisar redigitar nada — ver
// Sala.jsx (entrarViaLink) para o outro lado dessa história.
export const linkParticipante = (codigo, nome, mercado) => {
  const url = new URL(`/sala/${codigo}`, window.location.origin)
  url.searchParams.set('nome', nome)
  url.searchParams.set('mercado', mercado)
  return url.toString()
}

export const copiarTexto = async (texto) => {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch (e) {
    return false
  }
}
