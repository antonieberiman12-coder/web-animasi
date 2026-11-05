// OtakuStream Ad-Free Mobile & Web Client
const API_BASE = '/api';

// Special link for Fumetsu no Anata e requested by user
const FNA_URL = 'https://otakudesu.blog/anime/fna-sub-indo/';

// State
let currentAnime = null;
let currentEpisodes = [];
let currentEpIndex = -1;
let currentEpisodeUrl = '';

// Watched episodes tracker in localStorage
const WATCHED_KEY = 'otakustream_watched_episodes';
function getWatchedEpisodes() {
  try {
    return JSON.parse(localStorage.getItem(WATCHED_KEY) || '[]');
  } catch (e) {
    return [];
  }
}
function markEpisodeWatched(url) {
  const watched = getWatchedEpisodes();
  if (!watched.includes(url)) {
    watched.push(url);
    localStorage.setItem(WATCHED_KEY, JSON.stringify(watched));
  }
}

// Elements
const homeView = document.getElementById('home-view');
const detailView = document.getElementById('detail-view');
const playerView = document.getElementById('player-view');

const ongoingGrid = document.getElementById('ongoing-grid');
const completedGrid = document.getElementById('completed-grid');
const searchGrid = document.getElementById('search-grid');
const searchResultsSection = document.getElementById('search-results-section');

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const btnToggleSearch = document.getElementById('btn-toggle-search');
const btnClearSearch = document.getElementById('btn-clear-search');
const btnCloseSearchResults = document.getElementById('btn-close-search-results');
const searchWrap = document.getElementById('search-wrap');

const detailContent = document.getElementById('detail-content');
const episodesGrid = document.getElementById('episodes-grid');
const epCount = document.getElementById('ep-count');
const btnDetailBack = document.getElementById('btn-detail-back');

const playerEpTitle = document.getElementById('player-ep-title');
const videoLoader = document.getElementById('video-loader');
const nativeVideo = document.getElementById('native-video');
const sandboxedIframe = document.getElementById('sandboxed-iframe');
const mirrorList = document.getElementById('mirror-list');
const btnPrevEp = document.getElementById('btn-prev-ep');
const btnNextEp = document.getElementById('btn-next-ep');
const btnPlayerBack = document.getElementById('btn-player-back');

const btnBrand = document.getElementById('btn-brand');
const btnPlayFna = document.getElementById('btn-play-fna');
const btnListFna = document.getElementById('btn-list-fna');
const toastEl = document.getElementById('toast');

// Toast Notification
function showToast(message, duration = 3000) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, duration);
}

