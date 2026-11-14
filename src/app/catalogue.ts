import type {
  AuxBayPortType,
  FieldKitPieceId,
  RegionId,
} from '../contracts';
import type {
  Action,
  BeatId,
  DiscoveryId,
} from '../simulation';

export type SpeakerPortraitId = 'reyes' | 'lia' | 'elena' | 'cadet' | 'pip' | 'scout' | 'cometa';

export interface SpeakerPortrait {
  id: SpeakerPortraitId;
  name: string;
  role: string;
  visualSummary: string;
  badge: string;
}

export const speakerPortraits: Record<SpeakerPortraitId, SpeakerPortrait> = {
  reyes: {
    id: 'reyes',
    name: 'Reyes',
    role: 'Comandante e mentor de missão',
    visualSummary: 'Pele escura, barba grisalha e jaqueta de comando.',
    badge: 'CMD',
  },
  lia: {
    id: 'lia',
    name: 'Lia',
    role: 'Engenheira de sistemas',
    visualSummary: 'Cabelo curto, óculos de proteção e colete técnico laranja.',
    badge: 'ENG',
  },
  elena: {
    id: 'elena',
    name: 'Elena',
    role: 'Especialista de cultivo',
    visualSummary: 'Pele escura, cachos curtos, faixa verde e jaleco de estufa.',
    badge: 'BOT',
  },
  cadet: {
    id: 'cadet',
    name: 'Cadete',
    role: 'Astronauta em formação (personalizável)',
    visualSummary: 'Traje branco com detalhe configurável, visor selado e sem gênero fixo.',
    badge: 'AST',
  },
  pip: {
    id: 'pip',
    name: 'PIP',
    role: 'Assistente de diagnóstico',
    visualSummary: 'Drone esférico com visor ciano e faixa laranja.',
    badge: 'PIP',
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    role: 'Robô explorador S-02',
    visualSummary: 'Chassi de 4 rodas com antenas traseiras e braço de varredura.',
    badge: 'S-02',
  },
  cometa: {
    id: 'cometa',
    name: 'Cometa',
    role: 'Buddy dachshund astronauta (opcional)',
    visualSummary: 'Dachshund marrom e caramelo em traje pressurizado branco/laranja com capacete transparente.',
    badge: 'DOG',
  },
};

export const regionNames: Record<RegionId, string> = {
  academy: 'Academia Terra',
  orbit: 'Treinador orbital',
  habitat: 'Base Aurora',
  canyon: 'Cânion de gelo',
  greenhouse: 'Jardim de Elena',
};

export const targetNames: Record<string, string> = {
  'academy-console': 'Simulador de energia',
  'academy-launch': 'Embarque orbital',
  cargo: 'Carga à deriva',
  'lunar-transfer': 'Descida lunar',
  'battery-bank': 'Rede elétrica',
  'water-recycler': 'Reciclador de água',
  'oxygen-generator': 'Gerador de oxigênio',
  'habitat-shelter': 'Abrigo de regolito',
  'expedition-gate': 'Trilha do cânion',
  'mission-console': 'Central da missão',
  'field-locker': 'Armário de campo',
  'greenhouse-door': 'Eclusa da estufa',
  'ice-deposit': 'Depósito de gelo',
  'damaged-scout': 'Scout avariado',
  'survey-beacon': 'Marco de pesquisa',
  'return-gate': 'Voltar à base',
  'crop-bed': 'Canteiro hidropônico',
  'grow-lights': 'Luzes de cultivo',
  'return-habitat': 'Voltar à base',
  botanist: 'Elena • Botânica',
};

export const objectiveNames: Record<string, [string, string]> = {
  diagnose: ['Uma luz se apaga', 'Vá ao simulador à esquerda. Compare energia armazenada com demanda.'],
  balance: ['O que pode esperar?', 'Reduza a carga secundária e observe 15 segundos de recuperação.'],
  depart: ['Pronto para partir', 'Atravesse a sala até o embarque orbital.'],
  cargo: ['Nada fica para trás', 'Aproxime-se da carga à esquerda e fixe-a dentro de 45 kg.'],
  land: ['Além da atmosfera', 'A eclusa ao fundo leva à descida lunar.'],
  power: ['Restaure a luz', 'Inspecione e repare a rede elétrica à esquerda da base.'],
  water: ['Feche o ciclo', 'O reciclador precisa de energia e de água residual.'],
  oxygen: ['Um sopro de vida', 'Repare o gerador. Produzir oxigênio usa água e eletricidade.'],
  crop: ['Sementes do amanhã', 'Entre na estufa à direita e decida quando iniciar o cultivo.'],
  loadout: ['Prepare a expedição', 'Escolha as ferramentas no armário laranja respeitando 18 kg.'],
  expedition: ['Uma trilha desconhecida', 'Saia pelo caminho central ao norte. Suporte à vida deve estar ativo.'],
  scout: ['Um novo companheiro', 'Encontre Scout no cânion. Repare, observe e convide-o.'],
  sample: ['Água do futuro', 'Colete gelo, volte e entregue a amostra à central da missão.'],
  storm: ['Um teto para todos', 'Durante o alerta, retorne ao abrigo e permaneça até o fim da tempestade.'],
  harvest: ['A primeira colheita', 'Depois de 180 segundos de cultivo com energia e água, colha na estufa.'],
};

