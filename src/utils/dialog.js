// Substitui window.confirm()/window.alert() por um modal com a cara do
// app. API imperativa (mesmo jeito de usar do confirm/alert nativo, só
// que assíncrona), renderizada por um único <DialogHost/> montado uma
// vez em main.jsx.
//
//   const ok = await confirmar('Excluir esse item?')
//   if (!ok) return
//
//   await avisar('Preço inválido')
//
// Aceita um segundo argumento opcional: { titulo, textoConfirmar,
// textoCancelar, perigo: true } — "perigo" deixa o botão de confirmar
// vermelho, pra ações destrutivas (excluir sala, apagar produto, etc.).
//
// Suporta fila: se dois confirmar()/avisar() forem chamados antes do
// primeiro ser respondido, o segundo só aparece depois que o primeiro
// for fechado — nenhuma promise fica pendurada pra sempre.

let listener = null
let fila = []

export function setDialogListener(fn) {
  listener = fn
  if (fn && fila.length > 0) fn(fila[0])
}

function mostrarProximo() {
  fila.shift()
  if (listener) listener(fila[0] || null)
}

function abrir(config) {
  return new Promise((resolve) => {
    if (!listener && fila.length === 0) {
      // Fallback raríssimo (DialogHost ainda não montou) — evita travar
      // a ação silenciosamente.
      resolve(config.tipo === 'confirm' ? window.confirm(config.mensagem) : undefined)
      return
    }
    const item = { ...config, resolve: (valor) => { resolve(valor); mostrarProximo() } }
    fila.push(item)
    if (fila.length === 1 && listener) listener(item)
  })
}

export const confirmar = (mensagem, opcoes = {}) => abrir({ tipo: 'confirm', mensagem, ...opcoes })

export const avisar = (mensagem, opcoes = {}) => abrir({ tipo: 'alert', mensagem, ...opcoes })
