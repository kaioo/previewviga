# Deploy no Vercel

## Pré-requisitos
- Conta no Vercel
- Projeto no Git (GitHub/GitLab/Bitbucket) **ou** Vercel CLI autenticado

## Opção 1 (recomendada): Importar repositório no painel Vercel
1. Suba este projeto para um repositório remoto.
2. Acesse https://vercel.com/new
3. Importe o repositório.
4. O Vercel deve detectar automaticamente Vite com:
   - Build Command: `npm run build`
   - Output: `dist`
5. Clique em **Deploy**.

## Opção 2: CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

## Comandos locais
```bash
npm install
npm run dev
npm run build
```

## Observação
Este projeto inclui `vercel.json` para fixar o preset Vite e diretório de saída.
