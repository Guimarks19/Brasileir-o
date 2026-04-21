const API_URL = "/api/tabela";
const JOGOS_URL = "/api/jogos";
const POS_JOGO_URL = "/api/estatisticas-pos-jogo";
const TIMES_CUSTOMIZADOS = {
    1768: {
        nome: "Athletico-PR",
        escudo: "https://upload.wikimedia.org/wikipedia/commons/4/43/Athletico_Paranaense_%28Logo_2019%29.svg"
    }
};

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
const menuTabs = document.querySelectorAll("[data-tab]");
const heroTabelaEl = document.querySelector("#hero-tabela");
const heroJogosEl = document.querySelector("#hero-jogos");
const painelTabelaEl = document.querySelector("#painel-tabela");
const painelJogosEl = document.querySelector("#painel-jogos");

function atualizarStatus(mensagem, tipo = "info") {
    if (!statusEl) return;
    statusEl.textContent = mensagem;
    statusEl.className = tipo;
}

function criarLinhaTime(time) {
    const tr = document.createElement("tr");
    const customizacao = TIMES_CUSTOMIZADOS[time.team.id];
    const nomeTime = customizacao?.nome || time.team.shortName || time.team.name;
    const escudoTime = customizacao?.escudo || time.team.crest;

    if (time.position <= 4) {
        tr.classList.add("libertadores");
    } else if (time.position === 5) {
        tr.classList.add("pre-libertadores");
    } else if (time.position <= 11) {
        tr.classList.add("sul-americana");
    } else if (time.position >= 17) {
        tr.classList.add("rebaixamento");
    }

    tr.innerHTML = `
        <td class="pos">${time.position}</td>
        <td>
            <div class="time">
                <img src="${escudoTime}" alt="Escudo do ${nomeTime}">
                <span>${nomeTime}</span>
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

function obterTimePersonalizado(team) {
    const customizacao = TIMES_CUSTOMIZADOS[team.id];
    return {
        nome: customizacao?.nome || team.shortName || team.name,
        escudo: customizacao?.escudo || team.crest
    };
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

function criarCardJogo(jogo) {
    const mandante = obterTimePersonalizado(jogo.homeTeam);
    const visitante = obterTimePersonalizado(jogo.awayTeam);
    const status = formatarStatusJogo(jogo);
    const golsMandante = jogo.score?.fullTime?.home ?? "-";
    const golsVisitante = jogo.score?.fullTime?.away ?? "-";
    const estatisticasHtml =
        jogo.status === "FINISHED"
            ? `
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
            `
            : "";

    return `
        <article class="jogo-item">
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
            ${estatisticasHtml}
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
    const extra =
        tipo === "ao-vivo"
            ? "Partida em andamento agora"
            : `Comeca em ${formatarDataHora(jogo.utcDate)}`;
    const estatisticasHtml =
        jogo.status === "FINISHED"
            ? `
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
            `
            : "";

    return `
        <article class="jogo-item grande">
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
            ${estatisticasHtml}
        </article>
    `;
}

function preencherListaJogos(elemento, jogos, mensagemVazia) {
    if (!elemento) return;

    if (!jogos.length) {
        elemento.innerHTML = `<p class="lista-vazia">${mensagemVazia}</p>`;
        return;
    }

    elemento.innerHTML = jogos.map(criarCardJogo).join("");
}

function preencherGradeJogos(elemento, jogos, mensagemVazia, tipo) {
    if (!elemento) return;

    if (!jogos.length) {
        elemento.innerHTML = `<p class="lista-vazia">${mensagemVazia}</p>`;
        return;
    }

    elemento.innerHTML = jogos.map((jogo) => criarCardJogoGrande(jogo, tipo)).join("");
}

function renderizarEstatisticasPosJogo(elemento, estatisticas) {
    if (!elemento) return;

    if (!estatisticas || (!estatisticas.xg && !estatisticas.posse && !estatisticas.chutesTotais)) {
        elemento.classList.remove("carregando");
        elemento.innerHTML = `
            <p class="pos-jogo-vazio">Estatisticas pos-jogo indisponiveis.</p>
        `;
        return;
    }

    const itens = [];

    if (estatisticas.xg) {
        itens.push({
            label: "xG",
            mandante: estatisticas.xg.mandante,
            visitante: estatisticas.xg.visitante
        });
    }

    if (estatisticas.posse) {
        itens.push({
            label: "Posse",
            mandante: estatisticas.posse.mandante,
            visitante: estatisticas.posse.visitante
        });
    }

    if (estatisticas.chutesTotais) {
        itens.push({
            label: "Chutes",
            mandante: estatisticas.chutesTotais.mandante,
            visitante: estatisticas.chutesTotais.visitante
        });
    }

    elemento.classList.remove("carregando");
    elemento.innerHTML = `
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
    `;
}

