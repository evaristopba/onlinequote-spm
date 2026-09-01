import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  loginAdmin, logoutAdmin, souAdmin,
  listarTodasSalas, excluirSala,
  listarBasePropria, apagarProdutoDeVez, definirAtivoBasePropria,
} from '../firebase.js'
import { formatarDataRelativa } from '../utils/ptBR.js'
import { confirmar, avisar } from '../utils/dialog.js'

// Painel restrito — não tem link visível em nenhuma tela normal do app,
// só é acessível digitando /admin na URL. A segurança de verdade está
// nas regras do Firestore (coleção admins/{uid}); esta tela só dá a
// interface pra quem já tem a conta de admin criada no Firebase.
export default function Admin() {
  const nav = useNavigate()
  const [status, setStatus] = useState('verificando') // verificando | login | admin
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [aba, setAba] = useState('salas')
  const [salas, setSalas] = useState(null)
  const [produtos, setProdutos] = useState(null)
  const [buscaProduto, setBuscaProduto] = useState('')
  const [excluindoCodigo, setExcluindoCodigo] = useState(null)
  const [apagandoId, setApagandoId] = useState(null)

  const verificar = async () => {
    setStatus('verificando')
    const ok = await souAdmin()
    setStatus(ok ? 'admin' : 'login')
  }

  useEffect(() => { verificar() }, [])

  const carregarSalas = () => {
    setSalas(null)
    listarTodasSalas()
      .then(l => setSalas(l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))))
      .catch(e => avisar('Erro ao carregar salas: ' + e.message))
  }
  const carregarProdutos = () => {
    setProdutos(null)
    listarBasePropria()
      .then(l => setProdutos(l.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))))
      .catch(e => avisar('Erro ao carregar produtos: ' + e.message))
  }

  useEffect(() => {
    if (status !== 'admin') return
    if (aba === 'salas') carregarSalas()
    if (aba === 'produtos') carregarProdutos()
  }, [status, aba])

  const handleLogin = async () => {
    if (!email.trim() || !senha) { setErroLogin('Preencha e-mail e senha'); return }
    setEntrando(true)
    setErroLogin('')
    try {
      await loginAdmin(email.trim(), senha)
      await verificar()
    } catch (e) {
      setErroLogin('Login inválido.')
    }
    setEntrando(false)
  }

  const handleLogout = async () => {
    await logoutAdmin()
    nav('/')
  }

  const handleExcluirSala = async (codigo) => {
    const ok = await confirmar(`Excluir DEFINITIVAMENTE a sala #${codigo} e todos os preços lançados nela? Essa ação não pode ser desfeita.`, { titulo: 'Excluir sala', textoConfirmar: 'Excluir', perigo: true })
    if (!ok) return
    setExcluindoCodigo(codigo)
    try {
      await excluirSala(codigo)
      setSalas(s => s.filter(x => x.codigo !== codigo))
    } catch (e) {
      avisar('Erro ao excluir: ' + e.message)
    }
    setExcluindoCodigo(null)
  }

  const handleApagarProduto = async (p) => {
    const ok = await confirmar(`Apagar DEFINITIVAMENTE "${p.nome}" da base de produtos?\n\nIsso não pode ser desfeito. Se esse produto ainda estiver em alguma cotação ativa, ele vai parar de existir na base própria (mas continua aparecendo na cotação como um item avulso, sem cadastro vinculado).`, { titulo: 'Apagar produto', textoConfirmar: 'Apagar de vez', perigo: true })
    if (!ok) return
    setApagandoId(p.id)
    try {
      await apagarProdutoDeVez(p.id)
      setProdutos(ps => ps.filter(x => x.id !== p.id))
    } catch (e) {
      avisar('Erro ao apagar: ' + e.message)
    }
    setApagandoId(null)
  }

  const handleAlternarAtivo = async (p) => {
    try {
      await definirAtivoBasePropria(p.id, !p.ativo)
      setProdutos(ps => ps.map(x => x.id === p.id ? { ...x, ativo: !p.ativo } : x))
    } catch (e) {
      avisar('Erro: ' + e.message)
    }
  }

  const produtosFiltrados = (produtos || []).filter(p => {
    if (!buscaProduto.trim()) return true
    const b = buscaProduto.toLowerCase()
    return (p.nome || '').toLowerCase().includes(b) || (p.codigoBarras || '').includes(b)
  })

  if (status === 'verificando') {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>Verificando...</div>
  }

  if (status === 'login') {
    return (
      <div style={{ maxWidth: 380, margin: '0 auto', padding: '60px 16px' }}>
        <h2 style={{ marginBottom: 20 }}>🔒 Painel Admin</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
          <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inp} />
          {erroLogin && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{erroLogin}</p>}
          <button onClick={handleLogin} disabled={entrando} style={btnPrim}>{entrando ? 'Entrando...' : 'Entrar'}</button>
          <button onClick={() => nav('/')} style={btnLink}>← Voltar ao app</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>🔒 Painel Admin</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => nav('/')} style={btnSec}>← App</button>
          <button onClick={handleLogout} style={btnDanger}>Sair do admin</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setAba('salas')} style={aba === 'salas' ? tabOn : tabOff}>🗂️ Todas as salas</button>
        <button onClick={() => setAba('produtos')} style={aba === 'produtos' ? tabOn : tabOff}>📦 Base de produtos</button>
      </div>

      {aba === 'salas' && (
        <>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 14 }}>Toda sala do banco, independente de quem criou — inclusive as sem dono acessível (criador que perdeu a sessão anônima).</p>
          {salas === null && <p style={{ color: '#64748b', textAlign: 'center' }}>Carregando...</p>}
          {salas && salas.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>Nenhuma sala no banco.</p>}
          {salas && salas.map(s => (
            <div key={s.codigo} style={card}>
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b', letterSpacing: 1 }}>#{s.codigo}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.nome}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Criada {formatarDataRelativa(s.criadoEm)} · {Object.keys(s.participantes || {}).length} participante(s) · {(s.produtos || []).length} produto(s)
                  {!('criadorUid' in s) && <span style={{ marginLeft: 6, color: '#f59e0b' }}>· sem criador registrado</span>}
                </div>
              </div>
              <button onClick={() => handleExcluirSala(s.codigo)} disabled={excluindoCodigo === s.codigo} style={btnDanger}>
                {excluindoCodigo === s.codigo ? 'Excluindo...' : '🗑️ Excluir'}
              </button>
            </div>
          ))}
        </>
      )}

      {aba === 'produtos' && (
        <>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 10 }}>"Desativar" só esconde o produto das buscas. "Apagar de vez" remove o cadastro da base — use só pra lixo/duplicados, não pra produtos que ainda podem estar em uso.</p>
          <input placeholder="🔍 Buscar por nome ou código de barras" value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 14 }} />
          {produtos === null && <p style={{ color: '#64748b', textAlign: 'center' }}>Carregando...</p>}
          {produtos && produtosFiltrados.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center' }}>Nenhum produto encontrado.</p>}
          {produtos && produtosFiltrados.map(p => (
            <div key={p.id} style={{ ...card, opacity: p.ativo === false ? 0.6 : 1 }}>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                  {p.nome}
                  {p.ativo === false && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>DESATIVADO</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Cód: {p.codigoBarras} {p.categoria && `· ${p.categoria}`}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleAlternarAtivo(p)} style={btnSec}>{p.ativo === false ? '✓ Reativar' : '🚫 Desativar'}</button>
                <button onClick={() => handleApagarProduto(p)} disabled={apagandoId === p.id} style={btnDanger}>{apagandoId === p.id ? 'Apagando...' : '🗑️ Apagar de vez'}</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

const inp = { padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.95rem', outline: 'none' }
const btnPrim = { padding: '12px', borderRadius: 8, border: 'none', background: '#1e293b', color: 'white', fontWeight: 700 }
const btnSec = { padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 600, fontSize: '0.78rem' }
const btnDanger = { padding: '7px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: 'white', color: '#ef4444', fontWeight: 700, fontSize: '0.78rem' }
const btnLink = { padding: '8px', border: 'none', background: 'none', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }
const tabBase = { padding: '8px 12px', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', borderBottom: '2px solid transparent' }
const tabOn = { ...tabBase, color: '#10b981', borderBottom: '2px solid #10b981' }
const tabOff = { ...tabBase, color: '#94a3b8' }
const card = { background: 'white', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }
