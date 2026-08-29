export const formatarQuantidade = (v, u) => {
  const n = parseFloat(v)
  return `${isNaN(n) ? '1.000' : n.toFixed(3)} ${u || 'un'}`.trim()
}

export const parseQuantidadeExistente = (q) => {
  if (!q) return { valor: 1, unidade: 'un' }
  const m = String(q).trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  if (m) return { valor: parseFloat(m[1].replace(',', '.')) || 1, unidade: m[2] || 'un' }
  return { valor: 1, unidade: String(q) }
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
  const n = parseFloat(String(v).replace(/[^\d,]/g, '').replace(',', '.'))
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