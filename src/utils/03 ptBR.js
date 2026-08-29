export const formatarQuantidade = (v, u) => {
  const n = parseFloat(v)
  if (isNaN(n)) return `1.000 ${u || 'un'}`
  // Se for número inteiro, não mostra decimais desnecessários
  if (Number.isInteger(n)) return `${n} ${u || 'un'}`
  return `${n.toFixed(3).replace(/\.?0+$/, '')} ${u || 'un'}`
}

export const parseQuantidadeExistente = (q) => {
  if (!q) return { valor: 1, unidade: 'un' }
  const str = String(q).trim()
  
  // Tenta extrair número + unidade
  const regex = /^([\d,.]+)\s*([a-zA-Z]{1,3})$/
  const match = str.match(regex)
  
  let numeroStr = str
  let unidade = 'un'
  
  if (match) {
    numeroStr = match[1]
    unidade = match[2].toLowerCase()
  }
  
  // Converte número com vírgula OU ponto para float
  // Regras:
  // - Se tiver vírgula, substitui por ponto (1,5 → 1.5)
  // - Se tiver ponto e depois 3 dígitos, provavelmente é separador de milhar (1.500 → 1500)
  // - Se tiver ponto e depois 1 ou 2 dígitos, é decimal (1.5 → 1.5)
  let numeroLimpo = numeroStr.replace(/[^\d,.]/g, '')
  
  // Se tiver vírgula, usa vírgula como separador decimal
  if (numeroLimpo.includes(',')) {
    // Remove pontos que podem ser separadores de milhar
    const partes = numeroLimpo.split(',')
    const parteInteira = partes[0].replace(/\./g, '')
    const parteDecimal = partes[1] || ''
    numeroLimpo = `${parteInteira}.${parteDecimal}`
  } else if (numeroLimpo.includes('.')) {
    // Verifica se o ponto é separador de milhar (ex: 1.500)
    const partes = numeroLimpo.split('.')
    // Se tiver 3 dígitos depois do ponto, provavelmente é milhar
    if (partes.length === 2 && partes[1].length === 3) {
      // 1.500 → 1500 (remove o ponto)
      numeroLimpo = partes.join('')
    }
    // Se tiver 1 ou 2 dígitos depois do ponto, é decimal (1.5 → 1.5)
    // Mantém como está
  }
  
  const valor = parseFloat(numeroLimpo)
  return { valor: isNaN(valor) ? 1 : valor, unidade }
}

export const formatarMoeda = (v) => {
  if (v == null || isNaN(v)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export const formatarInputPreco = (v) => {
  if (v == null || isNaN(v)) return ''
  return v.toFixed(2).replace('.', ',')
}

export const parsePreco = (v) => {
  if (!v) return null
  let str = String(v).replace(/[^\d,.]/g, '')
  if (str.includes(',')) {
    str = str.replace('.', '').replace(',', '.')
  }
  const n = parseFloat(str)
  return isNaN(n) || n <= 0 ? null : n
}

export const formatarData = (s) => {
  if (!s) return '—'
  return new Date(s).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatarDataRelativa = (s) => {
  if (!s) return '—'
  const a = new Date(), d = new Date(s)
  const ms = a - d
  const mn = Math.floor(ms / 60000)
  const hr = Math.floor(ms / 3600000)
  const di = Math.floor(ms / 86400000)
  if (mn < 1) return 'agora mesmo'
  if (mn < 60) return `há ${mn} min`
  if (hr < 24) return `há ${hr}h`
  if (di === 1) return 'ontem'
  if (di < 7) return `há ${di} dias`
  return formatarData(s)
}

export const normalizarUnidade = (unidade) => {
  const map = {
    'g': 'g',
    'kg': 'kg',
    'ml': 'ml',
    'l': 'l',
    'L': 'l',
    'litro': 'l',
    'litros': 'l',
    'un': 'un',
    'unidade': 'un',
    'unidades': 'un',
    'pct': 'un',
    'pacote': 'un',
    'pacotes': 'un',
    'cx': 'un',
    'caixa': 'un',
    'caixas': 'un',
  }
  const normalizada = unidade?.toLowerCase().trim() || ''
  return map[normalizada] || normalizada
}

export const calcularPrecoPorUnidade = (preco, quantidade, unidade) => {
  if (!preco || preco <= 0 || !quantidade || quantidade <= 0) return null
  const qtd = parseFloat(quantidade)
  if (isNaN(qtd) || qtd <= 0) return null
  const un = normalizarUnidade(unidade)
  if (un === 'g') {
    return { valor: preco / (qtd / 1000), unidade: 'kg' }
  }
  if (un === 'ml') {
    return { valor: preco / (qtd / 1000), unidade: 'L' }
  }
  if (un === 'kg' || un === 'l') {
    return { valor: preco / qtd, unidade: un }
  }
  return { valor: preco / qtd, unidade: un || 'un' }
}

export const formatarPrecoPorUnidade = (preco, quantidade, unidade) => {
  const resultado = calcularPrecoPorUnidade(preco, quantidade, unidade)
  if (!resultado) return null
  return `${formatarMoeda(resultado.valor)}/${resultado.unidade}`
}

export const chaveProdutoSimilar = (nome, categoria) => {
  const termos = ['tradicional', 'extraforte', 'superior', 'premium', 'classic', 'special', 
                  'com acucar', 'sem acucar', 'zero', 'diet', 'light', 'integral', 'branco', 
                  'refinado', 'organico', 'orgânico', '500g', '1kg', '2kg', '5kg', '1l', '2l']
  let nomeLimpo = nome.toLowerCase()
  termos.forEach(t => { nomeLimpo = nomeLimpo.replace(new RegExp(t, 'gi'), '') })
  nomeLimpo = nomeLimpo.trim().replace(/\s+/g, ' ')
  return `${categoria || 'Outros'}|${nomeLimpo}`
}