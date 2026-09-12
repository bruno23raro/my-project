# Postagend

Interface de operação de conteúdo inspirada nos fluxos de plataformas de agendamento social: calendário editorial, criação de posts, contas conectadas, analytics, Explorer e planos.

## Executar

Para executar a interface com a API local:

```powershell
npm start
```

Depois acesse `http://localhost:5500`.

## Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
3. Copie `.env.example` para `.env`.
4. Preencha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` com os valores do painel **Project Settings > API**.
5. Rode `npm start`. A chave `SERVICE_ROLE` fica somente no servidor e nunca deve ser colocada no navegador.

Para hospedar no Render, envie o projeto para um repositório Git, crie um Web Service usando o `render.yaml` e preencha as duas variáveis do Supabase no painel.

Também é possível abrir `index.html` diretamente no navegador. Nesse modo, o agendamento usa apenas o `localStorage`.

## O que está funcional

- Navegação responsiva entre Visão geral, Calendário, Conteúdo, Contas, Analytics, Explorer e Planos.
- Modal de criação com upload local, legenda automática demonstrativa e data/hora de agendamento.
- Persistência do último post em `localStorage`.
- Calendário mensal com conteúdos, filtros visuais e alternância de visualização.
- Painéis de métricas, heatmap de horários e performance por canal.
- Estados de conexão, Explorer e cobrança com feedback visual.
- API local em `/api/health`, `/api/accounts` e `/api/posts`.
- Persistência no Supabase quando as variáveis estiverem configuradas; caso contrário, usa `postagend-data.json` local.

## Integrações para produção

OAuth das redes, publicação via APIs oficiais, geração de legenda por provedor de IA, analytics reais, pagamentos e autenticação devem ser ligados a um backend seguro. O arquivo `.claude/settings.local.json` contém um token de autenticação local; ele não deve ser exposto em produção e deve ser rotacionado caso tenha sido compartilhado.