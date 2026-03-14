// --- CONTROLE PRINCIPAL DO JOGO ---

let tacticsReturnScreen = 'main-hub-screen'; // Lembra de onde o jogador veio
// Note o 'async' antes da function
async function initializeGame() {
    // Espera todos os arquivos JSON carregarem primeiro
    await loadAllTeamsFromJson(); 
    
    // Depois que carregou, o jogo pode seguir
    calculateTeamOveralls();
    renderTeamSelection();
    
    // Inicializa as áreas de drag and drop estáticas
    addDropTargetListeners(document.getElementById('reserves-list'));
    addDropTargetListeners(document.getElementById('unlisted-list'));
}

function selectTeam(teamId) {
    gameState.playerTeam = teamsData.find(t => t.id === teamId);
    
    // MÁGICA: Pede para a IA testar todas as táticas e escolher a melhor para você começar!
    autoSelectBestLineup(gameState.playerTeam);
    gameState.currentFormation = gameState.playerTeam.currentFormation; // Avisa a interface
    
    createLeagueTable();
    createSchedule();
    showScreen('main-hub-screen');
    updateHub();
}

function changeFormation(formationName) {
    gameState.currentFormation = formationName;
    // Removemos a linha que chamava a IA. Agora, os 11 que estão no campo ficam no campo!
    renderTacticsScreen();
}

// --- LÓGICA DE RODADA E SIMULAÇÕES ---

let liveMatchTimer = null;
let currentLiveMinute = 0;
let liveEvents = [];
let liveResultData = null;
let allRoundResults = [];

// Velocidade da simulação (MODDING AQUI!)
// 500 = Meio segundo real para cada 1 minuto de jogo. 
// Para dar 5 minutos reais, mude para: 3333 (que é 3.3 segundos por in-game tick)
const TICK_RATE = 500; 

function processEntireRound() {
    calculateTeamOveralls(); 
    const roundMatches = gameState.schedule[gameState.currentRound - 1];
    allRoundResults = [];
    
    roundMatches.forEach(match => {
        const result = simulateMatch(match.home, match.away);
        allRoundResults.push(result);
        updateTableWithResult(result);

        match.homeGoals = result.homeGoals;
        match.awayGoals = result.awayGoals;
        match.played = true;
    });

    // Gera as notícias baseadas nos resultados desta rodada
    generateNewsAfterRound(allRoundResults);
}

// --- NOVA FUNÇÃO DE ANIMAÇÃO DO TEMPO ---
function animateCalendarToNextMatch(callback) {
    if (gameState.currentRound > gameState.schedule.length) return;
    
    const targetDate = gameState.schedule[gameState.currentRound - 1][0].date;
    
    // Efeito de rolagem de dias
    const interval = setInterval(() => {
        if (gameState.currentDate < targetDate) {
            gameState.currentDate.setDate(gameState.currentDate.getDate() + 1);
            // Recupera stamina de TODOS os times a cada dia que passa.
            // Times CPU também descansam entre as rodadas para manter o equilíbrio.
            teamsData.forEach(t => recoverStaminaForDay(t));
            updateHub();
        } else {
            clearInterval(interval);
            setTimeout(callback, 300); // Dá uma pequena pausa antes de abrir o jogo
        }
    }, 150); // Velocidade do calendário (150ms por dia)
}

// --- NOVA FUNÇÃO: SALVAR TÁTICAS ---
function saveTactics() {
    const starters = gameState.playerTeam.players.filter(p => p.isStarter);
    if (starters.length !== 11) {
        alert(`Sua equipe titular precisa ter EXATAMENTE 11 jogadores no campo!\nAtualmente você tem: ${starters.length}`);
        return;
    }
    
    const roles = gameState.roles;
    const starterNames = starters.map(p => p.name);

    if (!roles.captain || !roles.penalties || !roles.freeKicks || !roles.corners ||
        !starterNames.includes(roles.captain) || !starterNames.includes(roles.penalties) ||
        !starterNames.includes(roles.freeKicks) || !starterNames.includes(roles.corners)) {
        alert("⚠️ ATENÇÃO: Você precisa definir o Capitão e todos os Batedores nas 'Opções Avançadas' usando APENAS jogadores que estão no campo como titulares.");
        return;
    }

    calculateTeamOveralls();
    gameState.playerTeam.currentFormation = gameState.currentFormation; 
    alert("✅ Escalação e Táticas salvas com sucesso!");
    
    // A MÁGICA AQUI: Volta exatamente para a tela de onde o jogador veio!
    showScreen(tacticsReturnScreen);
}

