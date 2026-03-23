// --- INTERFACE DO USUÁRIO E RENDERIZAÇÃO ---

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    
    if (screenId === 'squad-screen') { squadCurrentTab = 'status'; squadSelectedPlayerId = null; renderSquadList(); }
    if (screenId === 'tactics-screen') renderTacticsScreen();
    if (screenId === 'pre-match-screen') renderPreMatchScreen();
    if (screenId === 'scorers-screen') renderScorersScreen();
}

function openModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

function renderHubTable() {
    const tableBody = document.getElementById('main-hub-table');
    tableBody.innerHTML = '';
    const sortedTable = sortLeagueTable(gameState.leagueTable);
    const total = sortedTable.length;
    sortedTable.forEach((entry, index) => {
        const pos = index + 1;
        const isPlayerTeam = entry.teamId === gameState.playerTeam.id;
        const isRelegation = pos > total - 4; // Últimos 4 = zona de rebaixamento
        const isLibertadores = pos <= 6;      // Top 6 = Libertadores
        
        let rowClass = isPlayerTeam ? 'bg-blue-900' : 'bg-gray-800';
        let posClass = '';
        if (isRelegation && !isPlayerTeam) posClass = 'text-red-400 font-bold';
        else if (isLibertadores) posClass = 'text-green-400 font-bold';

        let borderClass = '';
        if (pos === 6) borderClass = 'border-b-2 border-green-700';
        if (pos === total - 4) borderClass = 'border-b-2 border-red-700';

        tableBody.innerHTML += `
            <tr class="${rowClass} ${borderClass} hover:brightness-110 transition-all">
                <td class="p-2 ${posClass}">${pos}</td>
                <td class="p-2 flex items-center"><img src="${entry.logo}" class="h-5 w-5 mr-2 object-contain" onerror="this.onerror=null;this.src='https://placehold.co/20x20/2d3748/ffffff?text=?';">${entry.teamName}</td>
                <td class="p-2 font-bold">${entry.points}</td>
                <td class="p-2">${entry.played}</td><td class="p-2">${entry.wins}</td>
                <td class="p-2">${entry.draws}</td><td class="p-2">${entry.losses}</td>
                <td class="p-2">${entry.goalsFor}</td><td class="p-2">${entry.goalsAgainst}</td>
                <td class="p-2">${entry.goalsFor - entry.goalsAgainst}</td>
            </tr>`;
    });
}

function updateHub() {
    const team = gameState.playerTeam;
    document.getElementById('hub-team-logo').src = team.logo;
    document.getElementById('hub-team-name').textContent = team.name;
    document.getElementById('hub-team-finances').textContent = `Financeiro: R$ ${team.finances.toFixed(1)}M`;
    
    // Formata a data atual para um formato bonito em português
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = gameState.currentDate.toLocaleDateString('pt-BR', dateOptions);
    
    // Mostra a Data Real + A Rodada
    document.getElementById('hub-current-date').innerHTML = `
        <span class="text-yellow-400 font-bold capitalize">${formattedDate}</span>
        <br> <span class="text-sm text-gray-400">Rodada ${gameState.currentRound} do Brasileirão</span>
    `;

    // --- MORAL DO TIME ---
    const morale = gameState.teamMorale;
    let moraleEmoji, moraleLabel, moraleColor;
    if      (morale >= 85) { moraleEmoji = '🔥'; moraleLabel = 'Excelente';    moraleColor = 'text-green-400'; }
    else if (morale >= 65) { moraleEmoji = '🙂'; moraleLabel = 'Boa';          moraleColor = 'text-blue-300';  }
    else if (morale >= 45) { moraleEmoji = '😐'; moraleLabel = 'Normal';       moraleColor = 'text-yellow-400';}
    else if (morale >= 25) { moraleEmoji = '😟'; moraleLabel = 'Baixa';        moraleColor = 'text-orange-400';}
    else                   { moraleEmoji = '😤'; moraleLabel = 'Em crise';     moraleColor = 'text-red-400';   }

    const moraleEl = document.getElementById('hub-team-morale');
    if (moraleEl) {
        moraleEl.innerHTML = `
            <span class="text-gray-400 text-sm">Moral: </span>
            <span class="${moraleColor} font-bold">${moraleEmoji} ${moraleLabel} (${morale})</span>
            <div class="w-full bg-gray-700 rounded-full h-2 mt-1">
                <div class="h-2 rounded-full transition-all duration-500 ${morale >= 65 ? 'bg-green-500' : morale >= 45 ? 'bg-yellow-500' : 'bg-red-500'}" style="width:${morale}%"></div>
            </div>
        `;
    }
    
    renderHubTable();
    renderNextMatch();
    renderNewsFeed();
}

function renderNextMatch() {
    const nextMatchCard = document.getElementById('next-match-card');
    if (gameState.currentRound > gameState.schedule.length) {
        nextMatchCard.innerHTML = `<p class="text-lg font-semibold text-center mt-4">Fim da Temporada!</p>`;
        return;
    }
    
    const roundMatches = gameState.schedule[gameState.currentRound - 1];
    const playerMatch = roundMatches.find(m => m.home.id === gameState.playerTeam.id || m.away.id === gameState.playerTeam.id);
    const matchDate = playerMatch.date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

    if (playerMatch) {
        nextMatchCard.innerHTML = `
            <div class="text-center mb-3">
                <span class="bg-blue-900 text-blue-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    🗓️ Dia de Jogo: ${matchDate}
                </span>
                <button onclick="openCalendarModal()" class="ml-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded cursor-pointer transition">
                    📅 Ver Calendário
                </button>
            </div>
            <div class="flex justify-around items-center">
                <div class="text-center w-1/3">
                    <img src="${playerMatch.home.logo}" class="h-16 w-16 mx-auto mb-2 object-contain" onerror="this.onerror=null;this.src='https://placehold.co/64x64/2d3748/ffffff?text=?';">
                    <p class="font-bold text-sm">${playerMatch.home.name}</p>
                </div>
                <p class="text-2xl font-bold text-gray-400 w-1/3 text-center">VS</p>
                <div class="text-center w-1/3">
                    <img src="${playerMatch.away.logo}" class="h-16 w-16 mx-auto mb-2 object-contain" onerror="this.onerror=null;this.src='https://placehold.co/64x64/2d3748/ffffff?text=?';">
                    <p class="font-bold text-sm">${playerMatch.away.name}</p>
                </div>
            </div>`;
    }
}

// --- FEED DE NOTÍCIAS DO CLUBE ---
function renderNewsFeed() {
    const el = document.getElementById('hub-news-feed');
    if (!el) return;

    if (gameState.news.length === 0) {
        el.innerHTML = `<p class="text-gray-500 text-sm italic">Sem notícias ainda. Jogue sua primeira partida!</p>`;
        return;
    }

    const colorMap = {
        positive: 'border-green-600 text-green-300',
        negative: 'border-red-600 text-red-300',
        neutral:  'border-yellow-600 text-yellow-200',
        warning:  'border-orange-500 text-orange-300',
        info:     'border-blue-600 text-blue-300',
    };
    const iconMap  = { positive: '📈', negative: '📉', neutral: '📰', warning: '⚠️', info: 'ℹ️' };

    el.innerHTML = gameState.news.map(item => {
        const cls  = colorMap[item.type] || colorMap.neutral;
        const icon = iconMap[item.type]  || '📰';
        return `
            <div class="border-l-4 pl-3 py-1 ${cls}">
                <span class="mr-1">${icon}</span>${item.text}
            </div>
        `;
    }).join('');
}

// --- GERENCIAMENTO DE ELENCO COM ABAS E ORDENAÇÃO ---
let squadCurrentTab = 'status';
let squadSelectedPlayerId = null;

// Variáveis para Ordenação
let squadSortConfig = { column: 'pos', order: 'asc' };

function sortSquadList(column) {
    if (squadSortConfig.column === column) {
        squadSortConfig.order = squadSortConfig.order === 'asc' ? 'desc' : 'asc';
    } else {
        squadSortConfig.column = column;
        squadSortConfig.order = ['overallRating', 'age', 'goals', 'assists', 'matchesPlayed', 'marketValue', 'salary', 'potential'].includes(column) ? 'desc' : 'asc';
    }
    renderSquadList();
}

function getSortIcon(col) {
    return squadSortConfig.column === col ? (squadSortConfig.order === 'asc' ? ' ▴' : ' ▾') : '';
}