export interface Choice {
  label: string;
  action: Action;
  note?: string;
  payload?: Record<string, unknown>;
}

export interface Station {
  speaker: string;
  portraitId?: SpeakerPortraitId;
  title: string;
  line: string;
  evidence: string;
  choices: Choice[];
  topic?: 'energy' | 'water' | 'orbit' | 'crops' | 'radiation' | 'scout';
  beatId?: BeatId;
}

export const stations: Record<string, Station> = {
  'academy-console': {
    speaker: 'Lia • Engenheira',
    portraitId: 'lia',
    title: 'Apagão na Academia',
    line: 'A bateria está caindo, mas o cabo parece intacto. Vamos testar uma explicação: a demanda pode estar maior que a geração. Que carga pode esperar?',
    evidence: 'Neste ensaio, geração = 20 kW. Demanda inicial = 38 kW; sem carga secundária = 12 kW. kW mede potência; kWh mede energia acumulada. Valores didáticos.',
    choices: [
      { label: 'Registrar hipótese: demanda excessiva', action: 'diagnoseAcademy' },
      {
        label: 'Suspender carga secundária (12 kW)',
        action: 'chooseAcademyLoad',
        payload: { choice: 'shed' },
        note: 'Feche o painel e observe 15 s de recuperação.',
      },
      {
        label: 'Manter carga secundária ativa (38 kW)',
        action: 'chooseAcademyLoad',
        payload: { choice: 'keep_secondary' },
        note: 'Teste causal: a bateria segue caindo (>20 kW).',
      },
    ],
    topic: 'energy',
    beatId: 'trial',
  },
  cargo: {
    speaker: 'Reyes • Comandante',
    portraitId: 'reyes',
    title: 'Carga em Órbita — ensaio reduzido',
    line: 'Levamos só o que foi preparado dentro do orçamento de massa. Cada peça conta antes da transferência lunar.',
    evidence: 'Esta cabine usa locomoção assistida no plano (orbitAssisted = true): NÃO simula 6DoF nem física orbital completa. Capacidade de carga: 45 kg.',
    choices: [
      {
        label: 'Fixar conjunto padrão (40/45 kg)',
        action: 'collectCargo',
        note: 'Células solares, filtro, peças e sementes.',
      },
    ],
    topic: 'orbit',
    beatId: 'transit',
  },
  'battery-bank': {
    speaker: 'Lia • Engenheira',
    portraitId: 'lia',
    title: 'Restaurar a Energia',
    line: 'Há circuitos desconectados. Primeiro, confirme as leituras. Reparar um circuito permite fluxo; não enche a bateria.',
    evidence: 'Painéis: 5 kW em condição clara; 45% disso na tempestade. Bateria: 12 kWh. Carga essencial: 1,2 kW. Eficiências de carga e descarga: 90% (perdas registradas em energyLossKwh).',
    choices: [
      { label: 'Registrar hipótese: desequilíbrio elétrico', action: 'scanSolar' },
      { label: 'Reparar o conector', action: 'repairPower', note: '0,2 kWh • 5 segundos de trabalho' },
      {
        label: 'Observar atenuação solar na rede',
        action: 'inspectEvidence',
        payload: { id: 'solar_dust_attenuation' },
      },
    ],
    topic: 'energy',
    beatId: 'aurora',
  },
  'water-recycler': {
    speaker: 'Lia • Engenheira',
    portraitId: 'lia',
    title: 'O Ciclo da Água',
    line: 'Reciclar ajuda, mas não cria água. Parte se perde no processo e o oxigênio também depende deste tanque.',
    evidence: 'Reciclador: 0,7 kW; processa 0,12 kg/h e recupera 80%. Consumo agregado da equipe: 0,18 kg/h. A eletrólise também consome água potável. Parâmetros didáticos.',
    choices: [
      { label: 'Registrar hipótese: balanço de água', action: 'scanWater' },
      { label: 'Reparar o reciclador', action: 'repairWater', note: '0,2 kWh • 5 segundos' },
      { label: 'Alternar reciclador ligado/desligado', action: 'toggleRecycler' },
    ],
    topic: 'water',
    beatId: 'aurora',
  },
  'oxygen-generator': {
    speaker: 'Lia • Engenheira',
    portraitId: 'lia',
    title: 'Um Sopro de Vida',
    line: 'O gerador está desconectado. Depois do reparo, compare o oxigênio produzido com a água usada. Uma reserva de ar não elimina a dependência elétrica.',
    evidence: 'Gerador: 1,1 kW. Eletrólise: 0,18 kg água/h → 0,16 kg O₂/h + 0,02 kg H₂/h (conservação 8:1). Consumo agregado da tripulação: 0,08 kg O₂/h.',
    choices: [
      { label: 'Reconectar o gerador', action: 'repairOxygen', note: '0,2 kWh • 5 segundos' },
      { label: 'Alternar produção de oxigênio', action: 'toggleOxygen' },
    ],
    topic: 'water',
    beatId: 'aurora',
  },
  'habitat-shelter': {
    speaker: 'Lia • Engenheira',
    portraitId: 'lia',
    title: 'Abrigo contra Tempestade',
    line: 'A previsão mudou. O trabalho externo pode esperar; a proteção da tripulação vem antes da próxima leitura.',
    evidence: 'Alerta no segundo lunar 180; tempestade ativa nos segundos 300–379. Radiação é invisível (sem nuvens ou raios lunares). Abrigo pressurizado permite que Cometa fareje com segurança.',
    choices: [
      { label: 'Abrigar a tripulação', action: 'shelter' },
      { label: 'Sair do abrigo', action: 'exitShelter' },
    ],
    topic: 'radiation',
    beatId: 'warning',
  },
  'field-locker': {
    speaker: 'Lia • Engenheira',
    portraitId: 'lia',
    title: 'Preparar sem Pressa',
    line: 'Ferramentas não substituem a volta planejada. Confira energia, água e oxigênio antes de sair.',
    evidence: 'Saída exige módulos ativos, ferramentas dentro do limite de 18 kg, céu limpo e reservas mínimas: 5 kWh, 2 kg de água e 0,2 kg de O₂.',
    choices: [
      {
        label: 'Separar kit padrão de campo (15/18 kg)',
        action: 'chooseLoadout',
        note: 'Multímetro, amostrador de gelo e kit de reparo.',
      },
    ],
    topic: 'scout',
    beatId: 'prepare',
  },
  'mission-console': {
    speaker: 'Reyes • Comandante',
    portraitId: 'reyes',
    title: 'Central da Missão Aurora',
    line: 'Aurora responde quando cuidamos dos detalhes. Compare as leituras reais no relatório antes de encerrar o episódio.',
    evidence: 'Gelo coletado só vira água potável após entrega e 10 s de processamento com energia (0,5 kW). A conclusão exige todas as metas reais da simulação.',
    choices: [
      { label: 'Entregar amostra ao processador', action: 'deliverSample', note: '10 segundos com energia' },
      { label: 'Pedir varredura de telemetria ao Scout', action: 'dispatchScoutScan', payload: { target: 'solar' } },
      { label: 'Recarregar Scout pela base (0,5 kWh)', action: 'rechargeScout' },
    ],
    topic: 'water',
    beatId: 'home',
  },
  'ice-deposit': {
    speaker: 'PIP • Companheiro',
    portraitId: 'pip',
    title: 'Reserva Congelada (Ficção)',
    line: 'Esta exposição de gelo faz parte de um cenário de treinamento fictício. Leve uma pequena amostra e registre sua observação científica.',
    evidence: 'Reserva finita: 8 kg. Cada coleta transfere 0,5 kg sem duplicar massa. Não representa depósito lunar georreferenciado ou dado LRO/LOLA.',
    choices: [
      { label: 'Coletar 0,5 kg de gelo', action: 'collectSample' },
      { label: 'Observar estratos de gelo', action: 'inspectEvidence', payload: { id: 'canyon_ice_strata' } },
      { label: 'Acionar sonda no gelo (0,05 kWh)', action: 'runFieldProbe', payload: { id: 'canyon_ice_strata' } },
    ],
    topic: 'water',
    beatId: 'scout',
  },
  'damaged-scout': {
    speaker: 'Scout • Robô explorador',
    portraitId: 'scout',
    title: 'Scout e a Amostra',
    line: 'Diagnóstico incompleto. Preciso de ajuda. Verifique a peça e a energia antes de começar.',
    evidence: 'Reparo: 1 peça + 0,3 kWh + 5 s. Após recrutado, Scout realiza varreduras por 0,4 kWh da própria bateria e entra em resgate se cair para <= 0,1 kWh.',
    choices: [
      { label: 'Reparar Scout', action: 'repairCompanion', note: '1 peça • 0,3 kWh • 5 s fora do painel' },
      { label: 'Convidar Scout para a equipe', action: 'recruitCompanion' },
      { label: 'Solicitar varredura do Scout (0,4 kWh)', action: 'dispatchScoutScan', payload: { target: 'ice' } },
      { label: 'Recarregar Scout (0,5 kWh do traje/base)', action: 'rechargeScout' },
    ],
    topic: 'scout',
    beatId: 'scout',
  },
  'survey-beacon': {
    speaker: 'PIP • Companheiro',
    portraitId: 'pip',
    title: 'Caminho e Vestígio',
    line: 'Essa marca no módulo COM-03 pode indicar um caminho antigo — ou apenas equipamento desconectado. Vamos procurar mais evidência antes de concluir.',
    evidence: 'A história do lugar é hipótese até ser testada por medição. A Terra usa imagem NASA Blue Marble; terreno e cânion são ficção autoral sem DEM lunar.',
    choices: [
      { label: 'Inspecionar cabo solto em COM-03', action: 'inspectEvidence', payload: { id: 'com03_unplugged_cable' } },
      { label: 'Testar continuidade com sonda (0,05 kWh)', action: 'runFieldProbe', payload: { id: 'com03_unplugged_cable' } },
    ],
    topic: 'water',
    beatId: 'trace',
  },
  'crop-bed': {
    speaker: 'Elena • Botânica',
    portraitId: 'elena',
    title: 'Sementes do Amanhã',
    line: 'A planta não responde a uma promessa; precisa de luz e água. Acompanhe o que ela recebeu antes de tentar colher.',
    evidence: 'Luzes: 0,8 kW. Irrigação: 0,012 kg/h retidos no cultivo. Crescimento: 180 s com energia e água; colheita: +3 kg abstratos. Estratégias cedo/adiada são viáveis.',
    choices: [
      {
        label: 'Planejar plantio antecipado (consome agora)',
        action: 'chooseCropStrategy',
        payload: { strategy: 'early_plant' },
      },
      {
        label: 'Planejar plantio adiado (poupa p/ tempestade)',
        action: 'chooseCropStrategy',
        payload: { strategy: 'deferred_plant' },
      },
      { label: 'Iniciar cultivo agora', action: 'plantCrop' },
      { label: 'Colher alimento maduro', action: 'harvest' },
    ],
    topic: 'crops',
    beatId: 'harvest',
  },
  'grow-lights': {
    speaker: 'Elena • Botânica',
    portraitId: 'elena',
    title: 'O que a Escuridão Custa',
    line: 'Suspender luzes reduz demanda elétrica na hora, mas também pausa o crescimento. Observe a bateria antes de religar.',
    evidence: 'O crescimento só avança com luz ligada, energia suficiente e água potável disponível. Acelerar o relógio (3×) acelera também consumos e riscos.',
    choices: [{ label: 'Alternar luzes de cultivo', action: 'toggleCrop' }],
    topic: 'crops',
    beatId: 'harvest',
  },
  botanist: {
    speaker: 'Elena • Botânica',
    portraitId: 'elena',
    title: 'Um Jardim Longe de Casa',
    line: 'Minha primeira muda não sobreviveu. Aprendi a olhar para o sistema inteiro, não só para a folha. Vegetação viva pertence a este ambiente pressurizado.',
    evidence: 'A pesquisa Veggie da NASA estuda plantas em microgravidade. Esta estufa lunar e sua produtividade de 3 kg são ficção didática.',
    choices: [],
    topic: 'crops',
    beatId: 'harvest',
  },
};

