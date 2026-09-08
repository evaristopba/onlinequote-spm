import { chaveMercado } from './mercados.js'

const SEED_PRODUTOS = [
  { id: 'prod_1', nome: 'Arroz Branco Tipo 1 5kg', marca: 'Tio João', categoria: 'Alimentos', quantidade: '5', unidade: 'kg', codigoBarras: '7891234560011', ativo: true },
  { id: 'prod_2', nome: 'Feijão Carioca 1kg', marca: 'Camil', categoria: 'Alimentos', quantidade: '1', unidade: 'kg', codigoBarras: '7891234560028', ativo: true },
  { id: 'prod_3', nome: 'Óleo de Soja 900ml', marca: 'Soya', categoria: 'Alimentos', quantidade: '900', unidade: 'ml', codigoBarras: '7891234560035', ativo: true },
  { id: 'prod_4', nome: 'Café Torrado e Moído 500g', marca: 'Pilão', categoria: 'Alimentos', quantidade: '500', unidade: 'g', codigoBarras: '7891234560042', ativo: true },
  { id: 'prod_5', nome: 'Leite Integral 1L', marca: 'Italac', categoria: 'Laticínios', quantidade: '1', unidade: 'l', codigoBarras: '7891234560059', ativo: true },
  { id: 'prod_6', nome: 'Sabonete em Barra 85g', marca: 'Dove', categoria: 'Higiene', quantidade: '85', unidade: 'g', codigoBarras: '7891234560066', ativo: true },
  { id: 'prod_7', nome: 'Detergente Líquido 500ml', marca: 'Ypê', categoria: 'Limpeza', quantidade: '500', unidade: 'ml', codigoBarras: '7891234560073', ativo: true },
  { id: 'prod_8', nome: 'Creme Dental 90g', marca: 'Colgate', categoria: 'Higiene', quantidade: '90', unidade: 'g', codigoBarras: '7891234560080', ativo: true },
]

function carregarStorage(chave, padrao) {
  try {
    const raw = localStorage.getItem(chave)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    // Ignora erro de storage indisponível
  }
  return padrao
}

function salvarStorage(chave, dados) {
  try {
    localStorage.setItem(chave, JSON.stringify(dados))
  } catch (e) {
    // Ignora erro
  }
}

let mockUid = (() => {
  try {
    let u = localStorage.getItem('cotacao_mock_uid')
    if (!u) {
      u = 'user_mock_' + Math.random().toString(36).substring(2, 9)
      localStorage.setItem('cotacao_mock_uid', u)
    }
    return u
  } catch (e) {
    return 'user_mock_' + Math.random().toString(36).substring(2, 9)
  }
})()

export const mockAuth = {
  currentUser: { uid: mockUid, isAnonymous: true },
}

let mockSalas = carregarStorage('cotacao_mock_salas', {})
let mockProdutos = carregarStorage('cotacao_mock_produtos', SEED_PRODUTOS)

const listenersSalas = new Map()
const listenersPrecos = new Map()
const listenersAuth = new Set()

function sanitizarId(s) {
  return String(s).trim().toLowerCase().replace(/\//g, '_') || 'mercado'
}

function notificarSala(codigo) {
  salvarStorage('cotacao_mock_salas', mockSalas)
  const cbs = listenersSalas.get(codigo)
  if (cbs) {
    const salaData = mockSalas[codigo] || null
    cbs.forEach((cb) => cb(salaData ? JSON.parse(JSON.stringify(salaData)) : null, { hasPendingWrites: false, fromCache: false }))
  }
}

function notificarPrecos(codigo) {
  salvarStorage('cotacao_mock_salas', mockSalas)
  const cbs = listenersPrecos.get(codigo)
  if (cbs) {
    const formatted = formatarPrecosSala(codigo)
    cbs.forEach((cb) => cb(formatted, { hasPendingWrites: false, fromCache: false }))
  }
}

function formatarPrecosSala(codigo) {
  const sala = mockSalas[codigo]
  const precos = {}
  if (!sala || !sala.precos) return precos
  Object.values(sala.precos).forEach((d) => {
    if (!precos[d.produtoId]) precos[d.produtoId] = {}
    precos[d.produtoId][chaveMercado(d.mercado)] = {
      preco: d.preco,
      oferta: !!d.oferta,
      tipoOferta: d.tipoOferta || '',
      obsOferta: d.obsOferta || '',
      atualizadoEm: d.atualizadoEm || null,
    }
  })
  return precos
}

export const mockLoginAnonimo = () => {
  return Promise.resolve(mockAuth.currentUser)
}

export const mockObservarAuth = (cb) => {
  listenersAuth.add(cb)
  setTimeout(() => cb(mockAuth.currentUser), 0)
  return () => listenersAuth.delete(cb)
}

export const mockLoginAdmin = () => Promise.resolve(mockAuth.currentUser)
export const mockLogoutAdmin = () => Promise.resolve()
export const mockSouAdmin = () => Promise.resolve(false)

export const mockGerarCodigo = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let r = ''
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)]
  return r
}

