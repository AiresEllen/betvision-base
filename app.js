const demoMatches = [
  {
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

function showScreen(logged) {
  loginScreen.classList.toggle("active", !logged);
  dashboardScreen.classList.toggle("active", logged);

  if (logged) {
    refreshMatches().finally(() => {
      renderDashboard();
    });
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

function getFilteredMatches() {
  const source = state.matches.length ? state.matches : demoMatches;

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

function createMatchCard(match) {
  return `
    <article class="match-card">
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
    </article>
  `;
}

function renderMatches(matches) {
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

  matchesGrid.innerHTML = matches.map(createMatchCard).join("");
}

function renderDashboard() {
  const matches = getFilteredMatches();
  renderStats(matches);
  renderFeatured(matches);
  renderMatches(matches);
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
  showScreen(true);
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
  showScreen(true);
});

logoutBtn.addEventListener("click", async () => {
  setLoggedIn(false);
  await logoutSupabaseIfNeeded();
  showScreen(false);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;

    await refreshMatches();
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
    showScreen(isLoggedIn());
    return;
  }

  const {
    data: { session },
  } = await sbClient.auth.getSession();

  if (session?.user) {
    setMode("supabase");
    setLoggedIn(true);
    showScreen(true);
  } else {
    setMode("demo");
    showScreen(isLoggedIn());
  }
}

bootstrapAuth();
