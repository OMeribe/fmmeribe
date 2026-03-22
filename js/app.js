// --- CONTROLE PRINCIPAL DO JOGO ---

let tacticsReturnScreen = 'main-hub-screen';

async function initializeGame() {
    // 1. Mostra o Menu Principal
    showScreen('main-menu-screen');

    // 2. Trava o botão
    const btnJogar = document.getElementById('btn-menu-jogar');
    const txtJogar = document.getElementById('text-menu-jogar');
    const iconJogar = document.getElementById('icon-menu-jogar');
    
    // 3. Faz o download de todos os JSONs em silêncio
    await loadAllTeamsFromJson(); 
    
    // 4. Prepara a matemática
    calculateTeamOveralls();
    addDropTargetListeners(document.getElementById('reserves-list'));
    addDropTargetListeners(document.getElementById('unlisted-list'));

    // 5. Libera o botão "JOGAR" verdinho
    btnJogar.disabled = false;
    btnJogar.classList.remove('cursor-not-allowed', 'opacity-50', 'bg-green-700/80');
    btnJogar.classList.add('hover:bg-green-600', 'bg-green-700', 'cursor-pointer');
    txtJogar.textContent = 'JOGAR';
    iconJogar.classList.remove('hidden');

    // 6. Abre as opções (Carreira/Amistoso) ao clicar
    btnJogar.onclick = () => {
        const submenu = document.getElementById('submenu-jogar');
        submenu.classList.toggle('hidden');
        submenu.classList.toggle('flex');
    };
}

function selectTeam(teamId) {
    gameMode = 'career'; // Garante que entramos no modo carreira, mesmo vindo do menu de amistoso
    gameState.playerTeam = teamsData.find(t => t.id === teamId);
    
    // MÁGICA: Pede para a IA testar todas as táticas e escolher a melhor para você começar!
    autoSelectBestLineup(gameState.playerTeam);
    gameState.currentFormation = gameState.playerTeam.currentFormation; // Avisa a interface
    
    createLeagueTable();
    createSchedule();
    showScreen('main-hub-screen');
    updateHub();
}

// ==========================================================
// --- NOVO SISTEMA DE SELEÇÃO DE TIMES (CARROSSEL FIFA) ---
// ==========================================================
let currentTeamSelectionIndex = 0;

function openTeamSelection() {
    // Ordena os times em ordem alfabética para facilitar a busca
    teamsData.sort((a, b) => a.name.localeCompare(b.name));
    currentTeamSelectionIndex = 0;
    updateTeamSelectionUI();
    showScreen('team-selection-screen');
}

function cycleTeamSelection(direction) {
    currentTeamSelectionIndex += direction;
    
    // Looping infinito (se passar do último volta pro primeiro e vice-versa)
    if (currentTeamSelectionIndex < 0) currentTeamSelectionIndex = teamsData.length - 1;
    if (currentTeamSelectionIndex >= teamsData.length) currentTeamSelectionIndex = 0;
    
    // Efeito visual de animação no logo
    const logo = document.getElementById('ts-logo');
    logo.classList.remove('scale-100', 'opacity-100');
    logo.classList.add('scale-75', 'opacity-50');
    
    setTimeout(() => {
        updateTeamSelectionUI();
        logo.classList.remove('scale-75', 'opacity-50');
        logo.classList.add('scale-100', 'opacity-100');
    }, 150); // Atraso de 150ms para coincidir com a transição do CSS
}