export const topicFacts: Record<string, string> = {
  energy: 'Energia (kWh) é uma reserva; potência (kW) é uma taxa. Sem geração, autonomia aproximada = energia disponível ÷ demanda, descontando perdas de 90%.',
  water: 'Água, oxigênio e eletricidade estão ligados. Compare o tanque antes e depois de ligar o gerador: a eletrólise melhora o ar e consome água potável.',
  orbit: 'Flutuação orbital vem de queda livre compartilhada, não de ausência de gravidade. O treinador atual usa movimento assistido no plano (sem 6DoF).',
  crops: 'Plantar cedo ou adiar altera demanda elétrica (0,8 kW) e consumo de água (0,012 kg/h). Ambas as estratégias podem vencer com planejamento.',
  radiation: 'A tempestade é um risco qualitativo reproduzível (sem cálculo de dose clínica). Durante alerta ou tempestade ativa, priorize o abrigo.',
  scout: 'Scout tem papel distinto de varredura (0,4 kWh/scan) e exige resgate de 0,5 kWh se ficar sem carga. Cometa é opcional e nunca cria recursos.',
};

export interface BeatLine {
  speaker: string;
  portraitId: SpeakerPortraitId;
  line: string;
}

export interface BeatToneChoice {
  id: string;
  label: string;
  response: string;
}

