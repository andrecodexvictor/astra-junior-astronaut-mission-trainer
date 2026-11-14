# ASTRA: Lunar Frontier — bíblia do mundo e missões

**Estado:** visão futura de design, 14/11/2026 no horário local do projeto. Os locais, personagens, missões e números de percurso abaixo são propostas, não afirmações sobre o protótipo 1.1. Ver `GAME_SPEC.md` para requisitos, invariantes e metas de teste. A topografia é um cenário de treinamento ficcional; não é um mapa, sítio ou missão oficial da NASA.

## Premissa, tom e personagens

**WB-01.** Uma turma da Academia ASTRA chega a um centro lunar de treinamento e pesquisa para aprender a cuidar de sistemas interdependentes. Uma falha de distribuição e uma previsão de radiação obrigam a equipe a observar primeiro, restabelecer serviços e escolher expedições seguras. A história tem curiosidade, responsabilidade compartilhada e humor gentil; problemas técnicos não se resolvem por um discurso ou um robô milagroso. Conversas breves apresentam pessoas e consequências, com exploração jogável sempre central.

A pessoa jogadora é uma cadete ajustável. PIP, pequeno assistente de diagnóstico, mostra pistas e registra decisões sem decidir por ela. Uma mentora de sistemas ensina a ler fluxos, um responsável de campo avalia rotas e uma especialista de cultivo explica os ritmos da estufa. Seus nomes e aparências devem ser originais e não reproduzir pessoas ou marcas existentes. Scout, Horticultura e Manutenção são robôs de finalidade reconhecível, construídos e reparados por humanos. O vínculo nasce do cuidado e da cooperação; o álbum cataloga configuração, reparo e história de cada unidade, não espécies animais.

## Lugares e grafo navegável

**WB-02.** A ficção combina terreno equatorial, um setor de gelo de treinamento e pontos inspirados em diferentes contextos lunares. Gelo acessível perto de um habitat equatorial é uma conveniência ficcional e não uma representação de depósitos confirmados nesse local. Fontes topográficas ou imagens reais podem informar aparência, mas áreas não contíguas são compostas e identificadas como tal; não atribuir o mapa resultante à NASA nem afirmar equivalência geográfica. Sombra, radiação e funcionamento de sistemas são simplificados e explicados no guia.

```text
Academia terrestre -- transição de treinamento --> Treinador orbital
Treinador orbital -- transição de missão --> Habitat / eclusa solar [hub]
Hub -- caminho A --> Estufa e painéis -- retorno --> Hub
Hub -- caminho B --> Abrigo de regolito -- retorno --> Hub
Hub -- caminho C --> Cânion de gelo -- Observatório -- retorno --> Hub
```

| Setor | Leitura e função | Distância/portões de projeto |
|---|---|---|
| Academia | pátio branco e laranja, bancada com medidores; introdução segura | Trecho de tutorial compacto, transição explícita para órbita |
| Treinador orbital | cabine e carga em movimento; impulso e referencial simplificados | Cena curta, não uma simulação orbital completa |
| Habitat e eclusa solar | hub de mapa, troca de equipe, checkpoint, reservatórios e painéis | Origem das três rotas, marcos visíveis, retorno inequívoco |
| Estufa e energia | tubos identificados, cultivo e medidores; escolha de carga | Aproximadamente 2–3 min do hub; rota aberta após estabilização mínima |
| Abrigo de regolito | paredes protegidas e sinalização laranja; treino de abrigo | Aproximadamente 2–3 min; acesso sem salto preciso, exige rota segura |
| Cânion de gelo | trilha marcada, sombra e amostrador; gelo ficcional | Aproximadamente 2–3 min; reserva de ida/volta e equipamento necessários |
| Observatório | antena e horizonte reconhecíveis; leitura e comunicação | Adjacente ao cânion, após verificação de energia e comunicação |

**WB-03.** Esses tempos são alvos de percurso, ajustados por teste, não distâncias topográficas. Portais ou deslocamentos comprimidos devem ser sinalizados. Cada setor possui rota de volta, limites claros, declives legíveis, rampas e bordas protegidas onde apropriado. Marcadores incluem nome, direção e estado; ninguém deve precisar distinguir apenas cores. O mapa fornece previsão de tempo, condição de acesso e último ponto seguro. Um caminho alternativo acessível evita depender de salto ou precisão de câmera.

**WB-04.** A, B e C ficam disponíveis em ordem flexível após energia de emergência e reserva mínima de suporte vital; suas atividades têm dependências próprias. A saída C exige saldo calculado para ida e volta, instrumento e condições seguras; ela pode ser adiada enquanto se trabalha em A ou B. Tempestade/alerta de radiação suspende saídas externas e aponta para abrigo; não é um cronômetro que pune leitura de instruções enquanto pausado. Em caso de valores insuficientes, oferecer diagnóstico, economia de carga, retorno ou checkpoint, sem gerar suprimentos.