function updateTeamSelectionUI() {
    const team = teamsData[currentTeamSelectionIndex];
    const ovr = team.overall;
    
    // 1. Dados Básicos
    document.getElementById('ts-logo').src = team.logo;
    document.getElementById('ts-name').textContent = team.name;
    document.getElementById('ts-overall').textContent = ovr;
    
    // 2. Cálculo de Estrelas (★) - Proporcional a 100
    let starsHTML = '';
    
    // Regra de 3: Se 100 = 5 estrelas, dividimos o overall por 20.
    const starCount = Math.round(ovr / 20); 
    
    for(let i = 0; i < 5; i++) {
        if (i < starCount) starsHTML += '★ ';
        else starsHTML += '☆ ';
    }
    document.getElementById('ts-stars').innerHTML = starsHTML.trim();

    // 3. História, Detalhes e Títulos
    document.getElementById('ts-desc-title').textContent = team.name;
    document.getElementById('ts-stadium').textContent = team.stadium || 'Estádio Municipal';
    
    // Puxa a fundação direto do JSON.
    const foundedYear = team.founded || '????';
    document.getElementById('ts-founded').textContent = `Fund. ${foundedYear}`;
    
    // Puxa a descrição do JSON.
    const desc = team.description || `Um clube tradicional buscando novas glórias. (Adicione "description" e "titles" no arquivo .json deste time para ver a história real aqui).`;
    document.getElementById('ts-desc').textContent = desc;

    // --- NOVA LÓGICA DE TÍTULOS (ESTILO WIKIPEDIA) ---
    // Lê o nome do título e devolve o ícone correspondente
    const getTrophyIcon = (titleName) => {
        const t = titleName.toLowerCase();
        if (t.includes('mundial') || t.includes('intercontinental')) return '🌍';
        if (t.includes('libertadores')) return '🏆';
        if (t.includes('brasileir')) return '🇧🇷';
        if (t.includes('copa do brasil')) return '🏅';
        if (t.includes('sul-americana') || t.includes('mercosul')) return '🥈';
        if (t.includes('supercopa') || t.includes('recopa')) return '⚡';
        return '🎖️'; // Padrão para estaduais e outros
    };

    const titlesContainer = document.getElementById('ts-titles');
    titlesContainer.innerHTML = ''; 
    // Como agora temos 100% da tela, podemos criar 3 colunas bonitas!
    titlesContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'; 
    
    if (team.titles && team.titles.length > 0) {
        team.titles.forEach(t => {
            const icon = getTrophyIcon(t);
            titlesContainer.innerHTML += `
                <div class="flex items-stretch bg-gray-900/80 border border-gray-700 rounded-lg overflow-hidden shadow-sm hover:border-yellow-500 transition-colors">
                    <div class="bg-gradient-to-b from-yellow-600 to-yellow-800 w-10 flex items-center justify-center flex-shrink-0 border-r border-yellow-900 shadow-inner">
                        <span class="text-lg drop-shadow-md">${icon}</span>
                    </div>
                    <div class="px-3 py-2 text-[9px] text-gray-200 font-bold uppercase tracking-wider leading-tight flex flex-col justify-center text-left w-full">
                        ${t}
                    </div>
                </div>`;
        });
    } else {
        titlesContainer.className = 'flex'; 
        titlesContainer.innerHTML = `<span class="text-[10px] text-gray-600 italic">Nenhum título de expressão cadastrado.</span>`;
    }

    // 4. Inteligência das Expectativas (Gera as cobranças baseadas na Força do time)
    const expectations = [
        { label: 'Muito Alta', color: 'bg-red-900/50 text-red-400 border-red-800' },
        { label: 'Alta', color: 'bg-orange-900/50 text-orange-400 border-orange-800' },
        { label: 'Média', color: 'bg-yellow-900/50 text-yellow-400 border-yellow-800' },
        { label: 'Baixa', color: 'bg-green-900/50 text-green-400 border-green-800' }
    ];
    
    // Quem tem Overall alto, sofre cobrança alta.
    let expNac = ovr >= 82 ? expectations[0] : ovr >= 77 ? expectations[1] : ovr >= 72 ? expectations[2] : expectations[3];
    // Finanças: Times menores precisam gerar dinheiro. Times gigantes gastam tudo.
    let expFin = ovr >= 80 ? expectations[3] : ovr >= 75 ? expectations[2] : expectations[0]; 
    // Base: Times menores focam na base para vender, gigantes focam no time principal.
    let expBase = ovr < 75 ? expectations[0] : ovr < 80 ? expectations[1] : expectations[2]; 

    const setExp = (id, expObj) => {
        const el = document.getElementById(id);
        el.textContent = expObj.label;
        el.className = `text-[10px] font-bold px-2 py-1 rounded border ${expObj.color} uppercase tracking-wider`;
    };

    setExp('ts-exp-nac', expNac);
    setExp('ts-exp-fin', expFin);
    setExp('ts-exp-base', expBase);

    // 5. Orçamento Dinâmico do Modo Carreira
    const budget = team.finances || (ovr >= 82 ? 90.0 : ovr >= 78 ? 50.0 : ovr >= 73 ? 25.0 : 10.0);
    document.getElementById('ts-budget').textContent = `R$ ${budget.toFixed(1)}M`;
}

function confirmTeamSelection() {
    const selectedTeam = teamsData[currentTeamSelectionIndex];
    
    // Garante que o orçamento inicial seja salvo de forma permanente no cofre do time
    const ovr = selectedTeam.overall;
    selectedTeam.finances = selectedTeam.finances || (ovr >= 82 ? 90.0 : ovr >= 78 ? 50.0 : ovr >= 73 ? 25.0 : 10.0);
    
    // Inicia o Modo Carreira com esse time!
    selectTeam(selectedTeam.id);
}

