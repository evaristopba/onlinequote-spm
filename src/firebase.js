import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, arrayUnion, arrayRemove } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const configFaltando = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k)
if (configFaltando.length > 0) {
  console.error(
    `Configuração do Firebase incompleta. Variáveis ausentes: ${configFaltando.join(', ')}. ` +
    'Crie um arquivo .env na raiz do projeto (veja .env.example).'
  )
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Login anonimo automatico
export const loginAnonimo = () => signInAnonymously(auth)

// Gerar codigo de sala aleatorio
export const gerarCodigo = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Criar sala no Firestore
// Gera um código único (verifica colisão antes de gravar, já que gerarCodigo() é aleatório)
export const criarSala = async (nomeSala, produtos, criadorNome, criadorMercado) => {
  const user = auth.currentUser
  if (!user) throw new Error('Usuário não autenticado')

  let codigo, salaRef, snap
  let tentativas = 0
  do {
    codigo = gerarCodigo()
    salaRef = doc(db, 'salas', codigo)
    snap = await getDoc(salaRef)
    tentativas++
  } while (snap.exists() && tentativas < 5)

  if (snap.exists()) {
    throw new Error('Não foi possível gerar um código de sala único. Tente novamente.')
  }

  const participantes = {}
  participantes[user.uid] = {
    nome: criadorNome,
    mercado: criadorMercado,
    uid: user.uid,
    entrouEm: new Date().toISOString(),
  }

  await setDoc(salaRef, {
    nome: nomeSala,
    criadoEm: new Date().toISOString(),
    ativa: true,
    produtos: produtos.map((p, i) => ({ id: `p${i}`, nome: p.nome, quantidade: p.quantidade })),
    participantes,
    precos: {},
  })

  return codigo
}

// Entrar em sala existente
export const entrarSala = async (codigo, nome, mercado) => {
  const user = auth.currentUser
  const salaRef = doc(db, 'salas', codigo)
  const snap = await getDoc(salaRef)

  if (!snap.exists()) throw new Error('Sala nao encontrada')

  await updateDoc(salaRef, {
    [`participantes.${user.uid}`]: {
      nome,
      mercado,
      uid: user.uid,
      entrouEm: new Date().toISOString(),
    }
  })

  return snap.data()
}

// Escutar sala em tempo real
// callback recebe os dados da sala, ou null se a sala não existir (ex: código inválido)
export const escutarSala = (codigo, callback) => {
  const salaRef = doc(db, 'salas', codigo)
  return onSnapshot(salaRef, (snap) => {
    callback(snap.exists() ? snap.data() : null)
  })
}

// Lancar preco
export const lancarPreco = async (codigo, produtoId, mercado, preco) => {
  const salaRef = doc(db, 'salas', codigo)
  await updateDoc(salaRef, {
    [`precos.${produtoId}.${mercado}`]: parseFloat(preco),
  })
}

// Adicionar produto
export const adicionarProduto = async (codigo, nome, quantidade) => {
  const salaRef = doc(db, 'salas', codigo)
  const id = `p${Date.now()}`
  await updateDoc(salaRef, {
    produtos: arrayUnion({ id, nome, quantidade })
  })
  return id
}
