# Aplicação de design no ASTRA

Este é um raciocínio original de projeto para a demo autorizada, não uma cópia de artigo ou skill restrita. As referências estão em `SOURCE_REVIEW.md`. O texto descreve decisões e testes propostos; só o relatório de implementação estabelece quais foram executados.

## Pergunta que o primeiro protótipo precisa responder

O jogador consegue perceber uma falha no ambiente, formular uma hipótese com telemetria legível, agir no equipamento e reconhecer como sua decisão mudou a autonomia da base? Um ambiente extenso ou uma conversa longa não responde a essa pergunta. O primeiro corte precisa de uma rota pequena, sistemas conectados, uma decisão com custo e um desfecho recuperável.

O ciclo será: explorar um lugar → identificar algo anormal → inspecionar evidência → escolher uma intervenção → chegar ao equipamento e executar → observar a base reagir → registrar uma descoberta ou desbloquear uma possibilidade. A decisão se repete em contextos novos: a academia ensina um princípio, a Lua exige transferi-lo com outro limite. O motivo para retornar combina curiosidade pelo próximo setor, confiança nos companheiros e ferramentas que abrem novas ações; nenhum deles precisa de grind.

## Identidade e referências de jogo

A combinação solicitada usa princípios de seis jogos para construir uma identidade própria: jovens expedicionários e robôs reativam um posto lunar por observação, reparo e cuidado com a tripulação. Nenhum asset, mapa, diálogo, criatura ou personagem das referências deve ser copiado. Aproximar o estilo de exploração não exige reproduzir todos os sistemas desses jogos.

| Referência | Princípio aproveitado | Aplicação original e contida |
| --- | --- | --- |
| Space Engineers | Equipamentos formam redes funcionais com dependências | No primeiro corte, uma rede fixa de energia, água, oxigênio e cultivo. No futuro, um conector e um módulo extra por vez, com custo e teste de conservação. |
| Subnautica | Curiosidade leva a descoberta; tecnologia amplia alcance | Um sinal conduz ao canyon e ao gelo; nova ferramenta deve abrir uma ação útil e um retorno legível. Não prometer oceano/mundo procedural extenso. |
| Pokémon | Companheiro reconhecível, encontro e vínculo de progressão | Scout é reparado e recrutado; PIP ajuda a interpretar. Relação cresce com colaboração, sem capturar criaturas nem importar combate. |
| Scrap Mechanic | Montagem transforma peças em funções | Meta posterior de um kit de encaixe pequeno. Construção livre e veículos não estão implementados e não entram em paralelo ao fechamento da campanha. |
| Journey to the Savage Planet | Descoberta de campo leve, surpreendente e expressiva | Inspeção, ferramenta, hipótese e registro de uma observação; humor dos robôs. Caça violenta não será o loop de descoberta. |
| Deliver Us The Moon | Ambiente conta uma falha que se resolve por investigação e reparo | Vestígios, telemetria e um equipamento danificado contam uma história curta antes da reativação; texto apoia ação espacial. |

### Baseline atual versus intenção de evolução

O corte em integração tem cinco regiões — Terra/academia, órbita assistida, habitat lunar, canyon e estufa —, oito modelos GLB locais e um núcleo puro com ticks fixos. A órbita assistida não é simulação de seis graus de liberdade. Reparar/recrutar Scout, coletar gelo, cultivar, reagir à tempestade e produzir o relatório são o percurso a preservar e validar. A existência do código/modelo não prova conclusão de QA: resultados reais devem estar nos relatórios de testes.

Oito GLB não significam oito personagens com rigs completos nem fidelidade equivalente às imagens de referência. O refinamento visual começa pelos modelos, terreno, iluminação e caminhada desse circuito, com orçamento e captura real. Construção livre, veículos e outras regiões são futuros; não apresentá-los como recursos prontos.

### Ordem de evolução sem dispersão

1. Fechar diagnóstico, quatro recursos conectados, desfecho e retry nas cinco regiões atuais.
2. Polir um circuito de investigação: sinal ambiental → evidência → reparo de Scout → recrutamento → aplicação no canyon → resultado reconhecido. Medir compreensão, não só distância caminhada.
3. Adicionar um gate técnico e uma descoberta de campo originais. A ferramenta desbloqueia uma ação demonstrável; a descoberta fornece evidência ou contexto.
4. Só depois prototipar rede configurável com um módulo e conectores; em seguida, um kit de montagem restrito com preview, custo e undo. Veículo entra por último, se uma necessidade de travessia justificar seu custo técnico.

Cada passo deve ser integrado e verificado antes do próximo. O critério de escolha é aprofundar a aventura científica ASTRA, não completar uma lista de mecânicas das referências.

## Rota e ritmo do primeiro corte

