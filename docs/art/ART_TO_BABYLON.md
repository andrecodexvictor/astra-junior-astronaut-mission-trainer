# Das imagens ao mundo Babylon.js

Contrato de produção proposto, 14/11/2026. As oito pranchas são referências originais; todos os sistemas abaixo ainda exigem implementação e captura real para aceite. A demo atual já tem cinco regiões, oito GLBs, pivôs animados e simulação pura. Ela ainda não tem os novos rigs, Cometa, terreno desta composição ou a densidade das imagens.

## Ordem de autoridade

A spec científica e a jogabilidade prevalecem sobre um detalhe inconsistente de conceito. Para o conjunto visual, usar a prancha 01 como família de ambientes; 02 para composição lunar e gelo não emissivo; 03 para proporções/traje do cachorro; 04 para intenção de poses. O manifesto de clips e o rig real decidem nomes, contatos, duração e hierarquia. Um desenho não fornece medidas exatas ou pesos de skinning.

Preservar `src/world/manifest.ts`, IDs de interação, passagens e progresso enquanto se refina a geometria. Qualquer deslocamento de alvo exige atualizar o manifesto e refazer a verificação de caminho. A verdade física continua em `src/simulation`; animação, cão, câmera ou scanner não geram recursos.

## Um incremento espacial por vez

1. **Aurora primeiro:** conservar as funções do hub e seus alvos. Modelar pátio de chegada, deck elétrico, entrada de estufa, abrigo e saída do cânion. Antena como landmark de fundo; caminhada útil em primeiro plano. A imagem sugere relevo, mas nenhuma tarefa exige salto preciso.
2. **Terreno e kit:** três famílias de rocha e um kit de módulo/eclusa/corrimão/cabo/caixa. Malha de terreno autoral com colisão simplificada compatível, máscaras de trilha e espaços sem scatter. Heightmap medido só com dataset/projeção/licença/unidade/transformação documentados. Sem dataset, marcar geografia artística.
3. **Estufa e academia:** plantas e árvores onde há ambiente terrestre ou pressurizado, com densidade por canteiro e função legível. O cânion lunar não recebe floresta ou relva para imitar outra franquia.
4. **Cânion:** um ramo para Scout e um prospecto fictício, retorno identificado e caminho para Cometa. Interação fica acessível fora da colisão do objeto; rock dressing não bloqueia a volta. Rampa alternativa atende humano e quadrúpede.
5. **Órbita:** conservar a identificação de deslocamento assistido. Rigs flutuantes e física 6DoF são outro incremento, não uma conclusão obtida com um fundo novo.

Em cada região, separar camadas `walkable`, `collision`, `interactable`, `vista`, `noScatter` e `environmentalEvidence`. O marco de fundo pode ficar fora do limite caminhável e não promete conteúdo infinito. Medir controle/câmera/colisão reais antes de dimensionar degrau, eclusa ou rampa. Toda região deve manter saída e retry alcançáveis com as flags reais.

## Uso da engine

- **Geometria e assets:** glTF 2/GLB local, `AssetContainer`, propriedade de instâncias e descarte explícito. Importações granulares e versões compatíveis já adotadas. Não trocar Babylon nem introduzir um renderizador paralelo.
- **Rochas/plantas repetidas:** usar instances; thin instances apenas para grupos estáticos adequados e particionados em células de culling. Thin instances têm limites de visibilidade/atualização, conforme a documentação; não colocar o mapa inteiro em um lote só nem usá-las para compartilhar pose de personagens.
- **Variação controlada:** posições decorativas geradas uma vez por seed/região/célula, máscaras de declive/material e exclusão em trilhas/alvos. Mesma seed e versão produzem mesma distribuição, independentemente da ordem de visitas. Não reposicionar rochas a cada frame.
- **LOD:** criar reduções reais de geometria para rochas, estruturas e plantas distantes; configurar os níveis nativos e verificar popping e bounds. Distâncias finais vêm de captura e profiling, não de números arbitrários no conceito. Manter a malha de colisão estável.
- **Materiais:** PBR compartilhado, variação de roughness/normal e atlas/trim quando útil, com texturas locais licenciadas. Nenhum screenshot de jogo é textura. O preset econômico reduz resolução/sombras/decoração preservando pistas e tarefas.
- **Iluminação:** Lua com céu preto, Sol direcional e sombras; preenchimento artístico deve ser declarado. Retirar a névoa atmosférica do preset lunar ao refinar o código atual (`outdoor` hoje usa fog como artifício de distância). Profundidade vem de composição, silhueta, relevo e exposição. Sem nuvens, chuva ou vento terrestre na superfície lunar. Interior pressurizado pode ter luz quente e pequenos efeitos locais.
- **Animação:** `AnimationGroup`, mistura de pesos e grupos independentes por instância. APIs devem ser verificadas contra Babylon 9.35.0, sem colar exemplos de Babylon Lite ou de versão futura. Controller é dono de translação/yaw; não somar root motion e deslocamento do controlador.
- **Contato visual:** personagens usam skeleton/rig apropriado ou fallback por pivôs explicitamente limitado. Não transformar o movimento senoidal atual em alegação de rig esquelético. Cometa precisa de quatro patas e suporte/colisão próprios; NPC não é automaticamente um robô com outra cor.

