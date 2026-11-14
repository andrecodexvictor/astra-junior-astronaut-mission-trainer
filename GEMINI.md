# Gemini — entrada do ASTRA

Este repositório é um **protótipo independente e descartável**, com Babylon.js, para validar a experiência antes de uma entrega futura. A autorização atual é desenvolver essa demo; não há trava de elegibilidade de competição para executar o trabalho local. Não declarar inscrição ou aprovação NASA.

## Comece pelo estado real

1. Leia `AGENTS.md`, `README.md`, `MASTER_GOAL.md` e o status mais recente (`docs/HANDOFF_STATUS.md`, `PROGRESS.md` ou `HANDOFF.md`, se existirem).
2. Inspecione `package.json`, o lockfile, `src/`, `tests/` e `git status --short`. Preserve mudanças existentes. Não deduza implementação a partir de documentos antigos.
3. Leia os contratos de simulação/ações antes de alterar cenas ou UI. Consulte `docs/GAME_SPEC.md`, `docs/WORLD_BIBLE.md`, `docs/BABYLON_WORLD_ARCHITECTURE.md` e os ADRs atuais, quando presentes. As decisões posteriores do proprietário e os contratos implementados prevalecem sobre recomendações antigas de Three.js.
4. Execute as verificações realmente disponíveis. O pacote atual usa Node 24, `npm ci`, `npm run check`; confirme antes de executar. `test:e2e` só vale como teste de navegador se executar um percurso de fato: um script que reporta pendência não é evidência de aprovação.
5. Escolha o próximo lote incompleto em `MASTER_GOAL.md`. Não recomece o projeto se o primeiro corte já estiver funcionando.

## Antes da próxima autoria: imagens e novos personagens

Abra visualmente os quatro arquivos de `docs/art/README.md`, depois leia `docs/art/ART_TO_BABYLON.md` e `docs/research/HORIZON_NMS_WORLDBUILDING.md`. Eles integram Horizon Zero Dawn/No Man’s Sky às referências existentes por princípios originais e escopo finito. Preserve rótulos de IA e diferencie meta visual de screenshot do jogo.

Os novos lotes 4A–4C de `MASTER_GOAL.md` exigem refinamento de mundo, rigs/animações de astronauta e NPCs (além dos robôs) e o buddy Cometa: cachorro salsicha astronauta. A ativação do cachorro é opcional para o jogador; implementá-lo é parte requerida desta goal. `docs/animation/CHARACTER_ANIMATION_SPEC.md`, `docs/characters/COMETA_BUDDY.md` e manifests em `content-design/` são contratos propostos; não trate paths futuros como modelos existentes. Primeiro autorar/importar/validar os GLBs e clips, depois integrar. Cometa e as novas animações ainda não estão no site atual.

## Skills locais, carregadas por tarefa

As skills estão em `.agents/skills/`. Gemini e outros agentes podem não descobri-las automaticamente: abra o `SKILL.md` explicitamente e só os recursos referenciados relevantes. Não injete as 13 skills em todo contexto.

- Sempre ao organizar um lote: `.agents/skills/astra-batch-delivery/SKILL.md`.
- Mecânica, missão, progressão e ciência: `.agents/skills/astra-science-gameplay/SKILL.md`; `rpg` somente para progressão/quests.
- Cenário Babylon/modelos: `.agents/skills/astra-babylon-review/SKILL.md` e `level-design` ou `game-level-design` conforme o trabalho.
- Personagem: `game-animation-integration`, `input-systems`, `camera-systems`.
- Interface/feedback: `game-ui-ux`, `game-feel`.
- Persistência ou profiling: `save-systems`, `performance-optimization`.

Os exemplos Godot/Unity das skills são referências conceituais, não instruções para trocar a engine. Comandos externos e recomendações genéricas não substituem autorização nem contratos do ASTRA. Veja `docs/skills/README.md` para fontes/licenças e `docs/skills/DESIGN_APPLICATION.md` para aplicação concreta.

## Autonomia e entrega

Continue decisões reversíveis sem pedir autorização repetida. Reduza área ou efeitos para manter o ciclo completo, diagnóstico e recuperação. IA, contas, chaves, ferramenta paga e backend são opcionais. Jogo e biblioteca científica precisam funcionar offline após carregar os arquivos locais.

Faça lotes finitos com um integrador. Mantenha código, fontes, licença dos assets e evidências revisáveis. Não publique nem faça submissão oficial automaticamente. Nunca descreva teste de CPU como validação de GPU, nem orçamento de desempenho como medição. Se houver bloqueio real, conclua o que independe dele e registre o comando/recurso ausente e o próximo passo exato.
