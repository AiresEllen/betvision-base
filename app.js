const demoMatches = [
  {
    id: "demo-1",
    period: "today",
    league: "Brasileirão Série A",
    market: "BTTS Sim",
    home: "Palmeiras",
    away: "Flamengo",
    time: "19:30",
    stadium: "Allianz Parque",
    trend: "Confronto ofensivo com alta pressão dos dois lados.",
    confidence: 84,
    goalsAvg: 2.8,
    cornersAvg: 10.4,
    bttsRate: "71%",
  },
  {
    id: "demo-2",
    period: "today",
    league: "Champions League",
    market: "Mais de 2.5 gols",
    home: "Arsenal",
    away: "Inter",
    time: "16:00",
    stadium: "Emirates Stadium",
    trend: "Jogo de transição forte e volume ofensivo acima da média.",
    confidence: 79,
    goalsAvg: 3.1,
    cornersAvg: 9.3,
    bttsRate: "68%",
  },
  {
    id: "demo-3",
    period: "tomorrow",
    league: "Premier League",
    market: "Mais de 8.5 escanteios",
    home: "Liverpool",
    away: "Tottenham",
    time: "17:15",
    stadium: "Anfield",
    trend: "Times acelerados, cruzamentos e pressão alta dos dois lados.",
    confidence: 82,
    goalsAvg: 3.0,
    cornersAvg: 11.2,
    bttsRate: "73%",
  },
];

const APP_CONFIG = window.APP_CONFIG || {};

const SUPABASE_URL = APP_CONFIG.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = APP_CONFIG.SUPABASE_ANON_KEY || "";
const FOOTBALL_API_BASE_URL = APP_CONFIG.FOOTBALL_API_BASE_URL || "";
const FOOTBALL_API_KEY = APP_CONFIG.FOOTBALL_API_KEY || "";
const FOOTBALL_TIMEZONE = APP_CONFIG.FOOTBALL_TIMEZONE || "America/Sao_Paulo";

const sbClient =
  window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const state = {
  filter: "today",
  search: "",
  mode: "demo",
  matches: [],
  usingLiveApi: false,
  loadingMatches: false,
  currentSection: "overview",
  favorites: JSON.parse(localStorage.getItem("bv_favorites") || "[]"),
  selectedMatchId: null,
};

const loginScreen = document.getElementById("loginScreen");
const dashboardScreen = document.getElementById("dashboardScreen");
const loginForm = document.getElementById("loginForm");
const demoLogin = document.getElementById("demoLogin");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const matchesGrid = document.getElementById("matchesGrid");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll("[data-filter]");
const loginMessage = document.getElementById("loginMessage");
const modeLabel = document.getElementById("modeLabel");
const modeCardLabel = document.getElementById("modeCardLabel");
const modeCardDescription = document.getElementById("modeCardDescription");
const sidebarButtons = document.querySelectorAll(".sidebar-nav .nav-item");
const statsGrid = document.querySelector(".stats-grid");
const featuredPanel = document.querySelector(".featured-panel");
const sectionTitleRow = document.querySelector(".section-title-row");

function setMessage(text, type = "default") {
  loginMessage.innerHTML = `<span class="status-dot"></span>${text}`;
  loginMessage.style.color = type === "error" ? "#ffb4b4" : "";
}

function isLoggedIn() {
  return localStorage.getItem("bv_logged") === "true";
}

function setLoggedIn(value) {
  localStorage.setItem("bv_logged", value ? "true" : "false");
}

function saveFavoritesLocal() {
  localStorage.setItem("bv_favorites", JSON.stringify(state.favorites));
}

async function getCurrentUser() {
  if (!sbClient) return null;

  const {
    data: { user },
  } = await sbClient.auth.getUser();

  return user || null;
}

async function loadFavoritesFromSupabase() {
  if (!sbClient) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  const { data, error } = await sbClient
    .from("favorites")
    .select("match_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao carregar favoritos:", error);
    return false;
  }

  state.favorites = (data || []).map((item) => item.match_id);
  saveFavoritesLocal();
  return true;
}

async function syncFavoritesAfterLogin() {
  const loaded = await loadFavoritesFromSupabase();

  if (!loaded) {
    saveFavoritesLocal();
  }
}

