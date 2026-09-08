import { useState, useEffect, useRef } from 'react'

// Chave oficial de teste da Cloudflare (sempre passa sem cobrar nada e sem cartão)
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TEST_SITE_KEY_ALWAYS_PASS = '1x00000000000000000000AA'

export default function CaptchaWidget({ onVerify, onExpire, id = 'captcha-widget' }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const [carregado, setCarregado] = useState(false)
  const [verificado, setVerificado] = useState(false)
  const [usandoFallback, setUsandoFallback] = useState(false)
  const [respostaFallback, setRespostaFallback] = useState('')
  const [desafioFallback, setDesafioFallback] = useState(null)
  const [erroFallback, setErroFallback] = useState('')

  // Honeypot invisível para enganar robôs que preenchem formulários automaticamente
  const [honeypot, setHoneypot] = useState('')

  const siteKey =
    import.meta.env.VITE_TURNSTILE_SITE_KEY ||
    import.meta.env.TURNSTILE_SITE_KEY ||
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ||
    TEST_SITE_KEY_ALWAYS_PASS

  // Gera um desafio matemático simples caso a Cloudflare esteja offline / bloqueada
  const gerarNovoDesafio = () => {
    const num1 = Math.floor(Math.random() * 8) + 2
    const num2 = Math.floor(Math.random() * 8) + 1
    setDesafioFallback({ num1, num2, resultado: num1 + num2 })
    setRespostaFallback('')
    setErroFallback('')
  }

  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)
  const honeypotRef = useRef(honeypot)

  useEffect(() => {
    onVerifyRef.current = onVerify
    onExpireRef.current = onExpire
    honeypotRef.current = honeypot
  })

  useEffect(() => {
    let timeoutId = null

    // Função para renderizar o Turnstile
    const renderTurnstile = () => {
      if (!window.turnstile || !containerRef.current) return
      try {
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          language: 'pt-br',
          callback: (token) => {
            // Se o bot preencheu o campo oculto, bloqueia!
            if (honeypotRef.current) {
              console.warn('[Anti-bot] Bot detectado via honeypot')
              onExpireRef.current?.()
              setVerificado(false)
              return
            }
            setVerificado(true)
            onVerifyRef.current?.(token)
          },
          'expired-callback': () => {
            setVerificado(false)
            onExpireRef.current?.()
          },
          'error-callback': (err) => {
            console.warn('[Anti-bot] Turnstile offline ou erro, ativando fallback local:', err)
            setUsandoFallback(true)
            gerarNovoDesafio()
          },
        })
        setCarregado(true)
      } catch (e) {
        console.warn('[Anti-bot] Erro ao renderizar Turnstile:', e)
        setUsandoFallback(true)
        gerarNovoDesafio()
      }
    }

    // Verifica se o Turnstile já está no window
    if (window.turnstile) {
      renderTurnstile()
    } else {
      // Carrega o script oficial do Cloudflare Turnstile
      const scriptId = 'cf-turnstile-script'
      let script = document.getElementById(scriptId)
      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        script.onload = () => {
          renderTurnstile()
        }
        script.onerror = () => {
          setUsandoFallback(true)
          gerarNovoDesafio()
        }
        document.head.appendChild(script)
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval)
            renderTurnstile()
          }
        }, 100)
        timeoutId = setTimeout(() => {
          clearInterval(interval)
          if (!window.turnstile) {
            setUsandoFallback(true)
            gerarNovoDesafio()
          }
        }, 4000)
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (e) {
          // ignore
        }
      }
    }
  }, [siteKey])

  const handleValidarFallback = () => {
    if (honeypot) {
      setErroFallback('Tentativa automatizada rejeitada.')
      return
    }
    const val = parseInt(respostaFallback.trim(), 10)
    if (desafioFallback && val === desafioFallback.resultado) {
      setVerificado(true)
      setErroFallback('')
      onVerify?.(`local_verified_${Date.now()}`)
    } else {
      setErroFallback('Resposta incorreta. Tente novamente.')
      gerarNovoDesafio()
    }
  }

  return (
    <div id={id} style={{ margin: '14px 0', textAlign: 'left' }}>
      {/* Honeypot Trap invisível para bots */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <label htmlFor="website_extra_check">Não preencha este campo se for humano</label>
        <input
          id="website_extra_check"
          type="text"
          name="website_extra_check"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {!usandoFallback ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
              🛡️ Proteção Anti-bot
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Cloudflare Turnstile (Gratuito)
            </span>
          </div>

          <div ref={containerRef} style={{ minHeight: 65, display: 'flex', alignItems: 'center' }}>
            {!carregado && !verificado && (
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Verificando conexão segura...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Fallback interativo inteligente e gratuito quando o Turnstile estiver offline */
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
              🛡️ Verificação Anti-bot (Humano)
            </span>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
              100% Gratuito
            </span>
          </div>

          {verificado ? (
            <div style={{ color: '#15803d', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              ✅ Verificação concluída com sucesso!
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 8px' }}>
                Para confirmar que você é uma pessoa real, quanto é <strong>{desafioFallback?.num1} + {desafioFallback?.num2}</strong>?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  placeholder="Resultado"
                  value={respostaFallback}
                  onChange={(e) => setRespostaFallback(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleValidarFallback() }}
                  style={{ width: 100, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
                />
                <button
                  type="button"
                  onClick={handleValidarFallback}
                  style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Confirmar
                </button>
              </div>
              {erroFallback && (
                <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 6 }}>
                  {erroFallback}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
