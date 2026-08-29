import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { escutarSala, escutarPrecos, lancarPreco, adicionarProduto, editarProduto, removerProduto, excluirSala, auth, buscarProdutoBasePropria } from '../firebase.js'
import { parsePreco, formatarDataRelativa } from '../utils/ptBR.js'
import { buscarProdutoPorCodigo } from '../utils/barcode.js'
import { infoPreco } from '../utils/precos.js'
import { useOnline, salvarUltimaSala, limparUltimaSala } from '../utils/conexao.js'
import TabelaCotacao from './TabelaCotacao.jsx'
import ListaOtimizada from './ListaOtimizada.jsx'
import Participantes from './Participantes.jsx'
import BarcodeScanner from './BarcodeScanner.jsx'
import CadastrarProduto from './CadastrarProduto.jsx'
import ProdutoModal from './ProdutoModal.jsx'

export default function Sala() {
  const { codigo } = useParams()
  const nav = useNavigate()
  const online = useOnline()
  const [sala, setSala] = useState(null)
  const [precos, setPrecos] = useState({})
  const [naoEncontrada, setNaoEncontrada] = useState(false)
  const [meuMercado, setMeuMercado] = useState('')
  const [meuNome, setMeuNome] = useState('')
  const [mostrarScanner, setMostrarScanner] = useState(false)
  const [mostrarCadastro, setMostrarCadastro] = useState(null)
  const [mostrarProdutoModal, setMostrarProdutoModal] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [aba, setAba] = useState('todos')

  useEffect(() => {
    const unsub = escutarSala(codigo, (d) => {
      if (!d) { setNaoEncontrada(true); setSala(null); return }
      setNaoEncontrada(false)
      setSala(d)
      const u = auth.currentUser?.uid
      if (u && d.participantes[u]) {
        setMeuMercado(d.participantes[u].mercado)
        setMeuNome(d.participantes[u].nome)
      }
    })
    return () => unsub()
  }, [codigo])

  useEffect(() => {
    const unsub = escutarPrecos(codigo, setPrecos)
    return () => unsub()
  }, [codigo])

  useEffect(() => {
    if (sala) salvarUltimaSala(codigo, sala.nome)
  }, [codigo, sala?.nome])

  const mercados = useMemo(() => sala ? [...new Set(Object.values(sala.participantes || {}).map(p => p.mercado))] : [], [sala])
  const produtos = sala?.produtos || []
  const completos = useMemo(() => {
    if (mercados.length === 0) return []
    return produtos.filter(p => mercados.every(m => {
      const i = infoPreco(precos[p.id]?.[m])
      return i && i.preco > 0
    }))
  }, [produtos, precos, mercados])
  const produtosVisiveis = aba === 'completos' ? completos : produtos

  const souCriador = sala && auth.currentUser && (
    'criadorUid' in sala ? sala.criadorUid === auth.currentUser.uid : !!sala.participantes?.[auth.currentUser.uid]
  )

  const handleExcluir = async () => {
    if (!confirm('Excluir essa sala e todos os preços lançados? Essa ação não pode ser desfeita.')) return
    setExcluindo(true)
    try { await excluirSala(codigo); limparUltimaSala(); nav('/') } catch (e) { alert('Erro ao excluir: ' + e.message); setExcluindo(false) }
  }

  const handlePreco = async (pid, m, v) => {
    const n = parsePreco(v)
    if (n === null) return
    const atual = infoPreco(precos[pid]?.[m])
    await lancarPreco(codigo, pid, m, n, atual?.oferta ? { tipo: atual.tipoOferta, obs: atual.obsOferta } : null)
  }

  const handleAddManual = () => {
    setMostrarProdutoModal({
      titulo: '➕ Adicionar produto',
      inicial: { nome: '', quantidade: 1, unidade: 'un', categoria: 'Outros' }
    })
  }

  const abrirLancamentoPreco = (p, aviso) => {
    const atual = infoPreco(precos[p.id]?.[meuMercado])
    setMostrarProdutoModal({
      titulo: '💲 Lançar/atualizar preço',
      aviso,
      inicial: {
        nome: p.nome,
        quantidade: p.quantidade,
        unidade: p.unidade || 'un',
        categoria: p.categoria || 'Outros',
        codigo: p.codigo || null,
        preco: atual?.preco,
        tipoOferta: atual?.tipoOferta || '',
        obsOferta: atual?.obsOferta || '',
        somentePreco: true
      },
      editandoProdutoId: p.id,
      somentePreco: true,
    })
  }

  const processarCodigo = async (cb) => {
    setBuscando(true)
    const jaNaSala = produtos.find(p => p.codigo && String(p.codigo) === String(cb))
    if (jaNaSala) {
      setBuscando(false)
      abrirLancamentoPreco(jaNaSala, `"${jaNaSala.nome}" já está nessa cotação — em vez de duplicar, atualize o preço do seu mercado.`)
      return
    }
    try {
      const proprio = await buscarProdutoBasePropria(cb)
      if (proprio) {
        setMostrarProdutoModal({
          titulo: '✅ Produto encontrado na base própria',
          inicial: {
            nome: proprio.nome,
            quantidade: proprio.quantidade || 1,
            unidade: proprio.unidade || 'un',
            categoria: proprio.categoria || 'Outros',
            codigo: proprio.codigoBarras || null
          }
        })
        setBuscando(false)
        return
      }
      const off = await buscarProdutoPorCodigo(cb)
      if (off) {
        setMostrarCadastro({ ...off, codigoBarras: cb })
        setBuscando(false)
        return
      }
    } catch (e) {
      console.error('Busca do código falhou (offline?):', e)
    }
    setMostrarProdutoModal({
      titulo: `🔎 Código ${cb} não encontrado — cadastre manualmente`,
      inicial: { nome: '', quantidade: 1, unidade: 'un', categoria: 'Outros', codigo: cb }
    })
    setBuscando(false)
  }

  const handleScan = (cb) => {
    setMostrarScanner(false)
    processarCodigo(cb)
  }

  const handleSalvoNaBase = (dados) => {
    setMostrarCadastro(null)
    setMostrarProdutoModal({
      titulo: 'Confirmar produto',
      inicial: {
        nome: dados.nome,
        quantidade: dados.quantidade || 1,
        unidade: dados.unidade || 'un',
        categoria: dados.categoria,
        codigo: dados.codigo || null
      }
    })
  }

  const handleConfirmarProduto = async (dados) => {
    let produtoId = mostrarProdutoModal?.editandoProdutoId
    if (produtoId) {
      if (!mostrarProdutoModal?.somentePreco) {
        await editarProduto(codigo, produtoId, {
          nome: dados.nome,
          quantidade: dados.quantidade,
          unidade: dados.unidade || 'un',
          categoria: dados.categoria
        })
      }
    } else {
      const dup = dados.codigo ? produtos.find(p => p.codigo && String(p.codigo) === String(dados.codigo)) : null
      if (dup) {
        setMostrarProdutoModal(null)
        abrirLancamentoPreco(dup, `"${dup.nome}" já está na cotação com esse código de barras.`)
        return
      }
      produtoId = await adicionarProduto(codigo, dados.nome, dados.quantidade, dados.unidade || 'un', dados.codigo, dados.categoria)
    }
    if (dados.preco != null && meuMercado) {
      await lancarPreco(codigo, produtoId, meuMercado, dados.preco, dados.oferta)
    }
    setMostrarProdutoModal(null)
  }

  const handleEditarProduto = (p) => {
    setMostrarProdutoModal({
      titulo: '✏️ Editar produto',
      inicial: {
        nome: p.nome,
        quantidade: p.quantidade,
        unidade: p.unidade || 'un',
        categoria: p.categoria || 'Outros',
        codigo: p.codigo || null,
        preco: infoPreco(precos[p.id]?.[meuMercado])?.preco || null,
        tipoOferta: infoPreco(precos[p.id]?.[meuMercado])?.tipoOferta || '',
        obsOferta: infoPreco(precos[p.id]?.[meuMercado])?.obsOferta || '',
      },
      editandoProdutoId: p.id,
      produtoBaseId: null,
    })
  }

  const handleRemoverProduto = async (p) => {
    if (!confirm(`Remover "${p.nome}" da cotação? Os preços já lançados desse produto também somem.`)) return
    try { await removerProduto(codigo, p.id) } catch (e) { alert('Erro ao remover: ' + e.message) }
  }

  if (naoEncontrada && !online) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}><p>📴 Sem conexão e sem dados dessa sala no cache.</p><button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700 }}>Tentar novamente</button></div>
  if (naoEncontrada) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}><p>❌ Sala <strong>#{codigo}</strong> não encontrada.</p><button onClick={() => nav('/entrar')} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700 }}>Voltar</button></div>
  if (!sala) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Carregando...</div>

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px' }}>
      {!online && <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: '0.85rem', fontWeight: 600 }}>📴 Sem internet — você continua vendo e digitando; os lançamentos sobem sozinhos quando a conexão voltar.</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sala · Criada {formatarDataRelativa(sala.criadoEm)}</div><div style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', letterSpacing: 3 }}>#{codigo}</div></div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: online ? '#10b981' : '#f59e0b', fontWeight: 600, justifyContent: 'flex-end' }}><span style={{ width: 8, height: 8, background: online ? '#10b981' : '#f59e0b', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>{online ? 'AO VIVO' : 'OFFLINE'}</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>Você: <strong>{meuNome}</strong> · Mercado: <strong>{meuMercado}</strong></div>
          {souCriador && <button onClick={handleExcluir} disabled={excluindo} style={{ marginTop: 6, padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: 'white', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>{excluindo ? 'Excluindo...' : '🗑️ Encerrar sala'}</button>}
        </div>
      </div>
      <Participantes participantes={sala.participantes} />
      <div style={{ background: 'white', borderRadius: 12, padding: 18, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>📊 Cotação em Tempo Real</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {buscando && <span style={{ color: '#64748b', fontSize: '0.85rem', alignSelf: 'center' }}>🔍 Buscando...</span>}
            <button onClick={() => setMostrarScanner(true)} style={btnY}>📷 Escanear</button>
            <button onClick={handleAddManual} style={btnW}>➕ Manual</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={() => setAba('todos')} style={aba === 'todos' ? tabOn : tabOff}>Todos ({produtos.length})</button>
          <button onClick={() => setAba('completos')} style={aba === 'completos' ? tabOn : tabOff}>✅ Cotação completa ({completos.length})</button>
        </div>
        {aba === 'completos' && <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 10px' }}>Produtos com preço lançado em <strong>todos</strong> os {mercados.length} mercado(s) pesquisado(s).</p>}
        <TabelaCotacao
          produtos={produtosVisiveis}
          precos={precos}
          participantes={sala.participantes}
          meuMercado={meuMercado}
          onPrecoChange={handlePreco}
          onEditarProduto={handleEditarProduto}
          onRemoverProduto={handleRemoverProduto}
          onEditarOferta={(p) => abrirLancamentoPreco(p)}
          vazioTexto={aba === 'completos' ? 'Nenhum produto ainda tem preço em todos os mercados.' : 'Nenhum produto na cotação. Use 📷 Escanear ou ➕ Manual.'}
        />
      </div>
      <ListaOtimizada produtos={sala.produtos} precos={precos} participantes={sala.participantes} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      {mostrarScanner && <BarcodeScanner onScan={handleScan} onClose={() => setMostrarScanner(false)} />}
      {mostrarCadastro && <CadastrarProduto dadosIniciais={mostrarCadastro} onSalvo={handleSalvoNaBase} onCancelar={() => setMostrarCadastro(null)} />}
      {mostrarProdutoModal && (
        <ProdutoModal
          titulo={mostrarProdutoModal.titulo}
          aviso={mostrarProdutoModal.aviso}
          inicial={mostrarProdutoModal.inicial}
          meuMercado={meuMercado}
          onConfirmar={handleConfirmarProduto}
          onCancelar={() => setMostrarProdutoModal(null)}
        />
      )}
    </div>
  )
}

const btnY = { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#f59e0b', color: 'white', fontWeight: 600, fontSize: '0.85rem' }
const btnW = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 600, fontSize: '0.85rem' }
const tabBase = { padding: '8px 12px', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', borderBottom: '2px solid transparent' }
const tabOn = { ...tabBase, color: '#10b981', borderBottom: '2px solid #10b981' }
const tabOff = { ...tabBase, color: '#94a3b8' }