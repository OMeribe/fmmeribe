// --- MOTOR DO JOGO (Cálculos e Simulações) ---

let _playerIdCounter = 1;
function generatePlayerId() {
    return _playerIdCounter++;
}

function calculateOverallRating(player, position) {
    const weights = ATTRIBUTE_WEIGHTS[position];
    if (!weights) return 50; 

    let totalWeight = 0;
    let weightedSum = 0;

    for (const attr in weights) {
        weightedSum += (player.attributes[attr] || 50) * weights[attr];
        totalWeight += weights[attr];
    }

    return Math.round(weightedSum / totalWeight);
}

// --- CARREGAMENTO DE ARQUIVOS JSON ---

// --- CÁLCULOS FINANCEIROS DE JOGADORES ---
function calcPlayerSalary(overall) {
    // Salário mensal em R$ mil. Curva exponencial: rating 60 = ~30k, 75 = ~120k, 90 = ~500k
    return Math.round(0.008 * Math.pow(overall, 2.8) * 10) / 10;
}
function calcMarketValue(overall, age) {
    // Valor em R$ milhões. Pico aos 26 anos, cai após os 30.
    const ageFactor = age <= 26 ? 1 + (age - 18) * 0.05
                    : age <= 30 ? 1.4 - (age - 26) * 0.05
                    : Math.max(0.3, 1.2 - (age - 30) * 0.12);
    return Math.round(0.0002 * Math.pow(overall, 3.2) * ageFactor * 10) / 10;
}

async function loadAllTeamsFromJson() {
    teamsData = []; // Zera a lista

    for (const filename of teamFilesToLoad) {
        try {
            // O fetch busca o arquivo lá na sua pasta data/teams/
            const response = await fetch(`data/teams/${filename}`);
            if (!response.ok) throw new Error(`Erro ao carregar ${filename}`);
            
            const teamJson = await response.json();
            
            // Agora processamos os jogadores do JSON
            teamJson.players = teamJson.players.map(pData => {
                const player = {
                    id: generatePlayerId(),
                    name: pData.name,
                    number: pData.number || Math.floor(Math.random() * 99) + 1, // <-- NOVA LINHA (Se não tiver número, sorteia um)
                    photo: pData.photo,
                    age: calculateAge(pData.birthdate),
                    primaryPosition: pData.primaryPosition,
                    secondaryPositions: pData.secondaryPositions || [],
                    attributes: pData.attributes,
                    isStarter: false,
                    goals: 0,
                    assists: 0,
                    gamesPlayed: 0,
                    yellowCards: 0,   // ← adicionar
                    redCards: 0,      // ← adicionar
                    currentStamina: 100
                };
                player.overallRating = calculateOverallRating(player, player.primaryPosition);
                // Contrato, salário e valor de mercado gerados na criação
                player.contract   = Math.floor(Math.random() * 3) + 1; // 1 a 3 anos restantes
                player.salary     = calcPlayerSalary(player.overallRating);
                player.marketValue = calcMarketValue(player.overallRating, player.age);
                return player;
            });

            // Adiciona o time completo, com os jogadores processados, na nossa base global
            teamJson.overall = 0; // Será calculado depois
            teamsData.push(teamJson);

        } catch (error) {
            console.error(error);
        }
    }

    // Após carregar todos os JSONs, aplicamos a lógica de completar elenco e escalar titulares
    teamsData.forEach(team => {
        fillMissingPlayersWithGenerics(team);
        autoSelectStarters(team, '4-3-3');
    });
}

