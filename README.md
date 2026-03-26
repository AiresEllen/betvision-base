# Bet Vision Premium - Projeto Base

Projeto web responsivo com visual premium para painel de partidas de futebol.

## O que já vem pronto
- Tela de login demo
- Dashboard com cards de partidas
- Filtros Hoje / Amanhã / Semana
- Busca por time, liga ou mercado
- Layout responsivo para celular, tablet e desktop
- Pronto para publicar no Netlify

## Como testar localmente
Basta abrir o arquivo `index.html` no navegador.

## Como subir no Netlify
### Opção 1: deploy manual
1. Compacte os arquivos do projeto
2. Entre no Netlify
3. Clique em **Add new site**
4. Escolha **Deploy manually**
5. Arraste a pasta ou o zip

### Opção 2: GitHub
1. Suba esses arquivos para um repositório no GitHub
2. No Netlify, clique em **Import from Git**
3. Escolha o repositório
4. Como é site estático, não precisa comando de build

## Estrutura
- `index.html` → estrutura principal
- `styles.css` → layout e responsividade
- `app.js` → lógica do login demo, filtros e renderização dos cards

## Próximos passos sugeridos
- Trocar dados demo por API real
- Adicionar favoritos
- Criar painel admin
- Integrar login real
- Transformar em PWA
