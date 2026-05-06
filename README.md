# BetVision Premium Final

## Rodar local

```bash
npm install -g netlify-cli
netlify dev
```

Abra:

```txt
http://localhost:8888
```

## Variável obrigatória no Netlify

Em **Site configuration > Environment variables**, crie:

```txt
API_FOOTBALL_KEY=sua_chave_da_api_football
```

## Teste da API

```txt
/.netlify/functions/fixtures?date=2026-05-05&timezone=America/Sao_Paulo
```

## Keep alive no UptimeRobot

Use:

```txt
https://SEU-SITE.netlify.app/.netlify/functions/ping
```

## Supabase

Ajuste `config.js` se trocar de projeto Supabase.


## V3
- Cards premium com escudos/logos dos times e ligas quando a API retornar esses dados.
- Modo demo também mostra escudos para o painel não parecer vazio.
