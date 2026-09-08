import { useEffect, useRef, useState } from 'react'
import { setDialogListener } from '../utils/dialog.js'

// Monta uma vez só, em main.jsx, fora das rotas — assim funciona em
// qualquer tela, mesmo durante o "Conectando..." inicial do App.jsx.
export default function DialogHost() {
  const [dialog, setDialog] = useState(null)
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)

  useEffect(() => {
    setDialogListener((novo) => setDialog(novo))
    return () => setDialogListener(null)
  }, [])

  const ehConfirm = dialog?.tipo === 'confirm'

  // Escape sempre fecha, não importa onde o foco esteja no momento —
  // um onKeyDown num <div> só dispara se o foco já estiver DENTRO dele,
  // e isso nem sempre é garantido (ex.: um <input> da tabela por baixo
  // ainda focado quando o modal abre). Ouvir no document resolve isso
  // de forma robusta.
  useEffect(() => {
    if (!dialog) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') fechar(ehConfirm ? false : undefined)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog])

  // Foco no botão certo sempre que um novo diálogo aparece (inclusive
  // o próximo da fila) — usar só o atributo autoFocus não funciona aqui
  // porque, entre um diálogo da fila e outro, os botões não desmontam
  // (mesma posição/tipo), então autoFocus (que só age na montagem) não
  // dispara de novo.
  useEffect(() => {
    if (!dialog) return
    const alvo = ehConfirm ? cancelRef.current : confirmRef.current
    alvo?.focus()
  }, [dialog, ehConfirm])

  if (!dialog) return null

  const fechar = (valor) => {
    dialog.resolve(valor)
  }

  const perigo = !!dialog.perigo

  return (
    <div style={overlay} onClick={() => fechar(ehConfirm ? false : undefined)}>
      <div style={card} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true">
        {dialog.titulo && <h3 style={{ margin: '0 0 10px', fontSize: '1.05rem', color: '#1e293b' }}>{dialog.titulo}</h3>}
        <p style={{ margin: '0 0 22px', color: '#475569', fontSize: '0.92rem', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
          {dialog.mensagem}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {ehConfirm && (
            <button ref={cancelRef} onClick={() => fechar(false)} style={btnCancelar}>
              {dialog.textoCancelar || 'Cancelar'}
            </button>
          )}
          <button ref={confirmRef} onClick={() => fechar(ehConfirm ? true : undefined)} style={perigo ? btnPerigo : btnPrim}>
            {dialog.textoConfirmar || (ehConfirm ? 'Confirmar' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(15, 23, 42, 0.55)', zIndex: 10000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const card = {
  width: '100%', maxWidth: 380, background: 'white', borderRadius: 16,
  padding: 22, boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
}
const btnBase = { padding: '10px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }
const btnPrim = { ...btnBase, background: '#10b981', color: 'white' }
const btnPerigo = { ...btnBase, background: '#ef4444', color: 'white' }
const btnCancelar = { ...btnBase, background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }
