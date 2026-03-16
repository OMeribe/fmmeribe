// --- BANCO DE DADOS E ESTADO DO JOGO ---

const POSITIONS = {
    GOL: { name: 'Goleiro', group: 'GK' },
    ZAG: { name: 'Zagueiro', group: 'DF' },
    LE: { name: 'Lateral Esquerdo', group: 'DF' },
    LD: { name: 'Lateral Direito', group: 'DF' },
    VOL: { name: 'Volante', group: 'MF' },
    MC: { name: 'Meia Central', group: 'MF' },
    MEI: { name: 'Meia Atacante', group: 'MF' },
    ME: { name: 'Meia Esquerda', group: 'MF' }, // <-- ADICIONADO
    MD: { name: 'Meia Direita', group: 'MF' },   // <-- ADICIONADO
    PE: { name: 'Ponta Esquerda', group: 'FW' },
    PD: { name: 'Ponta Direita', group: 'FW' },
    SA: { name: 'Segundo Atacante', group: 'FW' },
    ATA: { name: 'Atacante', group: 'FW' },
};

const ATTRIBUTE_WEIGHTS = {
    GOL: { reflexes: 3, handling: 3, positioning_gk: 2, kicking: 1 },
    ZAG: { tackling: 3, marking: 3, heading: 2, strength: 2, speed: 1 },
    LE: { tackling: 2, marking: 2, crossing: 2, speed: 2, dribbling: 1, passing: 1 },
    LD: { tackling: 2, marking: 2, crossing: 2, speed: 2, dribbling: 1, passing: 1 },
    VOL: { passing: 3, tackling: 3, marking: 2, strength: 1, long_shots: 1 },
    MC: { passing: 3, dribbling: 2, vision: 2, long_shots: 1, tackling: 1 },
    MEI: { vision: 3, passing: 3, dribbling: 2, finishing: 2, long_shots: 1 },
    ME: { passing: 2, dribbling: 2, crossing: 3, speed: 2, vision: 1 }, // <-- ADICIONADO
    MD: { passing: 2, dribbling: 2, crossing: 3, speed: 2, vision: 1 }, // <-- ADICIONADO
    PE: { speed: 3, dribbling: 3, crossing: 2, finishing: 2, passing: 1 },
    PD: { speed: 3, dribbling: 3, crossing: 2, finishing: 2, passing: 1 },
    SA: { finishing: 3, speed: 2, dribbling: 2, passing: 1, vision: 1 },
    ATA: { finishing: 3, heading: 2, shot_power: 2, strength: 2, speed: 1 }
};

// --- MULTIPLICADORES DE DESGASTE POR POSIÇÃO ---
// Define o quanto cada posição cansa durante uma partida de 90min.
// Baseado em km percorrido médio por posição no futebol profissional.
// GOL ~5.5km | ZAG ~9km | VOL ~11km | PE/PD/LE/LD ~13km
const STAMINA_DRAIN_BY_POSITION = {
    GOL: 0.45,   // Goleiro: praticamente parado, reflexos e posicionamento
    ZAG: 0.70,   // Zagueiro: jogo posicional, coberturas moderadas
    LE:  1.25,   // Lateral Esq.: sobe e desce a faixa constantemente
    LD:  1.25,   // Lateral Dir.: idem
    VOL: 0.90,   // Volante: cobertura intensa, mas mais central
    MC:  0.85,   // Meia Central: jogo posicional, organiza sem tanto sprint
    MEI: 1.00,   // Meia Atacante: equilibrio entre criar e correr
    ME:  1.20,   // Meia Esquerda: aberto, faz e desfaz pela faixa
    MD:  1.20,   // Meia Direita: idem
    PE:  1.30,   // Ponta Esquerda: sprints constantes, maior desgaste
    PD:  1.30,   // Ponta Direita: idem
    SA:  0.85,   // Segundo Atacante: mais estático, pivô de área
    ATA: 0.80,   // Atacante Centro: pivô, espera a bola mais do que busca
};