// --- ATUALIZAR O PREPARE MATCH ---
// Substitua a sua função prepareMatch atual por esta:
function prepareMatch() {
    if (gameState.currentRound > gameState.schedule.length) {
        alert("A temporada acabou!"); return;
    }

    const roles = gameState.roles;
    const starters = gameState.playerTeam.players.filter(p => p.isStarter);
    const starterNames = starters.map(p => p.name);

    if (starters.length !== 11 || !roles.captain || !roles.penalties || !roles.freeKicks || !roles.corners ||
        !starterNames.includes(roles.captain) || !starterNames.includes(roles.penalties) ||
        !starterNames.includes(roles.freeKicks) || !starterNames.includes(roles.corners)) {
        
        alert("⚠️ AÇÃO NECESSÁRIA!\n\nSua escalação está incompleta ou as opções avançadas (Capitão, Faltas, etc) não foram definidas/atualizadas para os titulares atuais.");
        showScreen('tactics-screen');
        return;
    }

    // A MÁGICA DA CPU: Antes da tela pré-jogo, mandamos a IA adversária escolher a melhor tática!
    const match = gameState.schedule[gameState.currentRound - 1].find(m => m.home.id === gameState.playerTeam.id || m.away.id === gameState.playerTeam.id);
    const cpuTeam = match.home.id === gameState.playerTeam.id ? match.away : match.home;
    autoSelectBestLineup(cpuTeam);

    animateCalendarToNextMatch(() => {
        showScreen('pre-match-screen');
    });
}

function finishRoundAndGoToHub() {
    gameState.currentRound++;
    // Avança 1 dia após o jogo para não ficarmos presos no passado
    gameState.currentDate.setDate(gameState.currentDate.getDate() + 1);
    updateHub();
    showScreen('main-hub-screen');
}

function startQuickSim() {
    animateCalendarToNextMatch(() => {
        processEntireRound();
        finishRoundAndGoToHub();
        
        // Pega apenas o resultado do seu time
        const playerMatch = allRoundResults.find(r => r.homeTeam.id === gameState.playerTeam.id || r.awayTeam.id === gameState.playerTeam.id);
        
        // Renderiza a rodada no fundo e abre a sua tela de estatísticas por cima
        renderMatchResultsModal(allRoundResults);
        renderPlayerStatsModal(playerMatch);
    });
}

function showRoundResultsFromLive() {
    finishRoundAndGoToHub(); 
    // Como a simulação aprofundada já salvou o seu jogo na variável liveResultData, usamos ela
    renderMatchResultsModal(allRoundResults);
    renderPlayerStatsModal(liveResultData); 
}