export interface BeatCausalChoice {
  id: 'academy_load' | 'crop_timing';
  prompt: string;
  options: Array<{
    id: string;
    label: string;
    action: Action;
    payload: Record<string, unknown>;
    summary: string;
  }>;
}

export interface EpisodeBeatSpec {
  id: BeatId;
  order: number;
  title: string;
  historyLabel: string;
  region: RegionId;
  targetWorldId: string;
  optional: boolean;
  skippable: boolean;
  stormPriority: boolean;
  lines: BeatLine[];
  evidenceNote: string;
  causalChoice?: BeatCausalChoice;
  toneChoices: BeatToneChoice[];
}

export const episode01Beats: Record<BeatId, EpisodeBeatSpec> = {
  arrival: {
    id: 'arrival',
    order: 1,
    title: 'Chegada e vínculo — academia',
    historyLabel: '01 • Chegada à Academia ASTRA',
    region: 'academy',
    targetWorldId: 'academy-console',
    optional: true,
    skippable: true,
    stormPriority: false,
    lines: [
      {
        speaker: 'Reyes',
        portraitId: 'reyes',
        line: 'Aurora precisa de gente que saiba observar.',
      },
      {
        speaker: 'PIP',
        portraitId: 'pip',
        line: 'Vamos começar por uma leitura?',
      },
      {
        speaker: 'Reyes',
        portraitId: 'reyes',
        line: 'Cometa pode acompanhar, se você quiser.',
      },
    ],
    evidenceNote: 'Aproximação do console e vínculo opcional com Cometa; não altera recursos nem registra conclusão.',
    toneChoices: [
      { id: 'curious', label: 'Vamos ler os medidores primeiro.', response: 'PIP confirma que os instrumentos estão prontos.' },
      { id: 'warm', label: 'Cometa pode vir junto se estiver seguro.', response: 'Cometa abana a cauda dentro do traje.' },
    ],
  },
  trial: {
    id: 'trial',
    order: 2,
    title: 'Luzes de treino',
    historyLabel: '02 • Ensaio Academy Blackout',
    region: 'academy',
    targetWorldId: 'academy-console',
    optional: false,
    skippable: false,
    stormPriority: false,
    lines: [
      {
        speaker: 'Lia',
        portraitId: 'lia',
        line: 'A reserva está caindo. O que você consegue medir?',
      },
      {
        speaker: 'PIP',
        portraitId: 'pip',
        line: 'Reduza uma carga e acompanhe a tendência.',
      },
    ],
    evidenceNote: 'Potência (kW) e energia acumulada (kWh) são grandezas distintas; estabilidade exige 15 s com demanda < 20 kW.',
    causalChoice: {
      id: 'academy_load',
      prompt: 'Como equilibrar a rede da academia (geração 20 kW)?',
      options: [
        {
          id: 'shed',
          label: 'Reduzir carga secundária (38 → 12 kW)',
          action: 'chooseAcademyLoad',
          payload: { choice: 'shed' },
          summary: 'A bateria recupera +0,08 kWh/s e atinge 15 s estáveis.',
        },
        {
          id: 'keep_secondary',
          label: 'Manter carga secundária ligada (38 kW)',
          action: 'chooseAcademyLoad',
          payload: { choice: 'keep_secondary' },
          summary: 'Demanda supera geração (>20 kW); bateria cai -0,18 kWh/s e não estabiliza.',
        },
      ],
    },
    toneChoices: [
      { id: 'analytical', label: 'Vou comparar kW e kWh antes de desligar.', response: 'Lia aprova o registro da hipótese.' },
      { id: 'direct', label: 'Qual carga secundária posso cortar agora?', response: 'PIP aponta o circuito não essencial.' },
    ],
  },
  transit: {
    id: 'transit',
    order: 3,
    title: 'Briefing e carga',
    historyLabel: '03 • Treinador Orbital (assistido)',
    region: 'orbit',
    targetWorldId: 'cargo',
    optional: false,
    skippable: true,
    stormPriority: false,
    lines: [
      {
        speaker: 'Reyes',
        portraitId: 'reyes',
        line: 'Levamos só o que foi preparado. Cada peça conta.',
      },
      {
        speaker: 'PIP',
        portraitId: 'pip',
        line: 'Carga segura. Podemos seguir para a transferência.',
      },
    ],
    evidenceNote: 'Treinador assistido no plano com limite de 45 kg (não implementa física 6DoF).',
    toneChoices: [
      { id: 'careful', label: 'Conferindo massa dentro dos 45 kg.', response: 'Reyes confirma a amarração da carga.' },
      { id: 'eager', label: 'Pronto para a descida lunar.', response: 'PIP libera o checklist de transferência.' },
    ],
  },
  aurora: {
    id: 'aurora',
    order: 4,
    title: 'Aurora às escuras',
    historyLabel: '04 • Chegada à Base Aurora',
    region: 'habitat',
    targetWorldId: 'battery-bank',
    optional: false,
    skippable: true,
    stormPriority: false,
    lines: [
      {
        speaker: 'Lia',
        portraitId: 'lia',
        line: 'Há circuitos desconectados. Primeiro, confirme as leituras.',
      },
      {
        speaker: 'PIP',
        portraitId: 'pip',
        line: 'Reparar um circuito permite fluxo; não enche a bateria.',
      },
    ],
    evidenceNote: 'Cada reparo exige 0,2 kWh e 5 s simulados; energia, água e O₂ formam cadeia dependente.',
    toneChoices: [
      { id: 'methodical', label: 'Vou restaurar energia antes de ligar cargas.', response: 'Lia concorda com a sequência segura.' },
      { id: 'curious', label: 'O que causou os conectores soltos?', response: 'Lia lembra que marcas sem medição são apenas hipótese.' },
    ],
  },
  prepare: {
    id: 'prepare',
    order: 5,
    title: 'Preparar sem pressa',
    historyLabel: '05 • Preparo e Estratégia de Cultivo',
    region: 'habitat',
    targetWorldId: 'field-locker',
    optional: false,
    skippable: true,
    stormPriority: false,
    lines: [
      {
        speaker: 'Lia',
        portraitId: 'lia',
        line: 'Ferramentas não substituem a volta planejada.',
      },
      {
        speaker: 'PIP',
        portraitId: 'pip',
        line: 'Confira energia, água e oxigênio antes de sair.',
      },
    ],
    evidenceNote: 'Saída exige sistemas vivos, ferramentas (<= 18 kg), céu limpo e reservas mínimas (5 kWh, 2 kg água, 0,2 kg O₂).',
    causalChoice: {
      id: 'crop_timing',
      prompt: 'Quando ativar o cultivo de 0,8 kW e 0,012 kg/h de água?',
      options: [
        {
          id: 'early_plant',
          label: 'Plantar cedo (cresce durante a expedição)',
          action: 'chooseCropStrategy',
          payload: { strategy: 'early_plant' },
          summary: 'Antecipa a colheita, mas soma +0,8 kW e consumo de água antes da tempestade.',
        },
        {
          id: 'deferred_plant',
          label: 'Adiar plantio para após a tempestade',
          action: 'chooseCropStrategy',
          payload: { strategy: 'deferred_plant' },
          summary: 'Preserva bateria e água durante a crise, postergando os 180 s de cultivo.',
        },
      ],
    },
    toneChoices: [
      { id: 'cautious', label: 'Vou garantir margem extra para o retorno.', response: 'PIP destaca a janela de tempestade no relógio lunar.' },
      { id: 'balanced', label: 'Separando apenas as ferramentas essenciais.', response: 'O armário registra a massa escolhida.' },
    ],
  },
  trace: {
    id: 'trace',
    order: 6,
    title: 'Caminho e vestígio',
    historyLabel: '06 • Vestígio no Cânion',
    region: 'canyon',
    targetWorldId: 'survey-beacon',
    optional: true,
    skippable: true,
    stormPriority: false,
    lines: [
      {
        speaker: 'PIP',
        portraitId: 'pip',
        line: 'Essa marca pode indicar um caminho antigo.',
      },
      {
        speaker: 'Cadete',
        portraitId: 'cadet',
        line: 'Pode ser. Vamos procurar mais evidência.',
      },
    ],
    evidenceNote: 'Traços ambientais são hipóteses narrativas ficcionais, não conclusão medida sem sonda.',
    toneChoices: [
      { id: 'skeptical', label: 'Sem leitura de sonda, é só uma suposição.', response: 'PIP registra o critério científico.' },
      { id: 'observant', label: 'Cometa olhou o marco; vou testar o cabo.', response: 'Nenhuma informação oculta foi inventada.' },
    ],
  },
  scout: {
    id: 'scout',
    order: 7,
    title: 'Scout e a amostra',
    historyLabel: '07 • Resgate de Scout e Gelo Finito',
    region: 'canyon',
    targetWorldId: 'damaged-scout',
    optional: false,
    skippable: false,
    stormPriority: false,
    lines: [
      {
        speaker: 'Scout',
        portraitId: 'scout',
        line: 'Diagnóstico incompleto. Preciso de ajuda.',
      },
      {
        speaker: 'PIP',
        portraitId: 'pip',
        line: 'Verifique a peça e a energia antes de começar.',
      },
    ],
    evidenceNote: 'Reparo custa 1 peça + 0,3 kWh + 5 s; convite é separado; coleta transfere 0,5 kg dos 8 kg finitos de gelo.',
    toneChoices: [
      { id: 'reassure', label: 'Temos a peça e energia calculada para você, Scout.', response: 'Scout aguarda o reparo e depois o convite.' },
      { id: 'focused', label: 'Vamos reparar e vigiar o alerta de radiação.', response: 'PIP acompanha a janela de retorno.' },
    ],
  },
  warning: {
    id: 'warning',
    order: 8,
    title: 'Aviso e retorno',
    historyLabel: '08 • Alerta de Radiação e Abrigo',
    region: 'habitat',
    targetWorldId: 'habitat-shelter',
    optional: false,
    skippable: false,
    stormPriority: true,
    lines: [
      {
        speaker: 'Lia',
        portraitId: 'lia',
        line: 'A previsão mudou. Cancele a saída e volte.',
      },
      {
        speaker: 'PIP',
        portraitId: 'pip',
        line: 'A proteção vem antes da próxima leitura.',
      },
    ],
    evidenceNote: 'Prioridade dinâmica sobre o roteiro: radiação invisível exige retorno e abrigo durante o ciclo ativo.',
    toneChoices: [
      { id: 'urgent', label: 'Voltando ao abrigo imediatamente.', response: 'Lia confirma que o abrigo mantém os módulos funcionando.' },
      { id: 'check_cometa', label: 'Garantindo que todos cheguem em segurança.', response: 'Cometa segue ou aguarda em zona protegida sem sofrer dano.' },
    ],
  },
  harvest: {
    id: 'harvest',
    order: 9,
    title: 'Entrega e primeira colheita',
    historyLabel: '09 • Processamento e Colheita na Estufa',
    region: 'greenhouse',
    targetWorldId: 'crop-bed',
    optional: false,
    skippable: true,
    stormPriority: false,
    lines: [
      {
        speaker: 'Elena',
        portraitId: 'elena',
        line: 'A planta não responde a uma promessa; precisa de luz e água.',
      },
      {
        speaker: 'Cadete',
        portraitId: 'cadet',
        line: 'Então vamos acompanhar o que ela recebeu.',
      },
    ],
    evidenceNote: 'Processar gelo leva 10 s alimentados; colher exige 180 s com luz e água e adiciona +3 kg abstratos de alimento.',
    toneChoices: [
      { id: 'patient', label: 'Vamos respeitar o tempo de crescimento.', response: 'Elena aponta o medidor de umidade e luz.' },
      { id: 'grateful', label: 'Cada gota do ciclo fez diferença aqui.', response: 'Elena sorri e mantém o registro do canteiro.' },
    ],
  },
  home: {
    id: 'home',
    order: 10,
    title: 'Uma luz de cada vez',
    historyLabel: '10 • Relatório da Base Aurora',
    region: 'habitat',
    targetWorldId: 'mission-console',
    optional: false,
    skippable: true,
    stormPriority: false,
    lines: [
      {
        speaker: 'Reyes',
        portraitId: 'reyes',
        line: 'Aurora está respondendo porque vocês cuidaram dos detalhes.',
      },
      {
        speaker: 'PIP',
        portraitId: 'pip',
        line: 'Ainda há leituras para acompanhar.',
      },
      {
        speaker: 'Cadete',
        portraitId: 'cadet',
        line: 'Uma luz de cada vez.',
      },
    ],
    evidenceNote: 'Vitória depende exclusivamente do estado real da simulação; Cometa e falas opcionais não alteram a validação.',
    toneChoices: [
      { id: 'reflective', label: 'O que eu mudaria na próxima tentativa?', response: 'O relatório compara reservas, escolhas e perdas reais.' },
      { id: 'team', label: 'Conseguimos juntos: equipe humana e robótica.', response: 'Reyes registra o encerramento do Episódio 01.' },
    ],
  },
};

