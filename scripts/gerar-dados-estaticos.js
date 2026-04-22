const fs = require("fs");
const path = require("path");
const https = require("https");

const API_TOKEN = process.env.FOOTBALL_DATA_API_TOKEN || process.env.API_TOKEN;
const BASE_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(BASE_DIR, "data");
const STANDINGS_URL = "https://api.football-data.org/v4/competitions/BSA/standings";
const LIVE_MATCHES_URL = "https://api.football-data.org/v4/competitions/BSA/matches?status=LIVE";
const SCHEDULED_MATCHES_URL = "https://api.football-data.org/v4/competitions/BSA/matches?status=SCHEDULED";

function buscarJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(
            url,
            {
                headers: {
                    "X-Auth-Token": API_TOKEN
                }
            },
            (res) => {
                let corpo = "";

                res.on("data", (chunk) => {
                    corpo += chunk;
                });

                res.on("end", () => {
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        reject(new Error(`API retornou ${res.statusCode || 500} em ${url}`));
                        return;
                    }

                    try {
                        resolve(JSON.parse(corpo));
                    } catch {
                        reject(new Error(`Resposta invalida em ${url}`));
                    }
                });
            }
        );

        req.on("error", (erro) => {
            reject(erro);
        });
    });
}

async function gerarDados() {
    if (!API_TOKEN) {
        throw new Error("Defina a variavel FOOTBALL_DATA_API_TOKEN antes de executar.");
    }

    const tabela = await buscarJson(STANDINGS_URL);
    const rodadaAtual = tabela?.season?.currentMatchday;
    const rodadaUrl = `https://api.football-data.org/v4/competitions/BSA/matches?matchday=${rodadaAtual}`;

    const [aoVivo, rodada, proximos] = await Promise.all([
        buscarJson(LIVE_MATCHES_URL),
        buscarJson(rodadaUrl),
        buscarJson(SCHEDULED_MATCHES_URL)
    ]);

    fs.mkdirSync(DATA_DIR, { recursive: true });

    const atualizadoEm = new Date().toISOString();

    const tabelaPayload = {
        ...tabela,
        atualizadoEm,
        origem: "static-json"
    };

    const jogosPayload = {
        rodadaAtual,
        aoVivo: aoVivo.matches || [],
        rodada: rodada.matches || [],
        proximos: (proximos.matches || []).slice(0, 8),
        estatisticasPosJogo: {},
        atualizadoEm,
        origem: "static-json"
    };

    fs.writeFileSync(
        path.join(DATA_DIR, "tabela.json"),
        `${JSON.stringify(tabelaPayload, null, 2)}\n`,
        "utf8"
    );

    fs.writeFileSync(
        path.join(DATA_DIR, "jogos.json"),
        `${JSON.stringify(jogosPayload, null, 2)}\n`,
        "utf8"
    );

    console.log(`Dados estaticos atualizados em ${atualizadoEm}`);
}

gerarDados().catch((erro) => {
    console.error(erro.message);
    process.exit(1);
});