function renderSquadList() {
    const el = document.getElementById('squad-list');
    const team = gameState.playerTeam;
    const posOrder = ['GOL', 'LE', 'ZAG', 'LD', 'VOL', 'MC', 'MEI', 'ME', 'PE', 'MD', 'PD', 'SA', 'ATA'];
    
    // ORDENAÇÃO
    let sorted = [...team.players].sort((a, b) => {
        let valA, valB;
        const col = squadSortConfig.column;
        
        if (col === 'pos') {
            valA = posOrder.indexOf(a.primaryPosition); valB = posOrder.indexOf(b.primaryPosition);
        } else if (col === 'status') {
            valA = a.isStarter ? 1 : 0; valB = b.isStarter ? 1 : 0;
        } else if (col === 'name') {
            valA = a.name.toLowerCase(); valB = b.name.toLowerCase();
        } else if (col === 'potential') {
            valA = Math.min(99, a.overallRating + Math.max(0, (28 - a.age)));
            valB = Math.min(99, b.overallRating + Math.max(0, (28 - b.age)));
        } else {
            valA = a[col] || 0; valB = b[col] || 0;
        }

        if (valA < valB) return squadSortConfig.order === 'asc' ? -1 : 1;
        if (valA > valB) return squadSortConfig.order === 'asc' ? 1 : -1;
        return 0;
    });

    const tabs = [
        { key: 'status',       label: 'Status'        },
        { key: 'stats',        label: 'Estatísticas'  },
        { key: 'development',  label: 'Desenvolvimento'},
        { key: 'finances',     label: 'Finanças'      },
    ];

    const tabButtons = tabs.map(t => `
        <button onclick="switchSquadTab('${t.key}')"
            class="squad-tab px-5 py-2 font-bold text-sm uppercase tracking-wider transition-all duration-150
                   ${squadCurrentTab === t.key
                     ? 'bg-yellow-400 text-gray-900 rounded-t-lg'
                     : 'text-gray-400 hover:text-white'}"
            data-tab="${t.key}">
            ${t.label}
        </button>`).join('');

    // --- Coluna esquerda: tabela ---
    let tableHTML = '';
    if (squadCurrentTab === 'status') tableHTML = buildStatusTable(sorted);
    else if (squadCurrentTab === 'stats') tableHTML = buildStatsTable(sorted);
    else if (squadCurrentTab === 'development') tableHTML = buildDevelopmentTable(sorted);
    else if (squadCurrentTab === 'finances') tableHTML = buildFinancesTable(sorted);

    // --- Painel direito: detalhe do jogador selecionado ---
    const sel = sorted.find(p => p.id === squadSelectedPlayerId) || sorted[0];
    squadSelectedPlayerId = sel ? sel.id : null;
    const detailHTML = sel ? buildPlayerDetail(sel) : '';

    // ESTRUTURA COM SCROLL (h-[600px] e overflow-y-auto)
    el.innerHTML = `
        <div class="flex flex-col h-full">
            <div class="flex items-end gap-1 border-b border-gray-700 mb-0 px-1">
                ${tabButtons}
            </div>
            <div class="flex gap-4 mt-4 h-[550px] items-start">
                <div id="squad-table-container" class="flex-1 bg-gray-800 rounded-lg border border-gray-700 h-full overflow-y-auto custom-scrollbar relative">
                    ${tableHTML}
                </div>
                <div class="w-72 flex-shrink-0 h-full">
                    ${detailHTML}
                </div>
            </div>
        </div>
    `;
}

function switchSquadTab(tab) {
    squadCurrentTab = tab;
    renderSquadList();
}

function selectSquadPlayer(playerId) {
    // 1. Anota a posição atual do scroll
    const container = document.getElementById('squad-table-container');
    const scrollPos = container ? container.scrollTop : 0;
    
    // 2. Seleciona o jogador e atualiza a tela
    squadSelectedPlayerId = playerId;
    renderSquadList();
    
    // 3. Devolve a barra de rolagem pro exato lugar de antes!
    const newContainer = document.getElementById('squad-table-container');
    if (newContainer) newContainer.scrollTop = scrollPos;
}

function playerRowBase(p, extraCells) {
    const isSelected = p.id === squadSelectedPlayerId;
    return `
        <tr onclick="selectSquadPlayer(${p.id})"
            class="border-b border-gray-700 cursor-pointer transition-colors
                   ${isSelected ? 'bg-yellow-900 bg-opacity-40 border-l-4 border-yellow-400' : 'hover:bg-gray-700'}">
            <td class="p-2 w-12 text-center font-bold text-gray-400">${p.number}</td>
            <td class="p-2 w-12">
                <img src="${p.photo}" class="h-9 w-9 object-cover rounded-full bg-gray-600 border-2
                    ${isSelected ? 'border-yellow-400' : 'border-gray-600'}"
                    onerror="this.onerror=null;this.src='https://placehold.co/40x40/2d3748/ffffff?text=?';">
            </td>
            <td class="p-2 font-semibold text-gray-200">${p.name}</td>
            <td class="p-2"><span class="bg-gray-900 px-2 py-0.5 rounded text-xs font-bold text-gray-300">${p.primaryPosition}</span></td>
            ${extraCells}
        </tr>`;
}

function buildStatusTable(sorted) {
    const rows = sorted.map(p => {
        const sta = p.currentStamina ?? 100;
        const staColor = sta >= 70 ? 'bg-green-500' : sta >= 40 ? 'bg-yellow-500' : 'bg-red-500';
        const staLabel = sta >= 70 ? 'text-green-400' : sta >= 40 ? 'text-yellow-400' : 'text-red-400';
        return playerRowBase(p, `
            <td class="p-2 text-gray-300">${p.age}a</td>
            <td class="p-2 font-bold text-yellow-300">${p.overallRating}</td>
            <td class="p-2">${p.isStarter
                ? '<span class="text-green-400 font-semibold text-xs">● Titular</span>'
                : '<span class="text-gray-500 text-xs">○ Reserva</span>'}</td>
            <td class="p-2 w-24">
                <div class="flex items-center gap-1.5">
                    <div class="flex-1 bg-gray-700 rounded-full h-1.5">
                        <div class="${staColor} h-1.5 rounded-full transition-all" style="width:${sta}%"></div>
                    </div>
                    <span class="text-[10px] font-bold ${staLabel} w-6 text-right">${sta}</span>
                </div>
            </td>
        `);
    }).join('');
    return `<table class="w-full text-sm text-left">
        <thead class="bg-gray-900 text-gray-400 uppercase text-xs sticky top-0 z-10 shadow-md">
            <tr>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('number')">Nº${getSortIcon('number')}</th>
                <th class="p-3">Foto</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('name')">Nome${getSortIcon('name')}</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('pos')">Pos${getSortIcon('pos')}</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('age')">Idade${getSortIcon('age')}</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('overallRating')">OVR${getSortIcon('overallRating')}</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('status')">Status${getSortIcon('status')}</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('currentStamina')">⚡ STA${getSortIcon('currentStamina')}</th>
            </tr>
        </thead><tbody>${rows}</tbody></table>`;
}

function buildStatsTable(sorted) {
    const rows = sorted.map(p => playerRowBase(p, `
        <td class="p-2 text-center text-yellow-300 font-bold">${p.goals || 0}</td>
        <td class="p-2 text-center text-blue-300 font-bold">${p.assists || 0}</td>
        <td class="p-2 text-center">${p.gamesPlayed || 0}</td>
        <td class="p-2 text-center text-yellow-200">${p.yellowCards || 0}</td>
        <td class="p-2 text-center text-red-400">${p.redCards || 0}</td>
    `)).join('');
    return `<table class="w-full text-sm text-left">
        <thead class="bg-gray-900 text-gray-400 uppercase text-xs sticky top-0 z-10 shadow-md">
            <tr>
                <th class="p-3">Nº</th><th class="p-3">Foto</th><th class="p-3">Nome</th><th class="p-3">Pos</th>
                <th class="p-3 text-center cursor-pointer hover:text-white" onclick="sortSquadList('goals')">⚽ Gols${getSortIcon('goals')}</th>
                <th class="p-3 text-center cursor-pointer hover:text-white" onclick="sortSquadList('assists')">🎯 Ass.${getSortIcon('assists')}</th>
                <th class="p-3 text-center cursor-pointer hover:text-white" onclick="sortSquadList('gamesPlayed')">Jogos${getSortIcon('gamesPlayed')}</th>
                <th class="p-3 text-center">🟨</th><th class="p-3 text-center">🟥</th>
            </tr>
        </thead><tbody>${rows}</tbody></table>`;
}

function buildDevelopmentTable(sorted) {
    const rows = sorted.map(p => {
        const potential = Math.min(99, p.overallRating + Math.max(0, (28 - p.age)));
        const bar = Math.round((p.overallRating / 99) * 100);
        return playerRowBase(p, `
            <td class="p-2 text-gray-300">${p.age}a</td>
            <td class="p-2 font-bold text-yellow-300">${p.overallRating}</td>
            <td class="p-2 w-28">
                <div class="flex items-center gap-2">
                    <div class="flex-1 bg-gray-700 rounded-full h-2">
                        <div class="h-2 rounded-full bg-yellow-400" style="width:${bar}%"></div>
                    </div>
                </div>
            </td>
            <td class="p-2 text-green-400 font-bold">${potential}</td>
            <td class="p-2 text-xs text-gray-400">${p.secondaryPositions.length > 0 ? p.secondaryPositions.join(', ') : '—'}</td>
        `);
    }).join('');
    return `<table class="w-full text-sm text-left">
        <thead class="bg-gray-900 text-gray-400 uppercase text-xs sticky top-0 z-10 shadow-md">
            <tr>
                <th class="p-3">Nº</th><th class="p-3">Foto</th><th class="p-3">Nome</th><th class="p-3">Pos</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('age')">Idade${getSortIcon('age')}</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('overallRating')">OVR${getSortIcon('overallRating')}</th>
                <th class="p-3">Rating</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('potential')">Pot.${getSortIcon('potential')}</th>
                <th class="p-3">Alt. Pos.</th>
            </tr>
        </thead><tbody>${rows}</tbody></table>`;
}

