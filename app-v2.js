const APP_CONFIG = window.APP_CONFIG || {};

const FOOTBALL_FUNCTION_URL = "/.netlify/functions/fixtures";
const FOOTBALL_TIMEZONE = "America/Sao_Paulo";

const state = {
  filter: "today",
  matches: [],
  selectedMatch: null,
  currentSection: "overview",
};

// =============================
// FETCH DA API (CORRIGIDO)
// =============================
function fetchLiveMatches() {
  const date = getApiDateByFilter(state.filter);

  const url = new URL(FOOTBALL_FUNCTION_URL, window.location.origin);
  url.searchParams.set("date", date);
  url.searchParams.set("timezone", FOOTBALL_TIMEZONE);

  return fetch(url.toString(), {
    method: "GET",
  })
    .then((res) => {
      if (!res.ok) throw new Error("Erro API");
      return res.json();
    })
    .then((data) => {
      const fixtures = Array.isArray(data.response) ? data.response : [];
      return fixtures.map(mapFixtureToMatch);
    })
    .catch((err) => {
      console.error("Erro ao buscar jogos:", err);
      return [];
    });
}

// =============================
// DATA DO FILTRO
// =============================
function getApiDateByFilter(filter) {
  const now = new Date();

  if (filter === "today") return now.toISOString().split("T")[0];

  if (filter === "tomorrow") {
    now.setDate(now.getDate() + 1);
    return now.toISOString().split("T")[0];
  }

  return now.toISOString().split("T")[0];
}

// =============================
// MAPEAR DADOS DA API
// =============================
function mapFixtureToMatch(item) {
  return {
    id: item.fixture.id,
    league: item.league.name,
    home: item.teams.home.name,
    away: item.teams.away.name,
    time: new Date(item.fixture.date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    stadium: item.fixture.venue?.name || "Não informado",
    goalsAvg: (Math.random() * 3 + 1).toFixed(1),
    cornersAvg: Math.floor(Math.random() * 10),
    bttsRate: Math.floor(Math.random() * 100) + "%",
    confidence: Math.floor(Math.random() * 40) + 60,
    market: "Mais de 2.5 gols",
    risk: "Médio",
  };
}

// =============================
// CARREGAR JOGOS
// =============================
function loadMatches() {
  fetchLiveMatches().then((matches) => {
    state.matches = matches;
    renderMatches();
    renderHighlights();
  });
}

// =============================
// RENDER LISTA
// =============================
function renderMatches() {
  const container = document.getElementById("matchesList");
  if (!container) return;

  if (!state.matches.length) {
    container.innerHTML = `<p>Nenhuma partida disponível</p>`;
    return;
  }

  container.innerHTML = state.matches
    .map(
      (m) => `
      <div class="match-card" onclick="openMatch(${m.id})">
        <div>${m.home} vs ${m.away}</div>
        <div>${m.time}</div>
      </div>
    `,
    )
    .join("");
}

// =============================
// DESTAQUE
// =============================
function renderHighlights() {
  const el = document.getElementById("highlight");
  if (!el) return;

  if (!state.matches.length) {
    el.innerHTML = "Nenhuma partida disponível";
    return;
  }

  const m = state.matches[0];

  el.innerHTML = `
    <h2>${m.home} x ${m.away}</h2>
    <p>${m.league}</p>
    <p>${m.market}</p>
  `;
}

// =============================
// ABRIR ANÁLISE
// =============================
window.openMatch = function (id) {
  const match = state.matches.find((m) => m.id === id);
  if (!match) return;

  state.selectedMatch = match;
  renderAnalysis();
};

// =============================
// RENDER ANÁLISE
// =============================
function renderAnalysis() {
  const el = document.getElementById("analysis");
  if (!el) return;

  const m = state.selectedMatch;

  el.innerHTML = `
    <h2>${m.home} x ${m.away}</h2>
    <p><strong>Liga:</strong> ${m.league}</p>
    <p><strong>Estádio:</strong> ${m.stadium}</p>
    <p><strong>Mercado:</strong> ${m.market}</p>
    <p><strong>Confiança:</strong> ${m.confidence}%</p>
    <p><strong>Risco:</strong> ${m.risk}</p>
    <p><strong>Média de gols:</strong> ${m.goalsAvg}</p>
    <p><strong>Escanteios:</strong> ${m.cornersAvg}</p>
    <p><strong>BTTS:</strong> ${m.bttsRate}</p>
  `;
}

// =============================
// FILTROS
// =============================
window.setFilter = function (filter) {
  state.filter = filter;
  loadMatches();
};

// =============================
// INIT
// =============================
window.onload = () => {
  loadMatches();
};
// versao final v2