function setMode(mode) {
  state.mode = mode;

  if (mode === "supabase") {
    modeLabel.textContent = state.usingLiveApi
      ? "Supabase + API Live"
      : "Supabase Live";
    modeCardLabel.textContent = state.usingLiveApi
      ? "Supabase + API"
      : "Supabase Live";
    modeCardDescription.textContent = state.usingLiveApi
      ? "Login real com partidas puxadas da API"
      : "Login real conectado ao banco";
  } else {
    modeLabel.textContent = state.usingLiveApi ? "API Live" : "Premium Demo";
    modeCardLabel.textContent = state.usingLiveApi
      ? "API Live"
      : "Demo Premium";
    modeCardDescription.textContent = state.usingLiveApi
      ? "Partidas reais puxadas da API"
      : "Pronto para integrar API real";
  }
}

async function showScreen(logged) {
  loginScreen.classList.toggle("active", !logged);
  dashboardScreen.classList.toggle("active", logged);

  if (logged) {
    await refreshMatches();
    await syncFavoritesAfterLogin();
    renderDashboard();
  }
}

function getTodayDateString(offsetDays = 0) {
  const base = new Date();
  base.setDate(base.getDate() + offsetDays);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getApiDateByFilter(filter) {
  if (filter === "today") return getTodayDateString(0);
  if (filter === "tomorrow") return getTodayDateString(1);
  return getTodayDateString(0);
}

function normalizeLeagueName(rawName) {
  if (!rawName) return "Liga";
  return rawName
    .replace("Serie A", "Série A")
    .replace("UEFA Champions League", "Champions League");
}

function buildTrendText(homeGoals, awayGoals) {
  const total = (homeGoals || 0) + (awayGoals || 0);

  if (total >= 2.8) return "Tendência ofensiva com boa chance de gols.";
  if (total >= 2.2)
    return "Jogo equilibrado com possibilidade de boas chegadas.";
  return "Confronto com tendência mais controlada e menor volume ofensivo.";
}

function guessMarket(confidence, totalGoalsAvg) {
  if (totalGoalsAvg >= 2.8) return "Mais de 2.5 gols";
  if (confidence >= 78) return "BTTS Sim";
  if (totalGoalsAvg <= 2.1) return "Menos de 3.5 gols";
  return "Mais de 1.5 gols";
}

function calculateConfidence(homeGoals, awayGoals, homeForm, awayForm) {
  const goalsFactor = Math.min(((homeGoals || 0) + (awayGoals || 0)) * 18, 55);
  const formFactor = ((homeForm || 0) + (awayForm || 0)) * 4;
  const raw = 52 + goalsFactor * 0.35 + formFactor;
  return Math.max(58, Math.min(92, Math.round(raw)));
}

function buildRecommendation(match) {
  if (match.confidence >= 88) {
    return "Entrada forte para acompanhar. A leitura atual aponta cenário muito favorável dentro do mercado sugerido.";
  }
  if (match.confidence >= 78) {
    return "Boa oportunidade. Vale acompanhar confirmação final e contexto do jogo antes da entrada.";
  }
  if (match.confidence >= 68) {
    return "Leitura interessante, mas pede gestão de risco mais conservadora e atenção ao pré-jogo.";
  }
  return "Cenário mais sensível. Ideal operar com mais cautela ou observar ao vivo antes de decidir.";
}

function getRiskLevel(confidence) {
  if (confidence >= 86) return "Baixo";
  if (confidence >= 74) return "Moderado";
  return "Elevado";
}

function getRiskDescription(confidence) {
  if (confidence >= 86) {
    return "O cenário atual mostra boa sustentação estatística para a leitura proposta.";
  }
  if (confidence >= 74) {
    return "Existe valor, mas com alguns pontos que merecem confirmação antes da entrada.";
  }
  return "A análise sugere mais oscilação e necessidade de confirmação extra.";
}

function getWatchPoints(match) {
  const points = [];

  if (match.goalsAvg >= 2.8) {
    points.push(
      "Volume ofensivo acima da média, com boa chance de jogo aberto.",
    );
  } else {
    points.push(
      "Produção ofensiva mais controlada, o que pode reduzir o ritmo em alguns momentos.",
    );
  }

  if (parseFloat(match.bttsRate) >= 65) {
    points.push(
      "Ambos marcam aparece como cenário plausível dentro da tendência atual.",
    );
  } else {
    points.push(
      "Há sinais de jogo menos bilateral, com risco de domínio maior de um lado.",
    );
  }

  if (match.cornersAvg >= 9.5) {
    points.push(
      "Boa expectativa de pressão territorial e geração de escanteios.",
    );
  } else {
    points.push(
      "Escanteios podem ficar mais dependentes do contexto do jogo e da postura dos times.",
    );
  }

  return points;
}

function getPeriodFromFilter(filter) {
  if (filter === "today") return "today";
  if (filter === "tomorrow") return "tomorrow";
  return "week";
}

function mapFixtureToMatch(fixtureData, currentFilter) {
  const fixture = fixtureData.fixture || {};
  const league = fixtureData.league || {};
  const teams = fixtureData.teams || {};
  const goals = fixtureData.goals || {};
  const score = fixtureData.score || {};

  const homeName = teams.home?.name || "Mandante";
  const awayName = teams.away?.name || "Visitante";
  const stadium = fixture.venue?.name || "Estádio não informado";

  const fixtureDate = fixture.date ? new Date(fixture.date) : new Date();
  const matchTime = fixtureDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FOOTBALL_TIMEZONE,
  });

  const homeGoalsAvg = Number(goals.home ?? score.fulltime?.home ?? 1.1);
  const awayGoalsAvg = Number(goals.away ?? score.fulltime?.away ?? 1.0);
  const totalGoalsAvg = Math.max(1.2, homeGoalsAvg + awayGoalsAvg);
  const confidence = calculateConfidence(homeGoalsAvg, awayGoalsAvg, 3, 3);

  return {
    id: String(
      fixture.id || `${homeName}-${awayName}-${fixture.date || Date.now()}`,
    ),
    period: getPeriodFromFilter(currentFilter),
    league: normalizeLeagueName(league.name),
    market: guessMarket(confidence, totalGoalsAvg),
    home: homeName,
    away: awayName,
    time: matchTime,
    stadium,
    trend: buildTrendText(homeGoalsAvg, awayGoalsAvg),
    confidence,
    goalsAvg: Number(totalGoalsAvg.toFixed(1)),
    cornersAvg: Number((8 + (confidence % 4)).toFixed(1)),
    bttsRate: `${Math.max(45, Math.min(82, Math.round(confidence - 8)))}%`,
  };
}