function buildFinancesTable(sorted) {
    const rows = sorted.map(p => {
        const contractColor = p.contract <= 1 ? 'text-red-400' : p.contract === 2 ? 'text-yellow-300' : 'text-green-400';
        return playerRowBase(p, `
            <td class="p-2 text-gray-300">${p.age}a</td>
            <td class="p-2 font-bold text-yellow-300">${p.overallRating}</td>
            <td class="p-2 text-green-300 font-semibold">R$ ${(p.marketValue || 0).toFixed(1)}M</td>
            <td class="p-2 text-blue-300">R$ ${(p.salary || 0).toFixed(0)}k/mês</td>
            <td class="p-2 ${contractColor} font-bold">${p.contract || 1}a</td>
        `);
    }).join('');
    return `<table class="w-full text-sm text-left">
        <thead class="bg-gray-900 text-gray-400 uppercase text-xs sticky top-0 z-10 shadow-md">
            <tr>
                <th class="p-3">Nº</th><th class="p-3">Foto</th><th class="p-3">Nome</th><th class="p-3">Pos</th>
                <th class="p-3">Idade</th><th class="p-3">OVR</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('marketValue')">Valor${getSortIcon('marketValue')}</th>
                <th class="p-3 cursor-pointer hover:text-white" onclick="sortSquadList('salary')">Salário${getSortIcon('salary')}</th>
                <th class="p-3">Contrato</th>
            </tr>
        </thead><tbody>${rows}</tbody></table>`;
}

// --- PAINEL DE DETALHE DO JOGADOR ---
function buildPlayerDetail(p) {
    const potential = Math.min(99, p.overallRating + Math.max(0, (28 - p.age)));
    const contractColor = !p.contract || p.contract <= 1 ? 'text-red-400' : p.contract === 2 ? 'text-yellow-300' : 'text-green-400';
    const statusLabel = p.isStarter
        ? '<span class="bg-green-700 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Titular</span>'
        : '<span class="bg-gray-600 text-gray-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Reserva</span>';

    const attrs = p.attributes || {};
    let attrBars = '';

    // SE FOR GOLEIRO
    if (p.primaryPosition === 'GOL') {
        const attrGroups = [
            { label: 'REF', key: 'reflexes', color: 'bg-blue-500' },
            { label: 'MAN', key: 'handling', color: 'bg-green-500' },
            { label: 'POS', key: 'positioning_gk', color: 'bg-yellow-500' },
            { label: 'CHU', key: 'kicking', color: 'bg-red-500' },
        ];
        attrBars = attrGroups.map(g => {
            const val = attrs[g.key] || 50;
            return `
                <div class="flex items-center gap-2 mb-1.5">
                    <span class="text-gray-400 text-[10px] font-bold w-8">${g.label}</span>
                    <div class="flex-1 bg-gray-700 rounded-full h-2">
                        <div class="${g.color} h-2 rounded-full transition-all" style="width:${val}%"></div>
                    </div>
                    <span class="text-xs font-bold text-gray-200 w-6 text-right">${val}</span>
                </div>`;
        }).join('');
    } 
    // SE FOR LINHA
    else {
        const attrGroups = [
            { label: 'ATQ', keys: ['finishing','shot_power','heading'], color: 'bg-red-500' },
            { label: 'MIO', keys: ['passing','vision','dribbling'],    color: 'bg-blue-500' },
            { label: 'DEF', keys: ['tackling','marking','strength'],   color: 'bg-yellow-500' },
            { label: 'FIS', keys: ['speed','strength','stamina'],      color: 'bg-green-500' },
        ];
        attrBars = attrGroups.map(g => {
            const vals = g.keys.map(k => attrs[k] || 50);
            const avg = Math.round(vals.reduce((a,b) => a+b, 0) / vals.length);
            return `
                <div class="flex items-center gap-2 mb-1.5">
                    <span class="text-gray-400 text-[10px] font-bold w-8">${g.label}</span>
                    <div class="flex-1 bg-gray-700 rounded-full h-2">
                        <div class="${g.color} h-2 rounded-full transition-all" style="width:${avg}%"></div>
                    </div>
                    <span class="text-xs font-bold text-gray-200 w-6 text-right">${avg}</span>
                </div>`;
        }).join('');
    }

    const secPos = p.secondaryPositions && p.secondaryPositions.length > 0
        ? p.secondaryPositions.map(pos => `<span class="bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded">${pos}</span>`).join(' ')
        : '<span class="text-gray-600 text-[10px]">—</span>';

    // --- VARIÁVEIS DE STAMINA (devem ser declaradas ANTES do return) ---
    const sta = p.currentStamina ?? 100;
    const staBarColor = sta >= 70 ? 'bg-green-500' : sta >= 40 ? 'bg-yellow-500' : 'bg-red-500';
    const staTextColor = sta >= 70 ? 'text-green-400' : sta >= 40 ? 'text-yellow-400' : 'text-red-400';
    const staLabel = sta >= 85 ? 'Descansado ✅' : sta >= 70 ? 'Em boa forma' : sta >= 55 ? 'Levemente cansado' : sta >= 40 ? 'Precisa descansar' : sta >= 25 ? '⚠️ Muito cansado' : '🔴 Exausto';

    return `
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-5 sticky top-0 shadow-lg h-full">
            <div class="flex items-center gap-3 mb-5 pb-4 border-b border-gray-700">
                <div class="relative">
                    <img src="${p.photo}" class="h-16 w-16 object-cover rounded-full border-2 ${p.isStarter ? 'border-green-500' : 'border-gray-500'} bg-gray-700"
                        onerror="this.onerror=null;this.src='https://placehold.co/64x64/2d3748/ffffff?text=?';">
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-black text-white text-lg leading-tight truncate" title="${p.name}">${p.name}</div>
                    <div class="text-gray-400 text-[11px] mt-1">${p.age} anos · ${statusLabel}</div>
                    
                    <div class="flex flex-wrap items-center gap-1 mt-1.5">
                        <span class="bg-gray-900 text-yellow-400 font-black text-[10px] px-2 py-0.5 rounded flex-shrink-0">${p.primaryPosition}</span>
                        ${secPos}
                    </div>
                </div>
                <div class="text-center bg-gray-900 px-3 py-2 rounded-lg border border-gray-700 ml-2">
                    <div class="text-yellow-400 font-black text-2xl leading-none">${p.overallRating}</div>
                    <div class="text-gray-500 text-[9px] font-bold mt-1 uppercase">OVR</div>
                </div>
            </div>

            <div class="flex justify-between items-center text-xs mb-4 bg-gray-900 p-2 rounded">
                <span class="text-gray-400 font-bold uppercase text-[10px]">Potencial Estimado</span>
                <span class="text-green-400 font-black text-sm">${potential}</span>
            </div>

            <div class="mb-4">${attrBars}</div>

            <div class="mb-5 bg-gray-900 rounded-lg p-3 border border-gray-700">
                <div class="flex justify-between items-center mb-1.5">
                    <span class="text-gray-400 text-[11px] font-bold uppercase tracking-wider">⚡ Stamina Atual</span>
                    <span class="text-[11px] font-black ${staTextColor}">${sta}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2.5">
                    <div class="${staBarColor} h-2.5 rounded-full transition-all" style="width:${sta}%"></div>
                </div>
                <p class="text-[10px] text-gray-500 mt-1 text-center italic">${staLabel}</p>
            </div>

            <div class="border-t border-gray-700 pt-4 space-y-2 text-xs">
                <div class="flex justify-between">
                    <span class="text-gray-400">Valor de mercado</span>
                    <span class="text-green-300 font-bold">R$ ${(p.marketValue||0).toFixed(1)}M</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Salário</span>
                    <span class="text-blue-300 font-bold">R$ ${(p.salary||0).toFixed(0)}k/mês</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Contrato</span>
                    <span class="${contractColor} font-bold">${p.contract||1} ano(s)</span>
                </div>
                <div class="flex justify-between mt-3 pt-3 border-t border-gray-700">
                    <span class="text-gray-400">Gols na temporada</span>
                    <span class="text-yellow-400 font-black">${p.goals||0}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Partidas Jogadas</span>
                    <span class="text-white font-bold">${p.gamesPlayed||0}</span>
                </div>
            </div>
        </div>
    `;
}

// Função auxiliar para desenhar a barrinha de estatísticas colorida
function createStatBar(label, homeValue, awayValue, isPercentage = false) {
    const total = homeValue + awayValue || 1; // Evita divisão por zero
    const homeWidth = (homeValue / total) * 100;
    const awayWidth = (awayValue / total) * 100;
    const symbol = isPercentage ? '%' : '';

    return `
        <div class="mb-2">
            <div class="flex justify-between text-xs text-gray-400 font-bold mb-1 px-1">
                <span>${homeValue}${symbol}</span>
                <span class="text-[10px] uppercase text-gray-500">${label}</span>
                <span>${awayValue}${symbol}</span>
            </div>
            <div class="flex h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div style="width: ${homeWidth}%" class="bg-blue-500"></div>
                <div style="width: ${awayWidth}%" class="bg-red-500"></div>
            </div>
        </div>
    `;
}