function changeFormation(formationName) {
    gameState.currentFormation = formationName;
    // Removemos a linha que chamava a IA. Agora, os 11 que estão no campo ficam no campo!
    renderTacticsScreen();
}

// --- LÓGICA DE RODADA E SIMULAÇÕES ---

// ============================================================================
// --- LÓGICA DE RODADA E MOTOR AO VIVO (COM MOMENTUM SHIFT) ---
// ============================================================================

// Variáveis Globais do Motor
let liveMatchTimer = null;
let currentLiveMinute = 0;
let liveEvents = [];
let liveResultData = null;
let allRoundResults = [];

// Variáveis do Sistema de Substituição
let liveHomeScore = 0;
let liveAwayScore = 0;
let liveIsPaused = false;
let livePausesLeft = 3;
let liveSubsLeft = 5;
let liveSelectedPlayerId = null;

let TICK_RATE = 1333; 

function processEntireRound() {
    calculateTeamOveralls(); 
    const roundMatches = gameState.schedule[gameState.currentRound - 1];
    allRoundResults = [];
    
    roundMatches.forEach(match => {
        const result = simulateMatch(match.home, match.away);
        allRoundResults.push(result);
        if (gameMode !== 'friendly') updateTableWithResult(result);

        match.homeGoals = result.homeGoals;
        match.awayGoals = result.awayGoals;
        match.played = true;
    });

    if (gameMode !== 'friendly') generateNewsAfterRound(allRoundResults);
}

function animateCalendarToNextMatch(callback) {
    if (gameState.currentRound > gameState.schedule.length) return;
    const targetDate = gameState.schedule[gameState.currentRound - 1][0].date;
    const interval = setInterval(() => {
        if (gameState.currentDate < targetDate) {
            gameState.currentDate.setDate(gameState.currentDate.getDate() + 1);
            teamsData.forEach(t => recoverStaminaForDay(t));
            updateHub();
        } else {
            clearInterval(interval);
            setTimeout(callback, 300); 
        }
    }, 150); 
}

function saveTactics() {
    const starters = gameState.playerTeam.players.filter(p => p.isStarter);
    if (starters.length !== 11) { alert(`Sua equipe precisa ter 11 titulares!\nVocê tem: ${starters.length}`); return; }
    
    const roles = gameState.roles;
    const starterNames = starters.map(p => p.name);
    if (!roles.captain || !roles.penalties || !roles.freeKicks || !roles.corners ||
        !starterNames.includes(roles.captain) || !starterNames.includes(roles.penalties) ||
        !starterNames.includes(roles.freeKicks) || !starterNames.includes(roles.corners)) {
        alert("⚠️ Defina Capitão e Batedores usando APENAS titulares."); return;
    }

    calculateTeamOveralls();
    gameState.playerTeam.currentFormation = gameState.currentFormation; 
    alert("✅ Táticas salvas!");
    showScreen(tacticsReturnScreen);
}

function prepareMatch() {
    if (gameState.currentRound > gameState.schedule.length) { alert("Temporada acabou!"); return; }
    const roles = gameState.roles;
    const starters = gameState.playerTeam.players.filter(p => p.isStarter);
    const starterNames = starters.map(p => p.name);

    if (starters.length !== 11 || !roles.captain || !roles.penalties || !roles.freeKicks || !roles.corners ||
        !starterNames.includes(roles.captain) || !starterNames.includes(roles.penalties) ||
        !starterNames.includes(roles.freeKicks) || !starterNames.includes(roles.corners)) {
        alert("⚠️ AÇÃO NECESSÁRIA!\nEscalação incompleta ou batedores desatualizados.");
        showScreen('tactics-screen'); return;
    }

    const match = gameState.schedule[gameState.currentRound - 1].find(m => m.home.id === gameState.playerTeam.id || m.away.id === gameState.playerTeam.id);
    const cpuTeam = match.home.id === gameState.playerTeam.id ? match.away : match.home;
    autoSelectBestLineup(cpuTeam);

    animateCalendarToNextMatch(() => { showScreen('pre-match-screen'); });
}

function finishRoundAndGoToHub() {
    if (typeof gameMode !== 'undefined' && gameMode === 'friendly') {
        showScreen('main-menu-screen'); return;
    }
    gameState.currentRound++;
    gameState.currentDate.setDate(gameState.currentDate.getDate() + 1);
    updateHub();
    showScreen('main-hub-screen');
}

