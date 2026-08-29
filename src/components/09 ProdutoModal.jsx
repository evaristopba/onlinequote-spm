import { useState, useEffect, useRef } from 'react'
import { formatarQuantidade, parseQuantidadeExistente, formatarInputPreco, parsePreco } from '../utils/ptBR.js'
import { TIPOS_OFERTA } from '../utils/precos.js'
import { buscarProdutosPorNome, buscarProdutoBasePropria, salvarProdutoBasePropria } from '../firebase.js'

const CATEGORIAS = ['Alimentos', 'Bebidas', 'Limpeza', 'Higiene', 'Frios e Laticínios', 'Padaria', 'Açougue', 'Outros']
const UNIDADES = ['g', 'kg', 'ml', 'L', 'un', 'pct', 'cx', 'caixa', 'pacote']

export default function ProdutoModal({ titulo, aviso, inicial, meuMercado, onConfirmar, onCancelar }) {
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

  // 🔥 Código de barras - com validação de que é número
  const codigoInicial = (() => {
    const val = inicial?.codigo || ''
    // Só aceita se for número com 8+ dígitos
    if (/^\d{8,}$/.test(val)) return val
    return ''
  })()

  const [codigoBarras, setCodigoBarras] = useState(codigoInicial)
  const [validandoCodigo, setValidandoCodigo] = useState(false)
  const [erroCodigo, setErroCodigo] = useState(null)

  // 🔥 Autocomplete
  const [termoBusca, setTermoBusca] = useState(inicial?.nome || '')
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const inputRef = useRef(null)
  const sugestaoRef = useRef(null)

  const habilitarAutocomplete = !somentePreco && !inicial?.editandoProdutoId && inicial?.editandoIdx === undefined

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
    setCodigoBarras(/^\d{8,}$/.test(codigo) ? codigo : '')
    setMostrarSugestoes(false)
  }

  const validarCodigoBarras = async (codigo) => {
    if (!codigo || codigo.length < 8) {
      setErroCodigo(null)
      return true
    }
    setValidandoCodigo(true)
    try {
      const existente = await buscarProdutoBasePropria(codigo)
      if (existente && existente.id !== inicial?.produtoBaseId) {
        setErroCodigo(`Código já pertence a "${existente.nome}"`)
        setValidandoCodigo(false)
        return false
      }
      setErroCodigo(null)
      setValidandoCodigo(false)
      return true
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

    if (codigoBarras.trim()) {
      const valido = await validarCodigoBarras(codigoBarras.trim())
      if (!valido) return
    }

    setSalvando(true)
    try {
      const dadosProduto = {
        nome: nome.trim(),
        quantidade: v,
        unidade: unidadeQtd.trim() || 'un',
        categoria,
        codigo: codigoBarras.trim() || null,
        preco: precoNum,
        oferta: precoNum != null && tipoOferta ? { tipo: tipoOferta, obs: obsOferta.trim() } : null,
      }

      if (codigoBarras.trim() && !inicial?.editandoProdutoId) {
        try {
          await salvarProdutoBasePropria({
            codigoBarras: codigoBarras.trim(),
            nome: nome.trim(),
            marca: '',
            categoria,
            quantidade: v,
            unidade: unidadeQtd.trim() || 'un',
            imagem: null,
          })
          console.log('✅ Produto salvo na base própria com código:', codigoBarras)
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
                disabled={!habilitarAutocomplete && !!inicial?.editandoProdutoId}
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
            <label style={label}>Código de barras (opcional)</label>
            <input
              type="text"
              inputMode="numeric"
              value={codigoBarras}
              onChange={e => {
                setCodigoBarras(e.target.value)
                setErroCodigo(null)
              }}
              onBlur={() => { if (codigoBarras.trim()) validarCodigoBarras(codigoBarras.trim()) }}
              onKeyDown={handleKeyDown}
              style={{ ...inp, borderColor: erroCodigo ? '#ef4444' : '#e2e8f0' }}
              placeholder="Digite ou escaneie o código de barras"
            />
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
              {codigoBarras.trim() ? '✅ Produto será salvo na base própria' : '⚠️ Sem código, não será salvo na base própria'}
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

          {inicial?.codigo && !codigoBarras && /^\d{8,}$/.test(inicial.codigo) && (
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              📷 Código de barras original: {inicial.codigo}
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