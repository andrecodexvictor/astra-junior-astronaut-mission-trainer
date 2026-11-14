# Direção de jogo — seis referências, uma identidade ASTRA

Decisão do proprietário em 14/11/2026. As referências orientam princípios; não autorizam copiar personagens, criaturas, histórias, assets, mapas, UI, música, marcas ou código proprietário. A ficção original é a recuperação de Aurora por uma jovem equipe de astronautas e robôs. Descobrir algo deve mudar o que o jogador entende ou consegue fazer; manter o habitat vivo dá sentido à viagem.

| Referência | Princípio para ASTRA | Presente nesta demo | Próximo incremento verificável |
| --- | --- | --- | --- |
| Space Engineers | Engenharia como rede de entradas, saídas e limites | Geração, bateria, eficiência, cargas, água e eletrólise conectadas na simulação | Um painel com três conectores funcionais; validar topologia sem permitir recursos mágicos |
| Subnautica | Curiosidade por um sinal e retorno com conhecimento útil | Uma expedição finita para gelo e um sinal de Scout; retorno à base | Uma descoberta opcional abre uma ferramenta e uma rota, com volta garantida |
| Pokémon | Afeto, encontro e progressão por companheiros | PIP acompanha; Scout precisa de reparo e convite; marco único | Um papel de campo distinto para Scout com custo, feedback e save consistente; sem grind ou captura copiada |
| Scrap Mechanic | Experimentar montagem com peças que fazem algo | Reparo fixo é a fundação; montagem ainda ausente | Kit de três peças: painel, cabo e bateria em encaixes. Construção livre/rover só após provar esse kit |
| Journey to the Savage Planet | Exploração acessível, observação e humor leve | PIP, marco de pesquisa e descrição de geografia fictícia | Uma ferramenta de análise com evidência e descoberta ambiental; não caça violenta |
| Deliver Us The Moon | Investigar vestígios e restaurar uma instalação | Equipamentos desconectados, telemetria, cadeia de reparos, abrigo e reativação | Um vestígio espacial explica causa e oferece uma hipótese testável, sem monólogo obrigatório |

## Ciclo e ritmo

Explorar → notar uma anomalia → inspecionar evidência → formular hipótese → intervir com ferramenta/custo → medir consequência → retornar ou abrir uma nova possibilidade. Conversas curtas dão contexto humano e pista. O mundo fornece a ação; o simulador decide o resultado. A academia ensina uma relação, a Lua a reapresenta sob restrições e a expedição exige planejar o retorno.

O alvo futuro de 20–30 minutos é uma meta, não uma duração de playtest observada. Primeiro medir o circuito atual no Chrome, ajustar leitura e caminhos, depois ampliar uma só fronteira: rede conectável → kit modular → descoberta/upgrade → veículo opcional. Um mundo maior não substitui esse aceite.

## Identidade visual e modelagem

Proporções expressivas para astronauta e robôs; silhuetas de engenharia legíveis para equipamento. Branco técnico, laranja, basalto, ciano e verde botânico. A visão de longo prazo aproxima as imagens de referência por modelos glTF, materiais, escala, iluminação, câmera e animação; render conceitual não é prova de qualidade do jogo. Nesta fase há modelos reais e cenário autoral, com materiais compartilhados e factories Babylon. Não há Three.js no runtime.

A engine usa recursos existentes de Babylon: `AssetContainer`, instâncias/clones com propriedade definida, PBR, câmera, sombras, instrumentação e descarte. Melhorar o cenário requer captura real, comparação de composição e perfil de draw calls/GPU. A documentação de exemplos Babylon é referência técnica, não uma promessa de que a mesma cena já foi reproduzida.