function startQuickSim() {
    animateCalendarToNextMatch(() => {
        processEntireRound();
        finishRoundAndGoToHub();
        const playerMatch = allRoundResults.find(r => r.homeTeam.id === gameState.playerTeam.id || r.awayTeam.id === gameState.playerTeam.id);
        if (gameMode === 'friendly') renderPlayerStatsModal(playerMatch);
        else { renderMatchResultsModal(allRoundResults); renderPlayerStatsModal(playerMatch); }
    });
}

function showRoundResultsFromLive() {
    finishRoundAndGoToHub(); 
    if (gameMode === 'friendly') renderPlayerStatsModal(liveResultData); 
    else { renderMatchResultsModal(allRoundResults); renderPlayerStatsModal(liveResultData); }
}

function startDeepSim() {
    // 1. Snapshot da Stamina e Banco no minuto zero
    const pTeam = gameState.playerTeam;
    
    // Pega os 10 reservas balanceados do seu time
    const myBench = getBalancedBench(pTeam).bench;
    
    pTeam.players.forEach(p => {
        p.preMatchStamina = p.currentStamina ?? 100;
        p.subbedOut = false;
        p.subbedInMinute = 0;
        // Agora só marca como banco quem a IA de balanceamento selecionou
        p.isBench = myBench.some(b => b.id === p.id); 
    });

    // 2. Reseta as variáveis da Partida
    liveIsPaused = false;
    livePausesLeft = 3;
    liveSubsLeft = 5;
    liveSelectedPlayerId = null;
    liveHomeScore = 0;
    liveAwayScore = 0;
    currentLiveMinute = 0;

    // 3. Simula o campeonato em background e pega o nosso jogo
    processEntireRound();
    liveResultData = allRoundResults.find(r => r.homeTeam.id === gameState.playerTeam.id || r.awayTeam.id === gameState.playerTeam.id);
    liveResultData.events = generateMatchEvents(liveResultData); 
    liveEvents = liveResultData.events;
    
    // 4. Prepara a Interface
    document.getElementById('live-stadium-name').textContent = "📍 " + liveResultData.homeTeam.stadium;
    document.getElementById('live-home-logo').src = liveResultData.homeTeam.logo;
    document.getElementById('live-home-name').textContent = liveResultData.homeTeam.name;
    document.getElementById('live-away-logo').src = liveResultData.awayTeam.logo;
    document.getElementById('live-away-name').textContent = liveResultData.awayTeam.name;
    
    document.getElementById('live-commentary-box').innerHTML = '';
    document.getElementById('live-match-actions').classList.add('hidden'); 
    document.getElementById('live-match-skip').classList.remove('hidden'); 
    
    const btnPause = document.getElementById('btn-pause-match');
    btnPause.innerHTML = `⏸️ Pausar (3)`;
    btnPause.classList.replace('bg-green-600', 'bg-yellow-600');
    btnPause.classList.replace('border-green-800', 'border-yellow-800');
    btnPause.classList.remove('hidden', 'animate-pulse');
    document.getElementById('subs-left-count').textContent = `5 Subs`;

    updateLiveScoreboard(0, 0, 0);
    showScreen('live-match-screen');
    renderLiveMatchPanels(0);

    addLiveCommentary("Apita o árbitro! Começa a partida!", "info");
    liveMatchTimer = setInterval(liveMatchTick, TICK_RATE);
}

function liveMatchTick() {
    currentLiveMinute++;
    
    const eventsNow = liveEvents.filter(e => e.minute === currentLiveMinute);
    eventsNow.forEach(ev => {
        if(ev.type === 'goal') {
            if(ev.team === 'home') liveHomeScore++;
            if(ev.team === 'away') liveAwayScore++;
        }
        addLiveCommentary(ev.minute + "' - " + ev.text, ev.type);
    });

    updateLiveScoreboard(liveHomeScore, liveAwayScore, currentLiveMinute);

    if(currentLiveMinute === 45) addLiveCommentary("Fim do primeiro tempo.", "info");
    if(currentLiveMinute === 46) addLiveCommentary("Rola a bola para a etapa final!", "info");

    // Alertas de Cansaço (Só avisa se você ainda tiver pausas!)
    if ([30, 60, 75].includes(currentLiveMinute) && livePausesLeft > 0) {
        const playerIsHome = liveResultData.homeTeam.id === gameState.playerTeam.id;
        const myTeam = playerIsHome ? liveResultData.homeTeam : liveResultData.awayTeam;

        const tiredStarters = myTeam.players.filter(p => p.isStarter).filter(p => {
            const playTime = currentLiveMinute - (p.subbedInMinute || 0);
            const progress = playTime / 90;
            const staminaStat = p.attributes.stamina || 70;
            const drain = (25 + (100 - staminaStat) * 0.36) * (STAMINA_DRAIN_BY_POSITION[p.primaryPosition] || 1.0);
            return Math.max(5, (p.preMatchStamina ?? 100) - (drain * progress)) < 38;
        });

        if (tiredStarters.length > 0) {
            if (tiredStarters.length === 1) addLiveCommentary(`${currentLiveMinute}' ⚠️ ${tiredStarters[0].name} (${tiredStarters[0].primaryPosition}) está com as pernas pesadas. Considere uma substituição!`, 'warning');
            else addLiveCommentary(`${currentLiveMinute}' ⚠️ ALERTA: ${tiredStarters[0].name} e mais ${tiredStarters.length - 1} jogador(es) estão no limite físico!`, 'warning');
        }
    }

    if (currentLiveMinute % 5 === 0) renderLiveMatchPanels(currentLiveMinute);

    if (currentLiveMinute >= 90) {
        clearInterval(liveMatchTimer);
        addLiveCommentary("Fim de papo! O juiz encerra a partida.", "info");
        
        document.getElementById('live-match-skip').classList.add('hidden'); 
        document.getElementById('btn-pause-match').classList.add('hidden'); 
        document.getElementById('live-match-actions').classList.remove('hidden'); 
    }
}

