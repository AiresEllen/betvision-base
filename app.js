const APP_CONFIG = window.APP_CONFIG || {};
const FOOTBALL_FUNCTION_URL = "/.netlify/functions/fixtures";
const FOOTBALL_TIMEZONE = APP_CONFIG.FOOTBALL_TIMEZONE || "America/Sao_Paulo";

const DEMO_FIXTURES = [
  {
    fixture: {
      id: 101,
      date: new Date().toISOString(),
      venue: { name: "Etihad Stadium" },
    },
    league: {
      name: "Premier League",
      logo: "https://media.api-sports.io/football/leagues/39.png",
    },
    teams: {
      home: {
        id: 50,
        name: "Manchester City",
        logo: "https://media.api-sports.io/football/teams/50.png",
      },
      away: {
        id: 42,
        name: "Arsenal",
        logo: "https://media.api-sports.io/football/teams/42.png",
      },
    },
  },
  {
    fixture: {
      id: 102,
      date: new Date(Date.now() + 3600000).toISOString(),
      venue: { name: "Santiago Bernabéu" },
    },
    league: {
      name: "La Liga",
      logo: "https://media.api-sports.io/football/leagues/140.png",
    },
    teams: {
      home: {
        id: 541,
        name: "Real Madrid",
        logo: "https://media.api-sports.io/football/teams/541.png",
      },
      away: {
        id: 529,
        name: "Barcelona",
        logo: "https://media.api-sports.io/football/teams/529.png",
      },
    },
  },
  {
    fixture: {
      id: 103,
      date: new Date(Date.now() + 7200000).toISOString(),
      venue: { name: "Allianz Arena" },
    },
    league: {
      name: "Bundesliga",
      logo: "https://media.api-sports.io/football/leagues/78.png",
    },
    teams: {
      home: {
        id: 157,
        name: "Bayern Munich",
        logo: "https://media.api-sports.io/football/teams/157.png",
      },
      away: {
        id: 165,
        name: "Dortmund",
        logo: "https://media.api-sports.io/football/teams/165.png",
      },
    },
  },
  {
    fixture: {
      id: 104,
      date: new Date(Date.now() + 10800000).toISOString(),
      venue: { name: "Neo Química Arena" },
    },
    league: {
      name: "Brasileirão",
      logo: "https://media.api-sports.io/football/leagues/71.png",
    },
    teams: {
      home: {
        id: 131,
        name: "Corinthians",
        logo: "https://media.api-sports.io/football/teams/131.png",
      },
      away: {
        id: 121,
        name: "Palmeiras",
        logo: "https://media.api-sports.io/football/teams/121.png",
      },
    },
  },
];

const state = {
  filter: "today",
  section: "overview",
  matches: [],
  search: "",
  favorites: JSON.parse(localStorage.getItem("bv_favorites") || "[]"),
  isDemo: false,
  dataSource: "loading",
};

const supabaseClient =
  window.supabase && APP_CONFIG.SUPABASE_URL && APP_CONFIG.SUPABASE_ANON_KEY
    ? window.supabase.createClient(
        APP_CONFIG.SUPABASE_URL,
        APP_CONFIG.SUPABASE_ANON_KEY,
      )
    : null;

const $ = (id) => document.getElementById(id);

function toast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3000);
}

function formatApiDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setScreen(name) {
  $("loginScreen")?.classList.toggle("active", name === "login");
  $("appScreen")?.classList.toggle("active", name === "app");
}

function setMode(label, description) {
  $("modeLabel") && ($("modeLabel").textContent = label);
  $("modeCardLabel") &&
    ($("modeCardLabel").textContent = label.includes("Demo")
      ? "Demo"
      : "Supabase");
  $("modeCardDescription") &&
    ($("modeCardDescription").textContent = description);
}

function setDataSource(source) {
  state.dataSource = source;
  const badge = $("dataSourceBadge");
  if (!badge) return;
  badge.className =
    "source-badge " +
    (source === "api" ? "real" : source === "demo" ? "demo" : "neutral");
  badge.textContent =
    source === "api"
      ? "Dados reais da API"
      : source === "demo"
        ? "Modo demo / simulado"
        : "Carregando dados";
}

function loginMessage(msg) {
  $("loginMessage") && ($("loginMessage").textContent = msg);
}

async function login(email, password) {
  if (!supabaseClient) {
    loginMessage("Supabase não configurado.");
    toast("Supabase não configurado");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(error);
    loginMessage("Erro: " + error.message);
    toast("Erro no login: " + error.message);
    return;
  }

  state.isDemo = false;
  setMode("Usuário autenticado", "Login real ativo");
  setScreen("app");
  await loadMatches();
  toast("Login realizado");
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  setScreen("login");
}

