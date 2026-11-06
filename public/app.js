// OtakuStream Ad-Free Mobile & Web Client
const API_BASE = '/api';

// Special link for Fumetsu no Anata e requested by user
const FNA_URL = 'https://otakudesu.blog/anime/fna-sub-indo/';

// State
let currentAnime = null;
let currentEpisodes = [];
let currentEpIndex = -1;
let currentEpisodeUrl = '';
let currentView = 'home';
let previousView = 'home';

// Catalog State
let allAnimeGroups = [];
let allAnimeTotal = 0;
let isCatalogLoaded = false;
let activeFilterLetter = 'ALL';

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

// XSS Sanitizer for scraped text (Jailbreak / Boundary Defense)
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Elements
const homeView = document.getElementById('home-view');
const allAnimeView = document.getElementById('all-anime-view');
const listingView = document.getElementById('listing-view');
const detailView = document.getElementById('detail-view');
const playerView = document.getElementById('player-view');

const navBtnHome = document.getElementById('nav-btn-home');
const navBtnOngoing = document.getElementById('nav-btn-ongoing');
const navBtnCompleted = document.getElementById('nav-btn-completed');
const navBtnAll = document.getElementById('nav-btn-all');

const mobNavHome = document.getElementById('mob-nav-home');
const mobNavOngoing = document.getElementById('mob-nav-ongoing');
const mobNavCompleted = document.getElementById('mob-nav-completed');
const mobNavAll = document.getElementById('mob-nav-all');
const mobNavSearch = document.getElementById('mob-nav-search');

const listingBadge = document.getElementById('listing-badge');
const listingTitle = document.getElementById('listing-title');
const listingDesc = document.getElementById('listing-desc');
const listingGrid = document.getElementById('listing-grid');
const listingLoadMoreWrap = document.getElementById('listing-load-more-wrap');
const btnLoadMore = document.getElementById('btn-load-more');
const nextPageLabel = document.getElementById('next-page-label');
const btnRefreshListing = document.getElementById('btn-refresh-listing');

const btnSeeAllOngoing = document.getElementById('btn-see-all-ongoing');
const btnSeeAllCompleted = document.getElementById('btn-see-all-completed');
const headerOngoingClick = document.getElementById('header-ongoing-click');
const headerCompletedClick = document.getElementById('header-completed-click');

// Listing state
let currentListingType = 'ongoing'; // 'ongoing' | 'completed'
let listingCurrentPage = 1;
let listingMaxPage = 1;
let listingItems = [];
let isLoadingMore = false;

const catalogContent = document.getElementById('catalog-content');
const alphabetNav = document.getElementById('alphabet-nav');
const catalogFilterInput = document.getElementById('catalog-filter-input');
const btnClearCatalogFilter = document.getElementById('btn-clear-catalog-filter');
const btnRefreshCatalog = document.getElementById('btn-refresh-catalog');
const catalogTotalText = document.getElementById('catalog-total-text');
const headerCatalogBadge = document.getElementById('header-catalog-badge');

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
  if (view !== 'detail' && view !== 'player') {
    previousView = view;
  }
  currentView = view;

  // Pause any playing native video
  if (view !== 'player' && nativeVideo) {
    nativeVideo.pause();
    nativeVideo.src = '';
  }
  if (view !== 'player' && sandboxedIframe) {
    sandboxedIframe.src = 'about:blank';
  }

  homeView.classList.toggle('hidden', view !== 'home');
  allAnimeView.classList.toggle('hidden', view !== 'all-anime');
  listingView.classList.toggle('hidden', view !== 'listing');
  detailView.classList.toggle('hidden', view !== 'detail');
  playerView.classList.toggle('hidden', view !== 'player');

  // Sync tab active states
  const isOngoingTab = (view === 'listing' && currentListingType === 'ongoing');
  const isCompletedTab = (view === 'listing' && currentListingType === 'completed');

  if (navBtnHome) navBtnHome.classList.toggle('active', view === 'home');
  if (navBtnOngoing) navBtnOngoing.classList.toggle('active', isOngoingTab);
  if (navBtnCompleted) navBtnCompleted.classList.toggle('active', isCompletedTab);
  if (navBtnAll) navBtnAll.classList.toggle('active', view === 'all-anime');

  if (mobNavHome) mobNavHome.classList.toggle('active', view === 'home');
  if (mobNavOngoing) mobNavOngoing.classList.toggle('active', isOngoingTab);
  if (mobNavCompleted) mobNavCompleted.classList.toggle('active', isCompletedTab);
  if (mobNavAll) mobNavAll.classList.toggle('active', view === 'all-anime');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 1c. Open Listing View (Ongoing / Completed)