function toggleMatchPause() {
    if (!liveMatchTimer && !liveIsPaused) return; 

    if (liveIsPaused) {
        // RETOMAR O JOGO
        liveIsPaused = false;
        liveSelectedPlayerId = null;
        document.getElementById('btn-pause-match').innerHTML = `⏸️ Pausar (${livePausesLeft})`;
        document.getElementById('btn-pause-match').classList.replace('bg-green-600', 'bg-yellow-600');
        document.getElementById('btn-pause-match').classList.replace('border-green-800', 'border-yellow-800');
        document.getElementById('btn-pause-match').classList.remove('animate-pulse');
        
        addLiveCommentary(`${currentLiveMinute}' - ▶️ O jogo é reiniciado!`, "info");
        renderLiveMatchPanels(currentLiveMinute); 
        liveMatchTimer = setInterval(liveMatchTick, TICK_RATE);
    } else {
        // PAUSAR O JOGO
        if (livePausesLeft <= 0) { alert("Você já usou todas as 3 pausas permitidas!"); return; }
        liveIsPaused = true;
        livePausesLeft--;
        clearInterval(liveMatchTimer);
        
        document.getElementById('btn-pause-match').innerHTML = `▶️ Retomar Jogo`;
        document.getElementById('btn-pause-match').classList.replace('bg-yellow-600', 'bg-green-600');
        document.getElementById('btn-pause-match').classList.replace('border-yellow-800', 'border-green-800');
        document.getElementById('btn-pause-match').classList.add('animate-pulse');
        
        addLiveCommentary(`${currentLiveMinute}' - ⏸️ Jogo paralisado pelo treinador. Clique num TITULAR (coluna da esquerda) e num RESERVA (abaixo) para trocar.`, "warning");
        renderLiveMatchPanels(currentLiveMinute); 
    }
}

