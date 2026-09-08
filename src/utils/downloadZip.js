import { ZIP_BASE64 } from './zipData.js'

export function baixarProjetoZip() {
  try {
    const byteCharacters = atob(ZIP_BASE64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/zip' })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cotacao-online.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    console.error('Erro ao descompactar base64 do zip:', e)
    window.location.href = '/cotacao-online.zip'
  }
}