function startDeepSim() {
     // Salva um snapshot da stamina de cada jogador do nosso time ANTES do jogo.
    // Usado para calcular o desgaste progressivo durante a exibição ao vivo.
    gameState.playerTeam.players.forEach(p => {
        p.preMatchStamina = p.currentStamina ?? 100;
    });
    processEntireRound();
    
    liveResultData = allRoundResults.find(r => r.homeTeam.id === gameState.playerTeam.id || r.awayTeam.id === gameState.playerTeam.id);
    
    liveEvents = generateMatchEvents(liveResultData); 
    
    document.getElementById('live-stadium-name').textContent = "📍 " + liveResultData.homeTeam.stadium;
    document.getElementById('live-home-logo').src = liveResultData.homeTeam.logo;
    document.getElementById('live-home-name').textContent = liveResultData.homeTeam.name;
    document.getElementById('live-away-logo').src = liveResultData.awayTeam.logo;
    document.getElementById('live-away-name').textContent = liveResultData.awayTeam.name;
    
    document.getElementById('live-commentary-box').innerHTML = '';
    
    // --- CONTROLE DE VISIBILIDADE DOS BOTÕES ---
    document.getElementById('live-match-actions').classList.add('hidden'); 
    document.getElementById('live-match-skip').classList.remove('hidden'); // Mostra o botão de pular
    
    updateLiveScoreboard(0, 0, 0);
    showScreen('live-match-screen');
    
    currentLiveMinute = 0;
    let currentHomeScore = 0;
    let currentAwayScore = 0;
    
    addLiveCommentary("Apita o árbitro! Começa a partida!", "info");

    liveMatchTimer = setInterval(() => {
        currentLiveMinute++;
        
        const eventsNow = liveEvents.filter(e => e.minute === currentLiveMinute);
        eventsNow.forEach(ev => {
            if(ev.type === 'goal') {
                if(ev.team === 'home') currentHomeScore++;
                if(ev.team === 'away') currentAwayScore++;
            }
            addLiveCommentary(ev.minute + "' - " + ev.text, ev.type);
        });

        updateLiveScoreboard(currentHomeScore, currentAwayScore, currentLiveMinute);

        if(currentLiveMinute === 45) addLiveCommentary("Fim do primeiro tempo.", "info");
        if(currentLiveMinute === 46) addLiveCommentary("Rola a bola para a etapa final!", "info");

        // --- ALERTAS DE STAMINA NOS MINUTOS-CHAVE ---
        // Verifica se algum titular do nosso time está com desgaste crítico estimado.
        if ([30, 60, 75].includes(currentLiveMinute)) {
            const playerIsHome = liveResultData.homeTeam.id === gameState.playerTeam.id;
            const myTeam = playerIsHome ? liveResultData.homeTeam : liveResultData.awayTeam;
            const progress = currentLiveMinute / 90;

            const tiredStarters = myTeam.players
                .filter(p => p.isStarter)
                .filter(p => {
                    const staminaStat = p.attributes.stamina || 70;
                    const posMultiplier = STAMINA_DRAIN_BY_POSITION[p.primaryPosition] || 1.0;
                    const totalDrain = (25 + (100 - staminaStat) * 0.36) * posMultiplier;
                    // Estima a stamina no minuto atual da partida
                    const estimatedStamina = (p.preMatchStamina ?? 100) - (totalDrain * progress);
                    return estimatedStamina < 38;
                });

            if (tiredStarters.length > 0) {
                const top = tiredStarters[0];
                if (tiredStarters.length === 1) {
                    addLiveCommentary(`${currentLiveMinute}' ⚠️ CANSAÇO: ${top.name} (${top.primaryPosition}) está com as pernas pesadas. Considere uma substituição!`, 'warning');
                } else {
                    const names = tiredStarters.slice(0, 2).map(p => `${p.name}`).join(' e ');
                    addLiveCommentary(`${currentLiveMinute}' ⚠️ ALERTA FÍSICO: ${names} e mais ${tiredStarters.length - 2 > 0 ? tiredStarters.length - 2 + ' outros estão' : 'estão'} no limite! Hora de mexer no time.`, 'warning');
                }
                // Atualiza o painel de stamina ao vivo
                renderLiveStaminaPanel(currentLiveMinute);
            }
        }

        // Atualiza o painel de stamina a cada 15 minutos
        if (currentLiveMinute % 15 === 0) {
            renderLiveStaminaPanel(currentLiveMinute);
        }

        if (currentLiveMinute >= 90) {
            clearInterval(liveMatchTimer);
            addLiveCommentary("Fim de papo! O juiz encerra a partida.", "info");
            
            // --- CONTROLE DE FIM DE JOGO ---
            document.getElementById('live-match-skip').classList.add('hidden'); // Esconde o pular
            document.getElementById('live-match-actions').classList.remove('hidden'); // Mostra as ações
        }
    }, TICK_RATE);
}

// --- NOVA FUNÇÃO: Pular simulação ao vivo ---
function skipLiveMatch() {
    if (!liveMatchTimer) return; // Evita bugar se o jogo já tiver acabado
    
    // 1. Para o relógio imediatamente
    clearInterval(liveMatchTimer);
    liveMatchTimer = null;

    // 2. Filtra todos os eventos que ainda não aconteceram e joga na tela
    const remainingEvents = liveEvents.filter(e => e.minute > currentLiveMinute);
    remainingEvents.forEach(ev => {
        addLiveCommentary(ev.minute + "' - " + ev.text, ev.type);
    });

    // 3. Atualiza o placar final e o minuto para 90
    currentLiveMinute = 90;
    updateLiveScoreboard(liveResultData.homeGoals, liveResultData.awayGoals, 90);
    
    addLiveCommentary("Fim de papo! Simulação acelerada pelo treinador.", "info");

    // 4. Esconde o botão de pular e mostra os botões finais
    document.getElementById('live-match-skip').classList.add('hidden');
    document.getElementById('live-match-actions').classList.remove('hidden');
}

function setTeamRole(role, playerName) {
    gameState.roles[role] = playerName;
    console.log(`Definido: ${role} agora é responsabilidade de ${playerName}`);
    
    // Feedback visual opcional: Se for capitão, podemos atualizar a tela pré-jogo
    if(role === 'captain') {
        // Você pode disparar um alerta ou salvar no banco
    }
}

// INICIAR O JOGO QUANDO A PÁGINA CARREGAR
window.onload = initializeGame;