function handleLivePlayerClick(playerId) {
    if (!liveIsPaused) return; 
    
    const pTeam = gameState.playerTeam;
    const player = pTeam.players.find(p => p.id === playerId);
    if (!player || player.subbedOut) return; 

    // Primeiro clique (Seleciona)
    if (!liveSelectedPlayerId) {
        liveSelectedPlayerId = playerId;
        renderLiveMatchPanels(currentLiveMinute);
        return;
    }
    
    // Clicou de novo no mesmo (Desmarca)
    if (liveSelectedPlayerId === playerId) {
        liveSelectedPlayerId = null; 
        renderLiveMatchPanels(currentLiveMinute);
        return;
    }
    
    const p1 = pTeam.players.find(p => p.id === liveSelectedPlayerId);
    const p2 = player;
    
    // Validadores de erro
    if (p1.isStarter === p2.isStarter) {
        liveSelectedPlayerId = playerId; // Clicou em 2 do mesmo grupo, muda o foco
        renderLiveMatchPanels(currentLiveMinute);
        return;
    }
    if (liveSubsLeft <= 0) {
        alert("Você já fez as 5 substituições permitidas!");
        liveSelectedPlayerId = null;
        renderLiveMatchPanels(currentLiveMinute);
        return;
    }
    
    // Identifica quem é quem
    const starter = p1.isStarter ? p1 : p2;
    const bench = p1.isStarter ? p2 : p1;
    
    // EFETUA A TROCA FÍSICA NO BANCO
    starter.isStarter = false;
    starter.subbedOut = true; 
    
    bench.isStarter = true;
    bench.subbedInMinute = currentLiveMinute; 
    
    liveSubsLeft--;
    document.getElementById('subs-left-count').textContent = `${liveSubsLeft} Subs`;
    addLiveCommentary(`${currentLiveMinute}' - 🔄 SUBSTITUIÇÃO: Sai ${starter.name}, entra ${bench.name}.`, "info");
    
    // =========================================================================
    // A MÁGICA: O FATOR MOMENTUM (IMPACTO TÁTICO NO MOTOR)
    // =========================================================================
    const playerIsHome = liveResultData.homeTeam.id === pTeam.id;
    const myTeamKey = playerIsHome ? 'home' : 'away';
    const oppTeamKey = playerIsHome ? 'away' : 'home';

    // 1. FATOR DESTINO: O reserva "herda" todos os lances que seriam do cara cansado
    const futureEvents = liveEvents.filter(e => e.minute > currentLiveMinute);
    futureEvents.forEach(ev => {
        if (ev.player && ev.player.id === starter.id) ev.player = bench;
        if (ev.assister && ev.assister.id === starter.id) ev.assister = bench;
        ev.text = ev.text.replace(new RegExp(starter.name, 'g'), bench.name);
    });

    // 2. MOMENTUM SHIFT: Mede a diferença entre a "Força Cansada" de quem saiu e a "Força 100%" de quem entrou
    const staStat = starter.attributes.stamina || 70;
    const drain = (25 + (100 - staStat) * 0.36) * (STAMINA_DRAIN_BY_POSITION[starter.primaryPosition] || 1.0);
    const starterStamina = Math.max(5, (starter.preMatchStamina ?? 100) - (drain * (currentLiveMinute/90)));
    const impact = bench.overallRating - (starter.overallRating * (starterStamina/100));

    // Se a substituição injetou MUITA energia e qualidade no time (Diferença > 12 de impacto)
    if (impact > 12 && currentLiveMinute < 85) {
        
        if (['ATA', 'SA', 'PE', 'PD', 'MEI'].includes(bench.primaryPosition)) {
            // Entrou Atacante: 40% de chance do cara destruir e gerar um GOL EXTRA no tempo restante!
            if (Math.random() < 0.40) {
                const randomMin = currentLiveMinute + Math.floor(Math.random() * (89 - currentLiveMinute)) + 1;
                liveEvents.push({
                    minute: randomMin, team: myTeamKey, type: 'goal', 
                    text: `GOOOOOL! O Dedo do Treinador! ${bench.name} acabou de entrar, recebe com fôlego total e fuzila pro fundo da rede!`,
                    player: bench
                });
                liveEvents.sort((a,b) => a.minute - b.minute);
                
                if (myTeamKey === 'home') {
                    liveResultData.homeGoals++; 
                    liveResultData.homeScorers.push({scorer: bench, type: 'open_play'});
                } else {
                    liveResultData.awayGoals++;
                    liveResultData.awayScorers.push({scorer: bench, type: 'open_play'});
                }
                bench.goals = (bench.goals || 0) + 1; // Salva pra tela pós-jogo
            }
        } 
        else if (['ZAG', 'VOL', 'LE', 'LD'].includes(bench.primaryPosition)) {
            // Entrou Defensor: 70% de chance do zagueirão fresco ANULAR um gol que o adversário faria!
            if (Math.random() < 0.70) {
                const oppGoalIndex = liveEvents.findIndex(e => e.minute > currentLiveMinute && e.type === 'goal' && e.team === oppTeamKey);
                if (oppGoalIndex !== -1) {
                    const removedGoal = liveEvents[oppGoalIndex];
                    // Transforma o gol num desarme épico
                    liveEvents[oppGoalIndex].type = 'normal';
                    liveEvents[oppGoalIndex].text = `Incrível! O adversário ia marcar um gol certo, mas ${bench.name} (que acabou de entrar) volta numa velocidade absurda e salva o time!`;
                    
                    if (oppTeamKey === 'home') {
                        liveResultData.homeGoals--;
                        const sIdx = liveResultData.homeScorers.findIndex(s => s.scorer.id === removedGoal.player.id);
                        if(sIdx !== -1) { liveResultData.homeScorers[sIdx].scorer.goals--; liveResultData.homeScorers.splice(sIdx, 1); }
                    } else {
                        liveResultData.awayGoals--;
                        const sIdx = liveResultData.awayScorers.findIndex(s => s.scorer.id === removedGoal.player.id);
                        if(sIdx !== -1) { liveResultData.awayScorers[sIdx].scorer.goals--; liveResultData.awayScorers.splice(sIdx, 1); }
                    }
                }
            }
        }
    }
    // =========================================================================
    
    liveSelectedPlayerId = null;
    calculateTeamOveralls();
    renderLiveMatchPanels(currentLiveMinute);
}