// Navigation between views
function showView(view) {
  // Pause any playing native video
  if (view !== 'player' && nativeVideo) {
    nativeVideo.pause();
    nativeVideo.src = '';
  }
  if (view !== 'player' && sandboxedIframe) {
    sandboxedIframe.src = 'about:blank';
  }

  homeView.classList.toggle('hidden', view !== 'home');
  detailView.classList.toggle('hidden', view !== 'detail');
  playerView.classList.toggle('hidden', view !== 'player');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 1. Fetch & Render Home Page
async function loadHome() {
  try {
    const res = await fetch(`${API_BASE}/home`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    renderAnimeCards(json.data.ongoing, ongoingGrid, 'Ongoing');
    renderAnimeCards(json.data.completed, completedGrid, 'Tamat');
  } catch (err) {
    console.error('Error loading home:', err);
    ongoingGrid.innerHTML = `<p class="error-text">Gagal memuat anime ongoing. Sentuh brand untuk coba lagi.</p>`;
    completedGrid.innerHTML = `<p class="error-text">Gagal memuat anime tamat.</p>`;
  }
}

function renderAnimeCards(items, container, defaultBadge) {
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="empty-text">Tidak ada data.</p>';
    return;
  }

  container.innerHTML = items.map(anime => `
    <div class="anime-card" data-url="${anime.link}">
      <div class="poster-wrap">
        <img src="${anime.thumb || 'https://via.placeholder.com/300x400'}" alt="${anime.title}" loading="lazy">
        <span class="poster-badge">${anime.episode || defaultBadge}</span>
        ${anime.rating ? `<span class="poster-rating">★ ${anime.rating}</span>` : ''}
      </div>
      <div class="card-info">
        <h3 class="card-title">${anime.title}</h3>
        <div class="card-meta">
          <span>${anime.date || ''}</span>
          ${anime.status ? `<span>${anime.status}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  // Attach click events
  container.querySelectorAll('.anime-card').forEach(card => {
    card.addEventListener('click', () => {
      const url = card.getAttribute('data-url');
      openAnimeDetail(url);
    });
  });
}

// 2. Search Anime
async function handleSearch(query) {
  if (!query || query.trim().length === 0) return;

  searchResultsSection.classList.remove('hidden');
  searchGrid.innerHTML = `
    <div class="grid-skeleton"></div>
    <div class="grid-skeleton"></div>
    <div class="grid-skeleton"></div>
  `;
  document.getElementById('search-title').textContent = `Mencari "${query}"...`;

  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    document.getElementById('search-title').textContent = `Hasil untuk "${query}" (${json.data.length})`;
    renderAnimeCards(json.data, searchGrid, 'Anime');

    // Scroll to search results
    searchResultsSection.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('Search error:', err);
    searchGrid.innerHTML = `<p class="error-text">Gagal mencari anime: ${err.message}</p>`;
  }
}

// 3. Open Anime Detail View
async function openAnimeDetail(url) {
  showView('detail');
  detailContent.innerHTML = `
    <div class="grid-skeleton" style="height: 280px; width: 100%;"></div>
    <div style="flex:1;">
      <div class="grid-skeleton" style="height: 30px; width: 80%; margin-bottom: 12px;"></div>
      <div class="grid-skeleton" style="height: 100px; width: 100%;"></div>
    </div>
  `;
  episodesGrid.innerHTML = `
    <div class="grid-skeleton" style="height: 50px;"></div>
    <div class="grid-skeleton" style="height: 50px;"></div>
    <div class="grid-skeleton" style="height: 50px;"></div>
  `;

  try {
    const res = await fetch(`${API_BASE}/anime?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    currentAnime = json.data;
    currentEpisodes = currentAnime.episodes || [];

    // Render Detail Header
    detailContent.innerHTML = `
      <img class="detail-poster" src="${currentAnime.poster || ''}" alt="${currentAnime.title}">
      <div class="detail-info">
        <h1>${currentAnime.title}</h1>
        ${currentAnime.japanese ? `<div class="detail-japanese">${currentAnime.japanese}</div>` : ''}
        <div class="detail-chips">
          ${currentAnime.score ? `<span class="chip highlight">★ Skor: ${currentAnime.score}</span>` : ''}
          ${currentAnime.status ? `<span class="chip">Status: ${currentAnime.status}</span>` : ''}
          ${currentAnime.totalEpisodes ? `<span class="chip">Total: ${currentAnime.totalEpisodes}</span>` : ''}
          ${currentAnime.type ? `<span class="chip">${currentAnime.type}</span>` : ''}
          ${(currentAnime.genres || []).map(g => `<span class="chip">${g}</span>`).join('')}
        </div>
        <p class="detail-synopsis">${currentAnime.synopsis || 'Tidak ada sinopsis.'}</p>
      </div>
    `;

    // Render Episodes
    epCount.textContent = currentEpisodes.length;
    const watched = getWatchedEpisodes();

    if (currentEpisodes.length === 0) {
      episodesGrid.innerHTML = '<p class="empty-text">Daftar episode belum tersedia.</p>';
      return;
    }

    episodesGrid.innerHTML = currentEpisodes.map((ep, idx) => {
      const isWatched = watched.includes(ep.link);
      // Clean short label: "Eps 1", "Eps 2", etc.
      let shortLabel = `Eps ${idx + 1}`;
      const epMatch = ep.title.match(/Episode\s+(\d+)/i);
      if (epMatch) {
        shortLabel = `Eps ${epMatch[1]}`;
      }

      return `
        <button class="ep-btn ${isWatched ? 'watched' : ''}" data-index="${idx}" data-url="${ep.link}">
          <span>${shortLabel}</span>
          ${isWatched ? '<small style="font-size:9px; color:var(--accent);">✓ Ditonton</small>' : ''}
        </button>
      `;
    }).join('');

    // Attach click events on episodes
    episodesGrid.querySelectorAll('.ep-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        playEpisodeByIndex(idx);
      });
    });

  } catch (err) {
    console.error('Error loading anime detail:', err);
    detailContent.innerHTML = `<p class="error-text">Gagal memuat detail anime: ${err.message}</p>`;
  }
}

// 4. Play Episode
async function playEpisodeByIndex(idx) {
  if (idx < 0 || idx >= currentEpisodes.length) return;

  currentEpIndex = idx;
  const ep = currentEpisodes[idx];
  currentEpisodeUrl = ep.link;

  showView('player');
  playerEpTitle.textContent = ep.title;
  videoLoader.classList.remove('hidden');
  nativeVideo.classList.add('hidden');
  sandboxedIframe.classList.add('hidden');
  mirrorList.innerHTML = '';

  // Update navigation buttons
  btnPrevEp.disabled = (idx === 0);
  btnNextEp.disabled = (idx === currentEpisodes.length - 1);

  // Mark as watched
  markEpisodeWatched(ep.link);

  try {
    const res = await fetch(`${API_BASE}/episode?url=${encodeURIComponent(ep.link)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const epData = json.data;
    playerEpTitle.textContent = epData.title || ep.title;

    // Render Mirrors / Qualities
    renderMirrors(epData.mirrors || [], epData.defaultIframe);

    // Setup Video Player: Prefer Direct Video MP4 via Video-Stream Proxy
    if (epData.directVideo) {
      playNativeStream(epData.directVideo);
    } else if (epData.defaultIframe) {
      playSandboxedIframe(epData.defaultIframe);
    } else {
      videoLoader.innerHTML = '<span style="color:var(--danger)">Video stream tidak ditemukan pada episode ini.</span>';
    }

  } catch (err) {
    console.error('Error playing episode:', err);
    videoLoader.innerHTML = `<span style="color:var(--danger)">Gagal memutar episode: ${err.message}</span>`;
  }
}

function playNativeStream(rawVideoUrl) {
  videoLoader.classList.add('hidden');
  sandboxedIframe.classList.add('hidden');
  nativeVideo.classList.remove('hidden');

  const proxyUrl = `${API_BASE}/video-stream?url=${encodeURIComponent(rawVideoUrl)}`;
  nativeVideo.src = proxyUrl;
  nativeVideo.load();
  nativeVideo.play().catch(e => {
    console.log('Auto-play prevented by browser, waiting for user tap:', e);
  });
  showToast('▶ Memutar video via Native HTML5 (Bebas Iklan)');
}

function playSandboxedIframe(iframeSrc) {
  videoLoader.classList.add('hidden');
  nativeVideo.classList.add('hidden');
  nativeVideo.src = '';
  sandboxedIframe.classList.remove('hidden');

  // Load through player-embed proxy to strip CSP & neutralize redirect scripts
  const proxyEmbedUrl = `${API_BASE}/player-embed?url=${encodeURIComponent(iframeSrc)}`;
  sandboxedIframe.src = proxyEmbedUrl;
  showToast('🛡️ Memutar via Sandboxed Embed (Anti-Redirect)');
}

function renderMirrors(mirrors, defaultIframe) {
  mirrorList.innerHTML = '';

  // Button for Default Server
  const defaultBtn = document.createElement('button');
  defaultBtn.className = 'chip-server active';
  defaultBtn.textContent = 'Default (Auto HD)';
  defaultBtn.addEventListener('click', () => {
    document.querySelectorAll('.chip-server').forEach(b => b.classList.remove('active'));
    defaultBtn.classList.add('active');
    videoLoader.classList.remove('hidden');
    playEpisodeByIndex(currentEpIndex);
  });
  mirrorList.appendChild(defaultBtn);

  // Buttons for other mirrors
  mirrors.forEach(mirror => {
    const btn = document.createElement('button');
    btn.className = 'chip-server';
    btn.textContent = mirror.name;
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.chip-server').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      videoLoader.classList.remove('hidden');

      try {
        const res = await fetch(`${API_BASE}/mirror?url=${encodeURIComponent(currentEpisodeUrl)}&content=${encodeURIComponent(mirror.dataContent)}`);
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.directVideo) {
            playNativeStream(json.data.directVideo);
          } else if (json.data.iframeSrc) {
            playSandboxedIframe(json.data.iframeSrc);
          }
        }
      } catch (err) {
        showToast('Gagal memuat mirror: ' + err.message);
        videoLoader.classList.add('hidden');
      }
    });
    mirrorList.appendChild(btn);
  });
}

