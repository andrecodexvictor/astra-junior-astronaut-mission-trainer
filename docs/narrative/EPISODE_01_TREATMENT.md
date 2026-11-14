# Episódio 01 — Uma luz de cada vez

**Tratamento proposto, não implementado.** O objetivo emocional é devolver vida ao habitat Aurora com segurança, pela atenção compartilhada a sistemas e pessoas. A pessoa jogadora é uma jovem astronauta personalizável, sem gênero fixo. A narrativa abaixo propõe cenas, falas, personagens e escolhas; os alvos e operações marcados como existentes referem-se ao código atual, não comprovam que as cenas estejam jogáveis ou testadas. Aurora, geografia e situação são ficção. Nenhum procedimento é apresentado como protocolo NASA.

Reyes, mentor acolhedor, é proposto com pele escura e barba grisalha; Lia, mentora de sistemas, com cabelo curto e óculos de proteção; Elena, especialista de cultivo, com pele escura, cachos curtos e casaco verde. Essas aparências são direções de arte provisórias. PIP orienta sem decidir; Scout é um robô de campo recuperado, com papel distinto. Cometa é um dachshund de corpo comprido e baixo, buddy requerido pela nova goal e opcional na equipe da pessoa jogadora e para a conclusão. Seu vínculo e suas ações ainda não existem no runtime; não sofre dano nem fareja no vácuo. Não se atribuem recursos ou descobertas mágicas a ela.

## Batidas propostas

As falas são curtas, originais e podem aparecer em caixas relíveis; não interrompem a ação por longas cenas. Os IDs de alvo entre crases existem em `src/world/manifest.ts`. As ações e evidências citadas descrevem a simulação atual, salvo quando indicadas como propostas.

### 1. Chegada e vínculo — academia

- **Entrada:** a pessoa cadete chega ao treinamento. **Ação:** caminhar até `academy-console`; encontro com Cometa é futuro e opcional. **Evidência:** conhecer o espaço; o vínculo não altera recursos nem registra conclusão de missão.
- Reyes: “Aurora precisa de gente que saiba observar.”  
  PIP: “Vamos começar por uma leitura?”  
  Reyes: “Cometa pode acompanhar, se você quiser.”
- **Sucesso:** aproximar-se do console. **Falha/repetição:** uma rota livre leva de volta; ausência de Cometa não bloqueia nada. Cena e personagem propostos.

### 2. Luzes de treino

- **Entrada:** fase `academy`. **Ação:** em `academy-console`, diagnosticar e reduzir carga não essencial; observar 15 segundos de recuperação. **Evidência:** registro de hipótese, carga reduzida e bateria de treino ao fim do intervalo.
- Lia: “A reserva está caindo. O que você consegue medir?”  
  PIP: “Reduza uma carga e acompanhe a tendência.”
- **Escolha causal 1:** diagnosticar e reduzir a carga permite recuperação; deixar a carga ligada mantém a bateria em queda e não satisfaz a estabilidade. A intervenção existente não oferece outra estratégia de conclusão da academia. Se a bateria esgotar, é possível reduzir a carga e observar recuperação. **Reflexão:** potência e energia armazenada não são a mesma grandeza.

### 3. Briefing e carga

- **Entrada:** estabilidade concluída. **Ação:** usar `academy-launch` e, na fase `orbit`, alcançar `cargo`; seguir por `lunar-transfer` após assegurar a carga. **Evidência:** flags de carga e chegada registradas.
- Reyes: “Levamos só o que foi preparado. Cada peça conta.”  
  PIP: “Carga segura. Podemos seguir para a transferência.”
- O storyboard sugere corrimão e recuperação manual em queda livre como evolução futura; a cabine atual é um treinador assistido e simplificado, sem física orbital ou manipulação de carga em queda livre comprovadas. A passagem exige carga; retornar ao alvo permite tentar novamente. A conversa, janela lunar e briefing ampliado são propostas.

### 4. Aurora às escuras

- **Entrada:** fase `lunar`, região `habitat`. **Ação:** examinar `mission-console` e reparar `battery-bank`, `water-recycler` e `oxygen-generator`. **Evidência:** conexões, demanda, geração e reservas; cada reparo atual requer 0,2 kWh e cinco segundos simulados.
- Lia: “Há circuitos desconectados. Primeiro, confirme as leituras.”  
  PIP: “Reparar um circuito permite fluxo; não enche a bateria.”
- Uma peça antiga ou uma marca no ambiente pode sugerir uma história, mas a causa da falha é hipótese até haver medição; marcas não são prova de acidente ou abandono. Se faltar energia, o reparo falha sem débito; replanejar ou restaurar checkpoint. Ordem dos reparos e conversas ampliadas são direção narrativa proposta.

### 5. Preparar sem pressa

- **Entrada:** habitat alcançado. **Ação:** selecionar ferramentas em `field-locker` e ler `mission-console`; preparar em `crop-bed` se a pessoa quiser antecipar o cultivo. **Evidência:** seleção registrada e leituras de reserva.
- Lia: “Ferramentas não substituem a volta planejada.”  
  PIP: “Confira energia, água e oxigênio antes de sair.”
- **Escolha causal 2:** iniciar cultivo cedo permite crescimento durante tempo alimentado, mas acrescenta demanda elétrica e consumo de água; adiar preserva esses gastos por enquanto e posterga colheita. Os resultados devem vir das leituras da simulação, não da fala. Plantar e ligar cultivo existem; uma apresentação explícita comparando escolhas é proposta. A saída atual exige módulos funcionais, ferramentas, tempo claro e reservas mínimas de 5 kWh, 2 kg de água e 0,2 kg de oxigênio; sem isso, aguardar e recuperar.