function calculateAge(birthdateString) {
    const today = new Date();
    const birthDate = new Date(birthdateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

function fillMissingPlayersWithGenerics(team) {
    const minSquadSize = 18;
    if (team.players.length < minSquadSize) {
        const positionsNeeded = ['GOL', 'ZAG', 'ZAG', 'LE', 'LD', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'ATA'];
        for (let i = team.players.length; i < minSquadSize; i++) {
            const pos = positionsNeeded[i % positionsNeeded.length];
            const p = {
                id: generatePlayerId(),
                name: "Jogador da Base", photo: "https://placehold.co/40x40/2d3748/ffffff?text=?",
                number: Math.floor(Math.random() * 50) + 50, // <-- NOVA LINHA (Sorteia de 50 a 99)
                age: 18, primaryPosition: pos, secondaryPositions: [],
                attributes: {}, isStarter: false, goals: 0, assists: 0, gamesPlayed: 0, yellowCards: 0, redCards: 0, currentStamina: 100
            };
            p.overallRating = calculateOverallRating(p, p.primaryPosition);
            p.contract    = 1;
            p.salary      = calcPlayerSalary(p.overallRating);
            p.marketValue = calcMarketValue(p.overallRating, p.age);
            team.players.push(p);
        }
    }
}

function getSecondaryPositions(primary) {
    const mapping = {
        GOL: [], ZAG: ['VOL'], LE: ['PE', 'ZAG'], LD: ['PD', 'ZAG'],
        VOL: ['ZAG', 'MC'], MC: ['VOL', 'MEI'], MEI: ['MC', 'SA'],
        PE: ['LE', 'SA'], PD: ['LD', 'SA'], SA: ['ATA', 'MEI', 'PE', 'PD'],
        ATA: ['SA']
    };
    return mapping[primary] || [];
}

function calculateTeamOveralls() {
    teamsData.forEach(team => {
        const starters = team.players.filter(p => p.isStarter);
        if (starters.length > 0) {
            const totalSkill = starters.reduce((acc, p) => acc + p.overallRating, 0);
            team.overall = Math.round(totalSkill / starters.length);
        } else {
            const top11 = [...team.players].sort((a,b) => b.overallRating - a.overallRating).slice(0, 11);
            const totalSkill = top11.reduce((acc, p) => acc + p.overallRating, 0);
            team.overall = Math.round(totalSkill / top11.length);
        }
    });
}

function createLeagueTable() {
    gameState.leagueTable = teamsData.map(team => ({
        teamId: team.id, teamName: team.name, logo: team.logo,
        played: 0, points: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0,
    })).sort((a, b) => b.points - a.points);
}

function createSchedule() {
    const teams = [...teamsData];
    const schedule = [];
    const numRounds = (teams.length - 1) * 2;

    // A primeira rodada do Brasileirão geralmente começa num fim de semana de Abril
    let matchDate = new Date('2026-04-12T16:00:00'); 

    for (let round = 0; round < numRounds; round++) {
        const roundMatches = [];
        for (let i = 0; i < teams.length / 2; i++) {
            const home = teams[i];
            const away = teams[teams.length - 1 - i];
            
            // Salvamos a data real DENTRO da partida agendada
            if (round % 2 === 0) {
                roundMatches.push({ home, away, date: new Date(matchDate) });
            } else {
                roundMatches.push({ home: away, away: home, date: new Date(matchDate) });
            }
        }
        schedule.push(roundMatches);
        teams.splice(1, 0, teams.pop()); // Rotaciona os times

        // LÓGICA DO CALENDÁRIO: Avança os dias para a próxima rodada
        // A cada 3 rodadas temos um jogo no meio de semana (avança 3 dias), senão avança 4 dias (fim de semana)
        if (round % 3 === 0) {
            matchDate.setDate(matchDate.getDate() + 3); 
        } else {
            matchDate.setDate(matchDate.getDate() + 4); 
        }
    }
    gameState.schedule = schedule;
}

function autoSelectStarters(team, formationName) {
    // Tira a camisa de titular de todo mundo
    team.players.forEach(p => p.isStarter = false);
    
    // Cria uma lista de vagas no campo e uma lista de jogadores disponíveis no banco
    const formationSlots = formations[formationName].map(s => ({ ...s, filled: false }));
    let availablePlayers = [...team.players];

    // Função interna rápida para vestir a camisa no jogador e tirar ele da lista de disponíveis
    function assignPlayerToSlot(slot, player) {
        player.isStarter = true;
        slot.filled = true;
        availablePlayers = availablePlayers.filter(p => p.id !== player.id);
    }

    // --- FASE 1: OS ESPECIALISTAS (Posição Primária) ---
    // Garante que os craques joguem onde rendem mais (Ex: Gabigol de ATA)
    formationSlots.forEach(slot => {
        if (slot.filled) return;
        const specialists = availablePlayers
            .filter(p => p.primaryPosition === slot.position)
            .sort((a, b) => b.overallRating - a.overallRating);
        
        if (specialists.length > 0) assignPlayerToSlot(slot, specialists[0]);
    });

    // --- FASE 2: OS POLIVALENTES (Posição Secundária) ---
    // Cobre os buracos com quem sabe jogar ali (Ex: Ponta jogando de Meia)
    formationSlots.forEach(slot => {
        if (slot.filled) return;
        const adaptables = availablePlayers
            .filter(p => p.secondaryPositions && p.secondaryPositions.includes(slot.position))
            .sort((a, b) => b.overallRating - a.overallRating);
        
        if (adaptables.length > 0) assignPlayerToSlot(slot, adaptables[0]);
    });

    // --- FASE 3: IMPROVISO DE SETOR (Mesmo Grupo) ---
    // Cobre buracos com jogadores da mesma área (Ex: Falta LD, puxa um ZAG)
    formationSlots.forEach(slot => {
        if (slot.filled) return;
        const slotGroup = POSITIONS[slot.position].group;
        const sameGroupPlayers = availablePlayers
            .filter(p => POSITIONS[p.primaryPosition].group === slotGroup)
            .sort((a, b) => b.overallRating - a.overallRating);
        
        if (sameGroupPlayers.length > 0) assignPlayerToSlot(slot, sameGroupPlayers[0]);
    });

    // --- FASE 4: O DESESPERO TOTAL (Maior OVR Restante) ---
    // Último recurso para o campo nunca ficar vazio
    formationSlots.forEach(slot => {
        if (slot.filled) return;
        const anyRemaining = availablePlayers.sort((a, b) => b.overallRating - a.overallRating);
        if (anyRemaining.length > 0) assignPlayerToSlot(slot, anyRemaining[0]);
    });
}

// --- INTELIGÊNCIA ARTIFICIAL DO OPONENTE ---
function autoSelectBestLineup(team) {
    // A CPU vai testar essas táticas no vestiário antes do jogo
    const cpuFormations = ['4-3-3', '4-4-2', '4-2-3-1', '5-3-2', '3-5-2'];
    let bestFormation = cpuFormations[0];
    let highestPower = 0;

    cpuFormations.forEach(form => {
        // Simula escalar o time com a formação
        autoSelectStarters(team, form);
        
        // Mede a força gerada pelos titulares que entraram
        const sectors = calculateSectorOveralls(team);
        const totalPower = sectors.defense + sectors.midfield + sectors.attack;
        
        // Se ficou mais forte, guarda a tática na memória
        if (totalPower > highestPower) {
            highestPower = totalPower;
            bestFormation = form;
        }
    });

    // Veste a camisa dos 11 melhores na tática vencedora
    autoSelectStarters(team, bestFormation);
    team.currentFormation = bestFormation; // Avisa a interface qual tática a CPU escolheu
}

function assignGoalsToPlayers(team, goals) {
    const goalEvents = [];
    let availablePlayers = team.players.filter(p => p.isStarter);
    if(availablePlayers.length === 0) availablePlayers = team.players.slice(0, 11);

    for(let i=0; i<goals; i++) {
        // Sorteia o Artilheiro
        const weightedPlayers = [];
        availablePlayers.forEach(p => {
            let weight = 1;
            if(p.primaryPosition === 'ATA' || p.primaryPosition === 'SA') weight = 10;
            else if(['PE', 'PD', 'MEI'].includes(p.primaryPosition)) weight = 5;
            else if(['MC', 'VOL'].includes(p.primaryPosition)) weight = 2;
            else if(p.primaryPosition === 'GOL') weight = 0;
            for(let w=0; w<weight; w++) weightedPlayers.push(p);
        });
        const scorer = weightedPlayers[Math.floor(Math.random() * weightedPlayers.length)];
        
        // Sorteia o Garçom (Assistência)
        let assister = null;
        if (Math.random() < 0.7 && scorer) { // 70% de chance de ter assistência
            const assistWeights = [];
            availablePlayers.filter(p => p.id !== scorer.id).forEach(p => {
                let w = 1;
                // Meias e Laterais têm mais chance de dar assistência
                if(['MEI', 'MC', 'PE', 'PD', 'LE', 'LD'].includes(p.primaryPosition)) w = 8;
                else if(['VOL', 'SA', 'ATA'].includes(p.primaryPosition)) w = 4;
                for(let k=0; k<w; k++) assistWeights.push(p);
            });
            if (assistWeights.length > 0) {
                assister = assistWeights[Math.floor(Math.random() * assistWeights.length)];
            }
        }

        if(scorer) {
            scorer.goals += 1;
            if(assister) assister.assists += 1;
            // Agora retornamos um objeto com os dois jogadores!
            goalEvents.push({ scorer: scorer, assister: assister }); 
        }
    }
    return goalEvents;
}

// --- NOVA FUNÇÃO: Separa as notas por setor ---
function calculateSectorOveralls(team) {
    const starters = team.players.filter(p => p.isStarter);
    // Fallback caso dê algum erro e o time não tenha titulares
    if (starters.length === 0) return { defense: 50, midfield: 50, attack: 50 };

    // Agrupa os jogadores pela posição
    const defPlayers = starters.filter(p => ['GOL', 'ZAG', 'LE', 'LD'].includes(p.primaryPosition));
    const midPlayers = starters.filter(p => ['VOL', 'MC', 'MEI', 'ME', 'MD'].includes(p.primaryPosition));
    const attPlayers = starters.filter(p => ['PE', 'PD', 'SA', 'ATA'].includes(p.primaryPosition));

    // Calcula a média de cada setor
    const calcAvg = (players) => players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.overallRating, 0) / players.length) : 50;

    return {
        defense: calcAvg(defPlayers),
        midfield: calcAvg(midPlayers),
        attack: calcAvg(attPlayers)
    };
}

