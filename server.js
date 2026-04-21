const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { chromium } = require("playwright");

const porta = 5500;
const baseDir = __dirname;
const API_TOKEN = "df3f416dc5d6438ba975a4af794ee410";
const STANDINGS_URL = "https://api.football-data.org/v4/competitions/BSA/standings";
const LIVE_MATCHES_URL = "https://api.football-data.org/v4/competitions/BSA/matches?status=LIVE";
const SCHEDULED_MATCHES_URL = "https://api.football-data.org/v4/competitions/BSA/matches?status=SCHEDULED";
const SOCCERWAY_RESULTS_URL = "https://www.soccerway.com/brazil/serie-a-betano/results/";
const SOCCERWAY_RESULTS_CACHE_MS = 15 * 60 * 1000;
const POST_MATCH_STATS_CACHE_MS = 6 * 60 * 60 * 1000;
const SOCCERWAY_TEAM_NAMES = {
    1769: "Palmeiras",
    1783: "Flamengo RJ",
    1765: "Fluminense",
    1776: "Sao Paulo",
    1777: "Bahia",
    1768: "Athletico-PR",
    4241: "Coritiba",
    4286: "Bragantino",
    1770: "Botafogo RJ",
    1780: "Vasco",
    1782: "Vitoria",
    1766: "Atletico-MG",
    1767: "Gremio",
    6684: "Internacional",
    6685: "Santos",
    1771: "Cruzeiro",
    1779: "Corinthians",
    4364: "Mirassol",
    4287: "Remo",
    1772: "Chapecoense-SC"
};

let browserPromise = null;
let soccerwayResultsCache = {
    fetchedAt: 0,
    data: []
};
const postMatchStatsCache = new Map();

const tipos = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
};

function responderJson(res, statusCode, payload) {
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
}

function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function formatarDataSoccerway(utcDate) {
    const data = new Date(utcDate);
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    return `${dia}.${mes}.`;
}

function obterNomeSoccerway(teamId, fallback = "") {
    return SOCCERWAY_TEAM_NAMES[teamId] || fallback;
}

function escapeRegex(texto) {
    return String(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extrairDuplaEstatistica(texto, rotulo, valuePattern = "[0-9]+(?:\\.[0-9]+)?%?") {
    const regex = new RegExp(
        `(${valuePattern})\\s*${escapeRegex(rotulo)}\\s*(${valuePattern})`,
        "i"
    );
    const match = texto.match(regex);

    if (!match) {
        return null;
    }

    return {
        mandante: match[1],
        visitante: match[2]
    };
}

async function getBrowser() {
    if (!browserPromise) {
        browserPromise = chromium.launch({
            headless: true
        });
    }

    return browserPromise;
}

async function withPage(callback) {
    const browser = await getBrowser();
    const page = await browser.newPage({
        locale: "en-US",
        timezoneId: "America/Fortaleza"
    });

    try {
        return await callback(page);
    } finally {
        await page.close().catch(() => {});
    }
}

async function carregarResultadosSoccerway() {
    if (
        soccerwayResultsCache.data.length &&
        Date.now() - soccerwayResultsCache.fetchedAt < SOCCERWAY_RESULTS_CACHE_MS
    ) {
        return soccerwayResultsCache.data;
    }

    const resultados = await withPage(async (page) => {
        await page.goto(SOCCERWAY_RESULTS_URL, {
            waitUntil: "domcontentloaded",
            timeout: 120000
        });
        await page.waitForTimeout(5000);

        return page.locator("a[href*='/match/']").evaluateAll((links) => {
            const vistos = new Set();

            return links
                .map((link) => ({
                    href: link.href,
                    contexto: (link.parentElement?.textContent || "").trim()
                }))
                .filter((item) => {
                    if (!item.href || vistos.has(item.href)) {
                        return false;
                    }

                    vistos.add(item.href);
                    return true;
                });
        });
    });

    soccerwayResultsCache = {
        fetchedAt: Date.now(),
        data: resultados
    };

    return resultados;
}

function encontrarLinkJogoSoccerway(match, resultados) {
    const dataAlvo = normalizarTexto(formatarDataSoccerway(match.utcDate));
    const mandante = normalizarTexto(obterNomeSoccerway(match.homeTeam.id, match.homeTeam.shortName || match.homeTeam.name));
    const visitante = normalizarTexto(obterNomeSoccerway(match.awayTeam.id, match.awayTeam.shortName || match.awayTeam.name));

    return resultados.find((item) => {
        const contexto = normalizarTexto(item.contexto);
        return (
            contexto.includes(dataAlvo) &&
            contexto.includes(mandante) &&
            contexto.includes(visitante)
        );
    })?.href;
}

async function buscarEstatisticasPosJogo(match) {
    const cacheKey = String(match.id);
    const cached = postMatchStatsCache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < POST_MATCH_STATS_CACHE_MS) {
        return cached.data;
    }

    if (match.status !== "FINISHED") {
        return null;
    }

    const resultados = await carregarResultadosSoccerway();
    const urlPartida = encontrarLinkJogoSoccerway(match, resultados);

    if (!urlPartida) {
        return null;
    }

    const estatisticas = await withPage(async (page) => {
        await page.goto(urlPartida, {
            waitUntil: "domcontentloaded",
            timeout: 120000
        });
        await page.waitForTimeout(5000);

        const reject = page.getByText("Reject All");
        if (await reject.count()) {
            await reject.click().catch(() => {});
            await page.waitForTimeout(1000);
        }

        const textoBruto = await page.locator("body").innerText();
        const texto = textoBruto.replace(/\s+/g, " ");

        return {
            xg: extrairDuplaEstatistica(texto, "Expected goals (xG)", "[0-9]+(?:\\.[0-9]+)?"),
            posse: extrairDuplaEstatistica(texto, "Ball possession", "[0-9]+%"),
            chutesTotais: extrairDuplaEstatistica(texto, "Total shots", "[0-9]+"),
            fonte: "Soccerway",
            url: urlPartida
        };
    });

    postMatchStatsCache.set(cacheKey, {
        fetchedAt: Date.now(),
        data: estatisticas
    });

    return estatisticas;
}

function buscarJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(
            url,
            {
                headers: {
                    "X-Auth-Token": API_TOKEN
                }
            },
            (apiRes) => {
                let corpo = "";

                apiRes.on("data", (chunk) => {
                    corpo += chunk;
                });

                apiRes.on("end", () => {
                    if (!apiRes.statusCode || apiRes.statusCode < 200 || apiRes.statusCode >= 300) {
                        reject(new Error(`API retornou ${apiRes.statusCode || 500}`));
                        return;
                    }

                    try {
                        resolve(JSON.parse(corpo));
                    } catch {
                        reject(new Error("Resposta da API invalida"));
                    }
                });
            }
        );

        req.on("error", () => {
            reject(new Error("Falha ao consultar a API"));
        });
    });
}