async function fetchLiveMatches() {
  if (!FOOTBALL_API_BASE_URL || !FOOTBALL_API_KEY) {
    throw new Error("API não configurada no config.js");
  }

  const date = getApiDateByFilter(state.filter);
  const url = new URL(`${FOOTBALL_API_BASE_URL}/fixtures`);
  url.searchParams.set("date", date);
  url.searchParams.set("timezone", FOOTBALL_TIMEZONE);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-apisports-key": FOOTBALL_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Erro da API: ${response.status}`);
  }

  const data = await response.json();
  const fixtures = Array.isArray(data.response) ? data.response : [];

  return fixtures.map((item) => mapFixtureToMatch(item, state.filter));
}

async function refreshMatches() {
  state.loadingMatches = true;

  try {
    const liveMatches = await fetchLiveMatches();

    if (liveMatches.length) {
      state.matches = liveMatches;
      state.usingLiveApi = true;
    } else {
      state.matches = demoMatches;
      state.usingLiveApi = false;
    }
  } catch (error) {
    console.error("Erro ao buscar API:", error);
    state.matches = demoMatches;
    state.usingLiveApi = false;
  } finally {
    state.loadingMatches = false;
    setMode(state.mode);
  }
}

function getAllMatches() {
  return state.matches.length ? state.matches : demoMatches;
}

function getFilteredMatches() {
  const source = getAllMatches();

  return source.filter((match) => {
    const filterOk =
      state.filter === "week"
        ? ["today", "tomorrow", "week"].includes(match.period)
        : match.period === state.filter;

    const text =
      `${match.home} ${match.away} ${match.league} ${match.market}`.toLowerCase();
    const searchOk = text.includes(state.search.toLowerCase());

    return filterOk && searchOk;
  });
}