| Trecho | Situação espacial | Ação verificável | Por que existe |
| --- | --- | --- | --- |
| Academia segura | Sala pequena com mentor, painel e cargas | Caminhar, enquadrar o painel, inspecionar kW/kWh, desligar uma carga secundária | Ensinar controle e contraste entre potência e energia sem crise imediata |
| Partida e órbita | Transição curta e cenário controlado | Escolher carga com limite e executar o exercício assistido atual | Criar vínculo e preparar aplicação diferente; declarar que não é controle orbital 6DOF |
| Chegada lunar e Scout | Vista da base e circuito curto a pé | Encontrar um defeito por sinal/telemetria, reparar e recrutar Scout | Orientar por landmark e construir vínculo por uma ação de cuidado |
| Canyon de gelo | Rota finita de investigação e retorno | Inspecionar, obter gelo e levá-lo à cadeia de processamento | Ligar descoberta espacial à dependência de água/oxigênio/cultivo |
| Dilema integrado | Bateria/oxigênio/água/estufa próximos por rotas legíveis | Restaurar a cadeia de suporte à vida, escolher demanda adiada | Fazer os quatro pilares terem custos conectados e observáveis |
| Alerta e retorno | Abrigo visível e trajeto seguro previamente percorrido | Interromper EVA, abrigar-se ou perder margem de segurança | Testar priorização; permitir falha, checkpoint e outra estratégia |
| Descompressão narrativa | Interior seguro com PIP/mentor | Ler medidas antes/depois e escolher uma reflexão breve | Encerrar o episódio, sem substituir a ação por uma prova de alternativas |

A demonstração compacta pode condensar trechos, desde que o status diga exatamente quais existem. Caminhos opcionais curtos devem mostrar evidência, uma amostra ou um personagem; evite corredores sem função. Antes de refinar a arte, medir velocidade, altura do personagem, raio de giro da câmera, degrau possível, largura da eclusa e tempo real do circuito. Depois revalidar caminhos e retorno a cada bloqueio de quest.

## Escolhas e contabilidade

Exemplo didático, a parametrizar no simulador: geração limitada precisa atender ao oxigênio e ao cultivo. Suspender cultivo melhora a reserva elétrica agora, mas adia a colheita; priorizá-lo exige obter geração ou reserva suficientes antes do próximo intervalo de baixa produção. A água também limita o oxigênio e a plantação. Abrigar-se protege a tripulação e suspende o reparo externo. Há pelo menos duas ordens de ação viáveis, além de uma sequência que falha com explicação.

Esses parâmetros são hipóteses de jogo, não capacidades oficiais de equipamentos NASA. Os testes precisam provar dependência de entrada, conservação, limites e resultados para uma sequência fixa. Uma animação de válvula ou fala de PIP não pode conceder água. O relatório usa o log de comandos e medidas do simulador, não uma pontuação arbitrária escolhida pelo diálogo.

## Visual novel e RPG dentro da exploração

O encontro de personagem tem três funções: dar um objetivo humano curto, oferecer uma pista contextual e reconhecer o resultado. Quando a conversa termina, a tarefa continua no mundo. Close, retrato, expressão e histórico apoiam leitura; reduzir movimento mantém entendimento sem tremor de câmera. A pausa durante conversa deve ser uniforme entre os sistemas.

PIP tem presença e reações, mas não faz o reparo pelo jogador. Confiança e módulos desbloqueados devem abrir maneiras de observar ou alcançar regiões, com concessão única e custo registrado. Um sistema de relação não precisa impor dano irreversível por uma escolha de tom. Inspirar-se em RPGs recentes significa mundo contínuo legível, companheiro, exploração, encontro e progressão; personagens, música, criaturas, interface e mapas são originais, sem copiar Pokémon.

## Hipóteses de experiência, sem alegações não testadas

| Hipótese | Evidência a coletar em playtest | Resposta se falhar |
| --- | --- | --- |
| O jogador sabe a próxima ação sem ler um tutorial longo | Observação do percurso e pedido espontâneo de ajuda | Ajustar landmark, câmera e pistas; não só acrescentar texto |
| Entende por que um equipamento deixou de produzir | Explicação breve ligada às entradas e medidas vistas | Melhorar inspeção e feedback; revisar abstração |
| Percebe duas estratégias e pode se recuperar | Sequências diferentes registradas; tentativa após checkpoint | Ajustar limites, custo e disponibilidade da evidência |
| PIP ajuda sem tirar agência | Jogador usa pista e continua a operação manual | Reduzir antecipação automática e dicas não solicitadas |
| O encontro narrativo cria interesse pelo próximo setor | Jogador identifica um personagem/objetivo e decide explorar | Reescrever fala curta e contexto ambiental, não aumentar grind |

Nenhuma hipótese autoriza coleta de nome, localização ou perfil psicológico de menores. Telemetria local de desenvolvimento precisa ser mínima. Aprendizagem exige avaliação adequada: conclusão de quest ou tempo de sessão não comprovam eficácia pedagógica.

## Aceite do design versus evidência real

Documentos podem registrar o loop, o orçamento e a intenção. Aceite do produto exige um percurso jogável, consequências reproduzíveis, feedback, falha/retry e um relatório que corresponda às ações. Escopo posterior — regiões maiores, rover, Marte, tutor LLM, mais personagens — só entra depois de estabilizar esse circuito. `MASTER_GOAL.md` organiza a expansão em lotes sem confundir plano com implementação.