### 6. Caminho e vestígio

- **Entrada:** partida permitida em `expedition-gate`. **Ação:** percorrer o cânion e consultar `survey-beacon`. **Evidência:** posição e leitura disponível; comparar o marco com marcas ambientais propostas.
- PIP: “Essa marca pode indicar um caminho antigo.”  
  Cadete: “Pode ser. Vamos procurar mais evidência.”
- A possível história do lugar é uma pergunta, não uma conclusão medida. A rota e retorno existem; novo vestígio, diálogo e interpretação são propostos. Cometa, se futuramente ativa, só aponta para baliza já visível; aguarda ou é chamada por rota segura. Se a previsão de radiação mudar, voltar por `return-gate`.

### 7. Scout e a amostra

- **Entrada:** expedição ativa. **Ação:** em `damaged-scout`, reparar e depois convidar Scout; em `ice-deposit`, coletar amostra finita. **Evidência:** reparo usa uma peça, 0,3 kWh e cinco segundos; convite é separado. Coleta transfere 0,5 kg da reserva local à amostra.
- Scout: “Diagnóstico incompleto. Preciso de ajuda.”  
  PIP: “Verifique a peça e a energia antes de começar.”
- Faltando peça ou energia, o reparo não inicia; retornar e recuperar ou restaurar checkpoint. Scout é exigido pela condição atual de conclusão; Cometa não é. O aspecto visual de gelo branco sob lâmpadas é direção artística para depósito ficcional, não confirmação de gelo lunar real naquele local.

### 8. Aviso e retorno

- **Entrada:** previsão de radiação em alerta ou ativa. **Ação:** voltar por `return-gate`, entrar em `habitat-shelter` e esperar o ciclo ativo terminar. **Evidência:** estado da previsão, abrigo e registro de sobrevivência ao ciclo.
- Lia: “A previsão mudou. Cancele a saída e volte.”  
  PIP: “A proteção vem antes da próxima leitura.”
- Radiação é invisível: representar aviso por instrumentos, mensagens e comportamento, sem nuvens ou relâmpagos lunares. A saída com previsão não clara é bloqueada; para se abrigar durante uma expedição é preciso voltar primeiro. Exposição no ciclo ativo reduz saúde e pode exigir checkpoint; não afirmar dose real. A cena específica de cancelamento é proposta, usando esses estados existentes.

### 9. Entrega e primeira colheita

- **Entrada:** retorno seguro. **Ação:** entregar amostra em `mission-console` e, na estufa, cultivar e colher em `crop-bed`; `grow-lights` e `botanist` oferecem contexto. **Evidência:** processamento da amostra após dez segundos alimentados; colheita só após 180 ticks de crescimento alimentado com água e adiciona 3 kg de alimento.
- Elena: “A planta não responde a uma promessa; precisa de luz e água.”  
  Cadete: “Então vamos acompanhar o que ela recebeu.”
- Vegetação viva fica confinada à estufa; a cena de colheita e Elena como personagem identificada são propostas. Se falta energia ou água, crescimento pausa; restaurar condições e esperar. Colheita precoce falha sem conceder alimento.

### 10. Uma luz de cada vez

- **Entrada:** sistemas e reservas sustentáveis, amostra processada, Scout recrutado, abrigo atravessado e colheita feita. **Ação:** conferir `mission-console` e o relatório. **Evidência:** fase `complete` apenas quando os critérios reais de simulação estiverem satisfeitos, incluindo energia disponível, água potável acima de 1 kg e oxigênio acima de 0,2 kg.
- Reyes: “Aurora está respondendo porque vocês cuidaram dos detalhes.”  
  PIP: “Ainda há leituras para acompanhar.”  
  Cadete: “Uma luz de cada vez.”
- O encontro final e falas são propostos; se um critério faltar, o relatório deve mostrar o estado real e a pessoa pode resolver o que falta. A conclusão não depende de Cometa ou da escolha de diálogo.

## Ritmo, quadros e limites

A rota crítica curta agrupa os marcos em academia → carga e transferência → restaurar sistemas e preparar → Scout e amostra → abrigo e retorno → processar e colher → relatório; ela não exige todas as conversas ou o vestígio; um respiro opcional com Cometa, Reyes ou Elena pode enriquecer vínculo e contexto sem conceder recursos. A ordem entre preparação, cultivo e a espera depende dos estados; abrigo pode ocorrer quando o ciclo de previsão exigir, inclusive antes da expedição. Como meta editorial, manter falas em 2–3 linhas por batida e priorizar exploração sobre leitura. Tempos e proporções de jogo são metas a medir em playtest humano, não resultados observados. Checkpoints e falhas devem preservar a verdade de recursos; diálogos alternativos só mudam tom, e consequências físicas vêm da simulação.

Quadros propostos para acompanhamento: [academia](../art/05-academy-storyboard.png), [trânsito](../art/06-transit-storyboard.png), [descoberta no cânion](../art/07-canyon-discovery-storyboard.png) e [alerta e retorno](../art/08-storm-homecoming-storyboard.png). São conceitos de narrativa e enquadramento, não capturas do jogo, prova de implementação ou de testes. As quatro imagens estão presentes e seus hashes/dimensões constam no manifesto de arte. Isso valida arquivos de referência; não a execução das cenas.
