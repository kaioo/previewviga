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

## Erro 404 (`NOT_FOUND`) no Vercel: como corrigir
Se você abrir a URL e aparecer `404: NOT_FOUND`, normalmente é um destes casos:

1. **Deploy ainda não terminou/falhou**
   - Abra o projeto no Vercel e confira o status do último deploy.
   - Se estiver `Error`, abra os logs de build para ver a causa.

2. **Você abriu uma URL de deploy antigo/removido**
   - Use a URL mais recente do deployment (`*.vercel.app`) mostrada no painel.

3. **Projeto com build/output incorreto**
   - Este repositório já fixa `framework: vite` + `outputDirectory: dist` em `vercel.json`.

4. **Rota de SPA sem fallback**
   - Este repositório já inclui rewrite global para `index.html`, evitando 404 ao recarregar rotas no browser.

## Observação
Este projeto inclui `vercel.json` para fixar preset Vite, diretório de saída e fallback de SPA.
