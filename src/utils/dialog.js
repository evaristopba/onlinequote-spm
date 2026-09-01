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

let listener = null
let idCounter = 0

export function setDialogListener(fn) {
  listener = fn
}

function abrir(config) {
  return new Promise((resolve) => {
    const id = ++idCounter
    if (listener) {
      listener({ id, ...config, resolve })
    } else {
      // Fallback raríssimo (DialogHost ainda não montou) — evita travar
      // a ação silenciosamente.
      resolve(config.tipo === 'confirm' ? window.confirm(config.mensagem) : undefined)
    }
  })
}

export const confirmar = (mensagem, opcoes = {}) => abrir({ tipo: 'confirm', mensagem, ...opcoes })

export const avisar = (mensagem, opcoes = {}) => abrir({ tipo: 'alert', mensagem, ...opcoes })