export const cargoCatalogLabels: Record<string, { label: string; massKg: number; note: string }> = {
  solar_cells: { label: 'Células fotovoltaicas', massKg: 14, note: 'Reposição para a matriz solar' },
  water_filter: { label: 'Cartuchos de filtragem', massKg: 12, note: 'Manutenção do reciclador' },
  tool_spares: { label: 'Peças de campo', massKg: 10, note: 'Componentes para reparo de Scout' },
  seed_pack: { label: 'Sementes hidropônicas', massKg: 4, note: 'Cultura inicial da estufa' },
  heavy_ballast: { label: 'Lastro estrutural extra', massKg: 20, note: 'Opcional pesado (excede 45 kg se somado a tudo)' },
};

export const fieldLockerCatalogLabels: Record<string, { label: string; massKg: number; note: string }> = {
  diagnostic_multimeter: { label: 'Multímetro e sondas', massKg: 4, note: 'Leitura elétrica e testes de campo' },
  ice_corer: { label: 'Amostrador de gelo', massKg: 6, note: 'Coleta selada de 0,5 kg' },
  repair_kit: { label: 'Kit mecânico Scout', massKg: 5, note: 'Ferramentas para reconexão em campo' },
  thermal_blanket: { label: 'Manta térmica compacta', massKg: 3, note: 'Proteção leve adicional' },
  auxiliary_drill: { label: 'Perfurador pesado', massKg: 8, note: 'Opcional pesado (excede 18 kg com o trio padrão)' },
};