export const mockCriarSala = async (nomeSala, produtos, criadorNome, criadorMercado) => {
  const codigo = mockGerarCodigo()
  const user = mockAuth.currentUser
  const participantes = {
    [user.uid]: {
      nome: criadorNome,
      mercado: criadorMercado,
      uid: user.uid,
      entrouEm: new Date().toISOString(),
    },
  }

  mockSalas[codigo] = {
    nome: nomeSala || 'Cotacao',
    criadoEm: new Date().toISOString(),
    ativa: true,
    criadorUid: user.uid,
    produtos: produtos.map((p, i) => ({
      id: `p${i}`,
      nome: p.nome,
      quantidade: p.quantidade || 1,
      unidade: p.unidade || 'un',
      codigo: p.codigo || null,
      categoria: p.categoria || 'Outros',
    })),
    participantes,
    precos: {},
  }
  salvarStorage('cotacao_mock_salas', mockSalas)
  return codigo
}

export const mockEntrarSala = async (codigo, nome, mercado) => {
  const user = mockAuth.currentUser
  const sala = mockSalas[codigo]
  if (!sala) throw new Error('Sala nao encontrada.')
  if (!sala.participantes) sala.participantes = {}
  sala.participantes[user.uid] = {
    nome,
    mercado,
    uid: user.uid,
    entrouEm: new Date().toISOString(),
  }
  notificarSala(codigo)
  return JSON.parse(JSON.stringify(sala))
}

export const mockEscutarSala = (codigo, cb) => {
  if (!listenersSalas.has(codigo)) listenersSalas.set(codigo, new Set())
  listenersSalas.get(codigo).add(cb)
  const salaData = mockSalas[codigo] || null
  setTimeout(() => {
    cb(salaData ? JSON.parse(JSON.stringify(salaData)) : null, { hasPendingWrites: false, fromCache: false })
  }, 0)
  return () => {
    const s = listenersSalas.get(codigo)
    if (s) s.delete(cb)
  }
}

export const mockLancarPreco = async (codigo, produtoId, mercado, preco, oferta = null) => {
  const sala = mockSalas[codigo]
  if (!sala) throw new Error('Sala nao encontrada')
  if (!sala.precos) sala.precos = {}
  const precoId = `${produtoId}__${sanitizarId(mercado)}`
  sala.precos[precoId] = {
    produtoId,
    mercado,
    preco: parseFloat(preco),
    oferta: !!(oferta && oferta.tipo),
    tipoOferta: (oferta && oferta.tipo) || '',
    obsOferta: (oferta && oferta.obs) || '',
    atualizadoPor: mockAuth.currentUser.uid,
    atualizadoEm: new Date().toISOString(),
  }
  notificarPrecos(codigo)
}

export const mockEscutarPrecos = (codigo, cb) => {
  if (!listenersPrecos.has(codigo)) listenersPrecos.set(codigo, new Set())
  listenersPrecos.get(codigo).add(cb)
  const formatted = formatarPrecosSala(codigo)
  setTimeout(() => {
    cb(formatted, { hasPendingWrites: false, fromCache: false })
  }, 0)
  return () => {
    const s = listenersPrecos.get(codigo)
    if (s) s.delete(cb)
  }
}

export const mockEditarProduto = async (codigo, produtoId, dadosNovos) => {
  const sala = mockSalas[codigo]
  if (!sala) throw new Error('Sala nao encontrada')
  const idx = (sala.produtos || []).findIndex((p) => p.id === produtoId)
  if (idx === -1) throw new Error('Produto nao encontrado')
  sala.produtos[idx] = { ...sala.produtos[idx], ...dadosNovos }
  notificarSala(codigo)
}

export const mockRemoverProduto = async (codigo, produtoId) => {
  const sala = mockSalas[codigo]
  if (!sala) throw new Error('Sala nao encontrada')
  sala.produtos = (sala.produtos || []).filter((p) => p.id !== produtoId)
  if (sala.precos) {
    Object.keys(sala.precos).forEach((k) => {
      if (sala.precos[k].produtoId === produtoId) {
        delete sala.precos[k]
      }
    })
  }
  notificarSala(codigo)
  notificarPrecos(codigo)
}

