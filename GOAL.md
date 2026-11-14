# GOAL G-001 — ASTRA: Scientific Exploration RPG

**Estado atualizado em 14/11/2026:** G0 foi resolvida pelo proprietário como demo independente e descartável. O primeiro corte agora tem código Babylon.js executável, modelos locais, simulação, UI e testes; o aceite visual Chrome/GPU continua pendente. Este documento preserva o alvo original; `MASTER_GOAL.md` organiza a continuação por lotes e `HANDOFF.md`/`TEST_REPORT.md` registram o entregue.

## Missão para o time

Evoluir ASTRA para uma aventura científica 3D em Babylon.js na qual o jogador explora rotas legíveis, investiga encontros, repara e reúne robôs originais, administra uma equipe de campo e mantém uma base lunar viva. A aproximação com RPGs de coleção contemporâneos deve aparecer em exploração, afeto pelos companheiros, registros, progressão e liberdade orientada. Preservar autoria original e ciência: nenhum companheiro produz recursos por mágica, nenhuma conversa decide um resultado físico e nenhum botão decorativo substitui a ação no mundo.

O alvo inicial é um **slice concluível de 20–30 minutos** com uma expedição de ida/volta, duas estratégias válidas, falha explicada e recuperação. O alvo de produto ampliado é a malha de setores, três rotas, robôs e dez missões descritos na spec. Não declarar o jogo completo ao entregar apenas o slice; registrar qual marco foi atingido.

## Leia antes de agir

1. `docs/SPACE_APPS_COMPLIANCE.md` e `docs/PRIOR_WORK.md`.
2. `docs/GAME_SPEC.md` e `docs/WORLD_BIBLE.md`.
3. `docs/BABYLON_WORLD_ARCHITECTURE.md` e as referências primárias.
4. `docs/EXECUTION_BACKLOG.md`, `AGENTS.md` e `AI_USAGE.md`.

### G0 — decisão de trilha e proveniência (resolvida: demo independente)

- Há código, arte e planejamento anteriores ao evento. Eles não se tornam novos por migração ou reescrita de commits.
- **Trilha competitiva:** confirmar evento/fuso/registro, janela autorizada, guia 2026 e tratamento do trabalho prévio. Não iniciar código competitivo antes da janela nem importar legado sem resolver a regra aplicável. Não submeter nem prometer elegibilidade enquanto houver pendências.
- **Produto independente:** registrar explicitamente essa opção e ausência de alegação competitiva; evolução técnica pode prosseguir com direitos e proveniência auditados.
- Se a trilha ainda não foi escolhida, o primeiro agente apresenta a diferença ao responsável e continua pesquisa/documentação independente da decisão. Nunca forja essa resposta.
- O repositório está público e licenciado, mas isso não constitui inscrição, submissão ou aprovação NASA.

## Resultado que o jogador deve experimentar

1. Entrar com PIP numa área de treinamento e compreender deslocamento, interação e mapa sem um tutorial de texto longo.
2. Observar uma falha de energia, distinguir geração/carga em kW de reserva em kWh e agir em equipamento real.
3. Preparar uma expedição, verificar autonomia e escolher um companheiro/instrumento compatível.
4. Sair do habitat, seguir uma rota, investigar pelo menos duas hipóteses e executar uma ação com custo/tempo visíveis.
5. Reparar uma unidade robótica original, registrá-la e alocá-la à equipe sem recompensas duplicadas.
6. Voltar com uma evidência ou amostra cuja origem e destino estejam contabilizados; medir o efeito nos sistemas.
7. Enfrentar um risco integrado envolvendo suporte à vida, energia, abrigo radiológico e alimento futuro.
8. Concluir por mais de uma estratégia, ou falhar, receber diagnóstico e repetir de um checkpoint consistente.
9. Consultar um guia com medição antes/depois, hipóteses, fontes e simplificações; receber feedback e um desafio de transferência.

Diálogo é pontuação narrativa, não o controlador principal: meta de playtest de pelo menos 75% do tempo ativo em mundo/intervenções e 10–20% em conversas. Não usar esses números como resultado observado antes de cronometrar.

## Frentes de agentes e propriedade de arquivos

