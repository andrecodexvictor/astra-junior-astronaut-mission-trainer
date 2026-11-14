# Worldbuilding — Horizon Zero Dawn e No Man’s Sky

Pesquisa solicitada em 14/11/2026, America/Sao_Paulo. Abaixo estão fontes primárias e **interpretações autorais para ASTRA**. Referência de design não implica usar a engine, a escala, o código ou os assets dos jogos. As imagens novas do projeto são originais geradas por IA, identificadas e versionadas em [arte](../art/README.md).

## Fontes consultadas e limites

| ID | Fonte primária | O que sustenta / acesso |
| --- | --- | --- |
| HZD-01 | [Guerrilla — GPU-Based Procedural Placement in Horizon Zero Dawn](https://www.guerrilla-games.com/read/gpu-based-procedural-placement-in-horizon-zero-dawn) | Página de Jaap van Muijden, 01/03/2017, identificada pelo índice oficial. A abertura direta expirou; não alegamos leitura integral dos slides. |
| HZD-02 | [GDC Vault — sessão GPU-Based Run-Time Procedural Placement](https://www.gdcvault.com/play/1024700/) | Sinopse da sessão GDC 2017 lida: colocação dinâmica de elementos do ambiente. Não assistimos ao vídeo inteiro nem reproduzimos sua implementação. |
| HZD-03 | [PlayStation — Horizon Zero Dawn Remastered](https://www.playstation.com/en-us/games/horizon-zero-dawn/) | Página oficial de ambientação e galeria; natureza, ruínas e máquinas. A edição Remastered é identificada, sem confundir imagens dela com o runtime original. |
| HZD-04 | [PlayStation Blog — Announcing Horizon Zero Dawn](https://blog.playstation.com/2015/06/15/announcing-horizon-zero-dawn/) | Referência oficial indexada da proposta original de natureza retomando ruínas. Usada como contexto, sem copiar enredo ou personagens. |
| NMS-01 | [Hello Games — Worlds Part I](https://www.nomanssky.com/worlds-part-i-update/) | Página oficial lida: diversidade de ambientes e mudanças visuais, incluindo céu, luz e biomas. Esses recursos pertencem ao mundo ficcional do jogo. |
| NMS-02 | [Hello Games — Worlds Part II](https://www.nomanssky.com/2025/01/no-mans-sky-worlds-part-ii/) | Publicação oficial de 29/01/2025 lida: variedade de terreno/iluminação e descoberta. Não é promessa de reproduzir sua escala em navegador. |
| BAB-ANIM-01 | [Babylon — Animating Characters](https://doc.babylonjs.com/features/featuresDeepDive/animation/animatedCharacter/) | Fluxo oficial de modelo/GLB e grupos de animação. A integração ASTRA ainda precisa de rigs e clips reais. |
| BAB-ANIM-02 | [Babylon — Advanced Animation Methods](https://doc.babylonjs.com/features/featuresDeepDive/animation/advanced_animations) | Mistura e pesos de animação. Verificamos também os tipos locais de Babylon 9.35.0; APIs não provam qualidade dos clips. |
| BAB-WORLD-01 | [Babylon — Thin Instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances) | Adequação a muitos objetos estáticos e limites de culling/atualização. Escolher por caso, não como otimização universal. |
| BAB-WORLD-02 | [Babylon — Levels of Detail](https://doc.babylonjs.com/features/featuresDeepDive/mesh/LOD) | Níveis de geometria por distância/cobertura. Ativar no asset concreto e medir transições. |

As buscas visuais também localizaram screenshots de imprensa. Elas não foram copiadas para o repositório nem usadas como texturas ou inputs de geração; para referências visuais externas, abrir as galerias oficiais. Nenhum texto integral de artigo, slide deck ou vídeo foi redistribuído. Os status de acesso estão no [registro JSON](HORIZON_NMS_SOURCES.json).

## Derivação para ASTRA — decisões nossas

| Referência | Pergunta de design | Decisão para a próxima implementação | Evidência de aceite |
| --- | --- | --- | --- |
| Horizon: identidade de ambiente e distribuição | Como um cenário rico mantém rotas e objetos legíveis? | Autorizar o caminho principal e seus marcos à mão; distribuir detalhe em camadas com seed, máscaras de exclusão e funções ecológicas/industriais apropriadas. Não deixar scatter tapar um alvo. | Comparar panorama real com a prancha 02 e percorrer todas as saídas; mesma seed mantém decoração sem afetar missão. |
| Horizon: natureza e vestígios técnicos | Como um lugar mostra sua história sem um texto longo? | Na Terra/estufa, vegetação organizada por ambiente; na Lua, cabos, caixas e equipamentos avariados explicam uma falha. Não importar tribos, dinossauros robóticos ou floresta para o exterior lunar. | Um vestígio leva a uma hipótese e a um reparo com medida antes/depois. |
| No Man’s Sky: variedade e descoberta | O que diferencia uma região além da cor? | Dar motivo espacial, silhueta e descoberta distintos a academia, habitat, cânion e estufa; manter o retorno significativo. Bioma fantástico fica numa expansão declaradamente fictícia. | Jogador reconhece uma região pelo marco e pela atividade, sem depender só de HUD/cor. |
| No Man’s Sky: sistemas visuais em conjunto | Como luz, material e terreno sustentam sensação de lugar? | Uma composição coerente por região, com assets modulares, PBR, luz/sombras e LOD dentro de orçamento medido. Exterior lunar sem atmosfera terrestre; brilho do prospecto vem de lâmpadas. | Captura real do mesmo enquadramento e perfil de frame; sem vender render conceitual como gameplay. |

Essas são propostas ASTRA, não afirmações de que os estúdios usam os mesmos contratos de região, navegação, biologia ou simulação científica. Não tentamos portar Decima, uma galáxia procedural, voxels destrutíveis ou oceanos planetários para fechar a demo. A próxima área continua finita e verificável no Babylon.

## Critérios de qualidade que viram goal

1. Quatro imagens de referência devem estar no clone e ser abertas antes da próxima autoria de cenário/modelo; registrar o que cada uma governa.
2. Aurora ganha relevo e composição sem perder as interações, o abrigo, os custos e a rota de volta. Planta/árvore só em ambiente terrestre ou pressurizado na fase lunar.
3. Astronauta, NPCs humanos e robôs têm animações adequadas ao rig. Cometa tem modelo e rig de quadrúpede próprios, não um cachorro recolorido a partir de PIP.
4. A integração usa features da versão Babylon fixada e assets locais; mede skeletons, grupos, meshes e descarte. Não exige uma engine adicional.
5. O cachorro é uma entrega requerida da nova goal e um buddy opcional para o jogador. Caminho principal funciona sem selecioná-lo; sua presença não cria água/oxigênio/comida ou capacidades mágicas.
6. Comparação visual e animação precisam de Chrome/GPU. Os conceitos e manifests propostos não alteram o estado de aceite do jogo publicado.
