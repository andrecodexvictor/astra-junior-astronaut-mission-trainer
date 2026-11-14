# ASTRA: Lunar Frontier — especificação de jogo

> Atualização 14/11/2026: esta é a visão ampliada. O executável atual é uma demo independente menor; consulte `docs/demo/DESIGN_PILLARS.md`, `HANDOFF.md` e `ACCEPTANCE.json`. Seis referências de design agora incluem Scrap Mechanic, Journey to the Savage Planet e Deliver Us The Moon. Construção/veículos e os requisitos ampliados abaixo não se tornam implementados por estarem descritos.

**Estado:** proposta de design, não implementação. **Data de referência:** 14/11/2026, horário local do projeto. Requisitos abaixo descrevem o alvo; não atestam que ele existe ou foi testado. O protótipo de referência auditado em [PRIOR_WORK.md](PRIOR_WORK.md) se identifica como expansão 1.1: visual novel, seis zonas compactas, exploração 3D, simulação determinística, nove quests estruturadas e testes CPU/DOM. Seu README registra que Chrome real, GPU, desempenho e toque continuam sem verificação. Ele é material de referência e não constitui evidência de elegibilidade competitiva ou de implementação desta proposta.

## Visão e experiência

**G-01.** Uma aventura 3D de exploração científica em terceira pessoa: preparar uma expedição, percorrer rotas legíveis, observar anomalias, formular hipóteses, usar instrumentos e companheiros, medir consequências e registrar descobertas. A fantasia é integrar uma equipe humana e robótica que mantém uma base lunar habitável. O mundo aberto por setores, os encontros descobertos no caminho, a equipe pequena e o álbum de descobertas evocam aventuras contemporâneas de exploração; personagens, criaturas, regras, nomes, arte e narrativa devem ser originais. Não há combate nem captura de animais terrestres na Lua.

**G-02.** O mundo jogável é a interface principal. Conversas curtas acontecem em contexto ou em enquadramento próximo, com retorno claro ao controle; não exigem alternância permanente para visual novel. Planejar 75% ou mais do tempo ativo em deslocamento, observação, preparação e resolução de tarefas, e aproximadamente 10–20% em cenas e diálogo; menus e pausas ocupam o restante. São metas de playtest, não métricas observadas. Sem diálogo obrigatório longo ao repetir uma tentativa.

**G-03.** PIP e os robôs são companheiros de trabalho, não fontes mágicas. Recrutamento se dá por diagnóstico, reparo e autorização da base; registrar variantes robóticas no guia não afirma que há fauna lunar. Explorar e manter pessoas seguras são objetivos complementares. Classificações e provas avaliam evidências e escolhas, não dano ou vitórias em batalha.

## Escopo e marcos

**G-04 — vertical slice:** experiência delimitada de 20–30 minutos, do treinamento terrestre à estabilização lunar e a uma expedição curta com retorno, evidência e reflexão. Academia e treinador orbital podem ser vinhetas compactas; habitat e uma bifurcação lunar são exploráveis. Uma rota completa, PIP, um robô reparável, recursos fundamentais, checkpoint, guia e conclusão demonstram o ciclo. As demais missões, rotas e variantes abaixo são catálogo planejado, não promessa para o slice.

**G-05 — horizonte de produto:** campanha de várias horas, regiões e missões adicionais, três rotas interligadas e especialidades complementares. Não prometer mundo planetário contínuo, escala infinita ou quantidade de conteúdo que comprometa legibilidade e desempenho.

**G-06 — plano de 48 horas:** primeiro estabelecer elegibilidade e regras do evento; depois obter um fluxo executável mínimo com movimentação, interação, simulação aproveitada, uma missão com evidência, PIP, falha/recuperação, salvamento e conclusão; reservar tempo para teste real em navegador e pacote verificável. Cortar arte, falas e missões antes de sacrificar integridade de recursos ou uma jornada concluível. Isto é um alvo de planejamento dependente de equipe e autorização, não compromisso de entrega. Qualquer trabalho de código ou build sujeito à janela do evento aguarda sua abertura e confirmação das regras aplicáveis.

