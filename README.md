# 🛒 Cotação Online

App PWA de cotação de preços entre supermercados em grupo, usando React + Firebase + Vercel.

## 🚀 Setup

1. **Clone e instale:**
```bash
git clone <seu-repo>
cd cotacao-online
npm install
```

2. **Configure o Firebase:**
- Vá em [console.firebase.google.com](https://console.firebase.google.com)
- Crie um projeto novo
- Ative **Authentication** (modo Anônimo) e **Firestore Database**
- Em Configurações do projeto > Seus apps > Web, copie as credenciais
- Crie um arquivo `.env` na raiz com:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

3. **Regras do Firestore** (Firebase Console > Firestore > Regras):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /salas/{sala} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> ⚠️ **Nota de segurança:** a regra acima permite que qualquer usuário autenticado (mesmo anônimo) leia e escreva em **qualquer** sala, não só nas que participa. Para um app entre amigos via link isso costuma ser aceitável, mas se quiser mais rigor, restrinja a escrita a quem já é participante da sala, algo como:
> ```
> allow read: if request.auth != null;
> allow write: if request.auth != null &&
>   (resource == null || resource.data.participantes[request.auth.uid] != null ||
>    request.resource.data.participantes[request.auth.uid] != null);
> ```

4. **Rode local:**
```bash
npm run dev
```

5. **Deploy no Vercel:**
```bash
npm i -g vercel
vercel --prod
```
Ou conecte o repositório GitHub na dashboard do Vercel.

## 📱 Como usar

1. Uma pessoa cria a cotação → recebe código tipo `#X7K9P2`
2. Compartilha no WhatsApp
3. Os outros entram com o código
4. Cada um lança preços no mercado que visitou
5. A lista otimizada aparece automaticamente para todos