// --- HELPER: Fator de penalidade pelo cansaço do time ---
// Retorna um multiplicador entre 0.78 e 1.0 aplicado aos setores táticos.
// Stamina média acima de 70 = sem penalidade.
// Abaixo de 70: cada 10 pontos a menos = -3.5% de eficiência tática.
// Ex.: média 50 → fator 0.93 | média 30 → fator 0.86 | média 10 → fator 0.79
function getStaminaPenaltyFactor(avgStamina) {
    if (avgStamina >= 70) return 1.0;
    return Math.max(0.78, 1.0 - (70 - avgStamina) * 0.0035);
}

// --- SISTEMA DE STAMINA: Desgaste pós-partida ---
// Chamada após cada partida. Drena a currentStamina dos titulares.
// Posições que correm mais perdem mais. Stamina alta = base de desgaste menor.
function applyMatchStaminaDrain(team) {
    const starters = team.players.filter(p => p.isStarter);
    starters.forEach(p => {
        const staminaStat = p.attributes.stamina || 70;
        const posMultiplier = STAMINA_DRAIN_BY_POSITION[p.primaryPosition] || 1.0;

        // Jogador com stamina=100 perde 25 pts base; stamina=50 perde ~43 pts base
        const baseDrain = 25 + (100 - staminaStat) * 0.36;
        const totalDrain = baseDrain * posMultiplier;

        p.currentStamina = Math.max(5, Math.round((p.currentStamina ?? 100) - totalDrain));
    });
}

