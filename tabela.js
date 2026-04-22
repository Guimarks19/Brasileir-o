const EM_LOCALHOST = ["localhost", "127.0.0.1"].includes(window.location.hostname);

function obterBasePublica() {
    const caminho = window.location.pathname || "/";

    if (caminho === "/" || caminho === "/index.html") {
        return "";
    }

    if (caminho.endsWith("/")) {
        return caminho.slice(0, -1);
    }

    return caminho.replace(/\/[^/]*$/, "");
}

const BASE_PUBLICA = obterBasePublica();
const API_URL = EM_LOCALHOST ? "/api/tabela" : `${BASE_PUBLICA}/data/tabela.json`;
const JOGOS_URL = EM_LOCALHOST ? "/api/jogos" : `${BASE_PUBLICA}/data/jogos.json`;
const POS_JOGO_URL = "/api/estatisticas-pos-jogo";

const STORAGE_ACCOUNTS = "brasileirao.accounts";
const STORAGE_SESSION = "brasileirao.session";
const STORAGE_FAVORITO = "brasileirao.favorito";
const STORAGE_INTERACOES = "brasileirao.interacoes";
const STORAGE_SIMULADOR = "brasileirao.simulador";
const STORAGE_PROFILE = "brasileirao.profile";

const TIMES_CUSTOMIZADOS = {
    1768: {
        nome: "Athletico-PR",
        escudo: "https://upload.wikimedia.org/wikipedia/commons/4/43/Athletico_Paranaense_%28Logo_2019%29.svg"
    }
};

const EVENTOS_GAME = [
    "Perdeu jogador importante por lesao",
    "Treinador demitido apos sequencia ruim",
    "Clima leve no elenco e moral em alta",
    "Time virou assunto da rodada",
    "Torcida pressiona por resposta imediata",
    "Base ganha espaco e renova energia do elenco"
];

const estado = {
    accounts: carregarJsonLocal(STORAGE_ACCOUNTS, {}),
    sessao: carregarJsonLocal(STORAGE_SESSION, null),
    perfil: carregarJsonLocal(STORAGE_PROFILE, {}),
    favoritoId: Number(localStorage.getItem(STORAGE_FAVORITO)) || null,
    interacoes: carregarJsonLocal(STORAGE_INTERACOES, {}),
    simulador: carregarJsonLocal(STORAGE_SIMULADOR, { resultados: {}, modoGame: false }),
    tabelaOriginal: [],
    jogosRodada: [],
    jogosAoVivo: [],
    jogosProximos: [],
    appIniciado: false,
    avatarPreview: ""
};

const popupBetaEl = document.querySelector("#popup-beta");
const fecharPopupBetaEl = document.querySelector("#fechar-popup-beta");
const authScreenEl = document.querySelector("#auth-screen");
const appShellEl = document.querySelector("#app-shell");
const setupOverlayEl = document.querySelector("#setup-overlay");
const setupFavoritoEl = document.querySelector("#setup-favorito");
const setupAvatarInputEl = document.querySelector("#setup-avatar-input");
const setupAvatarPreviewEl = document.querySelector("#setup-avatar-preview");
const setupAvatarPlaceholderEl = document.querySelector("#setup-avatar-placeholder");
const salvarSetupEl = document.querySelector("#salvar-setup");
const fecharSetupEl = document.querySelector("#fechar-setup");
const abrirSetupEl = document.querySelector("#abrir-setup");
const cadastroFormEl = document.querySelector("#cadastro-form");
const loginFormEl = document.querySelector("#login-form");
const tabCadastroEl = document.querySelector("#tab-cadastro");
const tabLoginEl = document.querySelector("#tab-login");
const authMensagemEl = document.querySelector("#auth-mensagem");
const cadastroUsuarioEl = document.querySelector("#cadastro-usuario");
const cadastroSenhaEl = document.querySelector("#cadastro-senha");
const loginUsuarioEl = document.querySelector("#login-usuario");
const loginSenhaEl = document.querySelector("#login-senha");
const logoutBotaoEl = document.querySelector("#logout-botao");
const usuarioLogadoEl = document.querySelector("#usuario-logado");
const saudacaoUsuarioEl = document.querySelector("#saudacao-usuario");
const perfilAvatarEl = document.querySelector("#perfil-avatar");
const perfilAvatarPlaceholderEl = document.querySelector("#perfil-avatar-placeholder");
const tbody = document.querySelector("#tabela tbody");
const statusEl = document.querySelector("#status");
const rodadaEl = document.querySelector("#rodada-atual");
const liderTimeEl = document.querySelector("#lider-time");
const liderPontosEl = document.querySelector("#lider-pontos");
const atualizacaoEl = document.querySelector("#ultima-atualizacao");
const jogosAoVivoEl = document.querySelector("#jogos-ao-vivo");
const jogosRodadaEl = document.querySelector("#jogos-rodada");
const jogosTabAoVivoEl = document.querySelector("#jogos-tab-ao-vivo");
const jogosTabProximosEl = document.querySelector("#jogos-tab-proximos");
const insightsListaEl = document.querySelector("#insights-lista");
const favoritoCardEl = document.querySelector("#favorito-card");
const limparFavoritoEl = document.querySelector("#limpar-favorito");
const simuladorTabelaEl = document.querySelector("#simulador-tabela");
const simuladorJogosListaEl = document.querySelector("#simulador-jogos-lista");
const simuladorResumoEl = document.querySelector("#simulador-resumo");
const simuladorRodadaLabelEl = document.querySelector("#simulador-rodada-label");
const simuladorTimeCardEl = document.querySelector("#simulador-time-card");
const simuladorDestaquesEl = document.querySelector("#simulador-destaques");
const resetSimuladorEl = document.querySelector("#reset-simulador");
const toggleGameModeEl = document.querySelector("#toggle-game-mode");
const gameModeCardEl = document.querySelector("#game-mode-card");
const gameObjetivoEl = document.querySelector("#game-objetivo");
const gameMensagensEl = document.querySelector("#game-mensagens");
const menuTabs = document.querySelectorAll("[data-tab]");
const heroTabelaEl = document.querySelector("#hero-tabela");
const heroJogosEl = document.querySelector("#hero-jogos");
const heroBetaEl = document.querySelector("#hero-beta");
const painelTabelaEl = document.querySelector("#painel-tabela");
const painelJogosEl = document.querySelector("#painel-jogos");
const painelBetaEl = document.querySelector("#painel-beta");

function carregarJsonLocal(chave, fallback) {
    try {
        const valor = localStorage.getItem(chave);
        return valor ? JSON.parse(valor) : fallback;
    } catch {
        return fallback;
    }
}

