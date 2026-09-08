/* global process */
// Serverless Function para Vercel (Node.js)
// Valida o token do Cloudflare Turnstile no servidor usando a chave secreta
export default async function handler(req, res) {
  // Configura cabeçalhos CORS básicos se necessário
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { token } = body

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token anti-bot não fornecido' })
    }

    // Validação local de fallback ou token de teste
    if (token.startsWith('local_verified_') || token === 'XXXX.DUMMY.TOKEN.XXXX') {
      return res.status(200).json({ success: true, mode: 'test_or_fallback' })
    }

    // A chave secreta NUNCA deve ter prefixo VITE_ e fica apenas nas Environment Variables da Vercel
    const secretKey = process.env.TURNSTILE_SECRET_KEY

    // Se a chave secreta ainda não foi cadastrada na Vercel, opera em modo permissivo com aviso
    if (!secretKey) {
      console.warn('[Turnstile] TURNSTILE_SECRET_KEY não cadastrada na Vercel. Operando em modo de teste.')
      return res.status(200).json({ success: true, mode: 'unconfigured_secret' })
    }

    // Valida o token diretamente na API da Cloudflare
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress
    if (ip) {
      formData.append('remoteip', String(ip).split(',')[0].trim())
    }

    const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    })

    const cfData = await cfRes.json()

    if (cfData.success) {
      return res.status(200).json({ success: true, hostname: cfData.hostname })
    } else {
      console.warn('[Turnstile] Falha na validação Cloudflare:', cfData['error-codes'])
      return res.status(403).json({
        success: false,
        error: 'Verificação anti-bot inválida ou expirada',
        details: cfData['error-codes'],
      })
    }
  } catch (err) {
    console.error('[Turnstile] Erro interno:', err)
    return res.status(500).json({ success: false, error: 'Erro ao validar desafio com Cloudflare' })
  }
}
