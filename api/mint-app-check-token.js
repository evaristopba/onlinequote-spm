/* global process */
// Função serverless da Vercel: valida o token do Cloudflare Turnstile
// no servidor (secret key nunca sai daqui) e, se válido, emite um
// token de App Check DE VERDADE via Firebase Admin SDK — é isso que
// substitui o reCAPTCHA v3 dentro do App Check, sem precisar de
// extensão do Firebase nem do plano pago (Cloud Functions).
//
// Variáveis de ambiente necessárias na Vercel (nenhuma com prefixo
// VITE_ — são todas server-only, nunca chegam no bundle do cliente):
//   TURNSTILE_SECRET_KEY     — chave secreta do Turnstile (painel Cloudflare)
//   FIREBASE_SERVICE_ACCOUNT — JSON da conta de serviço (Firebase Console
//                               → Configurações do projeto → Contas de
//                               serviço → Gerar nova chave privada), colado
//                               como string JSON inteira
//   FIREBASE_APP_ID          — mesmo valor de VITE_FIREBASE_APP_ID

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAppCheck } from 'firebase-admin/app-check'

function obterAppAdmin() {
  if (getApps().length) return getApps()[0]
  const credencialJson = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!credencialJson) throw new Error('FIREBASE_SERVICE_ACCOUNT nao configurada')
  let credencial
  try {
    credencial = JSON.parse(credencialJson)
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT nao e um JSON valido')
  }
  return initializeApp({ credential: cert(credencial) })
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { token } = body

    if (!token) {
      return res.status(400).json({ error: 'Token do Turnstile nao fornecido' })
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY
    if (!secretKey) {
      console.error('[App Check] TURNSTILE_SECRET_KEY nao configurada na Vercel')
      return res.status(500).json({ error: 'Configuracao do servidor incompleta (TURNSTILE_SECRET_KEY)' })
    }

    // Valida o token direto na Cloudflare — NUNCA aceita um token sem
    // essa checagem (era exatamente isso que faltava/estava furado na
    // versao anterior desse arquivo).
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress
    if (ip) formData.append('remoteip', String(ip).split(',')[0].trim())

    const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    })
    const cfData = await cfRes.json()

    if (!cfData.success) {
      console.warn('[App Check] Falha na validacao Turnstile:', cfData['error-codes'])
      return res.status(403).json({ error: 'Verificacao anti-bot invalida ou expirada' })
    }

    const appId = process.env.FIREBASE_APP_ID
    if (!appId) {
      console.error('[App Check] FIREBASE_APP_ID nao configurada na Vercel')
      return res.status(500).json({ error: 'Configuracao do servidor incompleta (FIREBASE_APP_ID)' })
    }

    const app = obterAppAdmin()
    const resultado = await getAppCheck(app).createToken(appId)

    return res.status(200).json({ token: resultado.token, ttlMillis: resultado.ttlMillis })
  } catch (err) {
    console.error('[App Check] Erro interno:', err)
    return res.status(500).json({ error: 'Erro ao emitir token de App Check' })
  }
}
