// Pega um token do Cloudflare Turnstile sob demanda, pra alimentar o
// App Check. Diferente de um captcha de formulário (que fica visível
// esperando o usuário interagir), aqui criamos um widget EFÊMERO toda
// vez que o App Check precisa renovar seu token (isso acontece sozinho,
// em background, não é algo que o usuário aciona clicando em nada) —
// monta, pega o token, desmonta. Funciona com qualquer modo de widget
// escolhido no cadastro do site na Cloudflare (Gerenciado, Não
// interativo ou Invisível); com o modo Invisível, nem aparece nada na
// tela em nenhum momento.

function carregarScriptTurnstile() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) { resolve(); return }
    const scriptId = 'cf-turnstile-script'
    let script = document.getElementById(scriptId)
    if (script) {
      script.addEventListener('load', () => resolve())
      script.addEventListener('error', () => reject(new Error('Falha ao carregar o script do Turnstile')))
      return
    }
    script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar o script do Turnstile'))
    document.head.appendChild(script)
  })
}

export async function obterTokenTurnstile(siteKey) {
  if (!siteKey) throw new Error('VITE_TURNSTILE_SITE_KEY nao configurada')
  await carregarScriptTurnstile()

  return new Promise((resolve, reject) => {
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.bottom = '0'
    container.style.right = '0'
    container.style.zIndex = '-1'
    document.body.appendChild(container)

    let widgetId = null
    const limpar = () => {
      try { if (widgetId != null) window.turnstile.remove(widgetId) } catch (e) { /* ignora */ }
      container.remove()
    }

    const tempoEsgotado = setTimeout(() => {
      limpar()
      reject(new Error('Tempo esgotado aguardando verificacao do Turnstile'))
    }, 20000)

    try {
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: (token) => {
          clearTimeout(tempoEsgotado)
          limpar()
          resolve(token)
        },
        'error-callback': () => {
          clearTimeout(tempoEsgotado)
          limpar()
          reject(new Error('Falha na verificacao do Turnstile'))
        },
      })
    } catch (e) {
      clearTimeout(tempoEsgotado)
      limpar()
      reject(e)
    }
  })
}
