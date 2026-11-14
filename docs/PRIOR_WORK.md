# Proveniência do protótipo anterior

O ASTRA 1.1 foi construído nesta conversa antes da abertura competitiva padrão de 14/11/2026. Um novo nome de repo, nova licença ou nova branch não o transforma em trabalho novo. A própria especificação aqui é planejamento prévio e precisa ser identificada como tal.

## Snapshot auditado

- Aplicação legada: https://astra-lunar-frontier-academy.andrevictorandrade.chatgpt.site
- Commit de referência: `aae650ff37c5f0a22c14c4dcfeaee55fb32b03bd`.
- Versão: expansão 1.1, em checkout separado de Sites.
- Stack observada: Babylon.js 9.35, JavaScript estático, oito GLBs próprios, seis zonas compactas, 17 cenas, simulação pura, NPCs e progressão de RPG.
- A simulação já mantém resto subsegundo e integra passos internos inteiros; não é correto descrevê-la como sem passo fixo. O agendamento é acionado pelo loop de renderização e merece contrato explícito de pausa/background/replay.
- Evidência disponível: testes de simulação, narrativa/RPG, locomoção, importação Babylon NullEngine, Khronos glTF e integração CPU/DOM. Isso não é um teste Chrome/GPU. A ausência de revisão visual e FPS em hardware real foi declarada.
- Limites observados: zonas isoladas numa cena; orquestrador grande; retratos-base e movimento procedural; não há streaming completo, sistema de equipe de três robôs ou controle orbital 6DoF.

## Tratamento no novo repositório

Nenhum arquivo executável, modelo, atlas, identidade de hospedagem ou credencial do legado é distribuído aqui. O inventário abaixo é referência, não importação. Antes de reutilizar algo, decidir a trilha de elegibilidade e registrar origem, licença, data e transformação.

| Material anterior | Situação de referência | Pendência para eventual uso |
|---|---|---|
| Simulador e testes | Núcleo conceitualmente útil; autoria assistida por IA | Reaproveitamento competitivo precisa de esclarecimento; execução e licença devem ser auditadas |
| Oito GLBs e script de autoria | Gerados para o projeto com código assistido e Blender | Verificar direitos, código-fonte de autoria, animações e distribuição; não alegar criação durante o evento |
| Dois atlas de visual novel | Imagens geradas por IA | Não foram preparados como mídia competitiva com marca d'água visível; precisam de tratamento conforme orientação 2026 |
| Blue Marble e terreno LOLA | Fontes NASA com metadados e transformações no legado | Confirmar direito de uso e, separadamente, se um recurso está na lista oficial do desafio |
| Página pública de Sites | Artefato independente previamente publicado | Não trocar por “demo do novo repo” nem usá-la como prova de elegibilidade |

## Trilhas possíveis

**Produto independente:** a equipe pode propor evolução do legado com proveniência e testes, sem dizer que se qualifica a prêmio. A escolha explícita dessa trilha retira a alegação competitiva; não altera os fatos de autoria.

**Entrada competitiva:** confirmar janela e regra local, obter esclarecimento para o que é prévio e definir o delta admissível. Não inferir permissão só porque o código é aberto. Não apagar histórico, regravar datas ou esconder assistência de IA. Se não houver clareza, a prontidão competitiva fica bloqueada, mesmo que o produto rode.
