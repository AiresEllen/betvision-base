const demoMatches = [
  {
    period: 'today',
    league: 'Brasileirão Série A',
    market: 'BTTS Sim',
    home: 'Palmeiras',
    away: 'Flamengo',
    time: '19:30',
    stadium: 'Allianz Parque',
    trend: 'Confronto ofensivo com alta pressão dos dois lados.',
    confidence: 84,
    goalsAvg: 2.8,
    cornersAvg: 10.4,
    bttsRate: '71%'
  },
  {
    period: 'today',
    league: 'Champions League',
    market: 'Mais de 2.5 gols',
    home: 'Arsenal',
    away: 'Inter',
    time: '16:00',
    stadium: 'Emirates Stadium',
    trend: 'Jogo de transição forte e volume ofensivo acima da média.',
    confidence: 79,
    goalsAvg: 3.1,
    cornersAvg: 9.3,
    bttsRate: '68%'
  },
  {
    period: 'today',
    league: 'La Liga',
    market: 'Casa vence',
    home: 'Barcelona',
    away: 'Sevilla',
    time: '22:00',
    stadium: 'Olímpic Lluís Companys',
    trend: 'Mandante dominante e bom histórico recente em casa.',
    confidence: 76,
    goalsAvg: 2.6,
    cornersAvg: 8.8,
    bttsRate: '54%'
  },
  {
    period: 'tomorrow',
    league: 'Premier League',
    market: 'Mais de 8.5 escanteios',
    home: 'Liverpool',
    away: 'Tottenham',
    time: '17:15',
    stadium: 'Anfield',
    trend: 'Times acelerados, cruzamentos e pressão alta dos dois lados.',
    confidence: 82,
    goalsAvg: 3.0,
    cornersAvg: 11.2,
    bttsRate: '73%'
  },
  {
    period: 'tomorrow',
    league: 'Serie A Itália',
    market: 'Menos de 3.5 gols',
    home: 'Juventus',
    away: 'Milan',
    time: '15:45',
    stadium: 'Allianz Stadium',
    trend: 'Jogo grande com tendência de controle e menos exposição.',
    confidence: 74,
    goalsAvg: 2.2,
    cornersAvg: 8.1,
    bttsRate: '49%'
  },
  {
    period: 'week',
    league: 'Libertadores',
    market: 'Empate anula casa',
    home: 'São Paulo',
    away: 'River Plate',
    time: '21:30',
    stadium: 'MorumBIS',
    trend: 'Mandante consistente e encaixe defensivo mais seguro.',
    confidence: 78,
    goalsAvg: 2.4,
    cornersAvg: 9.1,
    bttsRate: '57%'
  },
  {
    period: 'week',
    league: 'Copa do Brasil',
    market: 'Mais de 1.5 gols',
    home: 'Atlético-MG',
    away: 'Athletico-PR',
    time: '20:00',
    stadium: 'Arena MRV',
    trend: 'Tendência de pelo menos dois gols pelo encaixe ofensivo.',
    confidence: 81,
    goalsAvg: 2.7,
    cornersAvg: 9.7,
    bttsRate: '66%'
  }
];

const state = {
  filter: 'today',
  search: ''
};

const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const demoLogin = document.getElementById('demoLogin');
const logoutBtn = document.getElementById('logoutBtn');
const matchesGrid = document.getElementById('matchesGrid');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('[data-filter]');

function isLoggedIn() {
  return localStorage.getItem('bv_logged') === 'true';
}

function setLoggedIn(value) {
  localStorage.setItem('bv_logged', value ? 'true' : 'false');
}

function showScreen(logged) {
  loginScreen.classList.toggle('active', !logged);
  dashboardScreen.classList.toggle('active', logged);
  if (logged) renderDashboard();
}

function getFilteredMatches() {
  return demoMatches.filter(match => {
    const filterOk = state.filter === 'week'
      ? ['today', 'tomorrow', 'week'].includes(match.period)
      : match.period === state.filter;

    const text = `${match.home} ${match.away} ${match.league} ${match.market}`.toLowerCase();
    const searchOk = text.includes(state.search.toLowerCase());
    return filterOk && searchOk;
  });
}

function renderStats(matches) {
  const count = matches.length;
  const best = matches.reduce((max, item) => Math.max(max, item.confidence), 0);
  const avgGoals = count
    ? (matches.reduce((sum, item) => sum + item.goalsAvg, 0) / count).toFixed(1)
    : '0.0';

  document.getElementById('matchesCount').textContent = count;
  document.getElementById('bestConfidence').textContent = `${best}%`;
  document.getElementById('goalsAverage').textContent = avgGoals;
}

function renderFeatured(matches) {
  const featured = [...matches].sort((a, b) => b.confidence - a.confidence)[0];

  if (!featured) {
    document.getElementById('featuredTitle').textContent = 'Nenhuma partida encontrada';
    document.getElementById('featuredDescription').textContent = 'Tente mudar o filtro ou pesquisar outro time.';
    document.getElementById('featuredConfidence').textContent = '0%';
    return;
  }

  document.getElementById('featuredTitle').textContent = `${featured.home} x ${featured.away}`;
  document.getElementById('featuredDescription').textContent = `${featured.trend} Mercado sugerido: ${featured.market}.`;
  document.getElementById('featuredConfidence').textContent = `${featured.confidence}%`;
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

  matchesGrid.innerHTML = matches.map(createMatchCard).join('');
}

function renderDashboard() {
  const matches = getFilteredMatches();
  renderStats(matches);
  renderFeatured(matches);
  renderMatches(matches);
}

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  setLoggedIn(true);
  showScreen(true);
});

demoLogin.addEventListener('click', () => {
  setLoggedIn(true);
  showScreen(true);
});

logoutBtn.addEventListener('click', () => {
  setLoggedIn(false);
  showScreen(false);
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    state.filter = button.dataset.filter;
    renderDashboard();
  });
});

searchInput.addEventListener('input', event => {
  state.search = event.target.value;
  renderDashboard();
});

showScreen(isLoggedIn());