// --- 1. TELA EXCLUSIVA DE ESTATÍSTICAS DO SEU TIME ---
function renderPlayerStatsModal(res) {
    if (!res) return;
    const content = document.getElementById('player-stats-content');
    
    if (!res.events) {
        res.events = generateMatchEvents(res);
    }

    let bgColor = 'bg-gray-800 border-gray-700';
    const playerIsHome = res.homeTeam.id === gameState.playerTeam.id;
    if((playerIsHome && res.homeGoals > res.awayGoals) || (!playerIsHome && res.awayGoals > res.homeGoals)) {
        bgColor = 'bg-green-900 border-green-500'; 
    } else if (res.homeGoals === res.awayGoals) {
        bgColor = 'bg-yellow-900 border-yellow-600'; 
    } else {
        bgColor = 'bg-red-900 border-red-500'; 
    }

    // Botões mais enxutos (py-3 em vez de py-4)
    let buttonsHTML = '';
    if (gameMode === 'friendly') {
        buttonsHTML = `
            <div class="mt-4 flex flex-col sm:flex-row justify-between gap-3">
                <button onclick="rematchFriendly()" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition shadow border-b-4 border-green-800 text-sm">
                    🔄 Revanche
                </button>
                <button onclick="backToFriendlySetup()" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition shadow border-b-4 border-blue-800 text-sm">
                    🔁 Mudar Times
                </button>
                <button onclick="exitToMainMenu()" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition shadow border-b-4 border-gray-800 text-sm">
                    🏠 Sair
                </button>
            </div>
        `;
    } else {
        buttonsHTML = `
            <div class="mt-4 flex justify-between gap-3">
                <button onclick="closeModal('player-stats-modal'); openModal('round-results-modal')" class="w-1/2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition shadow border-b-4 border-blue-800 text-sm">
                    Ver Restante da Rodada
                </button>
                <button onclick="closeModal('player-stats-modal')" class="w-1/2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition shadow border-b-4 border-gray-800 text-sm">
                    Avançar no Campeonato
                </button>
            </div>
        `;
    }

    // Timeline Compacta
    // Adiciona o 'sub' no filtro
    const keyEvents = res.events.filter(e => e.type === 'goal' || e.type === 'card' || e.type === 'sub').sort((a, b) => a.minute - b.minute);
    
    let eventsHTML = '';
    if (keyEvents.length > 0) {
        const eventsList = keyEvents.map(ev => {
            const isHome = ev.team === 'home';
            // Escolhe o ícone: Gol, Troca ou Cartão
            const icon = ev.type === 'goal' ? '⚽' : (ev.type === 'sub' ? '🔄' : (ev.isRed ? '🟥' : '🟨'));
            // Pega a foto certa
            const photoUrl = (ev.type === 'sub' ? ev.playerIn?.photo : ev.player?.photo) || 'https://placehold.co/28x28/2d3748/ffffff?text=?';
            
            // Escreve o nome baseado no tipo de evento
            let playerName = 'Jogador';
            if (ev.type === 'sub') playerName = `IN: ${ev.playerIn?.name.split(' ')[0]} | OUT: ${ev.playerOut?.name.split(' ')[0]}`;
            else playerName = ev.player?.name || 'Jogador';        

            if (isHome) {
                return `
                    <div class="flex items-center justify-between text-[11px] py-1 border-b border-gray-800 last:border-0 hover:bg-gray-800 transition px-2">
                        <div class="flex items-center gap-2 w-1/2">
                            <span class="text-gray-500 font-black w-5 text-left">${ev.minute}'</span>
                            <span title="${ev.type}">${icon}</span>
                            <img src="${photoUrl}" class="h-5 w-5 rounded-full object-cover border border-gray-600 bg-gray-700">
                            <span class="font-bold text-gray-200 truncate">${playerName}</span>
                        </div>
                        <div class="w-1/2"></div>
                    </div>`;
            } else {
                return `
                    <div class="flex items-center justify-between text-[11px] py-1 border-b border-gray-800 last:border-0 hover:bg-gray-800 transition px-2">
                        <div class="w-1/2"></div>
                        <div class="flex items-center gap-2 w-1/2 justify-end text-right">
                            <span class="font-bold text-gray-200 truncate">${playerName}</span>
                            <img src="${photoUrl}" class="h-5 w-5 rounded-full object-cover border border-gray-600 bg-gray-700">
                            <span title="${ev.type}">${icon}</span>
                            <span class="text-gray-500 font-black w-5 text-right">${ev.minute}'</span>
                        </div>
                    </div>`;
            }
        }).join('');

        // max-h-32 garante que a timeline não fique gigante
        eventsHTML = `
            <div class="bg-gray-900 border-t border-gray-700 py-2 px-6">
                <h3 class="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1.5 text-center">Resumo da Partida</h3>
                <div class="flex flex-col max-h-32 overflow-y-auto custom-scrollbar pr-2">
                    ${eventsList}
                </div>
            </div>
        `;
    }

    // Redução drástica de paddings: p-6 virou py-4 px-6 | gap-3 virou gap-2
    content.innerHTML = `
        <div class="flex flex-col border-l-8 ${bgColor} rounded-lg shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 bg-gray-900">
                <div class="flex flex-col items-center w-2/5">
                    <img src="${res.homeTeam.logo}" class="h-12 w-12 object-contain mb-1">
                    <span class="font-bold text-base text-center">${res.homeTeam.name}</span>
                </div>
                <div class="font-black text-3xl px-5 py-1 bg-black border border-gray-700 rounded-lg tracking-widest text-white shadow-inner">
                    <span>${res.homeGoals}</span><span class="text-gray-600 mx-1">-</span><span>${res.awayGoals}</span>
                </div>
                <div class="flex flex-col items-center w-2/5">
                    <img src="${res.awayTeam.logo}" class="h-12 w-12 object-contain mb-1">
                    <span class="font-bold text-base text-center">${res.awayTeam.name}</span>
                </div>
            </div>
            
            <div class="flex flex-col bg-gray-800 px-6 py-4 border-t border-gray-700 gap-2">
                ${createStatBar('Posse de Bola', res.homePossession, res.awayPossession, true)}
                ${createStatBar('Chutes a Gol', res.homeShots, res.awayShots)}
                ${createStatBar('Passes Trocados', res.homePasses, res.awayPasses)}
                ${createStatBar('Precisão de Passe', res.homePassAcc, res.awayPassAcc, true)}
            </div>
            
            ${eventsHTML}
        </div>
        ${buttonsHTML} 
    `;
    
    openModal('player-stats-modal');
}

// --- 2. TELA SIMPLIFICADA COM TODOS OS JOGOS DA RODADA ---
function renderMatchResultsModal(results) {
    const modalContent = document.getElementById('round-results-content');
    const modalTitle = document.getElementById('round-results-title');
    modalTitle.textContent = `Resultados da Rodada ${gameState.currentRound - 1}`; // -1 porque a rodada já virou no app.js
    modalContent.innerHTML = '';
    
    results.forEach(res => {
        const isPlayerMatch = res.homeTeam.id === gameState.playerTeam.id || res.awayTeam.id === gameState.playerTeam.id;
        
        // Destaca a sua partida na lista com uma cor diferente
        const bgColor = isPlayerMatch ? 'bg-blue-900 border-blue-500' : 'bg-gray-800 border-gray-700';

        modalContent.innerHTML += `
            <div class="flex items-center justify-between p-3 mb-2 border-l-4 ${bgColor} rounded-r-lg shadow">
                <div class="flex items-center text-right w-2/5 justify-end">
                    <span class="font-semibold mr-2">${res.homeTeam.name}</span>
                    <img src="${res.homeTeam.logo}" class="h-6 w-6 object-contain">
                </div>
                <div class="font-bold text-xl mx-4 px-2 py-1 bg-gray-900 rounded text-white shadow-inner">
                    <span>${res.homeGoals}</span> - <span>${res.awayGoals}</span>
                </div>
                <div class="flex items-center text-left w-2/5">
                    <img src="${res.awayTeam.logo}" class="h-6 w-6 object-contain mr-2">
                    <span class="font-semibold">${res.awayTeam.name}</span>
                </div>
            </div>`;
    });
}

// --- DRAG AND DROP ---
let draggedItem = null;
let originalParent = null;

function handleDragStart(e) {
    draggedItem = e.target;
    originalParent = e.target.parentElement;
    setTimeout(() => { e.target.style.display = 'none'; }, 0);
}

function addDropTargetListeners(target) {
    target.addEventListener('dragover', handleDragOver);
    target.addEventListener('dragenter', handleDragEnter);
    target.addEventListener('dragleave', handleDragLeave);
    target.addEventListener('drop', handleDrop);
}

function handleDragOver(e) { e.preventDefault(); }
function handleDragEnter(e) {
    e.preventDefault();
    const target = e.target.closest('.player-position, .player-list-container');
    if(target) target.classList.add('over');
}
function handleDragLeave(e) {
     const target = e.target.closest('.player-position, .player-list-container');
     if(target) target.classList.remove('over');
}

