# Handoff — ASTRA demo independente v0.2

O proprietário escolheu uma demo descartável, separada da entrega oficial. A primeira integração agora tem aplicação Vite/TypeScript/Babylon, cinco regiões, oito GLBs, personagem e PIP, Scout reparável/recrutável, treinamento, cadeia lunar, expedição, gelo, cultivo, tempestade, falha/checkpoint, fontes e relatório. Isso é um primeiro corte de implementação; não é a campanha ampliada ou o aceite completo de G-001.

## Rodar e continuar

Node 24 → `npm ci` → `npm run check` → `npm run dev`. Chrome com WebGL 2. Build estático em `dist/`; não precisa login, backend, CDN ou chave. O antigo site Sites continua um artefato separado e não foi substituído por este repositório.

Para o Gemini, carregar `GEMINI.md` e `MASTER_GOAL.md`, inspecionar `ACCEPTANCE.json`, então seguir o primeiro gate incompleto. As 13 skills estão no clone com lock e licenças; não reinstalar o catálogo inteiro. As seis referências atuais estão traduzidas em mecânicas originais em `docs/demo/DESIGN_PILLARS.md`.

## Autoridades de código

| Área | Arquivo / responsabilidade |
| --- | --- |
| Contratos de mundo | `src/contracts.ts`: regiões, alvos, posição, callbacks e API da cena |
| Mundo | `src/world/createGameWorld.ts`: Engine/Scene Babylon, glTF 2 local, região finita por raiz descartável, câmera, input, interação, seguidores e métricas |
| Planta espacial | `src/world/manifest.ts`: alvos, portais, limites, footprints e medidas |
| Locomoção | `src/actors/movement.ts`: movimento cinemático, colisão seletiva, salto e easing; Terra 9,81, Lua 1,62 m/s²; órbita assistida usa piso |
| Verdade física/didática | `src/simulation/index.ts`: estado puro, ações ordenadas, passo de 1 s, energia/massa, tarefas atrasadas, flags, objetivo, validação e relatório |
| Tempo e save | `src/app/clock.ts`, `save.ts`: relógio monotônico independente do render, resto salvo pelo simulador, versão 3 do envelope / versão 2 do núcleo, checkpoint completo |
| Texto e apresentação | `src/app/catalogue.ts`, `src/main.ts`, `src/presentation/style.css`: falas autorais, inspeção, HUD, mapa, diário e modais |
| Modelos/fontes | `public/assets/manifest.json`, `public/science/`, `tools/models/build.py`: hashes, autoria, NASA Blue Marble e parâmetros didáticos |
| Auditorias | `scripts/audit-assets.mjs`, `audit-skills.mjs`, `vendor/skills/verify.mjs` |

Todos os modelos são pré-carregados uma vez em AssetContainers; cada região cria/descarta apenas seus nós. Não há cinco cenas simultâneas, mundo infinito ou cache ilimitado. Materiais/templates são compartilhados com propriedade explícita. A simulação não importa Babylon/DOM, e o render não decide recursos. A UI aplica ações por alvo próximo; o núcleo não simula coordenadas.

Pausa por menu, leitura, transição ou aba oculta congela tempo de missão; abrigo congela locomoção mas mantém a simulação com painel fechado. A aceleração 3× é visível e afeta todos os custos/perigos. Não existe progresso offline. Save inválido produz mensagem e uma nova partida disponível; o storage local é privado ao navegador, sem sincronização de conta.

## Qualidade e limites materiais

Consulte `TEST_REPORT.md` para comandos e `ACCEPTANCE.json` para aceite por requisito. Testes puros, controlador, alcance em grid, importação real GLB em NullEngine, auditorias e build são evidência CPU/empacotamento. Não comprovam percurso no Chrome, foco real de teclado, qualidade de imagem, 20 transições completas, estabilidade GPU ou duração de 20–30 minutos. `test:e2e` informa essa pendência e sai com status 2.

Órbita é assistida, não 6DoF. Não há manifesto de massa, física Havok, rig esquelético, plataformas móveis, navegação robusta dos robôs, escolha de equipe ou habilidades, construção livre, veículos, multiplayer, planetas extras ou tutor LLM. A interação narrativa é um painel autoral com símbolo CSS de robô, sem retratos finais/close cinematográfico humano. Parte do log técnico permanece em inglês. A geografia é ficcional; cultivo e segurança são abstrações. Não alegar fidelidade gráfica às imagens sem captura comparativa.

## Próximo lote recomendado

1. Executar `docs/demo/BROWSER_SMOKE.md` no Chrome real, corrigir softlocks/câmera/materiais e registrar hardware, resolução, capturas e trace. Medir o circuito atual e o tempo de leitura, sem aumentar área antes.
2. Melhorar legibilidade e reação do equipamento no mundo a partir dessas capturas. Depois implementar uma ferramenta/descoberta original com desbloqueio causal e save.
3. Introduzir uma pequena rede de três conectores; depois um kit com painel/cabo/bateria. Montagem livre e veículo entram só após provar custos, rede e colisões. `MASTER_GOAL.md` contém os lotes e portas restantes.

Preservar a proveniência: oito GLBs e Blue Marble foram reutilizados do legado autorizado, enquanto núcleo modular e integração foram implementados nesta fase. As dúvidas de competição não são bloqueios desta demo e não foram convertidas em aprovação NASA.