function buscarTabela() {
    return buscarJson(STANDINGS_URL);
}

async function buscarJogos() {
    const tabela = await buscarTabela();
    const rodadaAtual = tabela?.season?.currentMatchday;
    const rodadaUrl = `https://api.football-data.org/v4/competitions/BSA/matches?matchday=${rodadaAtual}`;

    const [aoVivo, rodada, proximos] = await Promise.all([
        buscarJson(LIVE_MATCHES_URL),
        buscarJson(rodadaUrl),
        buscarJson(SCHEDULED_MATCHES_URL)
    ]);

    return {
        rodadaAtual,
        aoVivo: aoVivo.matches || [],
        rodada: rodada.matches || [],
        proximos: (proximos.matches || []).slice(0, 8)
    };
}

const servidor = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

    if (pathname === "/api/tabela") {
        buscarTabela()
            .then((dados) => {
                responderJson(res, 200, dados);
            })
            .catch((erro) => {
                console.error("Erro ao buscar tabela:", erro.message);
                responderJson(res, 502, { erro: erro.message });
            });
        return;
    }

    if (pathname === "/api/jogos") {
        buscarJogos()
            .then((dados) => {
                responderJson(res, 200, dados);
            })
            .catch((erro) => {
                console.error("Erro ao buscar jogos:", erro.message);
                responderJson(res, 502, { erro: erro.message });
            });
        return;
    }

    if (pathname === "/api/estatisticas-pos-jogo") {
        const match = {
            id: Number(url.searchParams.get("matchId")),
            status: url.searchParams.get("status"),
            utcDate: url.searchParams.get("utcDate"),
            homeTeam: {
                id: Number(url.searchParams.get("homeTeamId")),
                name: url.searchParams.get("homeTeamName") || "",
                shortName: url.searchParams.get("homeTeamShortName") || ""
            },
            awayTeam: {
                id: Number(url.searchParams.get("awayTeamId")),
                name: url.searchParams.get("awayTeamName") || "",
                shortName: url.searchParams.get("awayTeamShortName") || ""
            }
        };

        buscarEstatisticasPosJogo(match)
            .then((dados) => {
                responderJson(res, 200, { estatisticas: dados });
            })
            .catch((erro) => {
                console.error("Erro ao buscar estatisticas pos-jogo:", erro.message);
                responderJson(res, 502, { erro: erro.message });
            });
        return;
    }

    const urlPath = pathname === "/" ? "/Tabela.html" : pathname;
    const filePath = path.join(baseDir, urlPath);

    if (!filePath.startsWith(baseDir)) {
        res.writeHead(403);
        res.end("Acesso negado");
        return;
    }

    fs.readFile(filePath, (erro, conteudo) => {
        if (erro) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Arquivo nao encontrado");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const tipo = tipos[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": tipo });
        res.end(conteudo);
    });
});

servidor.listen(porta, "127.0.0.1", () => {
    console.log(`Servidor rodando em http://localhost:${porta}`);
});