// Posições táticas em campo (coordenadas espaçadas rigorosamente em blocos de 20% para evitar sobreposição na altura de 640px)
const formations = {
    '4-3-3': [
        { position: 'GOL', top: '84%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '35%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '65%', translateX: '-50%' },
        { position: 'LE', top: '64%', left: '12%', translateX: '-50%' },
        { position: 'LD', top: '64%', left: '88%', translateX: '-50%' },
        { position: 'VOL', top: '44%', left: '50%', translateX: '-50%' },
        { position: 'MC', top: '44%', left: '25%', translateX: '-50%' },
        { position: 'MC', top: '44%', left: '75%', translateX: '-50%' },
        { position: 'PE', top: '24%', left: '18%', translateX: '-50%' },
        { position: 'PD', top: '24%', left: '82%', translateX: '-50%' },
        { position: 'ATA', top: '4%', left: '50%', translateX: '-50%' }
    ],
    '4-4-2': [
        { position: 'GOL', top: '84%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '35%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '65%', translateX: '-50%' },
        { position: 'LE', top: '64%', left: '12%', translateX: '-50%' },
        { position: 'LD', top: '64%', left: '88%', translateX: '-50%' },
        { position: 'VOL', top: '44%', left: '35%', translateX: '-50%' },
        { position: 'VOL', top: '44%', left: '65%', translateX: '-50%' },
        { position: 'ME', top: '24%', left: '15%', translateX: '-50%' },
        { position: 'MD', top: '24%', left: '85%', translateX: '-50%' },
        { position: 'ATA', top: '8%', left: '35%', translateX: '-50%' },
        { position: 'ATA', top: '8%', left: '65%', translateX: '-50%' }
    ],
    '3-5-2': [
        { position: 'GOL', top: '84%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '25%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '75%', translateX: '-50%' },
        { position: 'VOL', top: '44%', left: '35%', translateX: '-50%' },
        { position: 'VOL', top: '44%', left: '65%', translateX: '-50%' },
        { position: 'ME', top: '24%', left: '15%', translateX: '-50%' },
        { position: 'MD', top: '24%', left: '85%', translateX: '-50%' },
        { position: 'MEI', top: '24%', left: '50%', translateX: '-50%' },
        { position: 'ATA', top: '4%', left: '35%', translateX: '-50%' },
        { position: 'ATA', top: '4%', left: '65%', translateX: '-50%' }
    ],
    '4-2-3-1': [
        { position: 'GOL', top: '84%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '35%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '65%', translateX: '-50%' },
        { position: 'LE', top: '64%', left: '12%', translateX: '-50%' },
        { position: 'LD', top: '64%', left: '88%', translateX: '-50%' },
        { position: 'VOL', top: '44%', left: '35%', translateX: '-50%' },
        { position: 'VOL', top: '44%', left: '65%', translateX: '-50%' },
        { position: 'ME', top: '24%', left: '18%', translateX: '-50%' },
        { position: 'MD', top: '24%', left: '82%', translateX: '-50%' },
        { position: 'MEI', top: '24%', left: '50%', translateX: '-50%' },
        { position: 'ATA', top: '4%', left: '50%', translateX: '-50%' }
    ],
    '5-3-2': [
        { position: 'GOL', top: '84%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '30%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '70%', translateX: '-50%' },
        { position: 'LE', top: '54%', left: '10%', translateX: '-50%' },
        { position: 'LD', top: '54%', left: '90%', translateX: '-50%' },
        { position: 'VOL', top: '44%', left: '50%', translateX: '-50%' },
        { position: 'MC', top: '26%', left: '30%', translateX: '-50%' },
        { position: 'MEI', top: '26%', left: '70%', translateX: '-50%' },
        { position: 'ATA', top: '6%', left: '35%', translateX: '-50%' },
        { position: 'ATA', top: '6%', left: '65%', translateX: '-50%' }
    ],
    '4-4-2 (Losango)': [
        { position: 'GOL', top: '84%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '35%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '65%', translateX: '-50%' },
        { position: 'LE', top: '64%', left: '12%', translateX: '-50%' },
        { position: 'LD', top: '64%', left: '88%', translateX: '-50%' },
        { position: 'VOL', top: '48%', left: '50%', translateX: '-50%' },
        { position: 'MC', top: '34%', left: '25%', translateX: '-50%' },
        { position: 'MC', top: '34%', left: '75%', translateX: '-50%' },
        { position: 'MEI', top: '20%', left: '50%', translateX: '-50%' },
        { position: 'ATA', top: '6%', left: '35%', translateX: '-50%' },
        { position: 'SA', top: '6%', left: '65%', translateX: '-50%' }
    ],
    '4-1-3-2': [
        { position: 'GOL', top: '84%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '35%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '65%', translateX: '-50%' },
        { position: 'LE', top: '64%', left: '12%', translateX: '-50%' },
        { position: 'LD', top: '64%', left: '88%', translateX: '-50%' },
        { position: 'VOL', top: '46%', left: '50%', translateX: '-50%' },
        { position: 'ME', top: '26%', left: '18%', translateX: '-50%' },
        { position: 'MEI', top: '26%', left: '50%', translateX: '-50%' },
        { position: 'MD', top: '26%', left: '82%', translateX: '-50%' },
        { position: 'ATA', top: '6%', left: '35%', translateX: '-50%' },
        { position: 'SA', top: '6%', left: '65%', translateX: '-50%' }
    ],
    '4-3-3 (Falso 9)': [
        { position: 'GOL', top: '84%', left: '50%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '35%', translateX: '-50%' },
        { position: 'ZAG', top: '64%', left: '65%', translateX: '-50%' },
        { position: 'LE', top: '64%', left: '12%', translateX: '-50%' },
        { position: 'LD', top: '64%', left: '88%', translateX: '-50%' },
        { position: 'VOL', top: '44%', left: '50%', translateX: '-50%' },
        { position: 'MC', top: '26%', left: '28%', translateX: '-50%' },
        { position: 'MC', top: '26%', left: '72%', translateX: '-50%' },
        { position: 'PE', top: '12%', left: '18%', translateX: '-50%' },
        { position: 'PD', top: '12%', left: '82%', translateX: '-50%' },
        { position: 'SA', top: '16%', left: '50%', translateX: '-50%' }
    ]
};

// Apenas iniciamos o array vazio. Ele será preenchido pelos JSONs.
let teamsData = []; 

// O "Índice" dos times que o jogo deve tentar carregar
const teamFilesToLoad = [
    'athletico-pr.json',
    'atletico-mineiro.json',
    'bahia.json',
    'botafogo.json',
    'bragantino.json',
    'chapecoense.json',
    'corinthians.json',
    'coritiba.json',
    'cruzeiro.json',
    'flamengo.json',
    'fluminense.json',
    'gremio.json',
    'internacional.json',
    'mirassol.json',
    'palmeiras.json',
    'remo.json',
    'santos.json',
    'sao-paulo.json',
    'vasco.json',
    'vitoria.json'
];

const playerNames = ["Lucas", "Gabriel", "Matheus", "Pedro", "Enzo", "Arthur", "Davi", "Miguel", "Bruno", "Felipe", "João", "Carlos", "Rafael", "Daniel", "Thiago", "Vinicius", "André", "Ricardo", "Eduardo", "Leonardo"];
const playerSurnames = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Carvalho", "Almeida", "Ferreira", "Ribeiro", "Gomes", "Lima", "Martins", "Rocha", "Alves"];

let gameState = {
    playerTeam: null,
    currentRound: 1,
    currentDate: new Date('2026-04-10T12:00:00'),
    schedule: [],
    leagueTable: [],
    currentFormation: '4-3-3',
    roles: {
        captain: null,
        penalties: null,
        freeKicks: null,
        corners: null
    },
    // --- MORAL DO TIME (0 a 100, começa em 70 = neutro) ---
    teamMorale: 70,
    // --- FEED DE NOTÍCIAS DO CLUBE ---
    news: []
};