| Frente | Responsabilidade | Área proposta |
|---|---|---|
| Integrador | contratos, arquitetura, merge, build reproduzível e estado da entrega | `src/app`, contratos compartilhados, package/lock, CI |
| Ciência/sistemas | simulador puro, unidades, balanços, riscos, replay e fontes | `src/simulation`, `src/content/science`, testes científicos |
| Mundo/Babylon | regiões, streaming, luz, terreno, colisão, LOD e orçamentos | `src/world`, manifestos de região |
| Personagem/companheiros | controle, câmera, animação, equipe, tarefas e resgate | `src/actors`, rigs/clips e testes de instância |
| Missões/aprendizagem | encontros, guia, progressão, falas curtas e evidências | `src/content/quests`, `src/presentation` sob contrato do integrador |
| QA/entrega | navegador real, acessibilidade, desempenho, direitos e pacote | `tests/e2e`, auditorias, evidências e handoff |

O integrador mantém interfaces, ordem de integração e um único dono por arquivo. Use branches/worktrees isolados por frente. Mudanças de contrato precisam ser entregues antes de integrar os consumidores. Modelo sugerido para modelagem e desenvolvimento: Terra, conforme preferência do projeto; usar ferramentas disponíveis e registrar o que realmente foi executado.

## Ordem de execução e gates

### P0 — contrato e primeira execução

- Registrar G0, escopo escolhido e o estado real do repositório.
- Scaffold Vite + TypeScript + Babylon modular, versões compatíveis fixadas e lockfile.
- Definir comandos e eventos tipados, unidades, ticks, IDs, save e manifesto de assets/regiões antes do trabalho paralelo.
- Implementar boot com WebGL 2 verificado; WebGPU é aprimoramento com fallback testado, não uma dependência obrigatória do slice.
- Adicionar shell acessível e tratamento legível de falha de engine/asset.
- Entregar build limpo e teste em navegador real com um personagem controlável. Não marcar isso pronto com NullEngine sozinho.

### P1 — mundo e companheiro de verdade

- Hub e uma rota externa com ida/volta; terreno, marcos e pelo menos uma transição de região com carregamento/descarte.
- GLB com rig/AnimationGroups ou pivôs bem definidos, animações de idle/andar/correr/saltar/pousar/interagir e transições coerentes.
- Colisões em rampas, degraus, bordas e plataformas; câmera evita paredes. Há caminho acessível alternativo onde salto não for essencial.
- PIP acompanha sem bloquear o jogador. Uma segunda unidade é encontrada, diagnosticada, reparada e alocada; equipe máxima de três no produto.
- Cada habilidade de campo valida ferramenta, distância, carga, custo e duração. Interromper e resgatar não gera energia nem material.

### P2 — ciência que decide o resultado

- Tick de suporte à vida independente da renderização; pausa/background/aceleração/reload definidos e logados.
- Geração/carga/bateria, água potável/residual/perdas, eletrólise, oxigênio, ração/cultivo e abrigo interdependentes.
- Recursos e bateria dos robôs têm contabilidade; reparo não reabastece estoque.
- Pelo menos uma fonte NASA realmente usada e verificada na lista do desafio caso a trilha competitiva exija; imagens decorativas não bastam como evidência de uso de dados.
- Incluir testes de conservação, dependências, limites, falta de insumos, ordens de eventos e replay.

### P3 — jornada e aprendizagem

- Uma missão completa com hipótese, evidência, intervenção, medição e reflexão, não apenas cliques de avanço.
- Encontros com estados persistentes e recompensas únicas; guia de campo e mapa legíveis.
- Duas estratégias válidas, um erro diagnosticável e recuperação sem duplicação de recursos.
- Roteiro curto integra personagens e consequências; pulo preserva escolhas relevantes e registros essenciais.
- Relatório final explica custos e resultados; a rubrica não se apresenta como certificação ou eficácia pedagógica comprovada.

### P4 — qualidade e ampliação controlada

- Medir antes de acrescentar efeitos ou áreas. Aplicar LOD, instâncias, atlas e descarte com base em perfis.
- Rodar gates de navegador, persistência, direitos e ciência abaixo.
- Fechar o slice antes de ampliar. Para o produto, adicionar as três rotas e M01–M10 com companheiros e missões completas, mantendo os mesmos testes.
- Prazo de 48h protege o ciclo central; horizonte de 1–2 semanas é uma meta de planejamento para conteúdo ampliado, não um compromisso nem uma extensão da janela do evento.

## Definition of Done — o integrador precisa provar

