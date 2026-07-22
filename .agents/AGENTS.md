# AGENTS.md — Regras do Projeto G&G Competições

Este arquivo é carregado automaticamente por agentes de IA (Antigravity, Claude Code, etc.)
ao trabalharem neste repositório. **Não remova nem ignore estas instruções.**

---

## 🔄 Regra obrigatória: Atualizar documentação após cada tarefa

> **Após concluir qualquer trabalho neste repositório — seja uma feature, correção de bug,
> refatoração ou decisão de design — você DEVE atualizar os arquivos de handoff antes de
> encerrar sua resposta.**

### O que atualizar e onde

| Arquivo | Quando atualizar | O que registrar |
|---------|-----------------|-----------------|
| [`CLAUDE.md`](../CLAUDE.md) | Sempre que o status de um módulo mudar | Mover itens entre "Real" e "Decorativo/mock"; atualizar a data no cabeçalho da seção; adicionar novos padrões de código se introduzidos |
| [`HANDOFF.md`](../HANDOFF.md) | Sempre que uma decisão de design for tomada ou um "Open Item" for resolvido/adicionado | Registrar a decisão e o motivo na seção "Decisions made"; atualizar a lista "Open items" |

### Formato da atualização em CLAUDE.md

Na seção **"Painel Diretor module status"**, mova o módulo de "Decorativo/mock" para "Real"
assim que ele tiver tabela real no banco + endpoint funcional + UI conectada. Atualize sempre
a data no cabeçalho da seção para refletir a data real da mudança.

### Formato da atualização em HANDOFF.md

Na seção **"Decisions made this session, and why"**, adicione um bullet com:
- O que foi decidido
- Por que (racional, referência ao sistema legado se aplicável)
- O que NÃO fazer no futuro sem confirmar com o usuário

Na seção **"Open items / natural next steps"**, remova o item concluído e adicione novos
itens que surgiram durante a implementação.

---

## 🚀 Rastreamento de commit e estado de deploy

> **Toda vez que fizer push para o GitHub, registre o commit no `HANDOFF.md`** na seção
> **"Último commit / estado de deploy"**. Isso permite que uma IA que assuma no meio do
> processo saiba exatamente onde a anterior parou e se o deploy subiu.

### Seção obrigatória no HANDOFF.md

Mantenha sempre esta seção atualizada no topo do `HANDOFF.md` (logo após o título):

```
## 🔖 Último commit / estado de deploy

| Campo | Valor |
|-------|-------|
| Hash | `xxxxxxx` |
| Mensagem | `feat: descrição do que foi feito` |
| Data/hora | YYYY-MM-DDTHH:MM:SS-03:00 |
| Push feito? | ✅ Sim / ❌ Não (trabalho em andamento) |
| Deploy EasyPanel confirmado? | ✅ Sim / ⏳ Pendente / ❌ Falhou |
| Tarefa estava completa? | ✅ Sim / ⚠️ Parcial (descreva o que faltou) |
```

### Como verificar se o deploy subiu (para a próxima IA)

1. Leia o hash registrado no `HANDOFF.md`
2. Rode `git log --oneline -5` — se o hash está lá, o código foi commitado localmente
3. Rode `git status` — se não há nada pendente, o push foi feito
4. Para checar o deploy no EasyPanel, consulte os logs de build/runtime em
   `gegcompeticoes-web.5450wp.easypanel.host` (peça o token ao usuário se necessário)
5. Se o deploy estiver pendente ou falho, **execute-o antes de continuar** com novas features

### Se você assumiu no meio de uma tarefa incompleta

- Leia a seção "Tarefa estava completa?" no `HANDOFF.md`
- Se marcada como ⚠️ Parcial, leia a descrição do que faltou antes de começar
- Nunca assuma que o estado atual do código = estado esperado sem verificar o HANDOFF

---

## 📌 Contexto rápido do projeto