**G-07 — produção de 1–2 semanas:** expandir de modo incremental para as três rotas, robôs adicionais, missões, animações, acessibilidade e testes em dispositivos. Esse horizonte é distinto do objetivo de 48 horas; depende de capacidade, direitos dos recursos e validação. Uma versão mais rica não implica precisão científica ou eficácia pedagógica já comprovada.

## Ciclo, progressão e encontros

**S-01.** Cada tarefa segue observar → levantar hipótese → agir → medir → refletir. Mostrar evidência de entrada, hipótese escolhida ou escrita em termos simples, ação com custo visível, medição antes/depois e explicação que conecte resultado à hipótese. Hipóteses alternativas plausíveis recebem respostas informativas; testar uma hipótese errada não deve bloquear a campanha sem recuperação.

**G-08.** O guia de campo reúne mapa, registros de instrumentos, variantes de robôs reparados, fotos ou ilustrações, hipóteses e fontes. Não conceder recursos por abrir entradas repetidamente. XP/insígnias reconhecem descobertas únicas e provas práticas; melhorias desbloqueiam informação, configuração de ferramenta ou eficiência explicitamente parametrizada, sempre dentro da conservação e das capacidades de equipamento. Nenhuma melhoria cria água, energia, oxigênio ou alimento.

**G-09.** Provas de classificação exigem demonstrar competências em contexto: interpretar medidor, planejar custo e retorno seguro, executar intervenção e explicar resultado. Podem oferecer múltiplas abordagens válidas; perguntas isoladas não dominam a progressão. Repetição é permitida após feedback. Uma classificação local é uma recompensa de jogo, não certificação científica.

**G-10 — encontro de descoberta:** `indisponível → detectável → observado → investigando → resolvido` ou `adiado`; falha recuperável retorna a `detectável` ou checkpoint. `detectável` exige região acessível e condições declaradas; aproximação/sinal identifica, interação revela evidência, escolha inicia ação com custos, e resultado se confirma por evento da simulação. O estado `resolvido` é idempotente e persiste. Sinais não devem depender apenas de cor ou som; o jogador pode ignorar uma investigação opcional.

**G-11 — equipe:** PIP acompanha como assistente de diagnóstico e comunicação; até três companheiros ativos no total, incluindo PIP. A base é o ponto de troca. Robôs são recrutados por reparo, registrados e alocados por capacidade; não é possível colocar duas cópias da mesma unidade na equipe. Seus modelos podem ter variantes cosméticas ou instrumentais rastreáveis. Fora da equipe, permanecem na base, sem executar tarefas em segundo plano salvo se explicitamente modeladas.

**G-12 — estados de companheiro:** `não descoberto → avariado → diagnosticado → reparável → disponível → na equipe`; no campo: `seguindo → designado → executando → concluído` ou `interrompido/sem carga → seguindo ou aguardando resgate`. Recrutamento exige peças, tempo, ferramenta e segurança da área; cancelar ou falta de carga interrompe de forma explícita. O jogador pode chamar de volta, encontrar um robô parado no mapa ou recuperá-lo no checkpoint. Nenhum teleporte produz trabalho ou recursos.

| Unidade | Capacidade planejada | Limite e custo |
|---|---|---|
| PIP | sinalizar objetivos, ler diagnóstico e registrar medição | Sem reparo autônomo; bateria própria e alcance de comunicação parametrizados |
| Scout | mapear terreno próximo e medir temperatura/sombra | Sensor e bateria necessários; não revela recursos inexistentes |
| Horticultura | inspecionar umidade e operar válvula de cultivo instalada | Água vem do reservatório; crescimento exige tempo e energia |
| Manutenção | transportar ferramenta e executar reparo compatível | Peça, ferramenta, duração e energia são debitadas; não fabrica peças |

**S-02.** Ações de robôs verificam equipamento, distância, energia e duração antes de iniciar, reservam custos quando apropriado e registram consumo efetivo. Parâmetros de capacidade, bateria em kWh, consumo em kW, alcance e duração são dados explícitos balanceados por playtest; não inventar valores com aparência de especificação NASA. Mostrar custo estimado e estado de carga antes da confirmação. Um robô nunca transfere massa sem contabilizar origem e destino.