function demoLogin() {
  state.isDemo = true;
  setMode("Premium Demo", "Dados demo com visual premium");
  setDataSource("demo");
  setScreen("app");
  loadMatches(true);
  toast("Modo demo ativado");
}

function getDates() {
  const today = new Date();

  if (state.filter === "tomorrow") today.setDate(today.getDate() + 1);

  if (state.filter === "week") {
    const to = new Date();
    to.setDate(to.getDate() + 7);
    return { from: formatApiDate(new Date()), to: formatApiDate(to) };
  }

  return { date: formatApiDate(today) };
}

async function fetchMatches(forceDemo = false) {
  if (forceDemo) {
    setDataSource("demo");
    return DEMO_FIXTURES.map(mapFixtureToMatch);
  }

  const url = new URL(FOOTBALL_FUNCTION_URL, window.location.origin);
  url.searchParams.set("timezone", FOOTBALL_TIMEZONE);

  const dates = getDates();

  if (dates.from) {
    url.searchParams.set("from", dates.from);
    url.searchParams.set("to", dates.to);
  } else {
    url.searchParams.set("date", dates.date);
  }

  try {
    const res = await fetch(url.toString());
    const json = await res.json();
    const payload = json.data || json;
    const errors = payload.errors;
    const hasErrors =
      errors &&
      (Array.isArray(errors) ? errors.length : Object.keys(errors).length);

    if (!res.ok || hasErrors) {
      console.warn("API retornou aviso/erro", payload.errors);
      setDataSource("demo");
      toast("API sem dados para essa data. Exibindo demo.");
      return DEMO_FIXTURES.map(mapFixtureToMatch);
    }

    const fixtures = Array.isArray(payload.response) ? payload.response : [];

    if (!fixtures.length) {
      setDataSource("demo");
      toast("Nenhum jogo encontrado. Exibindo demo.");
      return DEMO_FIXTURES.map(mapFixtureToMatch);
    }

    setDataSource("api");
    return fixtures.map(mapFixtureToMatch);
  } catch (e) {
    console.error(e);
    setDataSource("demo");
    toast("Erro na API. Exibindo demo.");
    return DEMO_FIXTURES.map(mapFixtureToMatch);
  }
}

function scoreFromId(id, min, max) {
  const n = Math.abs(Number(String(id).slice(-5)) || 12345);
  return min + (n % (max - min + 1));
}

function teamLogo(team) {
  if (team?.logo) return team.logo;
  if (team?.id)
    return `https://media.api-sports.io/football/teams/${team.id}.png`;
  return "";
}

function leagueLogo(league) {
  if (league?.logo) return league.logo;
  if (league?.id)
    return `https://media.api-sports.io/football/leagues/${league.id}.png`;
  return "";
}

function initials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

function logoHtml(src, name, kind = "team") {
  return src
    ? `<img class="${kind}-logo" src="${src}" alt="${name}" loading="lazy" onerror="this.outerHTML='<span class=&quot;logo-fallback&quot;>${initials(name)}</span>'" />`
    : `<span class="logo-fallback">${initials(name)}</span>`;
}

function mapFixtureToMatch(item) {
  const id = item.fixture?.id || Math.floor(Math.random() * 99999);
  const fixtureDate = new Date(item.fixture?.date || Date.now());

  const confidence = scoreFromId(id, 62, 99);
  const goals = (1.4 + scoreFromId(id, 0, 24) / 10).toFixed(1);
  const btts = scoreFromId(id, 38, 82);
  const corners = scoreFromId(id, 6, 14);
  const market =
    confidence > 88
      ? "Mais de 1.5 gols"
      : confidence > 76
        ? "Ambas marcam"
        : "Mais de 2.5 gols";
  const risk = confidence > 86 ? "Baixo" : confidence > 74 ? "Médio" : "Alto";
  const homeTeam = item.teams?.home || {};
  const awayTeam = item.teams?.away || {};
  const league = item.league || {};

  return {
    id,
    league: league.name || "Liga não informada",
    leagueLogo: leagueLogo(league),
    home: homeTeam.name || "Mandante",
    away: awayTeam.name || "Visitante",
    homeLogo: teamLogo(homeTeam),
    awayLogo: teamLogo(awayTeam),
    dateFormatted: fixtureDate.toLocaleDateString("pt-BR"),
    time: fixtureDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    stadium: item.fixture?.venue?.name || "Não informado",
    confidence,
    goalsAvg: goals,
    bttsRate: btts + "%",
    cornersAvg: corners,
    market,
    risk,
  };
}

async function loadMatches(forceDemo = false) {
  state.matches = await fetchMatches(forceDemo || state.isDemo);
  renderAll();
}