// --- SISTEMA DE STAMINA: Recuperação diária ---
// Chamada 1x para cada dia do calendário que passa.
// Jogadores com atributo de stamina alto se recuperam mais rápido.
// stamina=90 → +7.2/dia | stamina=60 → +4.8/dia | stamina=40 → +3.2/dia
function recoverStaminaForDay(team) {
    team.players.forEach(p => {
        if ((p.currentStamina ?? 100) >= 100) return; // Já 100%, não precisa calcular
        const staminaStat = p.attributes.stamina || 70;
        const recovery = (staminaStat / 100) * 8;
        p.currentStamina = Math.min(100, Math.round((p.currentStamina ?? 100) + recovery));
    });
}

// Função que calcula o impacto tático das escolhas do jogador
function applyRolesBonus(team, sectors, roles) {
    const captain = team.players.find(p => p.name === roles.captain && p.isStarter);
    const fk = team.players.find(p => p.name === roles.freeKicks && p.isStarter);
    const corner = team.players.find(p => p.name === roles.corners && p.isStarter);
    const pen = team.players.find(p => p.name === roles.penalties && p.isStarter);

    // Capitão: Organização tática dá +2 de Força para Defesa e Meio-campo
    if (captain) {
        sectors.defense += 2;
        sectors.midfield += 2;
    }
    // Faltas: Batedor perigoso aumenta a chance de gols (Ataque)
    if (fk) {
        let fkSkill = ((fk.attributes.long_shots || 50) + (fk.attributes.passing || 50)) / 2;
        if (fkSkill > 78) sectors.attack += 4;
        else if (fkSkill > 65) sectors.attack += 2;
    }
    // Escanteios: Cruzamentos na medida geram pânico na zaga
    if (corner) {
        let cornerSkill = corner.attributes.crossing || 50;
        if (cornerSkill > 78) sectors.attack += 4;
        else if (cornerSkill > 65) sectors.attack += 2;
    }
    // Pênaltis: Frieza para não desperdiçar as grandes chances
    if (pen) {
        let penSkill = ((pen.attributes.finishing || 50) + (pen.attributes.shot_power || 50)) / 2;
        if (penSkill > 78) sectors.attack += 4;
        else if (penSkill > 65) sectors.attack += 2;
    }
}