function skipLiveMatch() {
    if (!liveMatchTimer && !liveIsPaused) return; 
    
    clearInterval(liveMatchTimer);
    liveMatchTimer = null;
    liveIsPaused = false;

    // Joga na tela tudo que faltava (inclusive os lances novos que o "Fator Momentum" possa ter gerado)
    const remainingEvents = liveEvents.filter(e => e.minute > currentLiveMinute);
    remainingEvents.forEach(ev => {
        addLiveCommentary(ev.minute + "' - " + ev.text, ev.type);
    });

    currentLiveMinute = 90;
    updateLiveScoreboard(liveResultData.homeGoals, liveResultData.awayGoals, 90);
    addLiveCommentary("Fim de papo! Simulação acelerada pelo treinador.", "info");

    document.getElementById('live-match-skip').classList.add('hidden');
    document.getElementById('btn-pause-match').classList.add('hidden');
    document.getElementById('live-match-actions').classList.remove('hidden');
}

// --- MODO AMISTOSO ---
let gameMode = 'career'; // Pode ser 'career' ou 'friendly'
let friendlyHomeIndex = 0;
let friendlyAwayIndex = 1;

let hasInitializedFriendly = false; // Memória para saber se já escolhemos antes
function openFriendlySetup() {
    gameMode = 'friendly';
    teamsData.sort((a, b) => a.name.localeCompare(b.name));
    
    // Só reseta para 0 e 1 se for a primeira vez que entra no Amistoso
    if (!hasInitializedFriendly) {
        friendlyHomeIndex = 0;
        friendlyAwayIndex = 1;
        hasInitializedFriendly = true;
    }
    
    updateFriendlyUI();
    showScreen('friendly-setup-screen');
}

function cycleFriendlyTeam(side, direction) {
    if (side === 'home') {
        friendlyHomeIndex += direction;
        if (friendlyHomeIndex < 0) friendlyHomeIndex = teamsData.length - 1;
        if (friendlyHomeIndex >= teamsData.length) friendlyHomeIndex = 0;
        
        // Evita que Casa e Fora sejam o mesmo time
        if (friendlyHomeIndex === friendlyAwayIndex) cycleFriendlyTeam('home', direction);
    } else {
        friendlyAwayIndex += direction;
        if (friendlyAwayIndex < 0) friendlyAwayIndex = teamsData.length - 1;
        if (friendlyAwayIndex >= teamsData.length) friendlyAwayIndex = 0;
        
        if (friendlyAwayIndex === friendlyHomeIndex) cycleFriendlyTeam('away', direction);
    }
    updateFriendlyUI();
}

function updateFriendlyUI() {
    const homeTeam = teamsData[friendlyHomeIndex];
    const awayTeam = teamsData[friendlyAwayIndex];

    // Escala provisoriamente só para calcular a força real atual dos setores
    autoSelectStarters(homeTeam, '4-3-3');
    autoSelectStarters(awayTeam, '4-3-3');

    const homeSectors = calculateSectorOveralls(homeTeam);
    const awaySectors = calculateSectorOveralls(awayTeam);

    document.getElementById('friendly-home-logo').src = homeTeam.logo;
    document.getElementById('friendly-home-name').textContent = homeTeam.name;
    document.getElementById('friendly-home-ata').textContent = homeSectors.attack;
    document.getElementById('friendly-home-mio').textContent = homeSectors.midfield;
    document.getElementById('friendly-home-def').textContent = homeSectors.defense;

    document.getElementById('friendly-away-logo').src = awayTeam.logo;
    document.getElementById('friendly-away-name').textContent = awayTeam.name;
    document.getElementById('friendly-away-ata').textContent = awaySectors.attack;
    document.getElementById('friendly-away-mio').textContent = awaySectors.midfield;
    document.getElementById('friendly-away-def').textContent = awaySectors.defense;
}

function startFriendlySession() {
    const homeTeam = teamsData[friendlyHomeIndex];
    const awayTeam = teamsData[friendlyAwayIndex];

    // RECUPERA STAMINA PARA 100% SEMPRE NO AMISTOSO
    homeTeam.players.forEach(p => p.currentStamina = 100);
    awayTeam.players.forEach(p => p.currentStamina = 100);

    gameState.playerTeam = homeTeam; 
    autoSelectBestLineup(gameState.playerTeam);
    gameState.currentFormation = gameState.playerTeam.currentFormation;
    
    gameState.schedule = [
        [{ home: homeTeam, away: awayTeam, date: new Date(), played: false }]
    ];
    gameState.currentRound = 1;
    showScreen('pre-match-screen');
}