function refreshAdvancedOptions() {
    const container = document.getElementById('advanced-options-container');
    if (!container) return;

    const starters = gameState.playerTeam.players.filter(p => p.isStarter);
    const starterNames = starters.map(p => p.name);

    const roles = gameState.roles;
    ['captain', 'penalties', 'freeKicks', 'corners'].forEach(role => {
        if (roles[role] && !starterNames.includes(roles[role])) roles[role] = null;
    });

    container.innerHTML = `
        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg w-full">
            <h3 class="text-yellow-400 font-black uppercase tracking-wider mb-3 text-[11px] flex items-center">
                <span class="mr-2">⚙️</span> Opções do Time
            </h3>
            <div class="grid grid-cols-2 gap-3">
                ${renderRoleSelect("Capitão Ⓒ", "captain", starters)}
                ${renderRoleSelect("Pênaltis ⚽", "penalties", starters)}
                ${renderRoleSelect("Faltas 🎯", "freeKicks", starters)}
                ${renderRoleSelect("Escanteios 🚩", "corners", starters)}
            </div>
        </div>
    `;
}

function renderTacticsScreen() {
    const container = document.getElementById('tactics-screen');
    const pitchEl = document.getElementById('pitch');
    const reservesEl = document.getElementById('reserves-list');
    const unlistedEl = document.getElementById('unlisted-list');
    pitchEl.innerHTML = ''; reservesEl.innerHTML = ''; unlistedEl.innerHTML = '';

    document.getElementById('squad-count').textContent = `Total de jogadores no plantel: ${gameState.playerTeam.players.length}`;
    document.querySelectorAll('.formation-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === gameState.currentFormation) btn.classList.add('active');
    });

    const formationLayout = formations[gameState.currentFormation];
    formationLayout.forEach((pos, index) => {
        const posEl = document.createElement('div');
        posEl.classList.add('player-position');
        posEl.style.top = pos.top; posEl.style.left = pos.left;
        posEl.style.transform = `translateX(${pos.translateX})`;
        posEl.dataset.positionType = pos.position;
        posEl.dataset.positionIndex = index;
        posEl.innerHTML = `<span>${pos.position}</span>`;
        pitchEl.appendChild(posEl);
        addDropTargetListeners(posEl);
    });

    const posOrder = ['GOL', 'LE', 'ZAG', 'LD', 'VOL', 'MC', 'MEI', 'ME', 'PE', 'MD', 'PD', 'SA', 'ATA'];
    
    const starters = gameState.playerTeam.players.filter(p => p.isStarter);
    
    // Atualiza o painel de funções (Capitão, Faltas, etc)
    refreshAdvancedOptions();

    // Puxa o banco de reservas balanceado pela nossa nova inteligência artificial
    const { bench: reserves, unlisted } = getBalancedBench(gameState.playerTeam);
    const positionSlots = Array.from(document.querySelectorAll('.player-position'));

    // --- NOVO SISTEMA DE DISTRIBUIÇÃO VISUAL (O Funil de 4 Fases) ---
    // Ordenamos os titulares pelo Overall para os craques terem prioridade na "escolha" da vaga
    let unplacedStarters = starters.sort((a,b) => b.overallRating - a.overallRating);

    // FASE 1: Especialistas na Posição Primária
    unplacedStarters = unplacedStarters.filter(player => {
        let slot = positionSlots.find(s => s.children.length === 1 && s.dataset.positionType === player.primaryPosition);
        if (slot) {
            slot.appendChild(createPlayerToken(player, slot.dataset.positionType));
            return false; // Jogador foi alocado, tira da fila
        }
        return true; // Continua sem vaga
    });

    // FASE 2: Polivalentes (Posição Secundária)
    unplacedStarters = unplacedStarters.filter(player => {
        let slot = positionSlots.find(s => s.children.length === 1 && player.secondaryPositions.includes(s.dataset.positionType));
        if (slot) {
            slot.appendChild(createPlayerToken(player, slot.dataset.positionType));
            return false;
        }
        return true;
    });

    // FASE 3: Improviso de Setor (Mesmo Grupo)
    unplacedStarters = unplacedStarters.filter(player => {
        const pGroup = POSITIONS[player.primaryPosition].group;
        let slot = positionSlots.find(s => s.children.length === 1 && POSITIONS[s.dataset.positionType].group === pGroup);
        if (slot) {
            slot.appendChild(createPlayerToken(player, slot.dataset.positionType));
            return false;
        }
        return true;
    });

    // FASE 4: Onde tiver buraco (Desespero)
    unplacedStarters.forEach(player => {
        let slot = positionSlots.find(s => s.children.length === 1);
        if (slot) {
            slot.appendChild(createPlayerToken(player, slot.dataset.positionType));
        } else {
            // Só cai aqui se houver um bug com mais de 11 titulares
            player.isStarter = false; 
            unlisted.push(player); 
        }
    });
    
    // Jogadores no banco não recebem slotPosition, então ficam com a borda verde padrão
    reserves.forEach(player => reservesEl.appendChild(createPlayerToken(player)));
    unlisted.forEach(player => unlistedEl.appendChild(createPlayerToken(player)));
}

function renderRoleSelect(label, roleKey, players) {
    let options = `<option value="">Selecionar...</option>`;
    
    players.forEach(p => {
        const selected = gameState.roles[roleKey] === p.name ? 'selected' : '';
        options += `<option value="${p.name}" ${selected}>${p.name} (${p.primaryPosition})</option>`;
    });

    return `
        <div class="flex flex-col">
            <label class="text-gray-400 text-xs font-bold uppercase mb-2">${label}</label>
            <select onchange="setTeamRole('${roleKey}', this.value)" class="bg-gray-900 text-white border border-gray-600 rounded p-2 text-sm focus:border-yellow-500 outline-none">
                ${options}
            </select>
        </div>
    `;
}

function createPlayerToken(player, slotPosition = null) {
    const token = document.createElement('div');
    token.className = 'player-token';
    token.draggable = true;
    token.dataset.playerId = player.id;
    
    let statusClass = 'status-green'; 
    if (slotPosition) {
        if (player.primaryPosition === slotPosition) {
            statusClass = 'status-green';
        } else if (player.secondaryPositions && player.secondaryPositions.includes(slotPosition)) {
            statusClass = 'status-yellow';
        } else if (SISTER_POSITIONS[player.primaryPosition] && SISTER_POSITIONS[player.primaryPosition].includes(slotPosition)) {
            // Se for posição irmã (ex: PD no MD), fica amarelo também!
            statusClass = 'status-yellow';
        } else {
            statusClass = 'status-red';
        }
    }

    const attrs = player.attributes || {};
    const vel = attrs.speed || 50;
    const fin = attrs.finishing || 50;
    const pas = attrs.passing || 50;
    const def = attrs.tackling || 50;
    const teamLogo = gameState.playerTeam.logo; 
    
    // --- LÓGICA DO NOME DA CARTINHA ---
    const nameParts = player.name.trim().split(' ');
    let displayName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : player.name;
    
    // Se o último nome for um sufixo, pega o anterior junto (ex: "Neymar Jr", "João Neto")
    const suffixes = ['jr', 'jr.', 'filho', 'neto', 'sobrinho'];
    if (nameParts.length > 1 && suffixes.includes(displayName.toLowerCase())) {
        displayName = nameParts[nameParts.length - 2] + ' ' + displayName;
    }

    // LÓGICA DA STAMINA PARA A CARTINHA
    const sta = player.currentStamina ?? 100;
    const staColor = sta >= 70 ? 'bg-green-500' : sta >= 40 ? 'bg-yellow-500' : 'bg-red-500';

    token.innerHTML = `
        <div class="card-header-info">
            <span class="card-overall">${player.overallRating}</span>
            <div class="flex flex-col items-center">
                <img src="${teamLogo}" class="card-logo mb-1" onerror="this.style.display='none'">
                <span class="card-pos">${player.primaryPosition}</span>
            </div>
        </div>
        <div class="card-photo-container">
            <img src="${player.photo}" class="card-photo ${statusClass}" onerror="this.onerror=null;this.src='https://placehold.co/48x48/2d3748/ffffff?text=?';">
        </div>
        <div class="card-name text-yellow-400 font-black uppercase tracking-wider flex-shrink-0 min-h-[16px] w-full text-center" title="${player.name}">${displayName}</div>
        <div class="card-stats">
            <div class="stat-item"><span class="stat-label">VEL</span><span class="stat-val">${vel}</span></div>
            <div class="stat-item"><span class="stat-label">FIN</span><span class="stat-val">${fin}</span></div>
            <div class="stat-item"><span class="stat-label">PAS</span><span class="stat-val">${pas}</span></div>
            <div class="stat-item"><span class="stat-label">DEF</span><span class="stat-val">${def}</span></div>
        </div>
        <div class="w-full mt-1 bg-gray-900 rounded-full h-1 border border-gray-600" title="Fôlego: ${sta}%">
            <div class="${staColor} h-1 rounded-full" style="width:${sta}%"></div>
        </div>
    `;
    token.addEventListener('dragstart', handleDragStart);
    token.addEventListener('dragend', handleDragEnd);
    return token;
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedItem) return;

    // Limpa qualquer efeito visual de hover que tenha ficado travado
    document.querySelectorAll('.over').forEach(el => el.classList.remove('over'));

    draggedItem.style.display = 'flex';
    const playerId = draggedItem.dataset.playerId;
    const player = gameState.playerTeam.players.find(p => p.id == playerId);

    // Identifica onde exatamente soltamos o jogador
    const targetToken = e.target.closest('.player-token'); // Soltou em cima de outra carta?
    const dropZone = e.target.closest('.player-position, .player-list-container'); // Soltou num espaço?

    if (!player || (!dropZone && !targetToken)) {
        if (originalParent) originalParent.appendChild(draggedItem);
        draggedItem = null; originalParent = null;
        return;
    }

    // --- CÁLCULO MÁGICO DE TROCA DIRETA (SWAP) ---
    // Se você soltar uma carta EM CIMA de outra carta (seja no campo ou no banco)
    if (targetToken && targetToken !== draggedItem) {
        const targetPlayerId = targetToken.dataset.playerId;
        const targetPlayer = gameState.playerTeam.players.find(p => p.id == targetPlayerId);
        const targetParent = targetToken.parentElement;

        if (targetPlayer) {
            // 1. O jogador que estava quieto vai para o lugar de onde o outro saiu
            originalParent.appendChild(targetToken);
            targetPlayer.isStarter = originalParent.classList.contains('player-position');
            
            // Atualiza a cor de quem foi empurrado
            const originalSlot = originalParent.classList.contains('player-position') ? originalParent.dataset.positionType : null;
            updateTokenColor(targetToken, targetPlayer, originalSlot);

            // 2. O jogador arrastado ocupa o novo lugar
            targetParent.appendChild(draggedItem);
            player.isStarter = targetParent.classList.contains('player-position');
            
            // Atualiza a cor de quem acabou de chegar
            const newSlot = targetParent.classList.contains('player-position') ? targetParent.dataset.positionType : null;
            updateTokenColor(draggedItem, player, newSlot);
        }
    } else if (dropZone) {
        if (dropZone.classList.contains('player-position') && dropZone.children.length === 1) {
            // Soltou num slot vazio no campo
            dropZone.appendChild(draggedItem);
            player.isStarter = true;
            updateTokenColor(draggedItem, player, dropZone.dataset.positionType);
        } else if (dropZone.classList.contains('player-list-container')) {
            
            // --- NOVA TRAVA: LIMITE DE 10 NO BANCO ---
            if (dropZone.id === 'reserves-list' && dropZone.children.length >= 10 && originalParent.id !== 'reserves-list') {
                alert("O banco de reservas permite no máximo 10 jogadores!");
                originalParent.appendChild(draggedItem); // Devolve a carta pra onde ela veio
                draggedItem = null; 
                originalParent = null;
                return; // Para a execução do código aqui
            }

            // Se passou da trava, solta no final da fila normalmente
            dropZone.appendChild(draggedItem);
            player.isStarter = false;
            updateTokenColor(draggedItem, player, null);
        }
    }

    // Limpa a memória do Drag and Drop e recalcula o Overall do time
    draggedItem = null; 
    originalParent = null;
    calculateTeamOveralls();

    // Atualiza os selects de Capitão/Faltas/Escanteios/Pênaltis com os titulares atuais
    refreshAdvancedOptions();
}