export const mockAdicionarProduto = async (codigo, nome, quantidade, unidade, codigoBarras = null, categoria = 'Outros') => {
  const sala = mockSalas[codigo]
  if (!sala) throw new Error('Sala nao encontrada')
  const id = `p${Date.now()}`
  if (!sala.produtos) sala.produtos = []
  sala.produtos.push({
    id,
    nome,
    quantidade: quantidade || 1,
    unidade: unidade || 'un',
    codigo: codigoBarras,
    categoria,
  })
  notificarSala(codigo)
  return id
}

export const mockListarMinhasSalas = async () => {
  const uid = mockAuth.currentUser.uid
  return Object.entries(mockSalas)
    .filter(([, s]) => s.participantes && s.participantes[uid])
    .map(([codigo, s]) => ({ codigo, ...JSON.parse(JSON.stringify(s)) }))
}

export const mockExcluirSala = async (codigo) => {
  delete mockSalas[codigo]
  salvarStorage('cotacao_mock_salas', mockSalas)
  notificarSala(codigo)
  notificarPrecos(codigo)
}

export const mockBuscarProdutoBasePropria = async (codigoBarras) => {
  const p = mockProdutos.find((item) => item.codigoBarras === codigoBarras && item.ativo)
  return p ? JSON.parse(JSON.stringify(p)) : null
}

export const mockBuscarProdutosPorNome = async (termo, limite = 10) => {
  if (!termo || termo.length < 2) return []
  const termoLower = termo.toLowerCase().trim()
  return mockProdutos
    .filter((p) => p.ativo && p.nome && p.nome.toLowerCase().includes(termoLower))
    .slice(0, limite)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export const mockSalvarProdutoBasePropria = async (dados) => {
  const id = `prod_${Date.now()}`
  const novoProduto = {
    id,
    codigoBarras: dados.codigoBarras,
    nome: dados.nome,
    marca: dados.marca || '',
    categoria: dados.categoria || 'Outros',
    quantidade: dados.quantidade || '',
    unidade: dados.unidade || '',
    imagem: dados.imagem || null,
    ativo: true,
    cadastradoEm: new Date().toISOString(),
    cadastradoPor: mockAuth.currentUser.uid,
  }
  mockProdutos.push(novoProduto)
  salvarStorage('cotacao_mock_produtos', mockProdutos)
  return id
}

export const mockListarBasePropria = async () => {
  return JSON.parse(JSON.stringify(mockProdutos))
}

export const mockEditarProdutoBasePropria = async (id, dados) => {
  const idx = mockProdutos.findIndex((p) => p.id === id)
  if (idx !== -1) {
    mockProdutos[idx] = {
      ...mockProdutos[idx],
      nome: dados.nome,
      marca: dados.marca || '',
      categoria: dados.categoria || 'Outros',
      quantidade: dados.quantidade || '',
      unidade: dados.unidade || '',
    }
    salvarStorage('cotacao_mock_produtos', mockProdutos)
  }
}

export const mockBuscarProdutoPorId = async (id) => {
  const p = mockProdutos.find((item) => item.id === id)
  return p ? JSON.parse(JSON.stringify(p)) : null
}

export const mockVincularVariante = async (idA, idB) => {
  const pA = mockProdutos.find((p) => p.id === idA)
  const pB = mockProdutos.find((p) => p.id === idB)
  if (!pA || !pB) throw new Error('Produto não encontrado')
  const grupo = pA.grupoVariante || pB.grupoVariante || `grp_${idA}`
  pA.grupoVariante = grupo
  pB.grupoVariante = grupo
  salvarStorage('cotacao_mock_produtos', mockProdutos)
  return grupo
}

export const mockDesvincularVariante = async (id) => {
  const p = mockProdutos.find((item) => item.id === id)
  if (p) {
    p.grupoVariante = null
    salvarStorage('cotacao_mock_produtos', mockProdutos)
  }
}

export const mockDefinirAtivoBasePropria = async (id, ativo) => {
  const p = mockProdutos.find((item) => item.id === id)
  if (p) {
    p.ativo = ativo
    salvarStorage('cotacao_mock_produtos', mockProdutos)
  }
}

export const mockApagarProdutoDeVez = async (id) => {
  mockProdutos = mockProdutos.filter((p) => p.id !== id)
  salvarStorage('cotacao_mock_produtos', mockProdutos)
}

export const mockListarTodasSalas = async () => {
  return Object.entries(mockSalas).map(([codigo, s]) => ({ codigo, ...JSON.parse(JSON.stringify(s)) }))
}

export const mockRemoverParticipanteAdmin = async (codigo, uidParticipante) => {
  const sala = mockSalas[codigo]
  if (sala && sala.participantes) {
    delete sala.participantes[uidParticipante]
    notificarSala(codigo)
  }
}