function salvarJsonLocal(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
}

async function buscarJsonComFallback(urls) {
    let ultimoErro = null;

    for (const url of urls) {
        try {
            const resposta = await fetch(url, { cache: "no-store" });
            const data = await resposta.json();

            if (!resposta.ok) {
                throw new Error(data.erro || `Erro ${resposta.status}`);
            }

            return data;
        } catch (erro) {
            ultimoErro = erro;
        }
    }

    throw ultimoErro || new Error("Nao foi possivel carregar os dados.");
}

function obterUrlsTabela() {
    if (EM_LOCALHOST) return [API_URL];

    const alternativas = [API_URL, "./data/tabela.json", "data/tabela.json"];
    return [...new Set(alternativas)];
}

function obterUrlsJogos() {
    if (EM_LOCALHOST) return [JOGOS_URL];

    const alternativas = [JOGOS_URL, "./data/jogos.json", "data/jogos.json"];
    return [...new Set(alternativas)];
}

function normalizarUsuario(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function usuarioAtual() {
    return estado.sessao?.usuario || "";
}

function estaAutenticado() {
    return Boolean(usuarioAtual());
}

function atualizarStatus(mensagem, tipo = "info") {
    if (!statusEl) return;
    statusEl.textContent = mensagem;
    statusEl.className = tipo;
}

function formatarHorarioAtualizacao(isoString) {
    const data = isoString ? new Date(isoString) : new Date();
    if (Number.isNaN(data.getTime())) return "-";

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function obterTimePersonalizado(team) {
    const customizacao = TIMES_CUSTOMIZADOS[team.id];
    return {
        id: team.id,
        nome: customizacao?.nome || team.shortName || team.name,
        escudo: customizacao?.escudo || team.crest
    };
}

function obterNomeTime(team) {
    return obterTimePersonalizado(team).nome;
}

function perfilAtual() {
    return estado.perfil[usuarioAtual()] || {};
}

function mostrarMensagemAuth(mensagem) {
    if (authMensagemEl) {
        authMensagemEl.textContent = mensagem;
    }
}

function alternarAuth(modo) {
    const cadastroAtivo = modo === "cadastro";
    cadastroFormEl?.classList.toggle("hidden", !cadastroAtivo);
    loginFormEl?.classList.toggle("hidden", cadastroAtivo);
    tabCadastroEl?.classList.toggle("ativo", cadastroAtivo);
    tabLoginEl?.classList.toggle("ativo", !cadastroAtivo);
}

function atualizarAvatarUI() {
    const perfil = perfilAtual();
    const avatar = perfil.avatar || "";
    const inicial = (usuarioAtual().slice(0, 1) || "?").toUpperCase();

    if (perfilAvatarEl && perfilAvatarPlaceholderEl) {
        if (avatar) {
            perfilAvatarEl.src = avatar;
            perfilAvatarEl.classList.remove("hidden");
            perfilAvatarPlaceholderEl.classList.add("hidden");
        } else {
            perfilAvatarEl.classList.add("hidden");
            perfilAvatarPlaceholderEl.classList.remove("hidden");
            perfilAvatarPlaceholderEl.textContent = inicial;
        }
    }
}

function atualizarSaudacao() {
    if (!usuarioLogadoEl || !saudacaoUsuarioEl) return;

    if (!estaAutenticado()) {
        usuarioLogadoEl.textContent = "Visitante";
        saudacaoUsuarioEl.textContent = "Acesso local beta";
        atualizarAvatarUI();
        return;
    }

    usuarioLogadoEl.textContent = usuarioAtual();
    const favorito = encontrarTimeFavorito();
    saudacaoUsuarioEl.textContent = favorito
        ? `Seu time: ${obterNomeTime(favorito.team)}`
        : "Escolha um time favorito";
    atualizarAvatarUI();
}

function atualizarVisibilidadeApp() {
    const popupAberto = popupBetaEl && !popupBetaEl.classList.contains("hidden");
    authScreenEl?.classList.toggle("hidden", estaAutenticado() || popupAberto);
    appShellEl?.classList.toggle("hidden", !estaAutenticado());
    atualizarSaudacao();
}

function preencherSelectFavorito() {
    if (!setupFavoritoEl) return;

    const options = estado.tabelaOriginal
        .map((time) => `<option value="${time.team.id}">${obterNomeTime(time.team)}</option>`)
        .join("");

    setupFavoritoEl.innerHTML = `<option value="">Selecione um time</option>${options}`;
    if (estado.favoritoId) {
        setupFavoritoEl.value = String(estado.favoritoId);
    }
}

function abrirSetupSeNecessario() {
    if (!estaAutenticado()) return;
    preencherSelectFavorito();
    setupOverlayEl?.classList.remove("hidden");
}

function salvarSessao(usuario) {
    estado.sessao = { usuario };
    salvarJsonLocal(STORAGE_SESSION, estado.sessao);
    atualizarVisibilidadeApp();
    iniciarApp();
}

function encerrarSessao() {
    estado.sessao = null;
    estado.appIniciado = false;
    localStorage.removeItem(STORAGE_SESSION);
    atualizarVisibilidadeApp();
    popupBetaEl?.classList.add("hidden");
    setupOverlayEl?.classList.add("hidden");
    authScreenEl?.classList.remove("hidden");
    mostrarMensagemAuth("Entre novamente para acessar a beta.");
}

function abrirFluxoLogin() {
    popupBetaEl?.classList.add("hidden");
    if (estaAutenticado()) {
        atualizarVisibilidadeApp();
        iniciarApp();
        return;
    }

    if (!estaAutenticado()) {
        authScreenEl?.classList.remove("hidden");
    }
    atualizarVisibilidadeApp();
}

function cadastrarUsuario(usuarioBruto, senhaBruta) {
    const usuario = normalizarUsuario(usuarioBruto);
    const senha = String(senhaBruta || "").trim();

    if (!usuario || senha.length < 4) {
        mostrarMensagemAuth("Use um usuario valido e uma senha com pelo menos 4 caracteres.");
        return;
    }

    if (estado.accounts[usuario]) {
        mostrarMensagemAuth("Esse usuario ja existe. Tente entrar.");
        alternarAuth("login");
        return;
    }

    estado.accounts[usuario] = { senha };
    salvarJsonLocal(STORAGE_ACCOUNTS, estado.accounts);
    salvarSessao(usuario);
    mostrarMensagemAuth("Conta criada com sucesso.");
}

function fazerLogin(usuarioBruto, senhaBruta) {
    const usuario = normalizarUsuario(usuarioBruto);
    const senha = String(senhaBruta || "").trim();
    const conta = estado.accounts[usuario];

    if (!conta) {
        mostrarMensagemAuth("Usuario nao encontrado. Cadastre primeiro.");
        return;
    }

    if (conta.senha !== senha) {
        mostrarMensagemAuth("Senha incorreta. Tente novamente.");
        return;
    }

    salvarSessao(usuario);
    mostrarMensagemAuth("Login realizado com sucesso.");
}

function salvarSetupPerfil() {
    if (!estaAutenticado()) return;

    const favoritoId = Number(setupFavoritoEl?.value) || null;

    estado.favoritoId = favoritoId;
    if (favoritoId) {
        localStorage.setItem(STORAGE_FAVORITO, String(favoritoId));
    } else {
        localStorage.removeItem(STORAGE_FAVORITO);
    }
    estado.perfil[usuarioAtual()] = {
        ...perfilAtual(),
        favoritoId,
        avatar: estado.avatarPreview || perfilAtual().avatar || ""
    };
    salvarJsonLocal(STORAGE_PROFILE, estado.perfil);

    setupOverlayEl?.classList.add("hidden");
    renderizarTabela();
    renderizarFavoritoCard();
    renderizarInsights();
    renderizarPainelSimulador();
    atualizarSaudacao();
}

function fecharSetupPerfil() {
    setupOverlayEl?.classList.add("hidden");
}

function encontrarTimeFavorito() {
    return estado.tabelaOriginal.find((item) => item.team.id === estado.favoritoId) || null;
}

function renderizarFavoritoCard() {
    if (!favoritoCardEl || !limparFavoritoEl) return;

    const favorito = encontrarTimeFavorito();
    if (!favorito) {
        favoritoCardEl.innerHTML = `<p class="lista-vazia">Escolha um time na tabela para marcar como favorito.</p>`;
        limparFavoritoEl.classList.add("hidden");
        atualizarSaudacao();
        return;
    }

    const time = obterTimePersonalizado(favorito.team);
    favoritoCardEl.innerHTML = `
        <div class="favorito-card-conteudo">
            <img src="${time.escudo}" alt="Escudo do ${time.nome}">
            <div>
                <strong>${time.nome}</strong>
                <span>${favorito.position}o lugar • ${favorito.points} pontos • ${favorito.goalDifference >= 0 ? "+" : ""}${favorito.goalDifference} de saldo</span>
            </div>
        </div>
    `;
    limparFavoritoEl.classList.remove("hidden");
    atualizarSaudacao();
}

function gerarBotaoFavorito(teamId) {
    const ativo = estado.favoritoId === teamId;
    return `
        <button class="favorito-botao ${ativo ? "ativo" : ""}" type="button" data-favorito-id="${teamId}">
            ${ativo ? "★" : "☆"}
        </button>
    `;
}

function criarLinhaTime(time) {
    const tr = document.createElement("tr");
    const timeInfo = obterTimePersonalizado(time.team);

    if (time.position <= 4) tr.classList.add("libertadores");
    else if (time.position === 5) tr.classList.add("pre-libertadores");
    else if (time.position <= 11) tr.classList.add("sul-americana");
    else if (time.position >= 17) tr.classList.add("rebaixamento");

    if (estado.favoritoId === time.team.id) {
        tr.classList.add("favorito-time");
    }

    tr.innerHTML = `
        <td>${time.position}</td>
        <td>
            <div class="time">
                <img src="${timeInfo.escudo}" alt="Escudo do ${timeInfo.nome}">
                <div class="time-meta">
                    <span>${timeInfo.nome}</span>
                    ${gerarBotaoFavorito(time.team.id)}
                </div>
            </div>
        </td>
        <td>${time.points}</td>
        <td>${time.playedGames}</td>
        <td>${time.won}</td>
        <td>${time.draw}</td>
        <td>${time.lost}</td>
        <td>${time.goalDifference}</td>
    `;

    return tr;
}

function renderizarTabela() {
    if (!tbody) return;
    tbody.innerHTML = "";
    estado.tabelaOriginal.forEach((time) => {
        tbody.appendChild(criarLinhaTime(time));
    });

    tbody.querySelectorAll("[data-favorito-id]").forEach((botao) => {
        botao.addEventListener("click", () => {
            const teamId = Number(botao.dataset.favoritoId);
            estado.favoritoId = estado.favoritoId === teamId ? null : teamId;

            if (estado.favoritoId) {
                localStorage.setItem(STORAGE_FAVORITO, String(teamId));
                estado.perfil[usuarioAtual()] = {
                    ...perfilAtual(),
                    favoritoId: teamId
                };
                salvarJsonLocal(STORAGE_PROFILE, estado.perfil);
            } else {
                localStorage.removeItem(STORAGE_FAVORITO);
            }

            renderizarTabela();
            renderizarFavoritoCard();
            renderizarInsights();
            renderizarPainelSimulador();
            atualizarSaudacao();
        });
    });
}

function formatarStatusJogo(jogo) {
    switch (jogo.status) {
        case "IN_PLAY":
            return { texto: "Ao vivo", classe: "ao-vivo" };
        case "PAUSED":
            return { texto: "Intervalo", classe: "ao-vivo" };
        case "FINISHED":
            return { texto: "Encerrado", classe: "finalizado" };
        case "TIMED":
        case "SCHEDULED":
            return { texto: "Agendado", classe: "agendado" };
        default:
            return { texto: jogo.status, classe: "agendado" };
    }
}

function formatarDataHora(utcDate) {
    const data = new Date(utcDate);
    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function gerarHtmlEstatisticasPosJogo(estatisticas) {
    if (!estatisticas || (!estatisticas.xg && !estatisticas.posse && !estatisticas.chutesTotais)) {
        return `<div class="jogo-estatisticas"><p class="pos-jogo-vazio">Estatisticas pos-jogo indisponiveis.</p></div>`;
    }

    const itens = [];
    if (estatisticas.xg) itens.push({ label: "xG", mandante: estatisticas.xg.mandante, visitante: estatisticas.xg.visitante });
    if (estatisticas.posse) itens.push({ label: "Posse", mandante: estatisticas.posse.mandante, visitante: estatisticas.posse.visitante });
    if (estatisticas.chutesTotais) itens.push({ label: "Chutes", mandante: estatisticas.chutesTotais.mandante, visitante: estatisticas.chutesTotais.visitante });

    return `
        <div class="jogo-estatisticas">
            <div class="pos-jogo-cabecalho">
                <strong>Estatisticas pos-jogo</strong>
                <span>${estatisticas.fonte || ""}</span>
            </div>
            <div class="pos-jogo-grid">
                ${itens
                    .map(
                        (item) => `
                            <div class="pos-jogo-linha">
                                <span>${item.mandante}</span>
                                <small>${item.label}</small>
                                <span>${item.visitante}</span>
                            </div>
                        `
                    )
                    .join("")}
            </div>
        </div>
    `;
}

function criarPlaceholderEstatisticas(jogo) {
    return `
        <div
            class="jogo-estatisticas carregando"
            data-pos-jogo="1"
            data-match-id="${jogo.id}"
            data-status="${jogo.status}"
            data-utc-date="${jogo.utcDate}"
            data-home-team-id="${jogo.homeTeam.id}"
            data-home-team-name="${jogo.homeTeam.name}"
            data-home-team-short-name="${jogo.homeTeam.shortName || ""}"
            data-away-team-id="${jogo.awayTeam.id}"
            data-away-team-name="${jogo.awayTeam.name}"
            data-away-team-short-name="${jogo.awayTeam.shortName || ""}"
        >
            Carregando estatisticas pos-jogo...
        </div>
    `;
}

function obterInteracoesPartida(matchId) {
    const registro = estado.interacoes[String(matchId)] || {
        gostei: 0,
        secar: 0,
        favorito: 0,
        votosPorUsuario: {}
    };

    if (!registro.votosPorUsuario) {
        registro.votosPorUsuario = {};
    }

    return registro;
}

function usuarioJaInteragiu(matchId) {
    const usuario = usuarioAtual();
    return usuario ? Boolean(obterInteracoesPartida(matchId).votosPorUsuario[usuario]) : false;
}

function registrarInteracao(matchId, tipo) {
    const usuario = usuarioAtual();
    if (!usuario) return;

    const interacoes = obterInteracoesPartida(matchId);
    if (interacoes.votosPorUsuario[usuario]) return;

    interacoes[tipo] = (interacoes[tipo] || 0) + 1;
    interacoes.votosPorUsuario[usuario] = tipo;
    estado.interacoes[String(matchId)] = interacoes;
    salvarJsonLocal(STORAGE_INTERACOES, estado.interacoes);
}

function gerarHtmlInteracoes(jogo) {
    const interacoes = obterInteracoesPartida(jogo.id);
    const bloqueado = usuarioJaInteragiu(jogo.id);
    const votoUsuario = interacoes.votosPorUsuario[usuarioAtual()] || "";
    const dica = bloqueado
        ? `Voce ja reagiu com "${votoUsuario}" neste jogo.`
        : "Cada usuario pode reagir uma unica vez por jogo.";

    return `
        <div class="jogo-interacoes">
            <div class="jogo-interacoes-cabecalho">
                <strong>Interacoes da torcida</strong>
                <span>${interacoes.gostei + interacoes.secar + interacoes.favorito} acoes</span>
            </div>
            <div class="jogo-interacoes-acoes">
                <button class="interacao-botao ${bloqueado ? "bloqueado" : ""}" type="button" data-match-id="${jogo.id}" data-tipo="gostei" ${bloqueado ? "disabled" : ""}>🔥 ${interacoes.gostei}</button>
                <button class="interacao-botao ${bloqueado ? "bloqueado" : ""}" type="button" data-match-id="${jogo.id}" data-tipo="favorito" ${bloqueado ? "disabled" : ""}>💚 ${interacoes.favorito}</button>
                <button class="interacao-botao ${bloqueado ? "bloqueado" : ""}" type="button" data-match-id="${jogo.id}" data-tipo="secar" ${bloqueado ? "disabled" : ""}>👀 ${interacoes.secar}</button>
            </div>
            <p class="hero-chamada">${dica}</p>
        </div>
    `;
}

function criarHtmlEstatisticas(jogo) {
    if (jogo.postMatchStats) return gerarHtmlEstatisticasPosJogo(jogo.postMatchStats);
    if (EM_LOCALHOST && jogo.status === "FINISHED") return criarPlaceholderEstatisticas(jogo);
    return "";
}

function jogoTemFavorito(jogo) {
    return jogo.homeTeam.id === estado.favoritoId || jogo.awayTeam.id === estado.favoritoId;
}

function criarCardJogo(jogo) {
    const mandante = obterTimePersonalizado(jogo.homeTeam);
    const visitante = obterTimePersonalizado(jogo.awayTeam);
    const status = formatarStatusJogo(jogo);
    const golsMandante = jogo.score?.fullTime?.home ?? "-";
    const golsVisitante = jogo.score?.fullTime?.away ?? "-";

    return `
        <article class="jogo-item ${jogoTemFavorito(jogo) ? "favorito-jogo" : ""}">
            <div class="jogo-topo">
                <span class="jogo-status ${status.classe}">${status.texto}</span>
                <span class="jogo-hora">${formatarDataHora(jogo.utcDate)}</span>
            </div>
            <div class="jogo-times">
                <div class="jogo-time">
                    <img src="${mandante.escudo}" alt="Escudo do ${mandante.nome}">
                    <span>${mandante.nome}</span>
                </div>
                <div class="jogo-placar">
                    <span>${golsMandante}</span>
                    <small>x</small>
                    <span>${golsVisitante}</span>
                </div>
                <div class="jogo-time visitante">
                    <span>${visitante.nome}</span>
                    <img src="${visitante.escudo}" alt="Escudo do ${visitante.nome}">
                </div>
            </div>
            ${criarHtmlEstatisticas(jogo)}
            ${gerarHtmlInteracoes(jogo)}
        </article>
    `;
}

function criarCardJogoGrande(jogo, tipo) {
    const mandante = obterTimePersonalizado(jogo.homeTeam);
    const visitante = obterTimePersonalizado(jogo.awayTeam);
    const status = formatarStatusJogo(jogo);
    const golsMandante = jogo.score?.fullTime?.home ?? "-";
    const golsVisitante = jogo.score?.fullTime?.away ?? "-";
    const rodada = jogo.matchday ? `Rodada ${jogo.matchday}` : "Brasileirao";
    const extra = tipo === "ao-vivo" ? "Partida em andamento agora" : `Comeca em ${formatarDataHora(jogo.utcDate)}`;

    return `
        <article class="jogo-item grande ${jogoTemFavorito(jogo) ? "favorito-jogo" : ""}">
            <div class="jogo-topo">
                <span class="jogo-status ${status.classe}">${status.texto}</span>
                <span class="jogo-rodada">${rodada}</span>
            </div>
            <div class="jogo-times">
                <div class="jogo-time">
                    <img src="${mandante.escudo}" alt="Escudo do ${mandante.nome}">
                    <span>${mandante.nome}</span>
                </div>
                <div class="jogo-placar">
                    <span>${golsMandante}</span>
                    <small>x</small>
                    <span>${golsVisitante}</span>
                </div>
                <div class="jogo-time visitante">
                    <span>${visitante.nome}</span>
                    <img src="${visitante.escudo}" alt="Escudo do ${visitante.nome}">
                </div>
            </div>
            <div class="jogo-extra">${extra}</div>
            ${criarHtmlEstatisticas(jogo)}
            ${gerarHtmlInteracoes(jogo)}
        </article>
    `;
}

function preencherListaJogos(elemento, jogos, mensagemVazia) {
    if (!elemento) return;
    elemento.innerHTML = jogos.length ? jogos.map(criarCardJogo).join("") : `<p class="lista-vazia">${mensagemVazia}</p>`;
}

function preencherGradeJogos(elemento, jogos, mensagemVazia, tipo) {
    if (!elemento) return;
    elemento.innerHTML = jogos.length ? jogos.map((jogo) => criarCardJogoGrande(jogo, tipo)).join("") : `<p class="lista-vazia">${mensagemVazia}</p>`;
}

function renderizarEstatisticasPosJogo(elemento, estatisticas) {
    if (!elemento) return;
    elemento.classList.remove("carregando");
    elemento.outerHTML = gerarHtmlEstatisticasPosJogo(estatisticas);
}

async function carregarEstatisticasPosJogo() {
    if (!EM_LOCALHOST) return;

    const blocos = document.querySelectorAll("[data-pos-jogo='1']:not([data-carregado='1'])");

    for (const bloco of blocos) {
        bloco.dataset.carregado = "1";

        const params = new URLSearchParams({
            matchId: bloco.dataset.matchId,
            status: bloco.dataset.status,
            utcDate: bloco.dataset.utcDate,
            homeTeamId: bloco.dataset.homeTeamId,
            homeTeamName: bloco.dataset.homeTeamName,
            homeTeamShortName: bloco.dataset.homeTeamShortName,
            awayTeamId: bloco.dataset.awayTeamId,
            awayTeamName: bloco.dataset.awayTeamName,
            awayTeamShortName: bloco.dataset.awayTeamShortName
        });

        try {
            const resposta = await fetch(`${POS_JOGO_URL}?${params.toString()}`, { cache: "no-store" });
            const data = await resposta.json();

            if (!resposta.ok) throw new Error(data.erro || `Erro ${resposta.status}`);
            renderizarEstatisticasPosJogo(bloco, data.estatisticas);
        } catch (erro) {
            console.error("Erro ao carregar estatisticas pos-jogo:", erro);
            bloco.classList.remove("carregando");
            bloco.innerHTML = `<p class="pos-jogo-vazio">Nao foi possivel carregar as estatisticas pos-jogo.</p>`;
        }
    }
}

function ativarTab(tab) {
    menuTabs.forEach((item) => item.classList.toggle("ativo", item.dataset.tab === tab));
    heroTabelaEl?.classList.toggle("hidden", tab !== "tabela");
    painelTabelaEl?.classList.toggle("hidden", tab !== "tabela");
    heroJogosEl?.classList.toggle("hidden", tab !== "jogos");
    painelJogosEl?.classList.toggle("hidden", tab !== "jogos");
    heroBetaEl?.classList.toggle("hidden", tab !== "beta");
    painelBetaEl?.classList.toggle("hidden", tab !== "beta");
}

function obterTabelaPrincipal(data) {
    return data.standings?.find((item) => item.type === "TOTAL")?.table ?? [];
}

function enriquecerJogosComEstatisticas(jogos, estatisticasPorJogo) {
    return jogos.map((jogo) => ({
        ...jogo,
        postMatchStats: jogo.postMatchStats || estatisticasPorJogo[String(jogo.id)] || null
    }));
}

function renderizarInsights() {
    if (!insightsListaEl) return;

    const tabela = estado.tabelaOriginal;
    if (!tabela.length) {
        insightsListaEl.innerHTML = `<p class="lista-vazia">Carregando insights...</p>`;
        return;
    }

    const lider = tabela[0];
    const vice = tabela[1];
    const melhorAtaque = [...tabela].sort((a, b) => b.goalsFor - a.goalsFor)[0];
    const piorDefesa = [...tabela].sort((a, b) => b.goalsAgainst - a.goalsAgainst)[0];
    const destaqueFavorito = encontrarTimeFavorito();

    const insights = [
        {
            titulo: "Corrida pela lideranca",
            texto: `${obterNomeTime(lider.team)} lidera com ${lider.points} pontos${vice ? `, seguido por ${obterNomeTime(vice.team)} com ${vice.points}.` : "."}`
        },
        {
            titulo: "Ataque mais forte",
            texto: `${obterNomeTime(melhorAtaque.team)} soma ${melhorAtaque.goalsFor} gols marcados.`
        },
        {
            titulo: "Defesa mais vazada",
            texto: `${obterNomeTime(piorDefesa.team)} sofreu ${piorDefesa.goalsAgainst} gols ate aqui.`
        }
    ];

    if (destaqueFavorito) {
        insights.unshift({
            titulo: "Radar do seu time",
            texto: `${obterNomeTime(destaqueFavorito.team)} esta em ${destaqueFavorito.position}o com ${destaqueFavorito.points} pontos.`
        });
    }

    insightsListaEl.innerHTML = insights
        .map((item) => `
            <article class="insight-item">
                <strong>${item.titulo}</strong>
                <p>${item.texto}</p>
            </article>
        `)
        .join("");
}

function jogosParaSimulacao() {
    return estado.jogosProximos.length ? estado.jogosProximos : estado.jogosRodada;
}

function obterResultadoSimulado(matchId) {
    return estado.simulador.resultados?.[String(matchId)] || { casa: "", fora: "" };
}

function atualizarResultadoSimulado(matchId, lado, valor) {
    if (!estado.simulador.resultados) estado.simulador.resultados = {};
    const atual = obterResultadoSimulado(matchId);
    atual[lado] = valor;
    estado.simulador.resultados[String(matchId)] = atual;
    salvarJsonLocal(STORAGE_SIMULADOR, estado.simulador);
}

function resetarSimulador() {
    estado.simulador = {
        resultados: {},
        modoGame: estado.simulador.modoGame
    };
    salvarJsonLocal(STORAGE_SIMULADOR, estado.simulador);
    renderizarPainelSimulador();
}

function clonarTabelaBase() {
    return estado.tabelaOriginal.map((item) => ({
        ...item,
        team: { ...item.team }
    }));
}

function aplicarResultadoNaTabela(tabela, jogo, golsCasa, golsFora) {
    const mandante = tabela.find((item) => item.team.id === jogo.homeTeam.id);
    const visitante = tabela.find((item) => item.team.id === jogo.awayTeam.id);
    if (!mandante || !visitante) return;

    mandante.playedGames += 1;
    visitante.playedGames += 1;
    mandante.goalsFor += golsCasa;
    mandante.goalsAgainst += golsFora;
    visitante.goalsFor += golsFora;
    visitante.goalsAgainst += golsCasa;
    mandante.goalDifference = mandante.goalsFor - mandante.goalsAgainst;
    visitante.goalDifference = visitante.goalsFor - visitante.goalsAgainst;

    if (golsCasa > golsFora) {
        mandante.points += 3;
        mandante.won += 1;
        visitante.lost += 1;
    } else if (golsFora > golsCasa) {
        visitante.points += 3;
        visitante.won += 1;
        mandante.lost += 1;
    } else {
        mandante.points += 1;
        visitante.points += 1;
        mandante.draw += 1;
        visitante.draw += 1;
    }
}

function ordenarTabela(tabela) {
    tabela.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.team.name.localeCompare(b.team.name);
    });
    tabela.forEach((time, index) => {
        time.position = index + 1;
    });
    return tabela;
}

function gerarTabelaSimulada() {
    const tabela = clonarTabelaBase();
    let jogosAplicados = 0;

    jogosParaSimulacao().forEach((jogo) => {
        const resultado = obterResultadoSimulado(jogo.id);
        if (resultado.casa === "" || resultado.fora === "") return;

        aplicarResultadoNaTabela(tabela, jogo, Number(resultado.casa), Number(resultado.fora));
        jogosAplicados += 1;
    });

    return {
        tabela: ordenarTabela(tabela),
        jogosAplicados
    };
}

function gerarStatusGame(tabelaSimulada) {
    return tabelaSimulada.map((time) => {
        const baseConfianca = Math.max(10, 100 - time.position * 4);
        const basePressao = Math.max(10, time.position * 4);
        let confianca = baseConfianca;
        let pressao = basePressao;

        jogosParaSimulacao().forEach((jogo) => {
            const resultado = obterResultadoSimulado(jogo.id);
            if (resultado.casa === "" || resultado.fora === "") return;

            const golsCasa = Number(resultado.casa);
            const golsFora = Number(resultado.fora);
            const diferenca = Math.abs(golsCasa - golsFora);
            const impacto = diferenca >= 3 ? 14 : diferenca >= 2 ? 9 : 5;

            if (jogo.homeTeam.id === time.team.id) {
                if (golsCasa > golsFora) {
                    confianca += impacto;
                    pressao -= 6;
                } else if (golsCasa < golsFora) {
                    confianca -= 8;
                    pressao += impacto;
                } else {
                    confianca += 1;
                    pressao += 2;
                }
            }

            if (jogo.awayTeam.id === time.team.id) {
                if (golsFora > golsCasa) {
                    confianca += impacto;
                    pressao -= 6;
                } else if (golsFora < golsCasa) {
                    confianca -= 8;
                    pressao += impacto;
                } else {
                    confianca += 1;
                    pressao += 2;
                }
            }
        });

        return {
            ...time,
            confianca: Math.max(0, Math.min(100, confianca)),
            pressao: Math.max(0, Math.min(100, pressao))
        };
    });
}

function hashResultados() {
    return Object.entries(estado.simulador.resultados || {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([id, valor]) => `${id}:${valor.casa}-${valor.fora}`)
        .join("|");
}

function eventoDeterministico(statusTimes, offset) {
    if (!statusTimes.length) return null;
    const seed = hashResultados().length + offset * 17;
    const team = statusTimes[seed % statusTimes.length];
    const evento = EVENTOS_GAME[(seed + statusTimes.length) % EVENTOS_GAME.length];
    return `${obterNomeTime(team.team)}: ${evento}`;
}

function gerarObjetivoGame(statusTimes) {
    const favorito = statusTimes.find((time) => time.team.id === estado.favoritoId);
    if (!favorito) return "Escolha um time favorito para liberar um objetivo personalizado.";
    if (favorito.position <= 4) return `Objetivo: ser campeao com ${obterNomeTime(favorito.team)}.`;
    if (favorito.position >= 17) return `Objetivo: fugir do rebaixamento com ${obterNomeTime(favorito.team)}.`;
    return `Objetivo: levar ${obterNomeTime(favorito.team)} para a Libertadores.`;
}

function gerarTabelaSimuladaHtml(tabela) {
    return `
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Time</th>
                    <th>P</th>
                    <th>J</th>
                    <th>V</th>
                    <th>E</th>
                    <th>D</th>
                    <th>GP</th>
                    <th>GC</th>
                    <th>SG</th>
                </tr>
            </thead>
            <tbody>
                ${tabela
                    .map((time) => `
                        <tr class="${estado.favoritoId === time.team.id ? "favorito-simulado" : ""}">
                            <td>${time.position}</td>
                            <td>
                                <div class="time">
                                    <img src="${obterTimePersonalizado(time.team).escudo}" alt="Escudo do ${obterNomeTime(time.team)}">
                                    <span>${obterNomeTime(time.team)}</span>
                                </div>
                            </td>
                            <td>${time.points}</td>
                            <td>${time.playedGames}</td>
                            <td>${time.won}</td>
                            <td>${time.draw}</td>
                            <td>${time.lost}</td>
                            <td>${time.goalsFor}</td>
                            <td>${time.goalsAgainst}</td>
                            <td>${time.goalDifference}</td>
                        </tr>
                    `)
                    .join("")}
            </tbody>
        </table>
    `;
}

function renderizarListaSimulacao() {
    if (!simuladorJogosListaEl) return;

    const jogos = jogosParaSimulacao();
    if (!jogos.length) {
        simuladorJogosListaEl.innerHTML = `<p class="lista-vazia">Assim que os jogos carregarem, a lista de simulacao aparece aqui.</p>`;
        return;
    }

    const rodadaLabel = jogos[0]?.matchday ? `Rodada ${jogos[0].matchday}` : "Proximas rodadas";
    if (simuladorRodadaLabelEl) simuladorRodadaLabelEl.textContent = rodadaLabel;

    const options = Array.from({ length: 11 }, (_, i) => `<option value="${i}">${i}</option>`).join("");

    simuladorJogosListaEl.innerHTML = jogos
        .slice(0, 10)
        .map((jogo) => {
            const mandante = obterTimePersonalizado(jogo.homeTeam);
            const visitante = obterTimePersonalizado(jogo.awayTeam);
            const resultado = obterResultadoSimulado(jogo.id);

            return `
                <article class="simulador-partida">
                    <div class="simulador-time">
                        <img src="${mandante.escudo}" alt="Escudo do ${mandante.nome}">
                        <div>
                            <strong>${mandante.nome}</strong>
                            <span>${formatarDataHora(jogo.utcDate)}</span>
                        </div>
                    </div>
                    <div class="simulador-score">
                        <select data-simulador-match="${jogo.id}" data-lado="casa">
                            <option value="">-</option>
                            ${options}
                        </select>
                        <span>x</span>
                        <select data-simulador-match="${jogo.id}" data-lado="fora">
                            <option value="">-</option>
                            ${options}
                        </select>
                    </div>
                    <div class="simulador-time visitante">
                        <div>
                            <strong>${visitante.nome}</strong>
                            <span>Simule o placar</span>
                        </div>
                        <img src="${visitante.escudo}" alt="Escudo do ${visitante.nome}">
                    </div>
                </article>
            `;
        })
        .join("");

    simuladorJogosListaEl.querySelectorAll("[data-simulador-match]").forEach((select) => {
        const matchId = select.dataset.simuladorMatch;
        const lado = select.dataset.lado;
        const resultado = obterResultadoSimulado(matchId);
        select.value = resultado[lado];

        select.addEventListener("change", () => {
            atualizarResultadoSimulado(matchId, lado, select.value);
            renderizarPainelSimulador();
        });
    });
}

function renderizarSeuTimeNoSimulador(tabelaSimulada) {
    if (!simuladorTimeCardEl) return;

    const favorito = estado.favoritoId
        ? tabelaSimulada.find((time) => time.team.id === estado.favoritoId) || null
        : null;

    if (!favorito) {
        simuladorTimeCardEl.innerHTML = `<p class="lista-vazia">Escolha um time favorito para acompanhar seu cenario paralelo.</p>`;
        return;
    }

    const time = obterTimePersonalizado(favorito.team);
    simuladorTimeCardEl.innerHTML = `
        <div class="seu-time-box">
            <img src="${time.escudo}" alt="Escudo do ${time.nome}">
            <div>
                <strong>${time.nome}</strong>
                <span>Posicao simulada: ${favorito.position}o</span>
                <span>${favorito.points} pontos no cenario paralelo</span>
            </div>
        </div>
    `;
}

function renderizarDestaquesSimulador(tabelaSimulada) {
    if (!simuladorDestaquesEl) return;
    if (!tabelaSimulada.length) {
        simuladorDestaquesEl.innerHTML = `<p class="lista-vazia">Os destaques do simulador aparecem aqui.</p>`;
        return;
    }

    const lider = tabelaSimulada[0];
    const melhorAtaque = [...tabelaSimulada].sort((a, b) => b.goalsFor - a.goalsFor)[0];
    const melhorDefesa = [...tabelaSimulada].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
    const maiorSaldo = [...tabelaSimulada].sort((a, b) => b.goalDifference - a.goalDifference)[0];

    simuladorDestaquesEl.innerHTML = `
        <article class="destaque-item">
            <strong>Lider do cenario</strong>
            <p>${obterNomeTime(lider.team)} assume a ponta com ${lider.points} pontos.</p>
        </article>
        <article class="destaque-item">
            <strong>Melhor ataque</strong>
            <p>${obterNomeTime(melhorAtaque.team)} chega a ${melhorAtaque.goalsFor} gols marcados.</p>
        </article>
        <article class="destaque-item">
            <strong>Melhor defesa</strong>
            <p>${obterNomeTime(melhorDefesa.team)} sofre apenas ${melhorDefesa.goalsAgainst} gols.</p>
        </article>
        <article class="destaque-item">
            <strong>Maior saldo</strong>
            <p>${obterNomeTime(maiorSaldo.team)} fica com saldo ${maiorSaldo.goalDifference >= 0 ? "+" : ""}${maiorSaldo.goalDifference}.</p>
        </article>
    `;
}

function renderizarModoGame(statusTimes) {
    if (!gameModeCardEl || !gameMensagensEl || !gameObjetivoEl || !toggleGameModeEl) return;

    const ligado = Boolean(estado.simulador.modoGame);
    gameModeCardEl.classList.toggle("hidden", !ligado);
    toggleGameModeEl.textContent = `Modo Game: ${ligado ? "On" : "Off"}`;

    if (!ligado) return;

    const maiorConfianca = [...statusTimes].sort((a, b) => b.confianca - a.confianca)[0];
    const maiorPressao = [...statusTimes].sort((a, b) => b.pressao - a.pressao)[0];
    const eventos = [eventoDeterministico(statusTimes, 1), eventoDeterministico(statusTimes, 2)].filter(Boolean);
    const mensagens = [
        `${obterNomeTime(maiorConfianca.team)} em otima fase 🔥`,
        `Crise no ${obterNomeTime(maiorPressao.team)} 😰`,
        ...eventos
    ];

    gameObjetivoEl.innerHTML = `
        <strong>Objetivo</strong>
        <p>${gerarObjetivoGame(statusTimes)}</p>
    `;

    gameMensagensEl.innerHTML = mensagens
        .map((mensagem) => `
            <article class="destaque-item">
                <strong>Radar game</strong>
                <p>${mensagem}</p>
            </article>
        `)
        .join("");
}

function renderizarPainelSimulador() {
    if (!simuladorTabelaEl || !simuladorResumoEl) return;

    renderizarListaSimulacao();

    const { tabela, jogosAplicados } = gerarTabelaSimulada();
    const statusTimes = gerarStatusGame(tabela);

    simuladorTabelaEl.innerHTML = gerarTabelaSimuladaHtml(tabela);
    simuladorResumoEl.textContent =
        jogosAplicados > 0
            ? `${jogosAplicados} jogo(s) simulados. A classificacao foi recalculada do zero usando apenas uma copia dos dados reais.`
            : "O usuario entra, escolhe resultados e o sistema reorganiza a classificacao na hora usando um cenario paralelo.";

    renderizarSeuTimeNoSimulador(tabela);
    renderizarDestaquesSimulador(tabela);
    renderizarModoGame(statusTimes);
}

function renderizarJogosComEstadoAtual() {
    const jogosRodada = estado.jogosRodada.slice(0, 6);
    const proximosJogos = estado.jogosProximos.slice(0, 6);

    preencherListaJogos(jogosAoVivoEl, estado.jogosAoVivo, "Nao ha jogos ao vivo no momento.");
    preencherListaJogos(jogosRodadaEl, jogosRodada, "Nao foi possivel carregar os jogos da rodada.");
    preencherGradeJogos(jogosTabAoVivoEl, estado.jogosAoVivo, "Nao ha jogos ao vivo neste momento.", "ao-vivo");
    preencherGradeJogos(jogosTabProximosEl, proximosJogos, "Nao foi possivel carregar os proximos jogos.", "proximos");

    document.querySelectorAll(".interacao-botao:not([disabled])").forEach((botao) => {
        botao.addEventListener("click", () => {
            registrarInteracao(botao.dataset.matchId, botao.dataset.tipo);
            renderizarJogosComEstadoAtual();
        });
    });

    carregarEstatisticasPosJogo();
}

async function carregarTabela() {
    if (!tbody) {
        atualizarStatus("Tabela nao encontrada no HTML.", "erro");
        return;
    }

    atualizarStatus(
        EM_LOCALHOST ? "Carregando tabela do Brasileirao..." : "Carregando dados publicados no GitHub...",
        "info"
    );

    try {
        const data = await buscarJsonComFallback(obterUrlsTabela());
        estado.tabelaOriginal = obterTabelaPrincipal(data);
        renderizarTabela();
        preencherSelectFavorito();

        const lider = estado.tabelaOriginal[0];
        const rodada = data.season?.currentMatchday ?? data.rodadaAtual ?? "-";

        if (rodadaEl) rodadaEl.textContent = rodada;
        if (liderTimeEl) liderTimeEl.textContent = lider?.team?.shortName || lider?.team?.name || "-";
        if (liderPontosEl) liderPontosEl.textContent = lider?.points ?? "-";
        if (atualizacaoEl) atualizacaoEl.textContent = formatarHorarioAtualizacao(data.atualizadoEm);

        renderizarFavoritoCard();
        renderizarInsights();
        renderizarPainelSimulador();

        atualizarStatus(
            EM_LOCALHOST ? `Dados atualizados. Rodada atual: ${rodada}.` : `Dados publicados carregados. Rodada atual: ${rodada}.`,
            "sucesso"
        );
    } catch (erro) {
        console.error("Erro ao carregar tabela:", erro);
        atualizarStatus("Nao foi possivel carregar os dados dos times.", "erro");
    }
}

async function carregarTabelaBasePublica() {
    try {
        const data = await buscarJsonComFallback(obterUrlsTabela());
        estado.tabelaOriginal = obterTabelaPrincipal(data);
        preencherSelectFavorito();
    } catch (erro) {
        console.error("Erro ao preparar lista de times:", erro);
    }
}

async function carregarJogos() {
    try {
        const data = await buscarJsonComFallback(obterUrlsJogos());
        const estatisticasPorJogo = data.estatisticasPosJogo || {};
        estado.jogosAoVivo = enriquecerJogosComEstatisticas(data.aoVivo || [], estatisticasPorJogo);
        estado.jogosRodada = enriquecerJogosComEstatisticas(data.rodada || [], estatisticasPorJogo);
        estado.jogosProximos = enriquecerJogosComEstatisticas(data.proximos || [], estatisticasPorJogo);

        renderizarJogosComEstadoAtual();
        renderizarPainelSimulador();
    } catch (erro) {
        console.error("Erro ao carregar jogos:", erro);
        preencherListaJogos(jogosAoVivoEl, [], "Nao foi possivel carregar os jogos ao vivo.");
        preencherListaJogos(jogosRodadaEl, [], "Nao foi possivel carregar os jogos da rodada.");
        preencherGradeJogos(jogosTabAoVivoEl, [], "Nao foi possivel carregar os jogos ao vivo.", "ao-vivo");
        preencherGradeJogos(jogosTabProximosEl, [], "Nao foi possivel carregar os proximos jogos.", "proximos");
    }
}

function iniciarApp() {
    if (!estaAutenticado() || estado.appIniciado) return;

    estado.appIniciado = true;
    ativarTab("tabela");
    carregarTabela();
    carregarJogos();
    setInterval(carregarTabela, 60000);
    setInterval(carregarJogos, 30000);
}

fecharPopupBetaEl?.addEventListener("click", abrirFluxoLogin);
tabCadastroEl?.addEventListener("click", () => alternarAuth("cadastro"));
tabLoginEl?.addEventListener("click", () => alternarAuth("login"));

cadastroFormEl?.addEventListener("submit", (event) => {
    event.preventDefault();
    cadastrarUsuario(cadastroUsuarioEl?.value, cadastroSenhaEl?.value);
});

loginFormEl?.addEventListener("submit", (event) => {
    event.preventDefault();
    fazerLogin(loginUsuarioEl?.value, loginSenhaEl?.value);
});

setupAvatarInputEl?.addEventListener("change", () => {
    const arquivo = setupAvatarInputEl.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = () => {
        estado.avatarPreview = String(reader.result || "");
        if (setupAvatarPreviewEl && setupAvatarPlaceholderEl) {
            setupAvatarPreviewEl.src = estado.avatarPreview;
            setupAvatarPreviewEl.classList.remove("hidden");
            setupAvatarPlaceholderEl.classList.add("hidden");
        }
    };
    reader.readAsDataURL(arquivo);
});

salvarSetupEl?.addEventListener("click", salvarSetupPerfil);
fecharSetupEl?.addEventListener("click", fecharSetupPerfil);
abrirSetupEl?.addEventListener("click", abrirSetupSeNecessario);
logoutBotaoEl?.addEventListener("click", encerrarSessao);

limparFavoritoEl?.addEventListener("click", () => {
    estado.favoritoId = null;
    localStorage.removeItem(STORAGE_FAVORITO);
    estado.perfil[usuarioAtual()] = {
        ...perfilAtual(),
        favoritoId: null
    };
    salvarJsonLocal(STORAGE_PROFILE, estado.perfil);
    renderizarTabela();
    renderizarFavoritoCard();
    renderizarInsights();
    renderizarPainelSimulador();
    atualizarSaudacao();
});

resetSimuladorEl?.addEventListener("click", resetarSimulador);
toggleGameModeEl?.addEventListener("click", () => {
    estado.simulador.modoGame = !estado.simulador.modoGame;
    salvarJsonLocal(STORAGE_SIMULADOR, estado.simulador);
    renderizarPainelSimulador();
});

menuTabs.forEach((botao) => {
    botao.addEventListener("click", () => ativarTab(botao.dataset.tab));
});

alternarAuth("cadastro");
atualizarVisibilidadeApp();
carregarTabelaBasePublica();
iniciarApp();
