import { useState } from 'react'
import { formatarQuantidade, parseQuantidadeExistente, formatarInputPreco, parsePreco } from '../utils/ptBR.js'
import { TIPOS_OFERTA } from '../utils/precos.js'

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

  const handleConfirmar = async () => {
    if (!somentePreco && !nome.trim()) return
    const v = parseFloat(String(valorQtd).replace(',', '.'))
    if (!somentePreco && (isNaN(v) || v <= 0)) return alert('Quantidade precisa ser um número maior que zero')
    const precoNum = preco.trim() ? parsePreco(preco) : null
    if (preco.trim() && precoNum === null) return alert('Preço inválido')
    if (somentePreco && precoNum === null) return alert('Informe o preço')
    setSalvando(true)
    try {
      await onConfirmar({
        nome: nome.trim(),
        quantidade: v,
        unidade: unidadeQtd.trim() || 'un',
        categoria,
        codigo: inicial?.codigo || null,
        preco: precoNum,
        oferta: precoNum != null && tipoOferta ? { tipo: tipoOferta, obs: obsOferta.trim() } : null,
      })
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
            <input
              autoFocus={!somentePreco}
              disabled={somentePreco}
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ ...inp, background: somentePreco ? '#f8fafc' : 'white' }}
              placeholder="Ex: Tapioca 500g"
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Peso / Volume do pacote</label>
              <input
                type="text"
                inputMode="decimal"
                disabled={somentePreco}
                value={valorQtd}
                onChange={e => setValorQtd(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ ...inp, background: somentePreco ? '#f8fafc' : 'white' }}
                placeholder="500"
              />
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                Ex: 500 (para 500g) ou 1 (para 1 unidade)
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Unidade</label>
              <select
                disabled={somentePreco}
                value={unidadeQtd}
                onChange={e => setUnidadeQtd(e.target.value)}
                style={{ ...inp, background: somentePreco ? '#f8fafc' : 'white' }}
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
                disabled={somentePreco}
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
                {somentePreco ? '' : ' (opcional — dá pra lançar depois)'}
              </label>
              <input
                autoFocus={somentePreco}
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
          {inicial?.codigo && (
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              📷 Código de barras: {inicial.codigo}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={handleConfirmar}
            disabled={(!somentePreco && !nome.trim()) || salvando}
            style={{ ...btnPrim, opacity: ((!somentePreco && !nome.trim()) || salvando) ? 0.6 : 1 }}
          >
            {salvando ? 'Salvando...' : (somentePreco ? '✓ Lançar preço' : '✓ Adicionar')}
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