async function carregarEstatisticasPosJogo() {
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
            const resposta = await fetch(`${POS_JOGO_URL}?${params.toString()}`, {
                cache: "no-store"
            });
            const data = await resposta.json();

            if (!resposta.ok) {
                throw new Error(data.erro || `Erro ${resposta.status}`);
            }

            renderizarEstatisticasPosJogo(bloco, data.estatisticas);
        } catch (erro) {
            console.error("Erro ao carregar estatisticas pos-jogo:", erro);
            bloco.classList.remove("carregando");
            bloco.innerHTML = `
                <p class="pos-jogo-vazio">Nao foi possivel carregar as estatisticas pos-jogo.</p>
            `;
        }
    }
}

function ativarTab(tab) {
    const mostrarJogos = tab === "jogos";

    menuTabs.forEach((item) => {
        item.classList.toggle("ativo", item.dataset.tab === tab);
    });

    heroTabelaEl?.classList.toggle("hidden", mostrarJogos);
    painelTabelaEl?.classList.toggle("hidden", mostrarJogos);
    heroJogosEl?.classList.toggle("hidden", !mostrarJogos);
    painelJogosEl?.classList.toggle("hidden", !mostrarJogos);
}

async function carregarTabela() {
    if (!tbody) {
        console.error("Tabela nao encontrada no HTML.");
        atualizarStatus("Tabela nao encontrada no HTML.", "erro");
        return;
    }

    atualizarStatus("Carregando tabela do Brasileirao...");

    try {
        const resposta = await fetch(API_URL, {
            cache: "no-store"
        });

        const data = await resposta.json();

        if (!resposta.ok) {
            throw new Error(data.erro || `Erro ${resposta.status}`);
        }

        const tabela = data.standings.find((item) => item.type === "TOTAL")?.table ?? [];

        tbody.innerHTML = "";

        tabela.forEach((time) => {
            tbody.appendChild(criarLinhaTime(time));
        });

        const lider = tabela[0];
        const rodada = data.season?.currentMatchday ?? "-";
        const agora = new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        if (rodadaEl) rodadaEl.textContent = rodada;
        if (liderTimeEl) liderTimeEl.textContent = lider?.team?.shortName || lider?.team?.name || "-";
        if (liderPontosEl) liderPontosEl.textContent = lider?.points ?? "-";
        if (atualizacaoEl) atualizacaoEl.textContent = agora;

        atualizarStatus(`Dados atualizados. Rodada atual: ${rodada}.`, "sucesso");
    } catch (erro) {
        console.error("Erro ao carregar tabela:", erro);
        atualizarStatus("Nao foi possivel carregar os dados dos times.", "erro");
    }
}

async function carregarJogos() {
    try {
        const resposta = await fetch(JOGOS_URL, {
            cache: "no-store"
        });
        const data = await resposta.json();

        if (!resposta.ok) {
            throw new Error(data.erro || `Erro ${resposta.status}`);
        }

        const aoVivo = data.aoVivo || [];
        const rodada = data.rodada || [];
        const proximos = data.proximos || [];
        const jogosRodada = rodada.slice(0, 6);
        const proximosJogos = proximos.slice(0, 6);

        preencherListaJogos(
            jogosAoVivoEl,
            aoVivo,
            "Nao ha jogos ao vivo no momento."
        );
        preencherListaJogos(
            jogosRodadaEl,
            jogosRodada,
            "Nao foi possivel carregar os jogos da rodada."
        );
        preencherGradeJogos(
            jogosTabAoVivoEl,
            aoVivo,
            "Nao ha jogos ao vivo neste momento.",
            "ao-vivo"
        );
        preencherGradeJogos(
            jogosTabProximosEl,
            proximosJogos,
            "Nao foi possivel carregar os proximos jogos.",
            "proximos"
        );
        carregarEstatisticasPosJogo();
    } catch (erro) {
        console.error("Erro ao carregar jogos:", erro);
        preencherListaJogos(
            jogosAoVivoEl,
            [],
            "Nao foi possivel carregar os jogos ao vivo."
        );
        preencherListaJogos(
            jogosRodadaEl,
            [],
            "Nao foi possivel carregar os jogos da rodada."
        );
        preencherGradeJogos(
            jogosTabAoVivoEl,
            [],
            "Nao foi possivel carregar os jogos ao vivo.",
            "ao-vivo"
        );
        preencherGradeJogos(
            jogosTabProximosEl,
            [],
            "Nao foi possivel carregar os proximos jogos.",
            "proximos"
        );
    }
}

menuTabs.forEach((botao) => {
    botao.addEventListener("click", () => {
        ativarTab(botao.dataset.tab);
    });
});

ativarTab("tabela");
carregarTabela();
carregarJogos();
setInterval(carregarTabela, 60000);
setInterval(carregarJogos, 30000);
