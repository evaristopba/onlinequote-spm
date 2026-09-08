/**
 * Valida o token gerado pelo Turnstile contra o endpoint de backend (Vercel Serverless Function).
 * Se o app estiver rodando puramente como estático ou sem backend, degrada graciosamente.
 */
export async function validarTokenNoServidor(token) {
  if (!token) {
    return { ok: false, error: 'Token anti-bot não fornecido.' }
  }

  // Se for token do desafio interativo local
  if (token.startsWith('local_verified_')) {
    return { ok: true }
  }

  try {
    const res = await fetch('/api/verify-turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    // Se a rota 404 (ex: preview estático sem Vercel Functions ativa no momento)
    if (res.status === 404) {
      return { ok: true }
    }

    const data = await res.json()
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error || 'Falha na validação anti-bot.' }
    }

    return { ok: true }
  } catch (err) {
    console.warn('[Anti-bot] Não foi possível verificar token no endpoint serverless:', err)
    // Em caso de falha de conexão na função serverless, permite se o token do widget existe
    return { ok: true }
  }
}
