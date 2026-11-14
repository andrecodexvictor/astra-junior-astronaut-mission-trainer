# Backlog executável para o time

Todos os itens estão **planejados**, não implementados. O integrador determina a trilha G0 e o escopo do marco. As referências G/S/W/N/A são requisitos da spec/bíblia; AC são os aceites do GOAL.

| Pacote | Dono | Depende de | Entrega principal | Aceite |
|---|---|---|---|---|
| WP00 | Integrador + responsável | — | Trilha, evento/horário quando aplicável, tratamento do legado, fonte do desafio, inventário de decisões | AC12 |
| WP01 | Integrador | WP00 | Scaffold, contratos TS, versões/lock, engine/capabilities, primeira execução | AC11 |
| WP02 | Ciência | WP01 | Simulação pura, ledger de recursos, comandos, replay, fixtures e hipóteses | S-01–04, AC02–03 |
| WP03 | Mundo | WP01 | Hub+rota, manifestos, loader/dispose, colisão, iluminação e marcos | GAME W-01–02; WORLD WB-01–06, AC06 |
| WP04 | Personagem | WP01 | Rig/clips, controlador, câmera, plataforma/rampa e acessibilidade do percurso | A-01–04, AC04 |
| WP05 | Companheiros | WP02, WP04 | PIP, diagnóstico/recrutamento de segunda unidade, equipe/tarefa/resgate | G-11–12, AC05 |
| WP06 | Missões | WP02, WP03, WP05 | Encontro com hipóteses, evidência e intervenção; duas estratégias e recuperação | G-10/13, AC01/08 |
| WP07 | UI/aprendizagem | WP01, WP06 | Guia, mapa, diálogos curtos, relatório, foco, toque e preferências | A-01–03, AC08–09 |
| WP08 | Integração/save | WP02–07 | Checkpoint, save/reload, migração explicitamente permitida e auditada | N-01, AC07 |
| WP09 | QA/arte técnica | WP03–08 | Assets/rigs/licenças, traces, browser real e correções | AC04/09–11 |
| WP10 | Integrador | WP09 | Slice fechado, artefato, handoff e estado de todos os aceites | AC01–12 |
| WP11 | Mundo + missões | WP10 | Produto ampliado: três rotas, M01–M10 e companheiros adicionais | Mesmo padrão de provas por missão |

## Como paralelizar sem perder o controle

WP02, WP03 e WP04 podem avançar juntos depois dos contratos de WP01. Conteúdo de WP06 pode ser autorado em paralelo, mas só é integrado quando o evento/estado real existe. UI mockada não conta como missão pronta. O integrador recebe patches pequenos e escolhe a ordem dos merges; cada frente publica limites e testes junto com a mudança.

## Cortes sob restrição de prazo

Cortar variantes, cenas, efeitos, regiões extras e robôs adicionais antes de cortar um ciclo concluível, dependências científicas, falha/recuperação ou QA real. WP11 não cabe automaticamente na janela de 48h. Se o marco final for apenas o slice, escrever isso na entrega e no pitch.

## Board sugerido

Planejado → Contrato pronto → Em implementação → Em revisão → Evidência aprovada → Integrado. `Bloqueado` deve identificar a dependência concreta e a próxima ação. Um teste não executado fica pendente, não aprovado por inferência.
