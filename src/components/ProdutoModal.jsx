import { useState, useEffect, useRef } from 'react'
import { formatarQuantidade, parseQuantidadeExistente, formatarInputPreco, parsePreco } from '../utils/ptBR.js'
import { TIPOS_OFERTA } from '../utils/precos.js'
import { buscarProdutosPorNome, buscarProdutoBasePropria, salvarProdutoBasePropria, editarProdutoBasePropria } from '../firebase.js'

const CATEGORIAS = ['Alimentos', 'Bebidas', 'Limpeza', 'Higiene', 'Frios e Laticínios', 'Padaria', 'Açougue', 'Outros']
const UNIDADES = ['g', 'kg', 'ml', 'L', 'un', 'pct', 'cx', 'caixa', 'pacote']

export default function ProdutoModal({ titulo, aviso, inicial, meuMercado, editandoProdutoId = null, editandoIdx, onConfirmar, onCancelar }) {
  const qtdInicial = parseQuantidadeExistente(inicial?.quantidade)
  const [nome, setNome] = useState(inicial?.nome || '')
  const [valorQtd, setValorQtd] = useState(qtdInicial.valor)
  const [unidadeQtd, setUnidadeQtd] = useState(inicial?.unidade || qtdInicial.unidade || 'un')
  const [categoria, setCategoria] = useState(inicial?.categoria || 'Outros')
  const [preco, setPreco] = useState(inicial?.preco ? formatarInputPreco(inicial.preco) : '')
  const [tipoOferta, setTipoOferta] = useState(inicial?.tipoOferta || '')
  const [obsOferta, setObsOferta] = useState(inicial?.obsOferta || '')
  const [salvando, setSalvando] = useState(false)
  const somentePreco = !!inicial?.somentePreco

  // 🔥 Estado do código de barras
  const [codigoBarras, setCodigoBarras] = useState('')
  const [codigoOriginal, setCodigoOriginal] = useState('') // 🔥 Guarda o código que veio da base
  const [validandoCodigo, setValidandoCodigo] = useState(false)
  const [erroCodigo, setErroCodigo] = useState(null)
  const [produtoBaseId, setProdutoBaseId] = useState(null)
  const [carregandoCodigo, setCarregandoCodigo] = useState(false)

  // Carrega o código de barras já existente ao editar um produto da sala.
  // Prioridade 1: `inicial.codigo`, mas só se tiver "cara" de código de
  // barras de verdade (só dígitos, 8-14 caracteres) — isso descarta lixo
  // que ficou gravado por versões antigas com bug (ex.: texto de
  // categoria salvo no lugar do código).
  // Prioridade 2 (fallback, só quando não há código salvo ou o valor é
  // lixo): busca por NOME na base — mas só usa o resultado se for um
  // match EXATO e ÚNICO (nome idêntico e um só produto ativo com esse
  // nome). Nome não é chave única, então qualquer ambiguidade (0 ou 2+
  // resultados) deixa o campo em branco pra digitação manual em vez de
  // arriscar trazer o código de outro produto.
  useEffect(() => {
    const pareceCodigoDeBarras = (s) => /^\d{8,14}$/.test(String(s || '').trim())

    const carregarCodigoExistente = async () => {
      if (!editandoProdutoId || somentePreco) return
      const codigoSalvo = inicial?.codigo || ''
      setCarregandoCodigo(true)
      try {
        if (codigoSalvo && pareceCodigoDeBarras(codigoSalvo)) {
          const encontrado = await buscarProdutoBasePropria(codigoSalvo)
          setCodigoBarras(codigoSalvo)
          setCodigoOriginal(codigoSalvo)
          setProdutoBaseId(encontrado?.id || null)
          return
        }
        if (inicial?.nome) {
          const resultados = await buscarProdutosPorNome(inicial.nome, 10)
          const exatos = resultados.filter(p => p.nome === inicial.nome && p.codigoBarras)
          if (exatos.length === 1) {
            setCodigoBarras(exatos[0].codigoBarras)
            setCodigoOriginal(exatos[0].codigoBarras)
            setProdutoBaseId(exatos[0].id)
            return
          }
        }
        setCodigoBarras('')
        setCodigoOriginal('')
        setProdutoBaseId(null)
      } catch (e) {
        console.warn('Erro ao carregar código de barras:', e)
        setCodigoBarras('')
        setCodigoOriginal('')
        setProdutoBaseId(null)
      } finally {
        setCarregandoCodigo(false)
      }
    }
    carregarCodigoExistente()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editandoProdutoId])

  // 🔥 Autocomplete
  const [termoBusca, setTermoBusca] = useState(inicial?.nome || '')
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const inputRef = useRef(null)
  const sugestaoRef = useRef(null)

  const habilitarAutocomplete = !somentePreco && !editandoProdutoId && editandoIdx === undefined

  useEffect(() => {
    if (!habilitarAutocomplete || termoBusca.length < 2) {
      setSugestoes([])
      setMostrarSugestoes(false)
      return
    }
    const delay = setTimeout(async () => {
      try {
        const resultados = await buscarProdutosPorNome(termoBusca, 8)
        setSugestoes(resultados)
        setMostrarSugestoes(resultados.length > 0)
      } catch (e) {
        console.error('Erro ao buscar sugestões:', e)
        setSugestoes([])
        setMostrarSugestoes(false)
      }
    }, 300)
    return () => clearTimeout(delay)
  }, [termoBusca, habilitarAutocomplete])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sugestaoRef.current && !sugestaoRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setMostrarSugestoes(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selecionarProduto = (produto) => {
    const qtd = parseQuantidadeExistente(produto.quantidade)
    setNome(produto.nome || '')
    setTermoBusca(produto.nome || '')
    setValorQtd(qtd.valor)
    setUnidadeQtd(produto.unidade || qtd.unidade || 'un')
    setCategoria(produto.categoria || 'Outros')
    const codigo = produto.codigoBarras || ''
    setCodigoBarras(codigo)
    setCodigoOriginal(codigo)
    setProdutoBaseId(produto.id || null)
    setMostrarSugestoes(false)
  }

  // 🔥 VALIDAÇÃO: Só valida se o usuário ALTEROU o campo
  const validarCodigoBarras = async (codigo) => {
    // Se não digitou nada, não valida
    if (!codigo || codigo.trim().length === 0) {
      setErroCodigo(null)
      return true
    }

    // Se é igual ao original (veio da base), não valida
    if (codigo === codigoOriginal) {
      setErroCodigo(null)
      return true
    }

    if (codigo.length < 8) {
      setErroCodigo('Código deve ter pelo menos 8 dígitos')
      return false
    }

    setValidandoCodigo(true)
    try {
      const existente = await buscarProdutoBasePropria(codigo)
      if (!existente) {
        setErroCodigo(null)
        setValidandoCodigo(false)
        return true
      }
      if (existente.id === produtoBaseId) {
        setErroCodigo(null)
        setValidandoCodigo(false)
        return true
      }
      setErroCodigo(`Código já pertence a "${existente.nome}"`)
      setValidandoCodigo(false)
      return false
    } catch (e) {
      setErroCodigo('Erro ao validar código')
      setValidandoCodigo(false)
      return false
    }
  }

  const handleConfirmar = async () => {
    if (!somentePreco && !nome.trim()) return
    const v = parseFloat(String(valorQtd).replace(',', '.'))
    if (!somentePreco && (isNaN(v) || v <= 0)) return alert('Quantidade precisa ser um número maior que zero')
    const precoNum = preco.trim() ? parsePreco(preco) : null
    if (preco.trim() && precoNum === null) return alert('Preço inválido')
    if (somentePreco && precoNum === null) return alert('Informe o preço')

    // 🔥 Só valida se o usuário ALTEROU o código (digitou algo diferente do original)
    const codigoParaValidar = codigoBarras?.trim() || ''
    if (codigoParaValidar && codigoParaValidar !== codigoOriginal) {
      const valido = await validarCodigoBarras(codigoParaValidar)
      if (!valido) return
    }

    setSalvando(true)
    try {
      const dadosProduto = {
        nome: nome.trim(),
        quantidade: v,
        unidade: unidadeQtd.trim() || 'un',
        categoria,
        codigo: codigoParaValidar || null,
        preco: precoNum,
        oferta: precoNum != null && tipoOferta ? { tipo: tipoOferta, obs: obsOferta.trim() } : null,
      }

      if (produtoBaseId) {
        try {
          await editarProdutoBasePropria(produtoBaseId, {
            nome: nome.trim(),
            marca: '',
            categoria,
            quantidade: v,
            unidade: unidadeQtd.trim() || 'un',
          })
        } catch (e) {
          console.warn('Erro ao atualizar na base própria:', e)
        }
      } else if (codigoParaValidar) {
        try {
          const id = await salvarProdutoBasePropria({
            codigoBarras: codigoParaValidar,
            nome: nome.trim(),
            marca: '',
            categoria,
            quantidade: v,
            unidade: unidadeQtd.trim() || 'un',
            imagem: null,
          })
          setProdutoBaseId(id)
        } catch (e) {
          console.warn('Erro ao salvar na base própria:', e)
        }
      }

      await onConfirmar(dadosProduto)
    } catch (e) {
      alert('Erro ao salvar produto: ' + e.message)
      setSalvando(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirmar()
    }
  }

  const qtdExibicao = formatarQuantidade(valorQtd, unidadeQtd)

  if (somentePreco) {
    return (
      <div style={overlay}>
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>{titulo}</h3>
          {aviso && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 8, padding: '10px 12px', fontSize: '0.82rem', marginBottom: 14 }}>
              {aviso}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={label}>Produto</label>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                {inicial?.nome || 'Produto sem nome'}
              </div>
            </div>
            <div>
              <label style={label}>Preço em {meuMercado}</label>
              <input
                autoFocus
                inputMode="decimal"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                onKeyDown={handleKeyDown}
                style={inp}
                placeholder="0,00"
              />
            </div>
            {preco.trim() && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                <label style={label}>Esse preço depende de convênio/fidelidade?</label>
                <select
                  value={tipoOferta}
                  onChange={e => setTipoOferta(e.target.value)}
                  style={inp}
                >
                  <option value="">Não — preço normal para qualquer cliente</option>
                  {TIPOS_OFERTA.map(t => (
                    <option key={t} value={t}>Sim — {t}</option>
                  ))}
                </select>
                {tipoOferta && (
                  <input
                    value={obsOferta}
                    onChange={e => setObsOferta(e.target.value)}
                    style={{ ...inp, marginTop: 8 }}
                    placeholder="Detalhe (ex: Clube Economia, leve 2 pague 1)"
                  />
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={handleConfirmar}
              disabled={salvando}
              style={{ ...btnPrim, opacity: salvando ? 0.6 : 1 }}
            >
              {salvando ? 'Salvando...' : '✓ Lançar preço'}
            </button>
            <button onClick={onCancelar} disabled={salvando} style={btnSec}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>{titulo}</h3>
        {aviso && (
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 8, padding: '10px 12px', fontSize: '0.82rem', marginBottom: 14 }}>
            {aviso}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={label}>Nome do produto</label>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                autoFocus
                value={habilitarAutocomplete ? termoBusca : nome}
                onChange={e => {
                  const val = e.target.value
                  if (habilitarAutocomplete) {
                    setTermoBusca(val)
                    setNome(val)
                  } else {
                    setNome(val)
                  }
                }}
                onFocus={() => { if (habilitarAutocomplete && sugestoes.length > 0) setMostrarSugestoes(true) }}
                onKeyDown={handleKeyDown}
                style={{ ...inp, background: 'white' }}
                placeholder="Ex: Tapioca 500g"
                disabled={!habilitarAutocomplete && !!editandoProdutoId}
              />
              {habilitarAutocomplete && mostrarSugestoes && sugestoes.length > 0 && (
                <div
                  ref={sugestaoRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    maxHeight: 200,
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    marginTop: 4,
                  }}
                >
                  {sugestoes.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => selecionarProduto(prod)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={e => e.target.style.background = '#f8fafc'}
                      onMouseLeave={e => e.target.style.background = 'white'}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{prod.nome}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {prod.quantidade} {prod.unidade || 'un'} · {prod.categoria || 'Outros'}
                          {prod.marca && ` · ${prod.marca}`}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, background: '#ecfdf5', padding: '2px 10px', borderRadius: 999 }}>
                        já cadastrado
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {habilitarAutocomplete && (
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                💡 Digite para buscar produtos já cadastrados
              </div>
            )}
          </div>

          <div>
            <label style={label}>Código de barras</label>
            {carregandoCodigo ? (
              <div style={{ padding: '10px 12px', color: '#94a3b8' }}>🔍 Buscando código...</div>
            ) : (
              <input
                type="text"
                inputMode="numeric"
                value={codigoBarras}
                onChange={e => {
                  const val = e.target.value
                  setCodigoBarras(val)
                  // 🔥 Só valida se o usuário ALTEROU o campo
                  if (val && val.trim().length >= 8 && val !== codigoOriginal) {
                    validarCodigoBarras(val.trim())
                  } else {
                    setErroCodigo(null)
                  }
                }}
                onBlur={() => {
                  const val = codigoBarras?.trim() || ''
                  if (val && val.length >= 8 && val !== codigoOriginal) {
                    validarCodigoBarras(val)
                  }
                }}
                onKeyDown={handleKeyDown}
                style={{ ...inp, borderColor: erroCodigo ? '#ef4444' : '#e2e8f0' }}
                placeholder="Digite ou escaneie o código de barras"
              />
            )}
            {erroCodigo && (
              <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2 }}>
                ⚠️ {erroCodigo}
              </div>
            )}
            {validandoCodigo && (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                🔍 Validando código...
              </div>
            )}
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
              {codigoBarras && codigoBarras.trim() 
                ? '✅ Produto com código — será salvo na base própria' 
                : '⚠️ Sem código — NÃO será salvo na base própria'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Peso / Volume do pacote</label>
              <input
                type="text"
                inputMode="decimal"
                value={valorQtd}
                onChange={e => setValorQtd(e.target.value)}
                onKeyDown={handleKeyDown}
                style={inp}
                placeholder="500"
              />
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                Ex: 500 (para 500g) ou 1 (para 1 unidade)
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Unidade</label>
              <select
                value={unidadeQtd}
                onChange={e => setUnidadeQtd(e.target.value)}
                style={inp}
              >
                {UNIDADES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Categoria</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                style={inp}
              >
                {CATEGORIAS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
            📦 Tamanho do pacote: {qtdExibicao}
          </div>

          {meuMercado && (
            <div>
              <label style={label}>
                Preço do pacote em {meuMercado}
                {' (opcional — dá pra lançar depois)'}
              </label>
              <input
                inputMode="decimal"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                onKeyDown={handleKeyDown}
                style={inp}
                placeholder="0,00"
              />
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                Preço total do pacote (ex: R$ 2,50 para 500g)
              </div>
            </div>
          )}

          {meuMercado && preco.trim() && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
              <label style={label}>Esse preço depende de convênio/fidelidade?</label>
              <select
                value={tipoOferta}
                onChange={e => setTipoOferta(e.target.value)}
                style={inp}
              >
                <option value="">Não — preço normal para qualquer cliente</option>
                {TIPOS_OFERTA.map(t => (
                  <option key={t} value={t}>Sim — {t}</option>
                ))}
              </select>
              {tipoOferta && (
                <input
                  value={obsOferta}
                  onChange={e => setObsOferta(e.target.value)}
                  style={{ ...inp, marginTop: 8 }}
                  placeholder="Detalhe (ex: Clube Economia, leve 2 pague 1)"
                />
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={handleConfirmar}
            disabled={(!nome.trim()) || salvando || validandoCodigo}
            style={{ ...btnPrim, opacity: ((!nome.trim()) || salvando || validandoCodigo) ? 0.6 : 1 }}
          >
            {salvando ? 'Salvando...' : '✓ Adicionar'}
          </button>
          <button onClick={onCancelar} disabled={salvando} style={btnSec}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const card = { width: '100%', maxWidth: 420, background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }
const label = { display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: 4, fontWeight: 600 }
const inp = { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
const btnPrim = { flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', fontWeight: 700 }
const btnSec = { flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600 }