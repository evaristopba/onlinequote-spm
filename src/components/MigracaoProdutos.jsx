import { useState } from 'react'
import { previewMigracao, migrarProdutos } from '../migrarProdutos.js'

export default function MigracaoProdutos({ onClose }) {
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [preview, setPreview] = useState(null)

  const handlePreview = async () => {
    setCarregando(true)
    try {
      const dados = await previewMigracao()
      setPreview(dados)
    } catch (e) {
      alert('Erro no preview: ' + e.message)
    }
    setCarregando(false)
  }

  const handleMigrar = async () => {
    if (!confirm('Tem certeza que quer migrar todos os produtos pendentes?')) return
    setCarregando(true)
    try {
      const dados = await migrarProdutos()
      setResultado(dados)
      setPreview(null)
    } catch (e) {
      alert('Erro na migração: ' + e.message)
    }
    setCarregando(false)
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>🔄 Migração de Produtos</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
          Este script converte produtos antigos (quantidade em texto) para o novo formato (quantidade número + unidade separada).
        </p>
        
        {preview && (
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12, maxHeight: 300, overflow: 'auto' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>
              📋 {preview.pendentes} produtos pendentes:
            </div>
            {preview.lista.length === 0 ? (
              <p style={{ color: '#10b981' }}>✅ Todos os produtos já estão no formato novo!</p>
            ) : (
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #e2e8f0' }}>Produto</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #e2e8f0' }}>Antes</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #e2e8f0' }}>Depois</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lista.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>{item.nome}</td>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>{item.antes || '—'}</td>
                      <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9', color: '#059669' }}>{item.depois}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {resultado && (
          <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ margin: 0, color: '#065f46' }}>
              ✅ {resultado.atualizados} produtos atualizados, {resultado.ignorados} já estavam ok.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handlePreview} disabled={carregando} style={btnSec}>
            🔍 Ver pendentes
          </button>
          <button onClick={handleMigrar} disabled={carregando} style={btnPrim}>
            {carregando ? 'Executando...' : '🚀 Migrar produtos'}
          </button>
          <button onClick={onClose} style={btnOut}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const card = { width: '100%', maxWidth: 560, background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }
const btnPrim = { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' }
const btnSec = { padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }
const btnOut = { padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#64748b', fontWeight: 600, cursor: 'pointer' }