function rematchFriendly() {
    closeModal('player-stats-modal');
    startFriendlySession(); // Joga com os mesmos times e stamina renovada
}

function backToFriendlySetup() {
    closeModal('player-stats-modal');
    updateFriendlyUI(); // Abre a tela dupla já com os últimos times setados!
    showScreen('friendly-setup-screen');
}

function exitToMainMenu() {
    closeModal('player-stats-modal');
    showScreen('main-menu-screen');
}

// --- SISTEMA DE SAVE E LOAD (ARQUIVO .JSON) ---

function downloadSaveFile() {
    try {
        // 1. Prepara o pacote com todo o universo do jogo (AGORA COM A DIFICULDADE)
        const saveData = {
            gameState: gameState,
            teamsData: teamsData,
            cpuDifficulty: typeof cpuDifficulty !== 'undefined' ? cpuDifficulty : 'normal'
        };
        
        // 2. Transforma tudo em texto
        const dataStr = JSON.stringify(saveData);
        
        // 3. Cria um arquivo virtual (Blob) na memória
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        // 4. Cria um link invisível, clica nele e depois destrói
        const a = document.createElement('a');
        a.href = url;
        
        // Formata a data de hoje para o nome do arquivo
        const today = new Date();
        const dateStr = `${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}`;
        
        a.download = `Prancheta_Save_${dateStr}.json`; 
        document.body.appendChild(a);
        a.click(); 
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert("✅ Jogo salvo! O arquivo foi baixado para a sua pasta de Downloads.");
    } catch (e) {
        alert("Erro ao gerar o arquivo de save.");
        console.error(e);
    }
}

function triggerLoadGame() {
    // Finge um clique naquele input invisível que colocamos no HTML
    document.getElementById('save-file-input').click();
}

function processSaveFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            gameState = parsed.gameState;
            teamsData = parsed.teamsData;
            
            // A VACINA DE RETROCOMPATIBILIDADE: 
            // Se o save for antigo e não tiver a variável 'cpuDifficulty', ele assume 'normal' por padrão.
            cpuDifficulty = parsed.cpuDifficulty || 'normal';
            
            // Truque de interface: Força o 'select' do menu de configurações a mostrar a dificuldade carregada
            const selectDificuldade = document.querySelector('select[onchange="setDifficulty(this.value)"]');
            if (selectDificuldade) selectDificuldade.value = cpuDifficulty;
            
            // Reconstruir datas 
            gameState.currentDate = new Date(gameState.currentDate);
            if (gameState.schedule) {
                gameState.schedule.forEach(round => {
                    round.forEach(match => {
                        match.date = new Date(match.date);
                    });
                });
            }
            
            gameMode = 'career';
            updateHub();
            showScreen('main-hub-screen');
            alert("📂 Save carregado com sucesso! Bem-vindo de volta, Professor.");
            
        } catch (err) {
            alert("❌ Erro ao ler o arquivo. Tem certeza que é um save válido do Prancheta?");
            console.error(err);
        }
        
        event.target.value = ''; 
    };
    
    reader.readAsText(file);
}

// --- CONFIGURAÇÕES DO JOGO ---
let cpuDifficulty = 'normal'; // Começa sempre no normal

function setDifficulty(level) {
    cpuDifficulty = level;
    console.log("Dificuldade alterada para:", level);
}

function setMatchDuration(minutes) {
    // Transforma minutos reais em milissegundos e divide pelos 90 in-game
    TICK_RATE = Math.round((minutes * 60000) / 90);
    
    // Atualiza o texto na interface em tempo real
    const durationLabel = document.getElementById('match-duration-label');
    if (durationLabel) {
        durationLabel.textContent = `${minutes} Minuto${minutes > 1 ? 's' : ''}`;
    }
    console.log(`Duração da simulação: ${minutes} min reais (TICK_RATE: ${TICK_RATE}ms)`);
}

function clearCacheData() {
    const confirmDelete = confirm("Tem certeza? Isso apagará memórias temporárias do navegador.\n\nFique tranquilo: Os seus arquivos de Save (.json) já baixados no PC continuarão intactos!");
    
    if (confirmDelete) {
        localStorage.clear(); // Limpa resíduos de memory card antigo
        alert("🧹 Cache limpo com sucesso!");
    }
}

// INICIAR O JOGO QUANDO A PÁGINA CARREGAR
window.onload = initializeGame;