// --- NOVO SIMULADOR DE PARTIDAS (Baseado em Setores e Posse de Bola) ---
function simulateMatch(homeTeam, awayTeam) {
    const homeAdvantage = 3; // Fator casa

    homeTeam.players.filter(p => p.isStarter).forEach(p => p.gamesPlayed += 1);
    awayTeam.players.filter(p => p.isStarter).forEach(p => p.gamesPlayed += 1);

    // Pega as notas setorizadas de cada time
    const homeSectors = calculateSectorOveralls(homeTeam);
    const awaySectors = calculateSectorOveralls(awayTeam);

    // --- NOVA MECÂNICA: BÔNUS DAS OPÇÕES AVANÇADAS ---
    // Aplica o bônus apenas para o time do jogador (já que a IA ainda não tem essa inteligência)
    if (homeTeam.id === gameState.playerTeam.id) {
        applyRolesBonus(homeTeam, homeSectors, gameState.roles);
    } else if (awayTeam.id === gameState.playerTeam.id) {
        applyRolesBonus(awayTeam, awaySectors, gameState.roles);
    }

    // --- PENALIDADE DE STAMINA NOS SETORES ---
    // Times cansados jogam abaixo do seu potencial real.
    const homeStarters = homeTeam.players.filter(p => p.isStarter);
    const awayStarters = awayTeam.players.filter(p => p.isStarter);

    const homeAvgStamina = homeStarters.length > 0
        ? homeStarters.reduce((sum, p) => sum + (p.currentStamina ?? 100), 0) / homeStarters.length
        : 100;
    const awayAvgStamina = awayStarters.length > 0
        ? awayStarters.reduce((sum, p) => sum + (p.currentStamina ?? 100), 0) / awayStarters.length
        : 100;

    const homeFactor = getStaminaPenaltyFactor(homeAvgStamina);
    const awayFactor = getStaminaPenaltyFactor(awayAvgStamina);

    homeSectors.defense  = Math.round(homeSectors.defense  * homeFactor);
    homeSectors.midfield = Math.round(homeSectors.midfield * homeFactor);
    homeSectors.attack   = Math.round(homeSectors.attack   * homeFactor);

    awaySectors.defense  = Math.round(awaySectors.defense  * awayFactor);
    awaySectors.midfield = Math.round(awaySectors.midfield * awayFactor);
    awaySectors.attack   = Math.round(awaySectors.attack   * awayFactor);

    // 1. A BATALHA DO MEIO-CAMPO (Define a Posse de Bola)
    // Comparamos os meios-campos (com vantagem para o time da casa)
    const midDiff = (homeSectors.midfield + homeAdvantage) - awaySectors.midfield;
    
    // Partimos de 50%. Cada ponto de diferença dá 1.5% a mais de posse de bola
    let homePossession = 50 + (midDiff * 1.5); 
    
    // Adiciona o fator "imprevisibilidade do futebol" (Sorteia entre -5% e +5%)
    homePossession += (Math.random() * 10 - 5);
    
    // Trava a posse de bola para não passar de 75% nem cair de 25% (realismo)
    homePossession = Math.max(25, Math.min(75, Math.round(homePossession))); 
    let awayPossession = 100 - homePossession;

    // 2. ATAQUE vs DEFESA (Chances de Gol)
    // Quem tem mais posse de bola, ataca mais vezes! (Multiplicador de Volume de Jogo)
    const homePossessionMultiplier = homePossession / 50;
    const awayPossessionMultiplier = awayPossession / 50;

    // Força de Ataque = (Qualidade do Ataque + Casa) * Volume de Jogo
    const homeAttackPower = (homeSectors.attack + homeAdvantage) * homePossessionMultiplier;
    const awayDefensePower = awaySectors.defense;

    const awayAttackPower = awaySectors.attack * awayPossessionMultiplier;
    const homeDefensePower = homeSectors.defense + homeAdvantage;

    // 3. MATEMÁTICA DOS GOLS (Fura-Retranca)
    // Calculamos o gol comparando a Força de Ataque com a Força da Defesa adversária
    let homeExpectedGoals = Math.pow(homeAttackPower / 72, 2) * (homeAttackPower / awayDefensePower);
    let awayExpectedGoals = Math.pow(awayAttackPower / 72, 2) * (awayAttackPower / homeDefensePower);

    // Adiciona o fator sorte final nas finalizações (+ ou - gols perdidos)
    homeExpectedGoals += (Math.random() * 1.4 - 0.5); 
    awayExpectedGoals += (Math.random() * 1.4 - 0.5);

    // ... (cálculo dos gols que já fizemos antes)
    let homeGoals = Math.max(0, Math.round(homeExpectedGoals));
    let awayGoals = Math.max(0, Math.round(awayExpectedGoals));

    const homeScorers = assignGoalsToPlayers(homeTeam, homeGoals);
    const awayScorers = assignGoalsToPlayers(awayTeam, awayGoals);

    // --- 4. ESTATÍSTICAS EXTRAS (Passes, Precisão e Chutes) ---
    
    // Total de passes de um jogo normal varia entre 600 e 900
    const totalPasses = 600 + Math.floor(Math.random() * 300);
    let homePasses = Math.round((homePossession / 100) * totalPasses);
    let awayPasses = totalPasses - homePasses;

    // Precisão de Passe é influenciada pela nota do Meio-Campo (máx 95%)
    let homePassAcc = Math.min(95, Math.max(60, homeSectors.midfield + 5 + Math.floor(Math.random() * 6 - 3)));
    let awayPassAcc = Math.min(95, Math.max(60, awaySectors.midfield + 5 + Math.floor(Math.random() * 6 - 3)));

    // Chutes a gol: O mínimo tem que ser os gols que o time fez. O resto depende do volume do Ataque.
    let homeShots = homeGoals + Math.floor((homeAttackPower / 12) + (Math.random() * 4));
    let awayShots = awayGoals + Math.floor((awayAttackPower / 12) + (Math.random() * 4));

    // --- DRENA A STAMINA DOS JOGADORES APÓS A PARTIDA ---
    applyMatchStaminaDrain(homeTeam);
    applyMatchStaminaDrain(awayTeam);

    // Retornamos tudo para a interface exibir
    return { 
        homeTeam, awayTeam, 
        homeGoals, awayGoals, 
        homeScorers, awayScorers,
        homePossession, awayPossession,
        homePasses, awayPasses,
        homePassAcc, awayPassAcc,
        homeShots, awayShots
    };
}

