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
    renderTeamSelection();
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
let TICK_RATE = 500; 

function processEntireRound() {
    calculateTeamOveralls(); 
    const roundMatches = gameState.schedule[gameState.currentRound - 1];
    allRoundResults = [];
    
    roundMatches.forEach(match => {
        const result = simulateMatch(match.home, match.away);
        allRoundResults.push(result);
        
        // SÓ MEXE NA TABELA SE FOR MODO CARREIRA
        if (gameMode !== 'friendly') {
            updateTableWithResult(result);
        }

        match.homeGoals = result.homeGoals;
        match.awayGoals = result.awayGoals;
        match.played = true;
    });

    if (gameMode !== 'friendly') {
        generateNewsAfterRound(allRoundResults);
    }
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
    if (typeof gameMode !== 'undefined' && gameMode === 'friendly') {
        // Se for amistoso, acaba o jogo e volta pra tela de título!
        showScreen('main-menu-screen');
        return;
    }
    
    // Lógica normal do modo carreira
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
        
        // SE FOR AMISTOSO, VAI DIRETO PRO SEU PLACAR
        if (gameMode === 'friendly') {
            renderPlayerStatsModal(playerMatch);
        } else {
            renderMatchResultsModal(allRoundResults);
            renderPlayerStatsModal(playerMatch);
        }
    });
}

function showRoundResultsFromLive() {
    finishRoundAndGoToHub(); 
    if (gameMode === 'friendly') {
        renderPlayerStatsModal(liveResultData); 
    } else {
        renderMatchResultsModal(allRoundResults);
        renderPlayerStatsModal(liveResultData); 
    }
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

function setGameSpeed(speedMs, btnElement) {
    TICK_RATE = speedMs; // Altera a velocidade global do relógio
    
    // Reseta o visual de todos os botões de velocidade
    const buttons = document.querySelectorAll('.speed-btn');
    buttons.forEach(btn => {
        btn.classList.remove('bg-blue-600', 'border-blue-900', 'ring-2', 'ring-yellow-400');
        btn.classList.add('bg-gray-700', 'border-gray-900');
    });
    
    // Acende apenas o botão que o jogador clicou
    btnElement.classList.remove('bg-gray-700', 'border-gray-900');
    btnElement.classList.add('bg-blue-600', 'border-blue-900', 'ring-2', 'ring-yellow-400');
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