export const auxBayPortLabels: Record<AuxBayPortType, { label: string; effect: string }> = {
  power: { label: 'Porta auxiliar elétrica', effect: '+0,5 kW solar quando a rede elétrica está ativa (custo: 0,15 kWh).' },
  water: { label: 'Porta auxiliar de água', effect: '+0,04 kg/h no reciclador por +0,15 kW (mantém 80% de recuperação).' },
  o2: { label: 'Porta auxiliar de O₂', effect: '+0,04 kg/h na eletrólise por +0,20 kW (conserva razão 8:1).' },
};

export const fieldKitPieceLabels: Record<FieldKitPieceId, { label: string; effect: string }> = {
  relay_mast: { label: 'Mastro repetidor', effect: '+20 m de alcance de telemetria do PIP e estabilidade durante tempestade.' },
  thermal_shield: { label: 'Painel térmico modular', effect: 'Reduz demanda crítica para 1,1 kW e atenua dano inicial sem substituir o abrigo.' },
  sensor_pylon: { label: 'Pilar de sensores solares', effect: '+0,3 kW na matriz solar quando a rede principal está ativa.' },
};

export const discoveryCatalogLabels: Record<
  DiscoveryId,
  { title: string; region: RegionId; classificationLabel: string; note: string }
> = {
  com03_unplugged_cable: {
    title: 'Cabo solto no módulo COM-03',
    region: 'canyon',
    classificationLabel: 'Abstração ficcional (cenário narrativo)',
    note: 'Traço ambiental proposto na prancha 07; requer sonda para confirmar ausência de falha ativa.',
  },
  canyon_ice_strata: {
    title: 'Estratos de gelo no cânion',
    region: 'canyon',
    classificationLabel: 'Abstração ficcional (depósito didático)',
    note: 'Iluminação não emissiva sobre reserva finita de 8 kg; não representa mapa LRO/LOLA real.',
  },
  solar_dust_attenuation: {
    title: 'Atenuação solar na tempestade',
    region: 'habitat',
    classificationLabel: 'Telemetria medida na simulação',
    note: 'Compara oferta elétrica medida antes/depois (fator de 45% na tempestade é hipótese didática).',
  },
};

export const cadetAppearanceOptions = {
  suitAccents: [
    { id: 'orange', label: 'Laranja Segurança' },
    { id: 'cyan', label: 'Ciano Instrumentos' },
    { id: 'emerald', label: 'Verde Estufa' },
    { id: 'cobalt', label: 'Azul Orbital' },
  ],
  visorTones: [
    { id: 'gold', label: 'Dourado Solar' },
    { id: 'cyan', label: 'Ciano Claro' },
    { id: 'slate', label: 'Grafite Neutro' },
  ],
  skinTones: [
    { id: 'fair', label: 'Tom claro' },
    { id: 'light', label: 'Tom claro dourado' },
    { id: 'medium', label: 'Tom médio' },
    { id: 'tan', label: 'Tom bronzeado' },
    { id: 'deep', label: 'Tom retinto' },
  ],
} as const;
