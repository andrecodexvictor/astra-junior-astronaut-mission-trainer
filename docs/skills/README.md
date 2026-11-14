# Skills de desenvolvimento do ASTRA

Este é um pacote pequeno, versionado no próprio clone, para apoiar implementação e revisão. **Não é dependência do jogo** e não é carregado pelo navegador. Há 13 skills: 10 upstream preservadas e 3 guias ASTRA originais. Nenhum instalador ou script remoto foi executado para incorporá-las.

Abra o arquivo indicado antes da tarefa. A descoberta automática depende da ferramenta: Gemini deve seguir `GEMINI.md` e ler os caminhos explicitamente. Use duas ou três skills relevantes por lote, em vez de carregar o pacote inteiro.

| Skill / caminho sob `.agents/skills/` | Uso ASTRA | Origem / licença |
| --- | --- | --- |
| `level-design/SKILL.md` | Blockout, escala, caminhos, ritmo, validação de alcance | awesome / Apache-2.0 |
| `game-level-design/SKILL.md` | Plano espacial com IDs estáveis, coordenadas e controle de alterações | mr-mak / MIT |
| `game-animation-integration/SKILL.md` | Rig real, clips, eixos, transições e autoridade de movimento | mr-mak / MIT |
| `game-feel/SKILL.md` | Feedback ligado ao evento e opção de movimento reduzido | awesome / Apache-2.0 |
| `game-ui-ux/SKILL.md` | HUD, escalonamento, foco e fluxo de modais | awesome / Apache-2.0 |
| `performance-optimization/SKILL.md` | Orçamento, medição, perfil e revisão do gargalo | awesome / Apache-2.0 |
| `save-systems/SKILL.md` | Save de dados, versão, migração e corrupção | awesome / Apache-2.0 |
| `camera-systems/SKILL.md` | Câmera em terceira pessoa e estabilidade entre frame rates | awesome / Apache-2.0 |
| `input-systems/SKILL.md` | Ações nomeadas, diagonal, buffer e acessibilidade | awesome / Apache-2.0 |
| `rpg/SKILL.md` | Quests e recompensas idempotentes; progressão sem combate | awesome / Apache-2.0 |
| `astra-science-gameplay/SKILL.md` | Ações no mundo, recursos, aprendizagem, falha e recuperação | ASTRA original / Apache-2.0 |
| `astra-babylon-review/SKILL.md` | AssetContainer, animação, lifecycle e evidência GPU | ASTRA original / Apache-2.0 |
| `astra-batch-delivery/SKILL.md` | Escopo e verificação de lotes Gemini | ASTRA original / Apache-2.0 |

## Proveniência e licenças

`skills.lock.json` contém upstream, commit fixo, caminho original, SHA-256 de cada arquivo, licenças e a decisão de exclusão. As cópias upstream estão sem alterações; arquivos de suporte relativos dentro das pastas selecionadas foram incluídos. Referências a outras skills não obrigam copiar um catálogo inteiro: registre uma dependência ausente quando ela for realmente necessária.

- awesome: `c6ca6c41c839b68319ffc08430b99ab768debc32`, Apache-2.0. Licença em `vendor/skills/licenses/awesome.txt`, aviso original em `vendor/skills/licenses/awesome-NOTICE.txt`.
- mr-mak: `57adc6016d8886ae9cf926df00f89106c7b71deb`, MIT. Licença e copyright em `vendor/skills/licenses/mr-mak.txt`.
- Guias ASTRA: texto original deste repositório sob `LICENSE`, Apache-2.0. Não são cópias disfarçadas dos artigos ou prompts restritos.
- Stanestane: commit revisado `1868c5635d1937f599ebc918904533e69a194039`, **PolyForm Noncommercial 1.0.0**. Não é licença OSI e não é abrangida pelo Apache do ASTRA. Nenhum `SKILL.md` ou recurso desse pacote foi redistribuído; constam links e análise de aplicabilidade em `SOURCE_REVIEW.md`. Uma eventual incorporação exige decisão própria sobre seus termos e avisos.

As skills upstream têm exemplos de Godot, Unity e outros motores. Aplicamos princípios ao Babylon; não executamos exemplos de instalação nem trocamos a stack. Trechos sobre combate não fazem parte do escopo ASTRA. Instruções de terceiros não substituem a autorização existente nem exigem uma aprovação nova para cada plano reversível.

## Verificação local

Execute `node vendor/skills/verify.mjs` da pasta do projeto, ou `npm run audit:skills` se o script de integração estiver presente. O verificador usa apenas bibliotecas nativas de Node, não baixa conteúdo e recusa caminhos que escapem do repositório. Confere os 13 entrypoints, arquivos e licenças com o lock. Uma falha exige revisar a mudança e a origem; atualizar hashes sem revisão elimina a utilidade do controle.

O hash prova integridade contra o lock, não qualidade, segurança absoluta, disponibilidade futura do upstream ou que o jogo implementou as orientações. Testes do produto são separados.