function updateTableWithResult(result) {
    const homeEntry = gameState.leagueTable.find(e => e.teamId === result.homeTeam.id);
    const awayEntry = gameState.leagueTable.find(e => e.teamId === result.awayTeam.id);

    homeEntry.played++; awayEntry.played++;
    homeEntry.goalsFor += result.homeGoals; homeEntry.goalsAgainst += result.awayGoals;
    awayEntry.goalsFor += result.awayGoals; awayEntry.goalsAgainst += result.homeGoals;

    if (result.homeGoals > result.awayGoals) {
        homeEntry.points += 3; homeEntry.wins++; awayEntry.losses++;
    } else if (result.awayGoals > result.homeGoals) {
        awayEntry.points += 3; awayEntry.wins++; homeEntry.losses++;
    } else {
        homeEntry.points += 1; awayEntry.points += 1;
        homeEntry.draws++; awayEntry.draws++;
    }

    // --- ATUALIZA FINANÇAS E MORAL DO TIME DO JOGADOR ---
    const playerTeam = gameState.playerTeam;
    if (!playerTeam) return;

    const playerIsHome = result.homeTeam.id === playerTeam.id;
    const isPlayerMatch = playerIsHome || result.awayTeam.id === playerTeam.id;
    if (!isPlayerMatch) return;

    const myGoals  = playerIsHome ? result.homeGoals : result.awayGoals;
    const oppGoals = playerIsHome ? result.awayGoals : result.homeGoals;

    // Receita de bilheteria (só em casa) + salários por rodada
    if (playerIsHome) playerTeam.finances += 1.5;
    const salaryBill = playerTeam.players.reduce((sum, p) => sum + ((p.salary || 0) / 10000), 0);
    playerTeam.finances -= salaryBill;

    // Bônus/penalidade por resultado
    if (myGoals > oppGoals) {
        playerTeam.finances += 2.0;
        gameState.teamMorale = Math.min(100, gameState.teamMorale + 8);
    } else if (myGoals === oppGoals) {
        playerTeam.finances += 0.5;
        gameState.teamMorale = Math.min(100, gameState.teamMorale + 2);
    } else {
        gameState.teamMorale = Math.max(0, gameState.teamMorale - 10);
    }

    playerTeam.finances = Math.round(playerTeam.finances * 10) / 10;
}