As páginas oficiais de Babylon constam em [pesquisa](../research/HORIZON_NMS_WORLDBUILDING.md). `AnimationGroup.enableBlending`, `setWeightForAllAnimatables` e `clone` constam nos tipos locais de 9.35.0; a presença da API não prova integração, retargeting ou eventos corretos. Não construir um sistema de GPU procedural equivalente ao Decima ou um universo voxel para reproduzir uma referência.

## História ambiental e descoberta

Uma caixa aberta, cabo desconectado e marca de reparo contam o que falhou. O jogador vê, formula uma hipótese e mede o efeito de uma intervenção. Não adicionar símbolos de ameaça/combate ou máquinas copiadas de Horizon. Um scanner marca apenas dado ou evidência que existe no modelo; sua animação não confirma hipótese por si só. Cometa pode olhar um marco já visível e receber carinho; não fareja através do vácuo nem encontra água oculta por mágica.

Variação de cor, silhueta e motivos por região evoca exploração. Exoplanetas, nuvens exóticas e biomas fantásticos são expansão explicitamente hipotética/ficcional após estabilizar a Lua. Não trocar as propriedades científicas da Lua para parecer No Man’s Sky, nem prometer escala infinita.

## Aceite antes de ampliar

Criar comparação por prancha: alvo → captura real do mesmo ponto de câmera → diferença observada → correção limitada. Verificar silhueta do personagem/cão, leitura do caminho, três planos de profundidade, função dos módulos, separação entre abrigo e exterior, roupa/capacete e interface legível. Comparar a 1×, com câmera jogável; não aprovar apenas um render offline favorável.

Executar percurso completo com sucesso e falha, dois atores do mesmo rig, pausa/retomada, mudança de região, recall bloqueado e save/reload. Dar baixa em meshes, skeletons, grupos, texturas, observers e tarefas assíncronas descartadas. Registrar 20 transições reais sem crescimento contínuo, console e assets.

Registrar commit, GPU/browser, resolução/DPR, qualidade, carga fria/quente e trace de 60 s. Meta inicial: 60 fps desktop e modo econômico, sujeita a orçamento de frame medido; não é resultado atual. Orçamentos de personagem estão na spec de animação e são provisórios. Reduzir efeitos/área antes de cortar simulação, contato de patas, acessibilidade ou diagnóstico. Sem GPU, entregar código/GLBs e testes possíveis com pendência precisa, sem captura fictícia.

## Storyboards 05–08: espaço a serviço do episódio

A academia oferece vínculo e teste sem risco; a cabine marca a passagem entre mundos; o cânion dá evidência e novo companheiro; o abrigo/estufa fecha o episódio com uma base que responde ao cuidado. Usar o tratamento `docs/narrative/EPISODE_01_TREATMENT.md` para preservar causa e efeito. Não implementar uma sequência rígida de cutscenes que ignore a radiação ou recursos atuais. A geometria e câmera devem permitir a ação mostrada, e a comparação deve usar capturas reais, não substituir o mundo por um storyboard.