function filtered() {
  const q = state.search.toLowerCase().trim();
  if (!q) return state.matches;
  return state.matches.filter((m) =>
    [m.home, m.away, m.league, m.market].some((v) =>
      String(v).toLowerCase().includes(q),
    ),
  );
}

function bestMatch(list) {
  return [...list].sort((a, b) => b.confidence - a.confidence)[0];
}

function renderAll() {
  const list = filtered();
  renderStats(list);
  renderFeatured(list);
  renderMatchesGrid("matchesGrid", list.slice(0, 12));
  renderMatchesGrid("matchesFullGrid", list);
  renderTrends(list);
  renderFavorites();
}

function renderStats(list) {
  $("matchesCount") && ($("matchesCount").textContent = list.length);

  const best = list.length ? Math.max(...list.map((m) => m.confidence)) : 0;
  $("bestConfidence") && ($("bestConfidence").textContent = best + "%");

  const avg = list.length
    ? (list.reduce((s, m) => s + Number(m.goalsAvg), 0) / list.length).toFixed(
        1,
      )
    : "0.0";
  $("goalsAverage") && ($("goalsAverage").textContent = avg);
}

function renderFeatured(list) {
  const m = bestMatch(list);

  if (!m) {
    $("featuredTitle").textContent = "Nenhuma partida encontrada";
    $("featuredDescription").textContent = "Tente outro filtro.";
    $("featuredConfidence").textContent = "0%";
    return;
  }

  $("featuredTitle").textContent = `${m.home} x ${m.away}`;
  $("featuredDescription").innerHTML =
    `<span class="featured-teams">${logoHtml(m.homeLogo, m.home)} <span>${m.league} • ${m.dateFormatted} • ${m.time} • ${m.market} • Risco ${m.risk}</span> ${logoHtml(m.awayLogo, m.away)}</span>`;
  $("featuredConfidence").textContent = m.confidence + "%";
}

function renderMatchesGrid(id, list) {
  const el = $(id);
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<div class="empty glass">Nenhuma partida disponível.</div>';
    return;
  }

  el.innerHTML = list.map(matchCard).join("");
}

function matchCard(m) {
  const saved = state.favorites.includes(m.id);

  return `<article class="match-card glass">
    <div class="match-meta">
      <span class="league-pill">${m.leagueLogo ? `<img src="${m.leagueLogo}" alt="${m.league}" loading="lazy" />` : ""}${m.league}</span>
      <strong>${m.dateFormatted} • ${m.time}</strong>
    </div>

    <div class="scoreboard-row">
      <div class="team-box">
        ${logoHtml(m.homeLogo, m.home)}
        <strong>${m.home}</strong>
      </div>
      <div class="versus-box">
        <span>VS</span>
        <small>Análise</small>
      </div>
      <div class="team-box">
        ${logoHtml(m.awayLogo, m.away)}
        <strong>${m.away}</strong>
      </div>
    </div>

    <p><strong>Estádio:</strong> ${m.stadium}</p>
    <p><strong>Mercado sugerido:</strong> ${m.market}</p>

    <div class="match-stats">
      <span>Confiança: ${m.confidence}%</span>
      <span>Risco: ${m.risk}</span>
      <span>Gols: ${m.goalsAvg}</span>
      <span>BTTS: ${m.bttsRate}</span>
      <span>Escanteios: ${m.cornersAvg}</span>
      <span>Status: Analisado</span>
    </div>

    <div class="match-actions">
      <button class="mini-btn ${saved ? "saved" : ""}" onclick="toggleFavorite(${m.id})">${saved ? "Salvo" : "Favoritar"}</button>
      <button class="mini-btn" onclick="openAnalysis(${m.id})">Ver análise</button>
      <button class="mini-btn" onclick="copyAnalysis(${m.id})">Copiar análise</button>
    </div>
  </article>`;
}

function renderTrends(list) {
  const el = $("trendsGrid");
  if (!el) return;

  const total = list.length || 1;
  const over = list.filter(
    (m) => m.market.includes("1.5") || m.market.includes("2.5"),
  ).length;
  const btts = list.filter((m) => m.market.includes("Ambas")).length;
  const low = list.filter((m) => m.risk === "Baixo").length;

  el.innerHTML = [
    ["Over gols", over, "Jogos com mercado de gols forte"],
    ["Ambas marcam", btts, "Jogos com tendência BTTS"],
    ["Risco baixo", low, "Jogos mais seguros do filtro"],
  ]
    .map(
      ([t, n, d]) =>
        `<article class="trend-card glass"><span>${t}</span><strong>${n}</strong><p>${d}</p><small>${Math.round((n / total) * 100)}% do filtro</small></article>`,
    )
    .join("");
}

function renderFavorites() {
  const list = state.matches.filter((m) => state.favorites.includes(m.id));
  renderMatchesGrid("favoritesGrid", list);
}