## Mundo e segurança

**W-01.** O mapa é um grafo de setores delimitados, com marcos, portas, rampas e rotas de volta; distâncias e tempos são metas de jogo, não dados cartográficos reais. Academia terrestre → treinador orbital → habitat lunar são transições narrativas. No habitat, três rotas levam a estufa/energia, abrigo de regolito e cânion de gelo/observatório; veja `WORLD_BIBLE.md`. Numa região já liberada, objetivos próximos devem ficar tipicamente a 2–3 minutos a pé, com retorno e desvios compreensíveis. Não insinuar que todos os setores formam superfície lunar contínua ou geografia de uma missão real.

**W-02.** A rota à estufa, ao abrigo e ao cânion pode ser escolhida em ordem flexível depois de estabilizar suporte vital mínimo; acesso ao gelo e observatório exige oxigênio/energia para ida e volta e equipamento adequado. Bloqueios mostram a condição e um caminho para cumpri-la. A crise de radiação exige abrigo e não é vencida correndo sem proteção. Testar colisão, rampas, degraus e bordas; quedas ou saídas dos limites devolvem a último ponto seguro sem duplicar itens.

**S-03 — modelo físico:** passo fixo determinístico e unidades explícitas. Potência é kW, energia armazenada é kWh, massas são kg; integrar potência pelo tempo em horas, respeitar capacidade e eficiência de carga/descarga. Água potável, residual e perdas são reservatórios finitos; reciclagem e eletrólise movem massa e consomem energia. A eletrólise conserva massa de água como oxigênio e hidrogênio com destinos explícitos, incluindo perdas modeladas; não confundir água residual com potável. Oxigênio e alimento são finitos; cultivo consome insumos e cresce com atraso e condições adequadas. Radiação é risco qualitativo de treinamento, sem dosimetria clínica. Cada simplificação e unidade aparece no guia; parâmetros configuráveis não se apresentam como medições reais.

**S-04.** Antes de iniciar atividade, mostrar tempo e custos estimados; durante simulação atualizar indicadores e alertas de limiar. Uma máquina desligada ou danificada não produz. Nenhum reparo reabastece instantaneamente; não permitir massa negativa, energia acima da capacidade ou recompensa repetida. Em falha, explicar causa e restaurar checkpoint explícito, incluindo estoques, estado de máquinas, robôs e relógio; registrar que houve recuperação. A pausa e menus suspendem o tempo da simulação.

## Missões e dados

**G-13 — contrato de missão:** `id`, `versão`, `título`, `região`, `pré-requisitos`, `objetivo`, `observações`, `hipóteses`, `ações` (ferramentas, custos, duração), `evidências` (fonte e valor antes/depois), `condições de sucesso`, `falhas`, `recuperação`, `reflexão`, `recompensa única`, `eventos` e `localização`. Condições avaliam eventos/estado real da simulação, não apenas o clique. Missões opcionais nunca bloqueiam uma rota essencial. Texto e valores são dados localizáveis e validáveis; eventos duplicados não repetem recompensas.

As missões M01–M10, hipóteses, comprovações e recuperação estão especificadas na bíblia do mundo. M01–M04 e uma expedição curta são candidatas ao slice; a sequência exata será ajustada ao tempo medido. O catálogo completo não representa conteúdo pronto.

## Controle, interface e apresentação

**A-01.** Teclado/mouse e toque: mover, orientar câmera, interagir, correr, abrir mapa/guia/pausa; cada ação possui legenda contextual legível. Toque tem alvos amplos, posicionamento seguro e não exige gesto oculto. Não exibir controles decorativos como se fossem funcionais. Testar interação em dispositivo real antes de alegar suporte.

**A-02.** Suportar redimensionamento de texto, contraste, legendas, sinais redundantes por ícone/texto/cor, movimento reduzido e remapeamento planejado; foco visível e navegação de menus por teclado. Não usar cor como único indicador de risco ou estado. Câmera em terceira pessoa com ajuste de distância e obstrução; cenas curtas não removem orientação nem ocultam o caminho de retorno.

