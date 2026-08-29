import { db, auth } from './firebase.js'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'

function extrairQuantidadeUnidade(texto) {
  if (!texto) return { quantidade: 1, unidade: 'un' }
  const str = String(texto).trim()
  const regex = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]{1,3})$/
  const match = str.match(regex)
  if (match) {
    const valor = parseFloat(match[1].replace(',', '.'))
    const unidade = match[2].toLowerCase()
    return { quantidade: valor || 1, unidade }
  }
  const numMatch = str.match(/^(\d+(?:[.,]\d+)?)$/)
  if (numMatch) {
    const valor = parseFloat(numMatch[1].replace(',', '.'))
    return { quantidade: valor || 1, unidade: 'un' }
  }
  return { quantidade: 1, unidade: 'un' }
}

export async function migrarProdutos() {
  if (!db || !auth?.currentUser) {
    console.error('⚠️ Firebase não inicializado ou usuário não autenticado.')
    return
  }
  console.log('🚀 Iniciando migração de produtos...')
  try {
    const snapshot = await getDocs(collection(db, 'produtos'))
    console.log(`📦 Encontrados ${snapshot.size} produtos na base.`)
    let atualizados = 0
    let ignorados = 0
    for (const docSnap of snapshot.docs) {
      const dados = docSnap.data()
      const id = docSnap.id
      const jaMigrado = typeof dados.quantidade === 'number' && dados.unidade
      if (jaMigrado && dados.unidade) {
        ignorados++
        continue
      }
      const texto = dados.quantidade || ''
      const { quantidade, unidade } = extrairQuantidadeUnidade(texto)
      await updateDoc(doc(db, 'produtos', id), {
        quantidade: quantidade,
        unidade: unidade || 'un'
      })
      atualizados++
      console.log(`✅ "${dados.nome}" → ${quantidade} ${unidade}`)
    }
    console.log(`\n🎉 ${atualizados} atualizados, ${ignorados} já ok.`)
    return { atualizados, ignorados }
  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  }
}

export async function previewMigracao() {
  if (!db) return
  console.log('🔍 Preview da migração...')
  try {
    const snapshot = await getDocs(collection(db, 'produtos'))
    let pendentes = 0
    const lista = []
    for (const docSnap of snapshot.docs) {
      const dados = docSnap.data()
      const texto = dados.quantidade || ''
      const jaMigrado = typeof dados.quantidade === 'number' && dados.unidade
      if (jaMigrado && dados.unidade) continue
      const { quantidade, unidade } = extrairQuantidadeUnidade(texto)
      pendentes++
      lista.push({ nome: dados.nome, codigo: dados.codigoBarras, antes: texto, depois: `${quantidade} ${unidade}` })
    }
    console.table(lista)
    console.log(`\n📊 ${pendentes} produtos pendentes.`)
    return { pendentes, lista }
  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  }
}