window.toggleFavorite = function (id) {
  state.favorites = state.favorites.includes(id)
    ? state.favorites.filter((x) => x !== id)
    : [...state.favorites, id];
  localStorage.setItem("bv_favorites", JSON.stringify(state.favorites));
  renderAll();
};

window.copyAnalysis = function (id) {
  const m = state.matches.find((x) => x.id === id);
  if (!m) return;

  const text = `${m.home} x ${m.away}
Data: ${m.dateFormatted}
Horário: ${m.time}
Liga: ${m.league}
Mercado: ${m.market}
Confiança: ${m.confidence}%
Risco: ${m.risk}
Gols: ${m.goalsAvg}
BTTS: ${m.bttsRate}`;

  navigator.clipboard?.writeText(text);
  toast("Análise copiada");
};

window.openAnalysis = function (id) {
  const m = state.matches.find((x) => x.id === id);
  if (!m) return;

  const el = $("analysisContent");
  if (!el) return;

  const edge =
    m.confidence >= 88
      ? "Alta oportunidade"
      : m.confidence >= 76
        ? "Oportunidade moderada"
        : "Entrar com cautela";
  const advice =
    m.risk === "Baixo"
      ? "Boa opção para compor múltiplas com stake menor."
      : m.risk === "Médio"
        ? "Melhor para entrada simples ou análise complementar antes de apostar."
        : "Evite exposição alta; use apenas se houver confirmação de escalação e contexto.";

  el.innerHTML = `
    <span class="eyebrow">ANÁLISE DA PARTIDA</span>
    <h2>${m.home} x ${m.away}</h2>

    <div class="analysis-teams">
      <div>${logoHtml(m.homeLogo, m.home)}<strong>${m.home}</strong></div>
      <span>VS</span>
      <div>${logoHtml(m.awayLogo, m.away)}<strong>${m.away}</strong></div>
    </div>

    <p class="muted">${m.league} • ${m.dateFormatted} • ${m.time} • ${m.stadium}</p>

    <div class="analysis-grid">
      <div><strong>Mercado sugerido</strong><span>${m.market}</span></div>
      <div><strong>Confiança</strong><span>${m.confidence}%</span></div>
      <div><strong>Risco</strong><span>${m.risk}</span></div>
      <div><strong>Média de gols</strong><span>${m.goalsAvg}</span></div>
      <div><strong>BTTS</strong><span>${m.bttsRate}</span></div>
      <div><strong>Escanteios</strong><span>${m.cornersAvg}</span></div>
    </div>

    <h3>Leitura do jogo</h3>
    <p>${edge}. O painel encontrou tendência para <strong>${m.market}</strong>, com risco <strong>${m.risk}</strong> e confiança estimada em <strong>${m.confidence}%</strong>.</p>

    <h3>Sugestão de uso</h3>
    <p>${advice}</p>

    <p class="muted small">Aviso: análise estatística/automatizada para apoio. Não garante resultado.</p>
  `;

  $("analysisModal")?.classList.remove("hidden");
};

function setupEvents() {
  $("loginForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    login($("email").value, $("password").value);
  });

  $("demoLogin")?.addEventListener("click", demoLogin);
  $("logoutBtn")?.addEventListener("click", logout);
  $("refreshBtn")?.addEventListener("click", () => loadMatches());

  $("clearFavorites")?.addEventListener("click", () => {
    state.favorites = [];
    localStorage.removeItem("bv_favorites");
    renderAll();
  });

  $("closeAnalysis")?.addEventListener("click", () =>
    $("analysisModal")?.classList.add("hidden"),
  );

  $("analysisModal")?.addEventListener("click", (e) => {
    if (e.target.id === "analysisModal")
      $("analysisModal")?.classList.add("hidden");
  });

  [$("searchInput"), $("matchesSearch")].forEach((input) =>
    input?.addEventListener("input", (e) => {
      state.search = e.target.value;
      if ($("searchInput")) $("searchInput").value = state.search;
      if ($("matchesSearch")) $("matchesSearch").value = state.search;
      renderAll();
    }),
  );

  document.querySelectorAll(".chip[data-filter]").forEach((btn) =>
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".chip[data-filter]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.filter = btn.dataset.filter;
      loadMatches();
    }),
  );

  document.querySelectorAll(".nav-item").forEach((btn) =>
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-item")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document
        .querySelectorAll(".section")
        .forEach((s) => s.classList.remove("active"));
      $(btn.dataset.section)?.classList.add("active");
      $("pageTitle").textContent = btn.textContent;
    }),
  );
}

window.onload = async () => {
  setupEvents();

  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
      setMode("Usuário autenticado", "Login real ativo");
      setScreen("app");
      await loadMatches();
      return;
    }
  }

  setScreen("login");
};