## Elenco robótico e encontros

**WB-05.** PIP identifica o problema e oferece uma pista opcional, mas o jogador escolhe e mede. Scout encontra sinal de orientação, Horticultura lê um sensor e Manutenção instala uma peça quando reparados e equipados. Cada unidade tem estado, bateria, posição e custo; nenhuma executa tarefa para a qual não foi equipada. Variantes alteram sinalização e, quando documentado, o instrumento instalado, com mesmo regime de recursos. Três companheiros ativos no máximo, incluindo PIP; troca no hub. Encontrar um robô danificado inicia uma investigação, não uma captura. As máquinas podem ficar sem carga, aguardar resgate e ser recuperadas sem criar energia.

**WB-06.** Encontros usam a máquina de estados G-10 e companheiros usam G-12. Um encontro é reconhecível por geometria, som opcional e rótulo, e não aparece resolvido por atravessar seu volume. Após resolver, a área mantém evidência e consequências; revisitar mostra o registro sem duplicar peça, XP ou recurso.

## Catálogo de missões

Todas as missões seguem S-01 e o contrato G-13; números de missão não impõem ordem onde os pré-requisitos permitem escolha. Leitura dos instrumentos e resultado registrado constituem evidência de jogo, não avaliação clínica ou pedagógica validada. Custos, quantidades e tempos serão calibrados como dados explícitos antes da implementação. Toda ação com custo exige confirmação clara.

### M01 — Rede da academia

**Pré-requisito/local:** início; academia. **Observação:** consumo supera geração e a bateria cai. **Hipóteses:** cargas não essenciais ou geração desligada; inspecionar os dois. **Ação:** reduzir carga e verificar fonte, com passagem de tempo simulada. **Evidência/sucesso:** leitura de kW antes/depois e tendência de kWh estabilizada durante intervalo definido. **Troca:** desligar equipamento secundário limita conforto. **Falha/recuperação:** bateria baixa encerra treino e oferece checkpoint e nova leitura. **Reflexão:** potência instantânea difere de energia acumulada. Recompensa única: registro básico no guia.

### M02 — Carga e referencial

**Pré-requisito/local:** M01; treinador orbital. **Observação:** caixa deriva em relação à cabine. **Hipóteses:** impulso altera velocidade; impulso contínuo sem correção causa ultrapassagem. **Ação:** pulsos curtos dentro do combustível disponível. **Evidência/sucesso:** aproximação e velocidade relativa registradas, caixa recuperada. **Troca:** precisão custa tempo e combustível. **Falha/recuperação:** perder a caixa restaura checkpoint de treinamento; sem criação de combustível no estado corrente. **Reflexão:** movimento depende do referencial; modelo orbital é simplificado.

### M03 — Luzes do habitat

**Pré-requisito/local:** chegada ao hub. **Observação:** conexão avariada, geração e armazenamento insuficientes. **Hipóteses:** circuito aberto ou demanda excessiva. **Ação:** inspecionar, reparar com peça existente e reduzir carga não essencial. **Evidência/sucesso:** estado do circuito e leituras de geração, consumo e bateria mostram operação sustentável por intervalo. **Troca:** reserva conservada ao custo de aparelhos desligados. **Falha/recuperação:** descarga leva a checkpoint; reparar sem peça falha sem débito. **Reflexão:** reparo permite fluxo, não enche bateria.

### M04 — Água em circuito

**Pré-requisito/local:** energia mínima de M03; habitat. **Observação:** pouca água potável e residual acumulada. **Hipóteses:** reciclador desligado ou entrada bloqueada. **Ação:** verificar conexão, ligar reciclagem e aguardar com consumo elétrico. **Evidência/sucesso:** queda de residual e aumento de potável respeitam eficiência e perdas; total contabilizado. **Troca:** reciclar compete por energia. **Falha/recuperação:** carga insuficiente interrompe processo; economizar energia ou restaurar checkpoint. **Reflexão:** água muda de reservatório e perdas precisam de destino.

### M05 — Ar com orçamento

**Pré-requisito/local:** M03 e água disponível; habitat. **Observação:** oxigênio diminui. **Hipóteses:** eletrólise desligada ou sem energia/água. **Ação:** ligar aparelho e acompanhar consumo. **Evidência/sucesso:** água consumida e oxigênio/hidrogênio produzidos têm balanço coerente e estados registrados. **Troca:** produzir ar consome água e energia. **Falha/recuperação:** reserva crítica leva a abrigo/checkpoint, com orientação para reduzir carga e planejar. **Reflexão:** a água não se transforma inteiramente em oxigênio.

### M06 — Uma estufa paciente