function getTrendMatches() {
  return [...getFilteredMatches()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}

function getFavoriteMatches() {
  const all = getAllMatches();
  return all.filter((match) => state.favorites.includes(match.id));
}

function getSelectedMatch() {
  return (
    getAllMatches().find((match) => match.id === state.selectedMatchId) || null
  );
}

function renderStats(matches) {
  const count = matches.length;
  const best = matches.reduce((max, item) => Math.max(max, item.confidence), 0);
  const avgGoals = count
    ? (matches.reduce((sum, item) => sum + item.goalsAvg, 0) / count).toFixed(1)
    : "0.0";

  document.getElementById("matchesCount").textContent = count;
  document.getElementById("bestConfidence").textContent = `${best}%`;
  document.getElementById("goalsAverage").textContent = avgGoals;
}

function renderFeatured(matches) {
  const featured = [...matches].sort((a, b) => b.confidence - a.confidence)[0];

  if (!featured) {
    document.getElementById("featuredTitle").textContent =
      "Nenhuma partida encontrada";
    document.getElementById("featuredDescription").textContent =
      "Tente mudar o filtro ou pesquisar outro time.";
    document.getElementById("featuredConfidence").textContent = "0%";
    return;
  }

  document.getElementById("featuredTitle").textContent =
    `${featured.home} x ${featured.away}`;
  document.getElementById("featuredDescription").textContent =
    `${featured.trend} Mercado sugerido: ${featured.market}.`;
  document.getElementById("featuredConfidence").textContent =
    `${featured.confidence}%`;
}

async function saveFavoriteToSupabase(matchId) {
  if (!sbClient) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  const match = getAllMatches().find((item) => item.id === matchId);
  if (!match) return false;

  const { error } = await sbClient.from("favorites").upsert(
    {
      user_id: user.id,
      match_id: match.id,
      home_team: match.home,
      away_team: match.away,
      league: match.league,
      market: match.market,
    },
    {
      onConflict: "user_id,match_id",
    },
  );

  if (error) {
    console.error("Erro ao salvar favorito:", error);
    return false;
  }

  return true;
}

async function removeFavoriteFromSupabase(matchId) {
  if (!sbClient) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  const { error } = await sbClient
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("match_id", matchId);

  if (error) {
    console.error("Erro ao remover favorito:", error);
    return false;
  }

  return true;
}

async function toggleFavorite(matchId) {
  const alreadyFavorite = state.favorites.includes(matchId);

  if (alreadyFavorite) {
    state.favorites = state.favorites.filter((id) => id !== matchId);
    saveFavoritesLocal();
    renderDashboard();
    await removeFavoriteFromSupabase(matchId);
    return;
  }

  state.favorites.push(matchId);
  saveFavoritesLocal();
  renderDashboard();
  await saveFavoriteToSupabase(matchId);
}

window.toggleFavorite = toggleFavorite;

function openMatchDetails(matchId) {
  state.selectedMatchId = matchId;
  renderDashboard();
}

function backToDashboard() {
  state.selectedMatchId = null;
  renderDashboard();
}

window.openMatchDetails = openMatchDetails;
window.backToDashboard = backToDashboard;

function createMatchCard(match) {
  const isFavorite = state.favorites.includes(match.id);

  return `
    <article
      class="match-card"
      onclick="openMatchDetails('${match.id}')"
      style="cursor:pointer;"
    >
      <div class="match-top">
        <span class="league-pill">${match.league}</span>
        <span class="market-pill">${match.market}</span>
      </div>

      <div class="teams-row">
        <div class="team">
          <span>Mandante</span>
          <strong>${match.home}</strong>
        </div>
        <div class="vs">VS</div>
        <div class="team" style="text-align:right">
          <span>Visitante</span>
          <strong>${match.away}</strong>
        </div>
      </div>

      <div class="meta-row">
        <span>${match.time}</span>
        <span>${match.stadium}</span>
      </div>

      <div class="meta-grid">
        <div class="meta-box">
          <span>Média gols</span>
          <strong>${match.goalsAvg}</strong>
        </div>
        <div class="meta-box">
          <span>Escanteios</span>
          <strong>${match.cornersAvg}</strong>
        </div>
        <div class="meta-box">
          <span>BTTS</span>
          <strong>${match.bttsRate}</strong>
        </div>
      </div>

      <div class="confidence-row">
        <div class="pill-row">
          <span class="confidence-label">Confiança da análise</span>
          <strong>${match.confidence}%</strong>
        </div>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width:${match.confidence}%"></div>
        </div>
      </div>

      <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <small style="color:#8fa6d8;">Clique para abrir a análise completa</small>
        <button
          onclick="event.stopPropagation(); toggleFavorite('${match.id}')"
          style="
            border:none;
            border-radius:12px;
            padding:10px 14px;
            cursor:pointer;
            background:${isFavorite ? "linear-gradient(135deg,#5db0ff,#7c6dff)" : "rgba(255,255,255,0.08)"};
            color:white;
            font-weight:600;
          "
        >
          ${isFavorite ? "★ Favorito" : "☆ Favoritar"}
        </button>
      </div>
    </article>
  `;
}

function renderMatchDetails(match) {
  if (!match) {
    matchesGrid.innerHTML = `
      <div class="empty-state">
        <h3>Partida não encontrada</h3>
        <p>Volte para o painel e selecione outro jogo.</p>
      </div>
    `;
    return;
  }

  const isFavorite = state.favorites.includes(match.id);
  const riskLevel = getRiskLevel(match.confidence);
  const riskDescription = getRiskDescription(match.confidence);
  const watchPoints = getWatchPoints(match);
  const recommendation = buildRecommendation(match);

  document.getElementById("featuredTitle").textContent =
    `${match.home} x ${match.away}`;
  document.getElementById("featuredDescription").textContent =
    "Tela premium de análise detalhada da partida.";
  document.getElementById("featuredConfidence").textContent =
    `${match.confidence}%`;

  matchesGrid.innerHTML = `
    <section style="display:flex; flex-direction:column; gap:20px;">
      <div style="background:rgba(10,24,46,0.92); border:1px solid rgba(126,147,255,0.14); border-radius:28px; padding:24px; box-shadow:0 24px 60px rgba(0,0,0,0.28);">
        <div style="display:flex; justify-content:space-between; gap:18px; align-items:flex-start; flex-wrap:wrap;">
          <div style="min-width:0;">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#66c7ff; font-weight:800;">Análise detalhada</div>
            <h2 style="margin:10px 0 8px; font-size:clamp(30px,4vw,52px); line-height:1.05; word-break:break-word;">${match.home} x ${match.away}</h2>
            <p style="margin:0; color:#a7b8da; font-size:18px; line-height:1.5;">${match.league} • ${match.time} • ${match.stadium}</p>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button
              onclick="backToDashboard()"
              style="border:none; border-radius:16px; padding:13px 18px; cursor:pointer; background:rgba(255,255,255,0.08); color:#fff; font-weight:700;"
            >
              ← Voltar ao painel
            </button>

            <button
              onclick="toggleFavorite('${match.id}')"
              style="border:none; border-radius:16px; padding:13px 18px; cursor:pointer; background:${isFavorite ? "linear-gradient(135deg,#5db0ff,#7c6dff)" : "rgba(255,255,255,0.08)"}; color:#fff; font-weight:700;"
            >
              ${isFavorite ? "★ Favorito salvo" : "☆ Salvar favorito"}
            </button>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px;">
        <div style="padding:20px; border-radius:22px; background:rgba(16,29,56,0.9); border:1px solid rgba(126,147,255,0.12);">
          <div style="color:#8ea4cf; font-size:13px;">Mercado sugerido</div>
          <div style="font-size:24px; font-weight:800; margin-top:10px; line-height:1.2;">${match.market}</div>
        </div>
        <div style="padding:20px; border-radius:22px; background:rgba(16,29,56,0.9); border:1px solid rgba(126,147,255,0.12);">
          <div style="color:#8ea4cf; font-size:13px;">Confiança</div>
          <div style="font-size:24px; font-weight:800; margin-top:10px;">${match.confidence}%</div>
        </div>
        <div style="padding:20px; border-radius:22px; background:rgba(16,29,56,0.9); border:1px solid rgba(126,147,255,0.12);">
          <div style="color:#8ea4cf; font-size:13px;">Risco</div>
          <div style="font-size:24px; font-weight:800; margin-top:10px;">${riskLevel}</div>
        </div>
        <div style="padding:20px; border-radius:22px; background:rgba(16,29,56,0.9); border:1px solid rgba(126,147,255,0.12);">
          <div style="color:#8ea4cf; font-size:13px;">Média de gols</div>
          <div style="font-size:24px; font-weight:800; margin-top:10px;">${match.goalsAvg}</div>
        </div>
        <div style="padding:20px; border-radius:22px; background:rgba(16,29,56,0.9); border:1px solid rgba(126,147,255,0.12);">
          <div style="color:#8ea4cf; font-size:13px;">Escanteios</div>
          <div style="font-size:24px; font-weight:800; margin-top:10px;">${match.cornersAvg}</div>
        </div>
        <div style="padding:20px; border-radius:22px; background:rgba(16,29,56,0.9); border:1px solid rgba(126,147,255,0.12);">
          <div style="color:#8ea4cf; font-size:13px;">BTTS</div>
          <div style="font-size:24px; font-weight:800; margin-top:10px;">${match.bttsRate}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1.2fr 0.95fr; gap:18px;" class="detail-grid-responsive">
        <div style="display:flex; flex-direction:column; gap:18px;">
          <div style="padding:22px; border-radius:24px; background:rgba(12,25,47,0.94); border:1px solid rgba(126,147,255,0.12);">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#66c7ff; font-weight:800;">Leitura principal</div>
            <h3 style="margin:12px 0 10px; font-size:24px;">Tendência do confronto</h3>
            <p style="margin:0; color:#d3def5; line-height:1.8;">${match.trend}</p>
          </div>

          <div style="padding:22px; border-radius:24px; background:linear-gradient(135deg, rgba(89,184,255,0.12), rgba(122,108,255,0.12)); border:1px solid rgba(126,147,255,0.18);">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#b7d7ff; font-weight:800;">Recomendação executiva</div>
            <h3 style="margin:12px 0 10px; font-size:24px;">Como operar esse jogo</h3>
            <p style="margin:0; color:#eef4ff; line-height:1.8;">${recommendation}</p>
          </div>

          <div style="padding:22px; border-radius:24px; background:rgba(12,25,47,0.94); border:1px solid rgba(126,147,255,0.12);">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#66c7ff; font-weight:800;">O que observar</div>
            <ul style="margin:14px 0 0; padding-left:20px; color:#d3def5; line-height:1.9;">
              ${watchPoints.map((point) => `<li>${point}</li>`).join("")}
            </ul>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:18px;">
          <div style="padding:22px; border-radius:24px; background:rgba(12,25,47,0.94); border:1px solid rgba(126,147,255,0.12);">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#66c7ff; font-weight:800;">Resumo executivo</div>
            <ul style="margin:14px 0 0; padding-left:18px; color:#d3def5; line-height:1.95;">
              <li><strong>Liga:</strong> ${match.league}</li>
              <li><strong>Horário:</strong> ${match.time}</li>
              <li><strong>Estádio:</strong> ${match.stadium}</li>
              <li><strong>Mercado:</strong> ${match.market}</li>
              <li><strong>Confiança:</strong> ${match.confidence}%</li>
              <li><strong>BTTS:</strong> ${match.bttsRate}</li>
              <li><strong>Origem dos dados:</strong> ${state.usingLiveApi ? "API ao vivo" : "Modo demo"}</li>
            </ul>
          </div>

          <div style="padding:22px; border-radius:24px; background:rgba(12,25,47,0.94); border:1px solid rgba(126,147,255,0.12);">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#66c7ff; font-weight:800;">Leitura de risco</div>
            <h3 style="margin:12px 0 10px; font-size:24px;">Risco ${riskLevel}</h3>
            <p style="margin:0; color:#d3def5; line-height:1.8;">${riskDescription}</p>
          </div>

          <div style="padding:22px; border-radius:24px; background:rgba(12,25,47,0.94); border:1px solid rgba(126,147,255,0.12);">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#66c7ff; font-weight:800;">Conclusão rápida</div>
            <p style="margin:12px 0 0; color:#d3def5; line-height:1.8;">
              ${match.home} x ${match.away} chega com foco principal em <strong>${match.market}</strong>,
              sustentado por uma leitura de <strong>${match.confidence}%</strong> de confiança e média de
              <strong>${match.goalsAvg}</strong> gols no cenário atual.
            </p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderOverview(matches) {
  if (state.loadingMatches) {
    matchesGrid.innerHTML = `
      <div class="empty-state">
        <h3>Carregando partidas...</h3>
        <p>Aguarde enquanto buscamos os jogos.</p>
      </div>
    `;
    return;
  }

  if (!matches.length) {
    matchesGrid.innerHTML = `
      <div class="empty-state">
        <h3>Nenhum resultado encontrado</h3>
        <p>Tente trocar o filtro ou pesquisar outro nome.</p>
      </div>
    `;
    return;
  }

  matchesGrid.innerHTML = matches
    .map((match) => createMatchCard(match))
    .join("");
}

function renderPartidas(matches) {
  document.getElementById("featuredTitle").textContent = "Todas as partidas";
  document.getElementById("featuredDescription").textContent =
    "Lista completa das partidas disponíveis no filtro atual.";
  document.getElementById("featuredConfidence").textContent =
    `${matches.length}`;

  matchesGrid.innerHTML = matches.length
    ? matches.map((match) => createMatchCard(match)).join("")
    : `
      <div class="empty-state">
        <h3>Sem partidas</h3>
        <p>Nenhuma partida encontrada nesse filtro.</p>
      </div>
    `;
}

function renderTendencias() {
  const trendMatches = getTrendMatches();

  document.getElementById("featuredTitle").textContent = "Tendências do dia";
  document.getElementById("featuredDescription").textContent =
    "Jogos ordenados pelas maiores confianças.";
  document.getElementById("featuredConfidence").textContent =
    `${trendMatches[0]?.confidence || 0}%`;

  matchesGrid.innerHTML = trendMatches.length
    ? trendMatches.map((match) => createMatchCard(match)).join("")
    : `
      <div class="empty-state">
        <h3>Sem tendências</h3>
        <p>Nenhum jogo com tendência disponível.</p>
      </div>
    `;
}

function renderFavoritos() {
  const favoriteMatches = getFavoriteMatches();

  document.getElementById("featuredTitle").textContent = "Seus favoritos";
  document.getElementById("featuredDescription").textContent =
    "Jogos que você marcou para acompanhar depois.";
  document.getElementById("featuredConfidence").textContent =
    `${favoriteMatches.length}`;

  matchesGrid.innerHTML = favoriteMatches.length
    ? favoriteMatches.map((match) => createMatchCard(match)).join("")
    : `
      <div class="empty-state">
        <h3>Nenhum favorito ainda</h3>
        <p>Use o botão “Favoritar” nos cards para salvar aqui.</p>
      </div>
    `;
}

function renderConfiguracoes() {
  const apiStatus = state.usingLiveApi ? "Conectada" : "Não conectada";
  const supabaseStatus = sbClient ? "Conectado" : "Não configurado";

  document.getElementById("featuredTitle").textContent =
    "Configurações do sistema";
  document.getElementById("featuredDescription").textContent =
    "Resumo técnico da conexão atual.";
  document.getElementById("featuredConfidence").textContent = "OK";

  matchesGrid.innerHTML = `
    <div class="empty-state" style="text-align:left;">
      <h3>Status atual</h3>
      <p><strong>Supabase:</strong> ${supabaseStatus}</p>
      <p><strong>API Futebol:</strong> ${apiStatus}</p>
      <p><strong>Timezone:</strong> ${FOOTBALL_TIMEZONE}</p>
      <p><strong>Filtro atual:</strong> ${state.filter}</p>
      <p><strong>Modo atual:</strong> ${state.mode}</p>
      <p><strong>Partidas carregadas:</strong> ${state.matches.length || demoMatches.length}</p>
      <p><strong>Favoritos sincronizados:</strong> ${state.favorites.length}</p>
    </div>
  `;
}

function updateSidebarActive() {
  sidebarButtons.forEach((button) => {
    const section = button.textContent.trim().toLowerCase();

    button.classList.remove("active");

    if (
      (section.includes("visão") && state.currentSection === "overview") ||
      (section.includes("partidas") && state.currentSection === "matches") ||
      (section.includes("tendências") && state.currentSection === "trends") ||
      (section.includes("favoritos") && state.currentSection === "favorites") ||
      (section.includes("configurações") && state.currentSection === "settings")
    ) {
      button.classList.add("active");
    }
  });
}

function setDashboardLayoutForDetails(isDetail) {
  if (statsGrid) statsGrid.style.display = isDetail ? "none" : "";
  if (sectionTitleRow) sectionTitleRow.style.display = isDetail ? "none" : "";
  if (featuredPanel) featuredPanel.style.marginBottom = isDetail ? "18px" : "";
}

function renderDashboard() {
  updateSidebarActive();

  if (state.selectedMatchId) {
    setDashboardLayoutForDetails(true);
    renderMatchDetails(getSelectedMatch());
    return;
  }

  setDashboardLayoutForDetails(false);

  const matches = getFilteredMatches();
  renderStats(matches);
  renderFeatured(matches);

  if (state.currentSection === "overview") {
    renderOverview(matches);
    return;
  }

  if (state.currentSection === "matches") {
    renderPartidas(matches);
    return;
  }

  if (state.currentSection === "trends") {
    renderTendencias();
    return;
  }

  if (state.currentSection === "favorites") {
    renderFavoritos();
    return;
  }

  if (state.currentSection === "settings") {
    renderConfiguracoes();
  }
}

async function loginWithSupabase(email, password) {
  if (!sbClient) {
    setMessage(
      "Supabase não configurado. Preencha o arquivo config.js ou entre em modo demo.",
      "error",
    );
    return;
  }

  const { error } = await sbClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setMessage(`Erro no login: ${error.message}`, "error");
    return;
  }

  setMode("supabase");
  setLoggedIn(true);
  await showScreen(true);
}

async function signUpWithSupabase(email, password) {
  if (!sbClient) {
    setMessage(
      "Supabase não configurado. Preencha o arquivo config.js antes de criar conta.",
      "error",
    );
    return;
  }

  const { error } = await sbClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    setMessage(`Erro ao criar conta: ${error.message}`, "error");
    return;
  }

  setMessage(
    "Conta criada com sucesso. Se o Supabase pedir confirmação por e-mail, confirme antes de entrar.",
  );
}

async function logoutSupabaseIfNeeded() {
  if (sbClient) {
    await sbClient.auth.signOut();
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    setMessage("Preencha e-mail e senha.", "error");
    return;
  }

  await loginWithSupabase(email, password);
});

signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    setMessage("Preencha e-mail e senha para criar sua conta.", "error");
    return;
  }

  await signUpWithSupabase(email, password);
});

demoLogin.addEventListener("click", async () => {
  setMode("demo");
  setLoggedIn(true);
  setMessage("Você entrou em modo demo.");
  await showScreen(true);
});

logoutBtn.addEventListener("click", async () => {
  setLoggedIn(false);
  state.selectedMatchId = null;
  await logoutSupabaseIfNeeded();
  await showScreen(false);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    state.selectedMatchId = null;

    await refreshMatches();
    renderDashboard();
  });
});

sidebarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const label = button.textContent.trim().toLowerCase();
    state.selectedMatchId = null;

    if (label.includes("visão")) state.currentSection = "overview";
    else if (label.includes("partidas")) state.currentSection = "matches";
    else if (label.includes("tendências")) state.currentSection = "trends";
    else if (label.includes("favoritos")) state.currentSection = "favorites";
    else if (label.includes("configurações")) state.currentSection = "settings";

    renderDashboard();
  });
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderDashboard();
});

async function bootstrapAuth() {
  if (!sbClient) {
    setMode("demo");
    await showScreen(isLoggedIn());
    return;
  }

  const {
    data: { session },
  } = await sbClient.auth.getSession();

  if (session?.user) {
    setMode("supabase");
    setLoggedIn(true);
    await showScreen(true);
  } else {
    setMode("demo");
    await showScreen(isLoggedIn());
  }
}

bootstrapAuth();