- Plataforma de competições de tiro esportivo (G&G Competições)
- Migração de sistema legado PHP → Node.js/React/TypeScript
- Stack: Express + Vite + PostgreSQL (raw pg) + MinIO opcional
- Deploy: EasyPanel (`gegcompeticoes-web.5450wp.easypanel.host`), push em `origin/main`
- Sem CI/CD automático — deploy manual via API EasyPanel após push
- Sem testes automatizados — verificação manual via browser/API calls
- Auth: CPF + senha, header `x-user-id` (sem JWT)
- **Nunca fazer migrações destrutivas** (`DROP COLUMN`, `NOT NULL` em coluna existente) — sempre aditivo
- **Correções de resultados em todas as telas**: Toda correção, regra de cálculo ou filtro de resultados DEVE ser aplicada em todas as páginas e componentes que exibem resultados (ex: Painel Diretor, Perfil do Atleta, Rankings). Utilize o componente reutilizável `CompetitionResultsViewer.tsx` como padrão central.
- Credenciais de deploy/infra ficam **apenas no `.env` local** (veja seção abaixo) — nunca no git

---

## 🔐 Credenciais EasyPanel (acesso seguro para IAs)

As credenciais de deploy e monitoramento ficam **exclusivamente no `.env`** da maquina
local (jamais no git — o `.gitignore` ja exclui `.env*`). O `.env.example` documenta
o formato sem expor valores reais.

### Como acessar como IA

1. Leia o arquivo `.env` (existe localmente, nunca no repositorio)
2. Procure pelas variaveis:
   - `EASYPANEL_URL` — URL base do painel
   - `EASYPANEL_API_KEY` — token de autenticacao (Bearer) — necessario apenas para deploy
   - `EASYPANEL_PROJECT` — nome do projeto (`gegcompeticoes`)
   - `EASYPANEL_SERVICE` — nome do servico (`web`)

### ⭐ Endpoint de logs (simples, sem autenticacao, retorno JSON)

Existe um endpoint dedicado que expoe todos os logs de qualquer servico via GET simples:

```
URL padrao:
https://logs-do-easypanel-logs.5450wp.easypanel.host/{projeto}/{servico}/all

Para o servico web deste projeto:
https://logs-do-easypanel-logs.5450wp.easypanel.host/gegcompeticoes/web/all
```

Como chamar via curl (retorna JSON):
```bash
curl https://logs-do-easypanel-logs.5450wp.easypanel.host/gegcompeticoes/web/all
```

Como usar:
- Substitua `gegcompeticoes` pelo nome do projeto e `web` pelo nome do servico para acessar logs de qualquer servico
- Nao precisa de Authorization header nem API key
- Retorna JSON com os logs completos do container
- Use para verificar se o build subiu, se ha erros de runtime, ou se o deploy do ultimo commit esta refletido

### Endpoint para disparar um novo deploy (requer API key)

```
POST {EASYPANEL_URL}/api/trpc/services.deploy
Authorization: Bearer {EASYPANEL_API_KEY}
Content-Type: application/json

Body: {"json":{"projectName":"gegcompeticoes","serviceName":"web"}}
```

Via curl:
```bash
curl -X POST "{EASYPANEL_URL}/api/trpc/services.deploy" \
  -H "Authorization: Bearer {EASYPANEL_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"json":{"projectName":"gegcompeticoes","serviceName":"web"}}'
```

### Se a EASYPANEL_API_KEY estiver vazia no .env

Avise o usuario (carlo) e peca para gerar um novo token em:
**EasyPanel > Settings > API Keys > Create**.
Nao tente continuar o deploy sem ela — apenas registre o status como Pendente no HANDOFF.md.

---

## ✅ Confirmação ao usuário

Ao finalizar qualquer tarefa, informe explicitamente:
1. Quais arquivos de código foram alterados
2. O que foi atualizado em `CLAUDE.md` e/ou `HANDOFF.md`
3. Quais "Open items" foram fechados ou abertos
4. O hash e mensagem do último commit (se houve push)
5. Se o deploy foi disparado e qual o status esperado

---

*Criado em 2026-07-14 por instrução explícita do usuário (carlo). Esta regra é permanente
para o projeto e deve ser mantida por todos os agentes que trabalharem aqui.*