function handleDragEnd(e) {
    // Quando o arrasto termina, independente de onde for, garante que a carta volte a aparecer!
    e.target.style.display = 'flex';
    
    // Limpa qualquer efeito visual verde que tenha ficado travado nos slots
    document.querySelectorAll('.over').forEach(el => el.classList.remove('over'));

    // Reseta as variáveis de memória do mouse
    draggedItem = null;
    originalParent = null;
}

// NOVA FUNÇÃO: Atualiza apenas as bordas (Verde/Amarelo/Vermelho) sem recarregar o campo
function updateTokenColor(tokenEl, player, slotPosition) {
    const photoEl = tokenEl.querySelector('.card-photo');
    if (!photoEl) return;

    // Limpa as cores antigas
    photoEl.classList.remove('status-green', 'status-yellow', 'status-red');

    // Aplica a nova cor baseada na adaptação
    if (slotPosition) {
        if (player.primaryPosition === slotPosition) {
            photoEl.classList.add('status-green');
        } else if (player.secondaryPositions && player.secondaryPositions.includes(slotPosition)) {
            photoEl.classList.add('status-yellow');
        } else if (SISTER_POSITIONS[player.primaryPosition] && SISTER_POSITIONS[player.primaryPosition].includes(slotPosition)) {
            photoEl.classList.add('status-yellow'); // Irmãs ficam amarelas
        } else {
            photoEl.classList.add('status-red');
        }
    } else {
        photoEl.classList.add('status-green'); 
    }
}
// --- RENDERIZAÇÃO DO PRÉ-JOGO E SIMULAÇÃO AO VIVO ---