function sortLeagueTable(table) {
    return table.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const sgA = a.goalsFor - a.goalsAgainst;
        const sgB = b.goalsFor - b.goalsAgainst;
        if (sgB !== sgA) return sgB - sgA;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.teamName.localeCompare(b.teamName);
    });
}

// --- GERAÇÃO DE NOTÍCIAS APÓS A RODADA ---
function generateNewsAfterRound(results) {
    const playerTeam = gameState.playerTeam;
    if (!playerTeam) return;

    const pr = results.find(r => r.homeTeam.id === playerTeam.id || r.awayTeam.id === playerTeam.id);
    if (!pr) return;

    const isHome   = pr.homeTeam.id === playerTeam.id;
    const myGoals  = isHome ? pr.homeGoals : pr.awayGoals;
    const oppGoals = isHome ? pr.awayGoals : pr.homeGoals;
    const opponent = isHome ? pr.awayTeam  : pr.homeTeam;
    const newItems = [];

    // Notícia principal: resultado do jogo
    if (myGoals > oppGoals) {
        const opts = [
            `Vitória sólida! ${playerTeam.name} bate o ${opponent.name} por ${myGoals} a ${oppGoals}.`,
            `Três pontos valiosos! O ${playerTeam.name} derrota o ${opponent.name} com autoridade.`,
            `Show de bola! ${playerTeam.name} ${myGoals}×${oppGoals} ${opponent.name}. Torcida celebra!`,
        ];
        newItems.push({ text: opts[Math.floor(Math.random() * opts.length)], type: 'positive' });
    } else if (myGoals === oppGoals) {
        const opts = [
            `Empate em ${myGoals} a ${oppGoals} com o ${opponent.name}. Um ponto na bagagem.`,
            `Jogo truncado termina empatado. ${playerTeam.name} e ${opponent.name} dividem os pontos.`,
        ];
        newItems.push({ text: opts[Math.floor(Math.random() * opts.length)], type: 'neutral' });
    } else {
        const opts = [
            `Derrota por ${oppGoals} a ${myGoals} para o ${opponent.name}. Momento difícil no clube.`,
            `${opponent.name} impõe derrota ao ${playerTeam.name}. Vestiário preocupado.`,
            `Resultado decepcionante. ${playerTeam.name} perde e cede terreno na tabela.`,
        ];
        newItems.push({ text: opts[Math.floor(Math.random() * opts.length)], type: 'negative' });
    }

    // Notícia do artilheiro interno
    const topScorer = [...playerTeam.players].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals)[0];
    if (topScorer) {
        newItems.push({ 
            text: `${topScorer.name} é o artilheiro do clube com ${topScorer.goals} gol(s) na temporada.`, 
            type: 'info' 
        });
    }

    // Notícia de moral extrema
    if (gameState.teamMorale >= 88) {
        newItems.push({ text: 'Ambiente no vestiário está eletrizante. Moral do grupo nas alturas!', type: 'positive' });
    } else if (gameState.teamMorale <= 30) {
        newItems.push({ text: 'Crise de confiança! Jogadores desanimados com a sequência negativa.', type: 'negative' });
    }

    // Alerta financeiro
    if (playerTeam.finances < 10) {
        newItems.push({ text: '⚠️ Alerta: caixa do clube está baixo. Atenção às finanças!', type: 'warning' });
    }

    // Insere as novas no topo e limita a 8 itens
    gameState.news = [...newItems, ...gameState.news].slice(0, 8);
}
function generateMatchEvents(matchResult) {
    const events = [];
    // Pool de 89 minutos embaralhados — garante unicidade sem loop infinito
    const minutePool = Array.from({ length: 89 }, (_, i) => i + 1)
        .sort(() => Math.random() - 0.5);
    let minuteCursor = 0;

    function getUniqueMinute() {
        // Se esgotar o pool (impossível na prática), retorna o último minuto disponível
        if (minuteCursor >= minutePool.length) return 89;
        return minutePool[minuteCursor++];
    }

    matchResult.homeScorers.forEach(eventData => {
        const assistText = eventData.assister ? ` após passe magistral de ${eventData.assister.name}` : '';
        events.push({ minute: getUniqueMinute(), team: 'home', type: 'goal', text: `GOOOOOL DO ${matchResult.homeTeam.name.toUpperCase()}! ${eventData.scorer.name} manda pro fundo das redes${assistText}!` });
    });

    matchResult.awayScorers.forEach(eventData => {
        const assistText = eventData.assister ? ` com assistência de ${eventData.assister.name}` : '';
        events.push({ minute: getUniqueMinute(), team: 'away', type: 'goal', text: `GOOOOOL DO ${matchResult.awayTeam.name.toUpperCase()}! ${eventData.scorer.name} não perdoa e marca${assistText}!` });
    });
    
    // Faltas e passes com nomes de jogadores
    // Faltas, passes e escanteios com os jogadores designados
    const randomEvents = ['foul', 'corner', 'card', 'normal', 'normal', 'normal'];
    for(let i=0; i<15; i++) {
        const rEvent = randomEvents[Math.floor(Math.random() * randomEvents.length)];
        const isHomeEvent = Math.random() > 0.5;
        const activeTeam = isHomeEvent ? matchResult.homeTeam : matchResult.awayTeam;
        const activePlayers = activeTeam.players.filter(p => p.isStarter);
        const randomPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)]?.name || "Jogador";
        
        const isPlayerTeam = activeTeam.id === gameState.playerTeam.id;
        let text = "";

        if(rEvent === 'foul') {
            if (isPlayerTeam && gameState.roles.freeKicks) {
                text = `Falta perigosa a favor do ${activeTeam.name}! ${gameState.roles.freeKicks} ajeita a bola com carinho e bate... passou raspando a trave!`;
            } else {
                text = `Falta dura cometida por ${randomPlayer} (${activeTeam.name}). O juiz marca!`;
            }
        }
        else if(rEvent === 'corner') {
            if (isPlayerTeam && gameState.roles.corners) {
                text = `Escanteio para o ${activeTeam.name}. ${gameState.roles.corners} levanta na área, mas a zaga corta o perigo.`;
            } else {
                text = `Escanteio cobrado por ${randomPlayer}, a bola viaja pela grande área.`;
            }
        }
        else if(rEvent === 'card') {
            // Encontra o objeto do jogador para incrementar a contagem real
            const cardedPlayerObj = activePlayers.find(p => p.name === randomPlayer);
            const isRed = Math.random() < 0.12; // 12% de chance de ser vermelho

            if (cardedPlayerObj) {
                if (isRed) {
                    cardedPlayerObj.redCards = (cardedPlayerObj.redCards || 0) + 1;
                } else {
                    cardedPlayerObj.yellowCards = (cardedPlayerObj.yellowCards || 0) + 1;
                }
            }

            text = isRed
                ? `CARTÃO VERMELHO para ${randomPlayer} (${activeTeam.name})! Expulsão polêmica!`
                : `Cartão amarelo para ${randomPlayer} (${activeTeam.name}) após carrinho perigoso.`;
        }
        else if(rEvent === 'normal') {
            text = `${randomPlayer} tenta acionar o ataque, mas a marcação afasta.`;
        }
        
        events.push({ minute: getUniqueMinute(), team: 'none', type: rEvent, text: text });
    }
    
    return events.sort((a, b) => a.minute - b.minute);
}