function openListingView(type, page = 1) {
  currentListingType = type;
  showView('listing');

  if (type === 'ongoing') {
    listingBadge.textContent = '⚡ Anime Sedang Tayang';
    listingTitle.textContent = 'Seluruh Anime Ongoing';
    listingDesc.textContent = 'Daftar lengkap seluruh anime yang sedang aktif tayang dan rilis episode terbaru tiap minggu di Otakudesu.';
  } else {
    listingBadge.textContent = '🏁 Anime Selesai Tayang';
    listingTitle.textContent = 'Seluruh Anime Tamat (Completed)';
    listingDesc.textContent = 'Koleksi lengkap seluruh anime yang sudah tamat dari season awal hingga akhir di Otakudesu.';
  }

  fetchListing(type, page, false);
}

async function fetchListing(type, page = 1, append = false) {
  if (isLoadingMore) return;
  isLoadingMore = true;

  if (btnLoadMore) {
    btnLoadMore.disabled = true;
    btnLoadMore.innerHTML = `<span>Memuat halaman ${page}...</span>`;
  }

  if (!append) {
    listingGrid.innerHTML = `
      <div class="grid-skeleton"></div>
      <div class="grid-skeleton"></div>
      <div class="grid-skeleton"></div>
      <div class="grid-skeleton"></div>
    `;
    listingItems = [];
    listingLoadMoreWrap.classList.add('hidden');
  }

  try {
    const res = await fetch(`${API_BASE}/${type}?page=${page}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    listingCurrentPage = json.data.currentPage;
    listingMaxPage = json.data.maxPage;

    if (append) {
      listingItems.push(...(json.data.animeList || []));
    } else {
      listingItems = json.data.animeList || [];
    }

    renderAnimeCards(listingItems, listingGrid, type === 'ongoing' ? 'Ongoing' : 'Tamat');

    // Handle Load More
    if (json.data.hasNextPage) {
      listingLoadMoreWrap.classList.remove('hidden');
      if (btnLoadMore) {
        btnLoadMore.disabled = false;
        btnLoadMore.innerHTML = `▼ Muat Halaman Berikutnya (Halaman ${listingCurrentPage + 1} dari ${listingMaxPage})`;
      }
    } else {
      listingLoadMoreWrap.classList.add('hidden');
      showToast(`Sudah menampilkan seluruh anime ${type === 'ongoing' ? 'ongoing' : 'tamat'} (Total ${listingItems.length} anime)`);
    }

  } catch (err) {
    console.error('Error fetching listing:', err);
    if (!append) {
      listingGrid.innerHTML = `<p class="error-text">Gagal memuat anime: ${err.message}</p>`;
    } else {
      showToast('Gagal memuat halaman berikutnya: ' + err.message);
    }
    if (btnLoadMore) {
      btnLoadMore.disabled = false;
      btnLoadMore.textContent = 'Coba Lagi';
    }
  } finally {
    isLoadingMore = false;
  }
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

// 1b. Fetch & Render All Anime (A-Z Catalog ~1.900+ Titles)
async function loadAllAnime(forceRefresh = false) {
  if (isCatalogLoaded && !forceRefresh) {
    renderAlphabetBar();
    renderCatalogContent(allAnimeGroups, catalogFilterInput ? catalogFilterInput.value.trim() : '');
    return;
  }

  catalogContent.innerHTML = `
    <div class="catalog-loader">
      <div class="spinner"></div>
      <span>Mengambil seluruh 1.900+ koleksi anime dari Otakudesu...</span>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/anime-list`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    allAnimeGroups = json.data.groups || [];
    allAnimeTotal = json.data.totalCount || 0;
    isCatalogLoaded = true;

    // Update Badges
    if (catalogTotalText) {
      catalogTotalText.textContent = `${allAnimeTotal.toLocaleString('id-ID')} Judul`;
    }
    if (headerCatalogBadge) {
      headerCatalogBadge.textContent = `${allAnimeTotal.toLocaleString('id-ID')}`;
    }

    renderAlphabetBar();
    renderCatalogContent(allAnimeGroups, catalogFilterInput ? catalogFilterInput.value.trim() : '');
  } catch (err) {
    console.error('Error loading all anime list:', err);
    catalogContent.innerHTML = `
      <div class="catalog-loader" style="color:var(--danger)">
        <p>Gagal memuat katalog anime: ${err.message}</p>
        <button class="btn-primary" id="btn-retry-catalog" style="margin-top:12px;">Coba Muat Ulang</button>
      </div>
    `;
    const btnRetry = document.getElementById('btn-retry-catalog');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => loadAllAnime(true));
    }
  }
}

function renderAlphabetBar() {
  if (!alphabetNav) return;
  const letters = allAnimeGroups.map(g => g.letter);

  let html = `<button class="alpha-chip ${activeFilterLetter === 'ALL' ? 'active' : ''}" data-letter="ALL" type="button">Semua</button>`;
  letters.forEach(letter => {
    const isActive = (activeFilterLetter === letter);
    html += `<button class="alpha-chip ${isActive ? 'active' : ''}" data-letter="${letter}" type="button">${letter}</button>`;
  });

  alphabetNav.innerHTML = html;

  alphabetNav.querySelectorAll('.alpha-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const letter = btn.getAttribute('data-letter');
      activeFilterLetter = letter;

      alphabetNav.querySelectorAll('.alpha-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (letter === 'ALL') {
        renderCatalogContent(allAnimeGroups, catalogFilterInput.value.trim());
      } else {
        const filtered = allAnimeGroups.filter(g => g.letter === letter);
        renderCatalogContent(filtered, catalogFilterInput.value.trim());
        const groupEl = document.getElementById(`group-${letter}`);
        if (groupEl) {
          groupEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

function renderCatalogContent(groups, keyword = '') {
  if (!catalogContent) return;

  if (!groups || groups.length === 0) {
    catalogContent.innerHTML = `
      <div class="catalog-loader">
        <p>Tidak ada data anime dalam katalog.</p>
      </div>
    `;
    return;
  }

  const cleanKeyword = (keyword || '').toLowerCase().trim();
  let html = '';
  let matchCount = 0;

  groups.forEach(group => {
    let items = group.items || [];
    if (cleanKeyword) {
      items = items.filter(item => item.title.toLowerCase().includes(cleanKeyword));
    }

    if (items.length > 0) {
      matchCount += items.length;
      html += `
        <div class="catalog-group" id="group-${group.letter}">
          <div class="group-header">
            <div class="group-title-wrap">
              <span class="group-badge">${group.letter}</span>
              <span class="group-title">Daftar Anime Huruf ${group.letter}</span>
            </div>
            <span class="group-count">${items.length} Anime</span>
          </div>
          <div class="group-anime-list">
            ${items.map(item => `
              <a class="catalog-item" data-url="${escapeHtml(item.link)}" href="javascript:void(0);" title="${escapeHtml(item.title)}">
                <span class="catalog-bullet">▶</span>
                <span class="catalog-text">${escapeHtml(item.title)}</span>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }
  });

  if (cleanKeyword && matchCount === 0) {
    catalogContent.innerHTML = `
      <div class="catalog-loader">
        <p>Tidak ditemukan anime dengan kata kunci "<strong>${escapeHtml(keyword)}</strong>".</p>
      </div>
    `;
    return;
  }

  catalogContent.innerHTML = html;

  // Attach click listener to open anime detail
  catalogContent.querySelectorAll('.catalog-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const url = item.getAttribute('data-url');
      if (url) {
        openAnimeDetail(url);
      }
    });
  });
}

function renderAnimeCards(items, container, defaultBadge) {
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="empty-text">Tidak ada data.</p>';
    return;
  }

  container.innerHTML = items.map(anime => `
    <div class="anime-card" data-url="${escapeHtml(anime.link)}">
      <div class="poster-wrap">
        <img src="${escapeHtml(anime.thumb) || 'https://via.placeholder.com/300x400'}" alt="${escapeHtml(anime.title)}" loading="lazy">
        <span class="poster-badge">${escapeHtml(anime.episode || defaultBadge)}</span>
        ${anime.rating ? `<span class="poster-rating">★ ${escapeHtml(anime.rating)}</span>` : ''}
      </div>
      <div class="card-info">
        <h3 class="card-title">${escapeHtml(anime.title)}</h3>
        <div class="card-meta">
          <span>${escapeHtml(anime.date || '')}</span>
          ${anime.status ? `<span>${escapeHtml(anime.status)}</span>` : ''}
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
  
  // Resilient fallback: If proxy fails or times out in cloud, try direct video URL
  nativeVideo.onerror = () => {
    if (nativeVideo.src !== rawVideoUrl) {
      console.warn('Proxy video stream gagal, mencoba koneksi langsung ke sumber video...');
      nativeVideo.src = rawVideoUrl;
      nativeVideo.load();
      nativeVideo.play().catch(e => {
        console.log('Direct playback waiting for user click:', e);
      });
    }
  };

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

// Top Nav Tabs
if (navBtnHome) {
  navBtnHome.addEventListener('click', () => {
    showView('home');
  });
}
if (navBtnOngoing) {
  navBtnOngoing.addEventListener('click', () => {
    openListingView('ongoing');
  });
}
if (navBtnCompleted) {
  navBtnCompleted.addEventListener('click', () => {
    openListingView('completed');
  });
}
if (navBtnAll) {
  navBtnAll.addEventListener('click', () => {
    showView('all-anime');
    loadAllAnime();
  });
}

// Mobile Bottom Nav Tabs
if (mobNavHome) {
  mobNavHome.addEventListener('click', () => {
    showView('home');
  });
}
if (mobNavOngoing) {
  mobNavOngoing.addEventListener('click', () => {
    openListingView('ongoing');
  });
}
if (mobNavCompleted) {
  mobNavCompleted.addEventListener('click', () => {
    openListingView('completed');
  });
}
if (mobNavAll) {
  mobNavAll.addEventListener('click', () => {
    showView('all-anime');
    loadAllAnime();
  });
}

// Section Headers Click & "Lihat Semua" triggers
if (btnSeeAllOngoing) {
  btnSeeAllOngoing.addEventListener('click', () => {
    openListingView('ongoing');
  });
}
if (headerOngoingClick) {
  headerOngoingClick.addEventListener('click', () => {
    openListingView('ongoing');
  });
}

if (btnSeeAllCompleted) {
  btnSeeAllCompleted.addEventListener('click', () => {
    openListingView('completed');
  });
}
if (headerCompletedClick) {
  headerCompletedClick.addEventListener('click', () => {
    openListingView('completed');
  });
}

// Listing Load More & Refresh
if (btnLoadMore) {
  btnLoadMore.addEventListener('click', () => {
    if (listingCurrentPage < listingMaxPage) {
      fetchListing(currentListingType, listingCurrentPage + 1, true);
    }
  });
}

if (btnRefreshListing) {
  btnRefreshListing.addEventListener('click', () => {
    showToast(`Memuat ulang seluruh anime ${currentListingType}...`);
    openListingView(currentListingType, 1);
  });
}
if (mobNavSearch) {
  mobNavSearch.addEventListener('click', () => {
    searchWrap.classList.remove('hidden');
    searchInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Catalog Filter Input & Refresh
if (btnRefreshCatalog) {
  btnRefreshCatalog.addEventListener('click', () => {
    showToast('Memuat ulang seluruh daftar anime...');
    loadAllAnime(true);
  });
}

if (catalogFilterInput) {
  catalogFilterInput.addEventListener('input', () => {
    const kw = catalogFilterInput.value.trim();
    if (btnClearCatalogFilter) {
      btnClearCatalogFilter.classList.toggle('hidden', kw.length === 0);
    }
    const currentGroups = (activeFilterLetter === 'ALL')
      ? allAnimeGroups
      : allAnimeGroups.filter(g => g.letter === activeFilterLetter);
    renderCatalogContent(currentGroups, kw);
  });
}

if (btnClearCatalogFilter) {
  btnClearCatalogFilter.addEventListener('click', () => {
    catalogFilterInput.value = '';
    btnClearCatalogFilter.classList.add('hidden');
    const currentGroups = (activeFilterLetter === 'ALL')
      ? allAnimeGroups
      : allAnimeGroups.filter(g => g.letter === activeFilterLetter);
    renderCatalogContent(currentGroups, '');
    catalogFilterInput.focus();
  });
}

btnDetailBack.addEventListener('click', () => {
  showView(previousView || 'home');
});

btnPlayerBack.addEventListener('click', () => {
  if (currentAnime) {
    showView('detail');
  } else {
    showView(previousView || 'home');
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