**Pré-requisito/local:** suporte mínimo estável; rota A. **Observação:** cultivo seco e sem crescimento. **Hipóteses:** falta de água ou de energia/luz. **Ação:** inspecionar sensores, irrigar com água contabilizada e alimentar o sistema por tempo suficiente. **Evidência/sucesso:** medição de umidade, custo dos recursos e avanço de crescimento após atraso. **Troca:** irrigar reduz água disponível para outras tarefas. **Falha/recuperação:** irrigação insuficiente ou energia interrompida pausa crescimento; corrigir sem prêmio automático. **Reflexão:** produção de alimento leva tempo.

### M07 — Companheiro de manutenção

**Pré-requisito/local:** suporte mínimo e peça/ferramenta disponíveis; rota A ou hub. **Observação:** robô parado com diagnóstico de roda ou alimentação. **Hipóteses:** bateria vazia ou peça danificada. **Ação:** medir, reparar a causa e autorizar a unidade. **Evidência/sucesso:** estado muda de avariado a disponível, peça e energia debitadas, teste de movimento concluído. **Troca:** peça usada não estará disponível para outro reparo. **Falha/recuperação:** reparo inadequado deixa unidade diagnosticável; reavaliar ou retornar ao hub. **Reflexão:** diagnóstico precede intervenção. Recompensa: registro e possibilidade de alocação na equipe.

### M08 — Abrigo antes da tempestade

**Pré-requisito/local:** suporte mínimo; rota B. **Observação:** alerta qualitativo e mapa de abrigo. **Hipóteses:** estrutura protegida reduz exposição; permanecer externo é inseguro. **Ação:** planejar percurso, alcançar e entrar no abrigo antes de prosseguir. **Evidência/sucesso:** evento de entrada segura e comparação das opções no registro. **Troca:** expedições aguardam condições seguras. **Falha/recuperação:** exposição crítica restaura checkpoint e aponta rota; não atribuir dose numérica. **Reflexão:** proteção e planejamento importam mesmo quando há incerteza.

### M09 — Sombra e amostra

**Pré-requisito/local:** suporte mínimo, reserva de ida/volta e amostrador; rota C. **Observação:** sinal de gelo ficcional em área sombreada. **Hipóteses:** sinal consistente com gelo ou com sensor interferido. **Ação:** comparar leituras, coletar amostra usando equipamento e energia contabilizados, retornar. **Evidência/sucesso:** medições localizadas e amostra transferida com massa de origem/destino; retorno seguro. **Troca:** tempo e bateria limitam investigação. **Falha/recuperação:** sensor ou reserva insuficiente interrompe saída; voltar/recarregar, sem amostra gratuita. **Reflexão:** uma leitura não prova localização real de gelo lunar.

### M10 — Janela do observatório

**Pré-requisito/local:** rota C segura e energia/comunicação disponíveis; observatório. **Observação:** sinal irregular em antena. **Hipóteses:** orientação ou alimentação inadequada. **Ação:** comparar diagnóstico e ajustar equipamento durante intervalo definido. **Evidência/sucesso:** sinal medido antes/depois e custo energético registrado; relatório enviado ou armazenado localmente. **Troca:** observação usa energia que poderia recarregar bateria. **Falha/recuperação:** falta de energia pausa e permite retorno; relatório não desaparece. **Reflexão:** correlacionar intervenção e medição, reconhecendo limite do modelo.

## Ritmo, direção e teste

**WB-07.** No slice, abertura e transições são breves, M01–M04 demonstram dependências e uma saída curta demonstra descoberta e retorno. O catálogo completo é futuro; adaptar a seleção após cronometrar a jornada. No jogo ampliado, cada rota apresenta um marco visível, problema distinto e motivo para revisitar o hub. Nunca colocar texto essencial somente numa cena que pode ser pulada; registrar as informações no guia e permitir reler.

**WB-08.** Silhuetas arredondadas e acolhedoras coexistem com conexões, dobradiças, cabos e instrumentos compreensíveis. Branco e laranja identificam infraestrutura; ciano apoia dados e interações, sempre acompanhado de rótulo/ícone. O terreno apresenta luz e sombra legíveis, com cuidado para não usar contraste extremo como única indicação. O áudio é opcional e legendado; não copiar personagens, sons, símbolos ou elementos identificáveis de outras franquias.

**WB-09 — validação de cenário:** percorrer cada aresta nos dois sentidos, medir tempos, verificar acessibilidade de rampa e orientação, simular tempestade e retorno com reserva insuficiente. Para cada missão, testar hipótese incorreta, falta de ferramenta ou energia, sucesso com evidência, repetição idempotente e recuperação. Associar resultados aos IDs G/S/W/N/A e registrar plataforma e data. Fonte, licença e transformação de cada referência visual ou científica devem acompanhar o recurso usado; composições ficcionais devem ser rotuladas. Nenhuma destas verificações é alegada como concluída por este documento.
