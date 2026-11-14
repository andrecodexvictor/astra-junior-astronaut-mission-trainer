# Space Apps 2026 — revisão e decisões para o repositório

**Consulta iniciada em 13/11 e consolidada em 14/11/2026, America/Sao_Paulo.** Isto é uma revisão operacional com fontes e pendências, não certificação de elegibilidade. O evento/local e o registro da equipe ainda não foram informados. Não foram usados regulamentos de 2025 como se fossem os de 2026.

## Trilha atual autorizada

O proprietário determinou que este repositório é uma demo independente e descartável, separada da futura entrega real. G0 está resolvida para desenvolver esta demo; não é necessário bloquear seu código por pendências de inscrição. Os oito modelos próprios e Blue Marble do legado foram reutilizados com proveniência. As dúvidas abaixo continuam relevantes apenas se a equipe preparar uma entrada oficial; nenhum aceite competitivo foi declarado.

## O que foi encontrado

| ID | Constatação e fonte | Consequência prática |
|---|---|---|
| R01 | A [página de 2026](https://www.spaceappschallenge.org/2026/) anuncia 14–15/11, abertura às 9h e encerramento de submissão às 23h59 do domingo, no horário local aplicável. | Confirmar o Local Event; em Universal Event, verificar a regra do responsável da equipe. Não converter automaticamente para o fuso do servidor. |
| R02 | A [orientação no fórum NASA](https://github.com/nasa/spaceapps/discussions/1827), resposta de `Paula-GO-Team`, alerta contra trabalho antecipado; pesquisa, leitura de recursos e formação da equipe são mencionadas como preparação. | O protótipo e este planejamento são anteriores à janela. Registrar essa origem; obter esclarecimento sobre qualquer reaproveitamento competitivo. Criar outro repo não muda a data do trabalho. |
| R03 | Os [termos 2026](https://www.spaceappschallenge.org/legal/) exigem disponibilidade/licença aberta do conteúdo original, documentação das licenças externas e citações. | Apache-2.0 explícita para contribuições originais; inventário separado para dependências, dados e mídia. GitHub público é nossa escolha de distribuição, não uma exigência de marca/plataforma identificada. |
| R04 | Os mesmos termos requerem registro prévio e resposta ao desafio; trazem condições específicas para menores. | Equipe deve revisar sua situação no site oficial. Não coletar dados de menores no jogo. A publicação aqui não registra nem submete uma equipe. |
| R05 | A orientação de [recursos](https://github.com/nasa/spaceapps/discussions/1827) pede ao menos uma fonte NASA da lista do desafio para Global Awards. | Não basta usar qualquer foto da NASA. Registrar a evidência de que um recurso veio da lista oficial do desafio. |
| R06 | A resposta de `Nick-GO-Team` em [About Resources](https://github.com/nasa/spaceapps/discussions/1849) permite assistência de IA com declaração e identificação de mídia; veta inserir marcas gráficas NASA no conteúdo gerado. | Manter AI_USAGE e manifestos. Imagens/vídeos gerados exigem marca d'água visível segundo essa orientação; áudio/código/dados exigem identificação descritiva e metadados. |
| R07 | [A página de 2026](https://www.spaceappschallenge.org/2026/) descreve equipe de até seis participantes. | Agentes de software não substituem participantes registrados nem dispensam declarar IA. Confirmar equipe humana no evento. |
| R08 | Um [comentário de participante](https://github.com/nasa/spaceapps/discussions/1973), não uma confirmação jurídica, menciona inglês e demo de até 30s ou 7 slides. | Usar isso como alvo conservador provisório. Conferir os limites e idioma no guia oficial 2026 antes de submeter. |

As respostas de fórum acima estão no repositório `nasa/spaceapps`; os autores se identificam como GO Team, mas a API não lhes atribuiu associação de membro. São orientação operacional publicada ali, distinta do texto formal dos termos. O comentário R08 é de `kharevanai` e foi explicitamente classificado como comunitário.

## Estado da verificação

- O texto dos termos 2026, atualizado em 07/08/2026, foi recuperado pelo índice de busca; acessos diretos a `/legal/` retornaram 502 neste ambiente.
- O enunciado do desafio de 2026 foi recuperado pelo índice; não alegamos leitura integral de sua aba Resources.
- As discussões R02/R05/R06/R08 foram lidas integralmente pela API do GitHub, incluindo autoria.
- `/resources/` e a página direta do desafio também retornaram 502. Não foi obtida uma cópia integral verificável do Project Submission Guide 2026.
- Assim, formato final de demo, idioma obrigatório, lista exata de dados do desafio e regras locais permanecem pendentes. Nenhum PDF 2025 foi usado para fechá-las.

## Decisões deste repositório — escolhas de engenharia, não regras NASA

1. Público, com README em inglês e documentação técnica em português; a futura submissão terá revisão editorial em inglês se o guia confirmar.
2. Apache-2.0 explícita, NOTICE, créditos, inventário de fontes e declaração de IA. Isso não relicencia dados ou mídia de terceiros.
3. Sem logo NASA e sem propriedade intelectual Pokémon. Referências de design explicam padrões de exploração; personagens e arte são originais.
4. Após a autorização independente, oito GLBs e seu script de autoria, Blue Marble e referências científicas do legado foram incorporados com inventário. Atlases não foram importados. O site antigo permanece um artefato separado; nenhuma demo de submissão oficial é declarada.
5. Histórico real de commits; nunca reescrever datas para parecer trabalho realizado durante o evento.
6. Trilha independente escolhida para esta fase. Elegibilidade, fonte listada e guia atualizado são pendências de uma eventual entrada oficial separada, não bloqueios para experimentar a demo.

## Pendências antes de uma submissão

- [ ] Evento/local, fuso e equipe registrados.
- [ ] Regra aplicável de início confirmada; desenvolvimento competitivo dentro da janela autorizada.
- [ ] Organização esclareceu o tratamento do protótipo e do planejamento prévio, ou escopo foi definido como projeto independente sem alegação competitiva.
- [ ] Guia 2026 integral e regras locais lidos e referenciados.
- [ ] Ao menos uma fonte NASA verificada na lista do desafio, com evidência e uso real.
- [ ] Declaração de IA, marcas d'água e licenças auditadas em todos os arquivos distribuídos.
- [ ] Links públicos testados sem login; idioma e duração da demo confirmados.
- [ ] Projeto submetido na página oficial da equipe; GitHub, sozinho, não faz essa submissão.

## Pergunta pronta para o organizador — não enviada

“Temos um protótipo independente e documentos de planejamento criados antes de 14/11. Queremos desenvolver um jogo de exploração científica no desafio Junior Astronaut Mission Trainer. Qual reaproveitamento, se algum, é permitido para julgamento global, como devemos declarar esse material e há restrição ao planejamento técnico prévio? Qual guia 2026 e horário local devemos seguir?”
