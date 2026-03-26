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
    period: "today",
    league: "La Liga",
    market: "Casa vence",
    home: "Barcelona",
    away: "Sevilla",
    time: "22:00",
    stadium: "Olímpic Lluís Companys",
    trend: "Mandante dominante e bom histórico recente em casa.",
    confidence: 76,
    goalsAvg: 2.6,
    cornersAvg: 8.8,
    bttsRate: "54%",
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
  {
    period: "tomorrow",
    league: "Serie A Itália",
    market: "Menos de 3.5 gols",
    home: "Juventus",
    away: "Milan",
    time: "15:45",
    stadium: "Allianz Stadium",
    trend: "Jogo grande com tendência de controle e menos exposição.",
    confidence: 74,
    goalsAvg: 2.2,
    cornersAvg: 8.1,
    bttsRate: "49%",
  },
  {
    period: "week",
    league: "Libertadores",
    market: "Empate anula casa",
    home: "São Paulo",
    away: "River Plate",
    time: "21:30",
    stadium: "MorumBIS",
    trend: "Mandante consistente e encaixe defensivo mais seguro.",
    confidence: 78,
    goalsAvg: 2.4,
    cornersAvg: 9.1,
    bttsRate: "57%",
  },
  {
    period: "week",
    league: "Copa do Brasil",
    market: "Mais de 1.5 gols",
    home: "Atlético-MG",
    away: "Athletico-PR",
    time: "20:00",
    stadium: "Arena MRV",
    trend: "Tendência de pelo menos dois gols pelo encaixe ofensivo.",
    confidence: 81,
    goalsAvg: 2.7,
    cornersAvg: 9.7,
    bttsRate: "66%",
  },
];

const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";

const sbClient =
  window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const state = {
  filter: "today",
  search: "",
  mode: "demo",
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
    modeLabel.textContent = "Supabase Live";
    modeCardLabel.textContent = "Supabase Live";
    modeCardDescription.textContent = "Login real conectado ao banco";
  } else {
    modeLabel.textContent = "Premium Demo";
    modeCardLabel.textContent = "Demo Premium";
    modeCardDescription.textContent = "Pronto para integrar API real";
  }
}

function showScreen(logged) {
  loginScreen.classList.toggle("active", !logged);
  dashboardScreen.classList.toggle("active", logged);

  if (logged) {
    renderDashboard();
  }
}

function getFilteredMatches() {
  return demoMatches.filter((match) => {
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

demoLogin.addEventListener("click", () => {
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
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
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