| ID | Aceite | Evidência obrigatória |
|---|---|---|
| AC01 | Slice completo e outro percurso com falha/retomada | Walkthrough real, ações e resultado, duração medida |
| AC02 | Recursos obedecem unidades e balanços | Testes de energia/massa/dependências, taxas e hipóteses versionadas |
| AC03 | Mesma sequência de comandos gera mesmo estado | Hashes em ticks iguais sob 30/60/144 fps simulados, pausa e reload |
| AC04 | Movimento e animação correspondem ao estado | Vídeo/GIF de idle/andar/correr/salto/pouso/interação, colisão e rampa |
| AC05 | Companheiro e recrutamento funcionam | Diagnóstico→reparo→equipe→tarefa→interrupção/resgate; dois atores com animação independente |
| AC06 | Mundo conectado e estável | Ida/volta, falha de carregamento recuperável e 20 transições sem crescimento contínuo de recursos/observadores |
| AC07 | Save/reload não altera inventário nem conquistas | Fixtures, save corrompido, checkpoint e migrações declaradas/testadas |
| AC08 | Pelo menos duas estratégias causais e evidência de aprendizagem | Leituras antes/depois, hipóteses, custos e relatório; sem alegar estudo pedagógico |
| AC09 | UI utilizável por teclado e dispositivo de toque alvo | Foco, pausa, legendas, texto maior, movimento reduzido e caminho alternativo testados |
| AC10 | Perfil de performance registrado | Dispositivo/GPU/browser/resolução, trace de 60s; metas iniciais 60 fps desktop/30 mobile com p95 documentado |
| AC11 | Build reproduzível e assets auditáveis | Instalação limpa, build/typecheck/testes/auditoria glTF/licenças; hashes e versões |
| AC12 | Honestidade de entrega e competição | Status por requisito, limitações, IA/proveniência e checklist competitivo sem campos fingidamente confirmados |

Metas iniciais de performance: até 150 draw calls desktop/100 mobile, transferência inicial até 25 MB comprimidos e textura móvel até 128 MB estimados. São alvos a validar em hardware nomeado, não resultados deste repo. Se uma meta não for atingida, registrar falha/escopo ou proposta fundamentada; não alterar silenciosamente o número para aprovar.

Comandos que o scaffold deve fornecer e fazer passar: `npm ci`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run audit:assets`. Os comandos agora existem; `test:e2e` informa a pendência real e sai com status 2, não representa um teste executado. Browser QA indisponível significa AC01/AC04/AC09/AC10 pendentes; não instalar um caminho proibido nem converter CPU/DOM em prova de GPU.

## Contratos mínimos entre frentes

- `SimulationCommand`: tick, sequence, type, payload validado; IDs estáveis, sem referências Babylon.
- `SimulationSnapshot`: versão, tick, seed/PRNG, unidades, estoques, equipamentos, tarefas, segurança, eventos e resto de tempo quando aplicável.
- `RegionManifest`: bounds, spawn/exit, assets/hashes, colisão, pontos de interesse, vizinhos, iluminação, LOD e orçamento.
- `CompanionState`: ID único, capacidade, equipe, posição segura, bateria, tarefa, custos reservados/consumidos e estado de resgate.
- `QuestDefinition`: esquema G-13 da spec; sucesso lê eventos e medições reais, nunca texto improvisado de IA.
- `AssetRecord`: origem, autor, direitos, transformação, fonte de autoria, licença/NOTICE, geração por IA e identificação visual quando exigida.

## Pacote para devolver o controle

Entregar um PR/branch com commit exato, build reproduzível, comandos comprovados, instruções de execução, CHANGELOG, fontes/hipóteses, créditos e inventário de assets; `HANDOFF.md` com decisões de arquitetura, mapa de módulos e próximos passos; `TEST_REPORT.md` com dispositivo/browser/GPU, evidências e falhas; `ACCEPTANCE.json` com AC01–AC12 e IDs G/S/W/N/A; snapshot/replay e known limitations.

Não escrever “mundo completo”, “pronto para NASA”, “60 fps”, “offline”, “mobile suportado” ou “cientificamente validado” sem evidência correspondente. Submeter ao evento, convidar colaboradores, fundir PRs externos ou substituir a produção de Sites não é parte desta meta automaticamente. O dono recebe um resultado concreto para revisar.

## Prompt curto para colar no orquestrador

> Assuma o repositório ASTRA e execute GOAL.md. Comece pelo gate G0 de trilha/proveniência; depois preserve a simulação científica como autoridade e construa a aventura de exploração em Babylon.js descrita em GAME_SPEC e WORLD_BIBLE. Distribua trabalho pelas seis frentes com donos de arquivos e contratos compartilhados, integre incrementalmente e persista até fechar o slice jogável com companheiro, intervenção científica, falha/retomada e evidência real em navegador. Puxe a ambição visual de RPGs recentes para personagens, rotas e descoberta, com conteúdo original. Não troque física por diálogo, não fabrique testes ou elegibilidade e não declare os marcos ampliados prontos ao concluir somente o slice. Entregue HANDOFF, TEST_REPORT e ACCEPTANCE com commit e provas antes de devolver o controle.