**A-03.** Direção visual: trajes e estruturas brancos com laranja de segurança, ciano em instrumentos científicos, superfícies lunares de valor contrastante e linguagem espacial inspirada em engenharia real, estilizada e acolhedora para crianças. Máquinas devem comunicar função, escala e conexões. Evitar marcas ou insígnias institucionais que impliquem endosso. Fotos/fontes científicas exigem proveniência, licença e atribuição verificadas.

**A-04 — orçamento de arte:** prioridades P0: astronauta legível, PIP, habitat, eclusa, solar, estufa, caminhos, instrumentos e sinalização; P1: Scout/manutenção, gelo e observatório, animações de interação; P2: variantes, detalhes ambientais e expressões adicionais. Animações desejadas: idle, andar, correr, decolar/saltar, flutuar, pousar, interagir, reparar, pegar objeto, subir escadas, seguir com robô e rodas; transições coerentes com gravidade estilizada. Atlas facial em oito direções é opcional e de baixa prioridade, não requisito para o slice. Priorização preserva desempenho medido em hardware alvo; não assumir contagem infinita de malhas ou efeitos.

## Persistência, validação e prontidão

**N-01.** Save local versionado contém região e posição segura, relógio, recursos e equipamentos, máquinas, estados de missão/encontro, evidências, equipe, bateria, conquistas e preferências. Escrever atomicamente quando possível; validar valores e esquema na carga. Checkpoints antes de decisões críticas e na entrada de regiões seguras. Migração de saves 1.1 só é aceita após mapear explicitamente campos reais, definir valores ausentes e testar fixtures; preservar backup e oferecer novo jogo se migração falhar. Não alegar compatibilidade até verificada.

**N-02 — critérios de aceite:** uma execução limpa conclui o slice e uma execução com falha recupera sem duplicar recursos; rotas exibem seus pré-requisitos; cada evidência corresponde a uma medição real do estado; testes de passo fixo, limites e balanços passam; save/reload e migração comprovada preservam invariantes; controles e foco funcionam com teclado e toque real; walkthrough em navegador/GPU e desempenho em dispositivos alvo são registrados com condições. Verificar marcações de zonas e bordas, ferramentas disponíveis e legendas. Cada teste deve citar IDs deste documento e evidência reproduzível.

**N-03 — rubrica de prontidão:** (1) jornada concluível e recuperação; (2) integridade científica e fontes; (3) controles e acessibilidade básicos; (4) estabilidade, persistência e desempenho medidos; (5) direitos e regras do evento. Para cada item registrar `não iniciado`, `em andamento`, `aprovado` ou `bloqueado`, responsável, teste, data e evidência. Uma falha em qualquer item obrigatório bloqueia lançamento; funcionalidades opcionais ausentes são registradas como escopo cortado. Aprendizagem é hipótese de design: observar compreensão em testes com participantes e revisão especializada, sem alegar eficácia pedagógica publicada ou validada antes de estudo adequado.

## Extensão visual e personagens — requisito novo, não implementado

A revisão de 14/11 acrescenta Horizon Zero Dawn e No Man’s Sky como referências de worldbuilding; ver [pesquisa](research/HORIZON_NMS_WORLDBUILDING.md) e [arte original](art/README.md). O novo corte deve converter essas referências em um mundo finito melhor no Babylon, com marcos, terreno legível, kit modular, distribuição decorativa controlada e orçamento medido. Ciência e caminho navegável prevalecem sobre um detalhe de conceito.

Animação passa a incluir o astronauta e NPCs humanos, além de PIP/Scout. Cometa é o buddy dachshund astronauta requerido para implementação, opcional para o jogador. Entregar fonte/GLB/rig/clips reais e integração com pausa, contato, recall e save; conceito não basta. O cachorro é ficção autoral sem certificação NASA, e não cria recursos. Os contratos estão em [animação](animation/CHARACTER_ANIMATION_SPEC.md), [Cometa](characters/COMETA_BUDDY.md) e lotes 4A–4C de `MASTER_GOAL.md`. Esses requisitos novos não dão baixa automática no aceite da demo já publicada.