// Event Listeners
btnBrand.addEventListener('click', () => {
  showView('home');
});

btnDetailBack.addEventListener('click', () => {
  showView('home');
});

btnPlayerBack.addEventListener('click', () => {
  if (currentAnime) {
    showView('detail');
  } else {
    showView('home');
  }
});

btnPrevEp.addEventListener('click', () => {
  if (currentEpIndex > 0) {
    playEpisodeByIndex(currentEpIndex - 1);
  }
});

btnNextEp.addEventListener('click', () => {
  if (currentEpIndex < currentEpisodes.length - 1) {
    playEpisodeByIndex(currentEpIndex + 1);
  }
});

// Search bar toggle & submit
btnToggleSearch.addEventListener('click', () => {
  searchWrap.classList.toggle('hidden');
  if (!searchWrap.classList.contains('hidden')) {
    searchInput.focus();
  }
});

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (q) {
    handleSearch(q);
  }
});

searchInput.addEventListener('input', () => {
  btnClearSearch.classList.toggle('hidden', searchInput.value.length === 0);
});

btnClearSearch.addEventListener('click', () => {
  searchInput.value = '';
  btnClearSearch.classList.add('hidden');
  searchInput.focus();
});

btnCloseSearchResults.addEventListener('click', () => {
  searchResultsSection.classList.add('hidden');
});

// Shortcut buttons for Fumetsu no Anata e
btnPlayFna.addEventListener('click', async () => {
  showToast('Menyiapkan Fumetsu no Anata e Episode 1...');
  await openAnimeDetail(FNA_URL);
  if (currentEpisodes.length > 0) {
    playEpisodeByIndex(0); // Episode 1
  }
});

btnListFna.addEventListener('click', () => {
  showToast('Membuka Daftar 20 Episode...');
  openAnimeDetail(FNA_URL);
});

// Initial boot
loadHome();