function renderPreMatchScreen() {
    const preMatchScreen = document.getElementById('pre-match-screen');
    const match = gameState.schedule[gameState.currentRound - 1].find(m => m.home.id === gameState.playerTeam.id || m.away.id === gameState.playerTeam.id);
    const isHome = match.home.id === gameState.playerTeam.id;

    const posOrder = ['GOL', 'LE', 'ZAG', 'LD', 'VOL', 'MC', 'MEI', 'ME', 'PE', 'MD', 'PD', 'SA', 'ATA'];
    
    // FUNÇÃO HELPER: Gera as listas de titulares formatadas
    // FUNÇÃO HELPER: Gera as listas de titulares formatadas
    const renderLineupList = (team, isPlayerTeam) => {
        const starters = team.players.filter(p => p.isStarter).sort((a,b) => {
            const posDiff = posOrder.indexOf(a.primaryPosition) - posOrder.indexOf(b.primaryPosition);
            if (posDiff !== 0) return posDiff;
            return b.overallRating - a.overallRating;
        });

        // A CPU calcula a própria tática, se for seu time, pega da variável global
        const taticName = isPlayerTeam ? gameState.currentFormation : (team.currentFormation || 'Tática Custom');

        // DECLARAÇÃO DO HTML AQUI (Esta foi a linha que faltou!)
        let html = `
            <div class="bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6 rounded-xl shadow-2xl border border-gray-800 h-full relative overflow-hidden">
                <h3 class="text-center text-gray-400 text-[10px] tracking-[0.2em] uppercase mb-4 font-bold relative z-10 border-b border-gray-700 pb-2">${team.name} <br><span class="text-yellow-500">${taticName}</span></h3>
                <div class="flex flex-col gap-2.5 relative z-10">
        `;

        starters.forEach(p => {
            const isCaptain = isPlayerTeam && gameState.roles.captain === p.name;
            const captainIconHTML = isCaptain ? '<span class="text-red-600 font-bold italic text-xs flex-shrink-0 ml-1.5" title="Capitão">(C)</span>' : '';
            
            // Stamina: número detalhado para o seu time, barrinha discreta para a CPU
            const sta = p.currentStamina ?? 100;
            const staBarColor  = sta >= 70 ? 'bg-green-500' : sta >= 40 ? 'bg-yellow-500' : 'bg-red-500';
            const staTextColor = sta >= 70 ? 'text-green-400' : sta >= 40 ? 'text-yellow-400' : 'text-red-400';
            const staminaHTML = isPlayerTeam
                ? `<span class="text-[10px] font-black ${staTextColor} mr-1" title="Fôlego atual">⚡${sta}%</span>`
                : `<div class="w-10 bg-gray-700 rounded-full h-1.5 mr-1.5" title="Energia: ${sta}%">
                       <div class="${staBarColor} h-1.5 rounded-full" style="width:${sta}%"></div>
                   </div>`;

            html += `
                <div class="flex items-center justify-between group py-1">
                    <div class="flex items-center gap-3 min-w-0"> 
                        <div class="w-6 text-right font-black text-sm text-gray-500">${p.number}</div>
                        <img src="${p.photo}" class="h-7 w-7 object-cover rounded-full bg-gray-700 border border-gray-600 flex-shrink-0 shadow-sm" onerror="this.onerror=null;this.src='https://placehold.co/28x28/2d3748/ffffff?text=?';">
                        <div class="flex items-center min-w-0" title="${p.name}">
                            <span class="text-sm font-bold tracking-wide text-gray-200 group-hover:text-white transition-colors truncate">
                                ${p.name}
                            </span>
                            ${captainIconHTML}
                        </div>
                    </div>
                    
                    <div class="flex items-center flex-shrink-0">
                        ${staminaHTML}
                        <span class="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded font-bold border border-gray-700">${p.primaryPosition}</span>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        return html;
    };

    // Monta os blocos Esquerdo e Direito
    const homeLineupHTML = renderLineupList(match.home, isHome);
    const awayLineupHTML = renderLineupList(match.away, !isHome);

    // Monta o bloco Central
    // Monta o bloco Central
    let detailsHTML = `
        <div class="flex flex-col h-full justify-center gap-6">
            <div class="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 text-center flex-grow flex flex-col justify-center">
                <h2 class="text-2xl font-black text-yellow-400 uppercase tracking-widest mb-1">Dia de Jogo</h2>
                <p class="text-gray-400 font-semibold tracking-wide uppercase text-[10px] mb-6">Rodada ${gameState.currentRound} | Brasileirão</p>
                
                <div class="flex justify-between items-center mb-6">
                    <div class="w-1/3 text-center">
                        <img src="${match.home.logo}" class="h-20 w-20 mx-auto object-contain drop-shadow-lg mb-2">
                        <p class="font-bold text-sm leading-tight">${match.home.name}</p>
                    </div>
                    <div class="w-1/3 flex flex-col items-center">
                        <p class="text-4xl font-black text-gray-600 tracking-tighter">X</p>
                    </div>
                    <div class="w-1/3 text-center">
                        <img src="${match.away.logo}" class="h-20 w-20 mx-auto object-contain drop-shadow-lg mb-2">
                        <p class="font-bold text-sm leading-tight">${match.away.name}</p>
                    </div>
                </div>
                
                <div class="w-full h-28 mb-2 rounded-lg overflow-hidden border border-gray-700 shadow-inner bg-gray-900">
                    <img src="${match.home.stadiumPhoto || 'https://placehold.co/600x200/1a202c/4a5568?text=Est%C3%A1dio'}" 
                         class="w-full h-full object-cover opacity-90" 
                         onerror="this.src='https://placehold.co/600x200/1a202c/4a5568?text=Est%C3%A1dio'">
                </div>

                <div class="bg-gray-900 rounded-lg p-3 text-xs text-gray-400 inline-block border border-gray-700 w-full truncate">
                    📍 <span class="font-bold text-gray-200">${match.home.stadium}</span>
                </div>
            </div>
            
            <div class="flex flex-col gap-3">
                <button onclick="tacticsReturnScreen='pre-match-screen'; showScreen('tactics-screen')" class="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow transition uppercase tracking-wider text-sm border-b-4 border-blue-900">
                    Ajustar Táticas
                </button>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="startQuickSim()" class="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-2 rounded-xl shadow transition uppercase tracking-wider text-[10px] border-b-4 border-gray-800">
                        Simulação Rápida
                    </button>
                    <button onclick="startDeepSim()" class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-2 rounded-xl shadow transition uppercase tracking-wider text-[10px] border-b-4 border-green-800">
                        Simulação Aprofundada
                    </button>
                </div>
                <button onclick="if(gameMode==='friendly'){ showScreen('friendly-setup-screen'); } else { showScreen('main-hub-screen'); }" class="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white font-bold py-2 px-4 rounded-xl shadow transition uppercase tracking-wider text-[10px] border-b-4 border-gray-900 mt-1">
                    🔙 Voltar ao Menu
                </button>
            </div>
        </div>
    `;

    // Gruda tudo em um Grid Responsivo
    preMatchScreen.innerHTML = `
        <div class="max-w-7xl mx-auto p-4 grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1.5fr] gap-6 mt-4 items-stretch">
            <div class="w-full h-[500px] md:h-auto">${homeLineupHTML}</div>
            <div class="w-full h-auto">${detailsHTML}</div>
            <div class="w-full h-[500px] md:h-auto">${awayLineupHTML}</div>
        </div>
    `;
}

function updateLiveScoreboard(homeScore, awayScore, minute) {
    document.getElementById('live-home-score').textContent = homeScore;
    document.getElementById('live-away-score').textContent = awayScore;
    document.getElementById('live-match-time').textContent = minute >= 90 ? "FIM" : minute + "'";
}

function addLiveCommentary(text, type = 'normal') {
    const box = document.getElementById('live-commentary-box');
    const p = document.createElement('div');
    p.className = 'py-1 border-b border-gray-800 last:border-0';
    
    if(type === 'goal') p.innerHTML = `⚽ <span class="text-yellow-400 font-bold">${text}</span>`;
    else if(type === 'foul') p.innerHTML = `🛑 <span class="text-red-400">${text}</span>`;
    else if(type === 'card') p.innerHTML = `🟨 <span class="text-yellow-200">${text}</span>`;
    else if(type === 'warning') p.innerHTML = `<span class="text-orange-400 font-bold animate-pulse">${text}</span>`;  // ← NOVA LINHA
    else p.innerHTML = `<span class="text-gray-300">${text}</span>`;
    
    box.appendChild(p);
    box.scrollTop = box.scrollHeight; // Rola para baixo automaticamente
}


// --- PAINEL DE STAMINA AO VIVO ---
// Renderiza as barrinhas de stamina estimada para o minuto atual da partida.
// Usa o snapshot preMatchStamina + a fórmula de desgaste proporcional ao progresso.
function renderLiveStaminaPanel(currentMinute) {
    const panel = document.getElementById('live-stamina-list');
    if (!panel || !liveResultData) return;

    const playerIsHome = liveResultData.homeTeam.id === gameState.playerTeam.id;
    const myTeam = playerIsHome ? liveResultData.homeTeam : liveResultData.awayTeam;
    const progress = currentMinute / 90;
    const starters = myTeam.players.filter(p => p.isStarter);

    panel.innerHTML = starters.map(p => {
        const staminaStat = p.attributes.stamina || 70;
        const posMultiplier = STAMINA_DRAIN_BY_POSITION[p.primaryPosition] || 1.0;
        const totalDrain = (25 + (100 - staminaStat) * 0.36) * posMultiplier;
        
        // Stamina estimada no minuto atual
        const estimated = Math.max(5, Math.round((p.preMatchStamina ?? 100) - (totalDrain * progress)));
        
        const barColor = estimated >= 70 ? 'bg-green-500' : estimated >= 40 ? 'bg-yellow-500' : 'bg-red-500';
        const textColor = estimated >= 70 ? 'text-green-400' : estimated >= 40 ? 'text-yellow-400' : 'text-red-400';
        const icon = estimated < 38 ? '⚠️ ' : '';

        return `
            <div class="flex items-center gap-2 py-0.5">
                <span class="text-[10px] text-gray-400 w-5 text-center font-bold">${p.primaryPosition}</span>
                <span class="text-[11px] text-gray-300 truncate flex-1" title="${p.name}">${icon}${p.name.split(' ')[0]}</span>
                <div class="w-16 bg-gray-700 rounded-full h-1.5">
                    <div class="${barColor} h-1.5 rounded-full transition-all" style="width:${estimated}%"></div>
                </div>
                <span class="text-[10px] font-bold ${textColor} w-6 text-right">${estimated}</span>
            </div>
        `;
    }).join('');
}

// Agora quando abrir a tela, por padrão ela carrega os Gols
function renderScorersScreen() {
    renderStatsTable('goals');
}

// Nova função dinâmica que serve tanto para Gols quanto para Assistências
function renderStatsTable(statType) {
    const tbody = document.getElementById('scorers-table');
    tbody.innerHTML = '';
    
    // Atualiza o visual das Abas e o título da coluna
    document.querySelectorAll('.stat-tab').forEach(btn => {
        btn.classList.remove('bg-blue-700', 'text-white');
        btn.classList.add('bg-gray-800', 'text-gray-400');
    });
    
    if (statType === 'goals') {
        document.getElementById('tab-goals').classList.replace('bg-gray-800', 'bg-blue-700');
        document.getElementById('tab-goals').classList.replace('text-gray-400', 'text-white');
        document.getElementById('stat-column-name').textContent = 'Gols';
    } else {
        document.getElementById('tab-assists').classList.replace('bg-gray-800', 'bg-blue-700');
        document.getElementById('tab-assists').classList.replace('text-gray-400', 'text-white');
        document.getElementById('stat-column-name').textContent = 'Assistências';
    }
    
    // Filtra e junta todos os jogadores
    let allPlayers = [];
    teamsData.forEach(team => {
        team.players.forEach(p => {
            if (p[statType] > 0) { // Se for 'goals', verifica gols. Se for 'assists', verifica assists.
                allPlayers.push({ ...p, teamName: team.name, teamLogo: team.logo });
            }
        });
    });
    
    // Ordena do maior para o menor
    allPlayers.sort((a, b) => b[statType] - a[statType]);
    
    // Renderiza a tabela com a Foto
    allPlayers.slice(0, 20).forEach((p, index) => {
        tbody.innerHTML += `
            <tr class="border-b border-gray-700 bg-gray-800 hover:bg-gray-700 transition">
                <td class="p-4 text-center font-bold text-gray-500">${index + 1}º</td>
                <td class="p-2 text-center">
                    <div class="h-12 w-12 rounded-full overflow-hidden mx-auto border-2 border-gray-600 bg-gray-900 flex items-center justify-center">
                        <img src="${p.photo}" class="h-full w-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/48x48/2d3748/ffffff?text=?';">
                    </div>
                </td>
                <td class="p-4 font-bold text-lg">${p.name} <span class="text-xs bg-gray-900 text-gray-400 px-2 py-1 rounded ml-2">${p.primaryPosition}</span></td>
                <td class="p-4 flex items-center h-16"><img src="${p.teamLogo}" class="h-6 w-6 mr-3 object-contain">${p.teamName}</td>
                
                <td class="p-4 text-center font-bold text-gray-400">${p.gamesPlayed}</td>
                
                <td class="p-4 text-yellow-400 font-black text-2xl text-center">${p[statType]}</td>
            </tr>
        `;
    });
}

// --- LÓGICA DO CALENDÁRIO ESTILO FIFA ---
let currentCalendarDate = null;

function openCalendarModal() {
    if (!currentCalendarDate) currentCalendarDate = new Date(gameState.currentDate);
    renderCalendar();
    openModal('calendar-modal');
}

function changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Dom, 6 = Sáb
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Preenche os espaços vazios do começo do mês
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    // Preenche os dias reais
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = new Date(year, month, day).toDateString() === gameState.currentDate.toDateString();
        let matchHTML = '';
        let bgClass = '';

        // Procura se tem jogo do nosso time neste dia
        let foundMatch = null;
        for (const round of gameState.schedule) {
            for (const match of round) {
                if ((match.home.id === gameState.playerTeam.id || match.away.id === gameState.playerTeam.id) &&
                    match.date.getFullYear() === year && match.date.getMonth() === month && match.date.getDate() === day) {
                    foundMatch = match;
                    break;
                }
            }
            if(foundMatch) break;
        }

        if (foundMatch) {
            const isHome = foundMatch.home.id === gameState.playerTeam.id;
            const opponent = isHome ? foundMatch.away : foundMatch.home;
            const homeAwayText = isHome ? 'CASA' : 'FORA';

            matchHTML = `
                <span class="text-[9px] text-gray-400 font-bold mb-1">${homeAwayText}</span>
                <img src="${opponent.logo}" class="calendar-match-logo" onerror="this.onerror=null;this.src='https://placehold.co/40x40/2d3748/ffffff?text=?';">
            `;

            if (foundMatch.played) {
                const myGoals = isHome ? foundMatch.homeGoals : foundMatch.awayGoals;
                const oppGoals = isHome ? foundMatch.awayGoals : foundMatch.homeGoals;
                let resultColor = 'text-yellow-400'; // Cor padrão (Empate)
                if (myGoals > oppGoals) { resultColor = 'text-green-400'; bgClass = 'win-bg'; }
                if (myGoals < oppGoals) { resultColor = 'text-red-400'; bgClass = 'loss-bg'; }

                matchHTML += `<div class="calendar-score ${resultColor}">${myGoals} - ${oppGoals}</div>`;
            }
        }

        grid.innerHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${bgClass}">
                <span class="calendar-date-num">${day}</span>
                ${matchHTML}
            </div>
        `;
    }
}

function openPatchNotes() {
    const content = document.getElementById('patch-notes-content');
    
    document.getElementById('game-version-text').textContent = patchNotes[0].version;

    content.innerHTML = patchNotes.map(patch => `
        <div class="mb-6 border-b border-gray-700 pb-4 last:border-0">
            <div class="flex justify-between items-end mb-3">
                <h3 class="text-xl font-black text-yellow-400">v${patch.version} - ${patch.title}</h3>
                <span class="text-xs text-gray-400 font-bold bg-gray-900 px-2 py-1 rounded border border-gray-700">${patch.date}</span>
            </div>
            <ul class="list-disc pl-5 text-gray-300 space-y-2 text-sm">
                ${patch.changes.map(c => `<li>${c}</li>`).join('')}
            </ul>
        </div>
    `).join('');

    openModal('patch-notes-modal');
}

// --- NOVA FUNÇÃO: RENDERIZA OS TIMES E O BANCO AO VIVO ---
// --- NOVA FUNÇÃO: RENDERIZA OS TIMES E O BANCO AO VIVO ---
function renderLiveMatchPanels(currentMinute) {
    if (!liveResultData) return;

    // Função interna para desenhar um time (Casa ou Fora)
    const renderTeamLineup = (team, containerId, isHome) => {
        const container = document.getElementById(containerId);
        const starters = team.players.filter(p => p.isStarter);
        const isMyTeam = team.id === gameState.playerTeam.id; // Descobre se é o time do jogador

        let html = `<h3 class="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-700 pb-2">${team.name}</h3><div class="flex flex-col gap-1.5">`;
        
        starters.forEach(p => {
            // CORREÇÃO: Calcula o cansaço SÓ baseado nos minutos que ele esteve em campo!
            const playTime = currentMinute - (p.subbedInMinute || 0);
            const realProgress = playTime / 90;

            const staminaStat = p.attributes.stamina || 70;
            const posMultiplier = STAMINA_DRAIN_BY_POSITION[p.primaryPosition] || 1.0;
            const totalDrain = (25 + (100 - staminaStat) * 0.36) * posMultiplier;
            const estimated = Math.max(5, Math.round((p.preMatchStamina ?? 100) - (totalDrain * realProgress)));
            
            const barColor = estimated >= 70 ? 'bg-green-500' : estimated >= 40 ? 'bg-yellow-500' : 'bg-red-500';
            const textColor = estimated >= 70 ? 'text-green-400' : estimated >= 40 ? 'text-yellow-400' : 'text-red-400';
            const icon = estimated < 38 ? '⚠️' : ''; 

            // LÓGICA DE CLIQUE E SELEÇÃO (Faltava isso!)
            const isSelected = typeof liveSelectedPlayerId !== 'undefined' && liveSelectedPlayerId === p.id;
            const activeStyle = isSelected ? 'border-yellow-400 bg-yellow-900/50' : 'border-gray-700 bg-gray-900';
            const clickEvent = isMyTeam ? `onclick="handleLivePlayerClick(${p.id})"` : '';
            const cursorStyle = (isMyTeam && typeof liveIsPaused !== 'undefined' && liveIsPaused) ? 'cursor-pointer hover:border-yellow-500' : '';

            html += `
                <div ${clickEvent} class="flex items-center justify-between p-2 rounded-lg border shadow-sm transition-colors ${activeStyle} ${cursorStyle}">
                    <div class="flex items-center gap-2 w-7/12 min-w-0">
                        <span class="text-[9px] font-black text-gray-500 w-4 text-center">${p.number}</span>
                        <img src="${p.photo}" class="h-7 w-7 rounded-full object-cover border border-gray-600 bg-gray-800 flex-shrink-0" onerror="this.onerror=null;this.src='https://placehold.co/28x28/2d3748/ffffff?text=?';">
                        <div class="flex flex-col min-w-0">
                            <span class="text-[11px] font-bold text-gray-200 truncate" title="${p.name}">${p.name}</span>
                            <span class="text-[9px] text-gray-500 font-bold">${p.primaryPosition}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 w-5/12 justify-end">
                        <span class="text-[10px]">${icon}</span>
                        <div class="w-12 bg-gray-800 rounded-full h-1.5 border border-gray-700">
                            <div class="${barColor} h-1.5 rounded-full transition-all duration-300" style="width:${estimated}%"></div>
                        </div>
                        <span class="text-[9px] font-black ${textColor} w-5 text-right">${estimated}</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    };

    renderTeamLineup(liveResultData.homeTeam, 'live-home-lineup-container', true);
    renderTeamLineup(liveResultData.awayTeam, 'live-away-lineup-container', false);

    // --- DESENHA O SEU BANCO DE RESERVAS ---
    const isPlayerHome = liveResultData.homeTeam.id === gameState.playerTeam.id;
    const playerTeam = isPlayerHome ? liveResultData.homeTeam : liveResultData.awayTeam;
    
    const bench = getBalancedBench(playerTeam).bench.filter(p => !p.subbedOut);
    const benchContainer = document.getElementById('live-bench-container');
    let benchHtml = '';
    
    bench.forEach(p => {
        const nameParts = p.name.split(' ');
        const shortName = nameParts.length > 1 ? nameParts[0] + ' ' + nameParts[nameParts.length-1] : p.name;
        
        // LÓGICA DE CLIQUE PARA OS RESERVAS
        const isSelected = typeof liveSelectedPlayerId !== 'undefined' && liveSelectedPlayerId === p.id;
        const activeStyle = isSelected ? 'border-yellow-400 bg-yellow-900/50 opacity-100' : 'border-gray-700 bg-gray-900';
        const cursorState = (typeof liveIsPaused !== 'undefined' && liveIsPaused) ? 'cursor-pointer hover:border-yellow-500 opacity-100' : 'cursor-not-allowed opacity-80';

        benchHtml += `
            <div onclick="handleLivePlayerClick(${p.id})" class="flex items-center justify-between p-2 rounded border transition-colors ${activeStyle} ${cursorState}">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="text-[9px] font-black text-gray-500 w-3">${p.number}</span>
                    <span class="text-[10px] font-bold text-gray-300 truncate" title="${p.name}">${shortName}</span>
                </div>
                <div class="flex items-center gap-1">
                    <span class="text-[9px] text-gray-500 font-bold bg-gray-800 px-1 rounded">${p.primaryPosition}</span>
                    <span class="text-[9px] text-yellow-400 font-black">${p.overallRating}</span>
                </div>
            </div>
        `;
    });
    benchContainer.innerHTML = benchHtml;
}

document.addEventListener('DOMContentLoaded', () => {
    // Atualiza a versão na tela inicial
    const versionText = document.getElementById('game-version-text');
    if(versionText && typeof patchNotes !== 'undefined') {
        versionText.textContent = patchNotes[0].version;
    }
});