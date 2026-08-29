import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { criarSala, buscarProdutoBasePropria, lancarPreco, buscarProdutosPorNome } from '../firebase.js'
import { buscarProdutoPorCodigo } from '../utils/barcode.js'
import BarcodeScanner from './BarcodeScanner.jsx'
import CadastrarProduto from './CadastrarProduto.jsx'
import ProdutoModal from './ProdutoModal.jsx'
import { formatarQuantidade, parseQuantidadeExistente } from '../utils/ptBR.js'

export default function CriarSala() {
  const nav = useNavigate()
  const [nome, setNome] = useState('')
  const [mercado, setMercado] = useState('')
  const [nomeSala, setNomeSala] = useState('')
  const [produtos, setProdutos] = useState([])
  const [mostrarScanner, setMostrarScanner] = useState(false)
  const [mostrarCadastro, setMostrarCadastro] = useState(null)
  const [mostrarProdutoModal, setMostrarProdutoModal] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [buscando, setBuscando] = useState(false)
  
  const [termoBusca, setTermoBusca] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const inputRef = useRef(null)
  const sugestaoRef = useRef(null)

  useEffect(() => {
    if (termoBusca.length < 2) {
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
  }, [termoBusca])

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
    setTermoBusca(produto.nome || '')
    setMostrarSugestoes(false)
    setMostrarProdutoModal({
      titulo: '✅ Produto encontrado na base',
      aviso: `Este produto já está cadastrado como "${produto.nome}". Confirme para adicionar à cotação.`,
      inicial: {
        nome: produto.nome,
        quantidade: qtd.valor,
        unidade: produto.unidade || qtd.unidade || 'un',
        categoria: produto.categoria || 'Outros',
        codigo: produto.codigoBarras || null,
        preco: null,
      },
      editandoIdx: null,
      produtoExistente: produto,
    })
  }

  const addManual = () => {
    setTermoBusca('')
    setMostrarSugestoes(false)
    setMostrarProdutoModal({
      titulo: '➕ Adicionar produto',
      inicial: { nome: '', quantidade: 1, unidade: 'un', categoria: 'Outros' },
      editandoIdx: null,
    })
  }

  const processarCodigo = async (codigo) => {
    setBuscando(true)
    const proprio = await buscarProdutoBasePropria(codigo)
    if (proprio) {
      const qtd = parseQuantidadeExistente(proprio.quantidade)
      setMostrarProdutoModal({
        titulo: '✅ Produto encontrado na base própria',
        inicial: {
          nome: proprio.nome,
          quantidade: qtd.valor,
          unidade: proprio.unidade || qtd.unidade || 'un',
          categoria: proprio.categoria || 'Outros',
          codigo: proprio.codigoBarras,
          preco: null,
        },
        editandoIdx: null,
        produtoExistente: proprio,
      })
      setBuscando(false)
      return
    }
    const off = await buscarProdutoPorCodigo(codigo)
    if (off) {
      setMostrarCadastro({ ...off, codigoBarras: codigo })
      setBuscando(false)
      return
    }
    setMostrarProdutoModal({
      titulo: `🔎 Código ${codigo} não encontrado — cadastre manualmente`,
      inicial: { nome: '', quantidade: 1, unidade: 'un', categoria: 'Outros', codigo },
      editandoIdx: null,
    })
    setBuscando(false)
  }

  const handleScan = (codigo) => {
    setMostrarScanner(false)
    processarCodigo(codigo)
  }

  const handleSalvoNaBase = (dados) => {
    setMostrarCadastro(null)
    const qtd = parseQuantidadeExistente(dados.quantidade)
    setMostrarProdutoModal({
      titulo: 'Confirmar produto',
      inicial: {
        nome: dados.nome,
        quantidade: qtd.valor,
        unidade: dados.unidade || qtd.unidade || 'un',
        categoria: dados.categoria,
        codigo: dados.codigo,
        preco: null,
      },
      editandoIdx: null,
    })
  }

  const editar = (idx) => {
    const p = produtos[idx]
    const qtd = parseQuantidadeExistente(p.quantidade)
    setMostrarProdutoModal({
      titulo: '✏️ Editar produto',
      inicial: {
        nome: p.nome,
        quantidade: qtd.valor,
        unidade: p.unidade || qtd.unidade || 'un',
        categoria: p.categoria || 'Outros',
        codigo: p.codigo,
        preco: p.preco,
      },
      editandoIdx: idx,
    })
  }

  const handleConfirmarProduto = (dados) => {
    const novoProduto = {
      nome: dados.nome,
      quantidade: dados.quantidade,
      unidade: dados.unidade || 'un',
      categoria: dados.categoria || 'Outros',
      codigo: dados.codigo || null,
      preco: dados.preco || null,
    }
    if (mostrarProdutoModal?.editandoIdx != null) {
      setProdutos(p => p.map((item, i) => i === mostrarProdutoModal.editandoIdx ? { ...item, ...novoProduto } : item))
    } else {
      setProdutos(p => [...p, novoProduto])
    }
    setTermoBusca('')
    setMostrarProdutoModal(null)
  }

  const remover = (idx) => setProdutos(p => p.filter((_, i) => i !== idx))

  const handleCriar = async () => {
    if (!nome.trim() || !mercado.trim()) return alert('Preencha nome e mercado')
    if (produtos.length === 0) return alert('Adicione pelo menos um produto')
    setCarregando(true)
    try {
      const c = await criarSala(nomeSala || 'Cotação', produtos, nome, mercado)
      await Promise.all(produtos.map((p, i) => p.preco != null ? lancarPreco(c, `p${i}`, mercado, p.preco) : null))
      nav(`/sala/${c}`)
    } catch (e) { alert('Erro: ' + e.message); setCarregando(false) }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ marginBottom: 20 }}>➕ Criar Cotação</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <input placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} style={inp} />
        <input placeholder="Mercado (ex: Carrefour)" value={mercado} onChange={e => setMercado(e.target.value)} style={inp} />
        <input placeholder="Nome da cotação (opcional)" value={nomeSala} onChange={e => setNomeSala(e.target.value)} style={inp} />
      </div>
      <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>📦 Produtos ({produtos.length})</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMostrarScanner(true)} style={btnA}>📷 Escanear</button>
            <button onClick={addManual} style={btnB}>✏️ Manual</button>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="🔍 Digite o nome do produto..."
            value={termoBusca}
            onChange={e => setTermoBusca(e.target.value)}
            onFocus={() => { if (sugestoes.length > 0) setMostrarSugestoes(true) }}
            style={inp}
          />
          {mostrarSugestoes && sugestoes.length > 0 && (
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
                maxHeight: 240,
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
              <div
                onClick={addManual}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderTop: '1px solid #e2e8f0',
                  color: '#3b82f6',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textAlign: 'center',
                }}
                onMouseEnter={e => e.target.style.background = '#eff6ff'}
                onMouseLeave={e => e.target.style.background = 'white'}
              >
                ➕ Cadastrar novo: "{termoBusca}"
              </div>
            </div>
          )}
        </div>

        {buscando && <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>🔍 Buscando...</p>}
        {produtos.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem', padding: '10px 0' }}>
            Nenhum produto. Escaneie, busque ou adicione manualmente.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr>
                <th style={th}>Produto</th>
                <th style={th}>Qtd</th>
                <th style={th}>Cat.</th>
                <th style={th}>Preço</th>
                <th style={{ ...th, width: 36 }}></th>
              </tr></thead>
              <tbody>
                {produtos.map((p, i) => (
                  <tr key={i}>
                    <td style={td}>
                      <strong>{p.nome}</strong>
                      {p.codigo && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Cód: {p.codigo}</div>}
                    </td>
                    <td style={td}>{formatarQuantidade(p.quantidade, p.unidade)}</td>
                    <td style={td}>{p.categoria}</td>
                    <td style={td}>
                      {p.preco != null ? `R$ ${p.preco.toFixed(2).replace('.', ',')}` : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => editar(i)} style={editBtn} title="Editar">✏️</button>
                      <button onClick={() => remover(i)} style={delBtn} title="Remover">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <button onClick={handleCriar} disabled={carregando} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, fontSize: '1rem', opacity: carregando ? 0.6 : 1 }}>
        {carregando ? 'Criando...' : '🚀 Criar Sala'}
      </button>
      {mostrarScanner && <BarcodeScanner onScan={handleScan} onClose={() => setMostrarScanner(false)} />}
      {mostrarCadastro && <CadastrarProduto dadosIniciais={mostrarCadastro} onSalvo={handleSalvoNaBase} onCancelar={() => setMostrarCadastro(null)} />}
      {mostrarProdutoModal && (
        <ProdutoModal
          key={mostrarProdutoModal.editandoIdx ?? 'novo'}
          titulo={mostrarProdutoModal.titulo}
          aviso={mostrarProdutoModal.aviso}
          inicial={mostrarProdutoModal.inicial}
          editandoIdx={mostrarProdutoModal.editandoIdx}
          meuMercado={mercado.trim() || null}
          onConfirmar={handleConfirmarProduto}
          onCancelar={() => {
            setTermoBusca('')
            setMostrarProdutoModal(null)
          }}
        />
      )}
    </div>
  )
}

const inp = { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
const btnA = { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f59e0b', color: 'white', fontWeight: 600, fontSize: '0.85rem' }
const btnB = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 600, fontSize: '0.85rem' }
const th = { padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }
const td = { padding: '8px 10px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }
const delBtn = { background: 'none', border: 'none', color: '#ef4444', fontSize: '1.05rem', cursor: 'pointer' }
const editBtn = { background: 'none', border: 'none', color: '#3b82f6', fontSize: '1.05rem', cursor: 'pointer', marginRight: 6 }