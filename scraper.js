const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://otakudesu.blog';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Referer': BASE_URL + '/'
};

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: BROWSER_HEADERS
});

// Cache for home page & nonce
let cachedHome = null;
let homeExpiry = 0;
let cachedNonce = null;
let nonceExpiry = 0;

async function getNonce(refererUrl) {
  const now = Date.now();
  if (cachedNonce && now < nonceExpiry) {
    return cachedNonce;
  }

  try {
    const res = await client.get(refererUrl);
    const $ = cheerio.load(res.data);
    let scriptContent = '';
    $('script').each((i, el) => {
      const text = $(el).html();
      if (text && text.includes('admin-ajax.php')) {
        scriptContent = text;
      }
    });

    const actionMatches = scriptContent.match(/action:"([a-f0-9]{32})"/g);
    if (actionMatches && actionMatches.length >= 2) {
      const actionNonce = actionMatches[1].replace('action:', '').replace(/"/g, '');
      const actionMirror = actionMatches[0].replace('action:', '').replace(/"/g, '');

      const form = new URLSearchParams();
      form.append('action', actionNonce);

      const nonceRes = await client.post('/wp-admin/admin-ajax.php', form.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': refererUrl,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (nonceRes.data && nonceRes.data.data) {
        cachedNonce = {
          nonce: nonceRes.data.data,
          actionMirror
        };
        nonceExpiry = now + (10 * 60 * 1000); // 10 minutes cache
        return cachedNonce;
      }
    }
  } catch (err) {
    console.error('Error fetching nonce:', err.message);
  }
  return null;
}

// 1. Get Home Page (Ongoing & Latest Completed)
async function getHome() {
  const now = Date.now();
  if (cachedHome && now < homeExpiry) {
    return cachedHome;
  }

  const res = await client.get('/');
  const $ = cheerio.load(res.data);

  const ongoing = [];
  const completed = [];

  $('.venz').each((idx, section) => {
    const sectionTitle = $(section).find('h1, h2').text().toLowerCase();
    const isOngoing = sectionTitle.includes('on-going') || sectionTitle.includes('ongoing') || idx === 0;

    $(section).find('ul li').each((_, el) => {
      const title = $(el).find('h2.jdlflm').text().trim() || $(el).find('a').text().trim();
      const link = $(el).find('a').attr('href');
      const thumb = $(el).find('img').attr('src');
      const episode = $(el).find('.epz').text().trim();
      const date = $(el).find('.newnime').text().trim() || $(el).find('.epztipe').text().trim();

      if (title && link) {
        const item = { title, link, thumb, episode, date };
        if (isOngoing) {
          ongoing.push(item);
        } else {
          completed.push(item);
        }
      }
    });
  });

  if (ongoing.length > 0 || completed.length > 0) {
    cachedHome = { ongoing, completed };
    homeExpiry = now + (5 * 60 * 1000); // 5 minutes cache
  }

  return { ongoing, completed };
}

// 2. Search Anime
async function searchAnime(query) {
  const res = await client.get(`/?s=${encodeURIComponent(query)}&post_type=anime`);
  const $ = cheerio.load(res.data);
  const results = [];

  $('ul.chivsrc li').each((_, el) => {
    const title = $(el).find('h2 a').text().trim();
    const link = $(el).find('h2 a').attr('href');
    const thumb = $(el).find('img').attr('src');
    const genres = [];
    $(el).find('.set a').each((__, g) => genres.push($(g).text().trim()));
    const status = $(el).find('.set:contains("Status")').text().replace('Status :', '').trim();
    const rating = $(el).find('.set:contains("Rating")').text().replace('Rating :', '').trim();

    if (title && link) {
      results.push({ title, link, thumb, genres, status, rating });
    }
  });

  return results;
}

// 3. Anime Details
async function getAnimeDetail(url) {
  const res = await client.get(url);
  const $ = cheerio.load(res.data);

  const title = $('.infozingle p:contains("Judul")').text().replace('Judul:', '').trim() || $('h1.entry-title').text().trim() || $('h1').text().trim();
  const japanese = $('.infozingle p:contains("Japanese")').text().replace('Japanese:', '').trim();
  const score = $('.infozingle p:contains("Skor")').text().replace('Skor:', '').trim();
  const producer = $('.infozingle p:contains("Produser")').text().replace('Produser:', '').trim();
  const type = $('.infozingle p:contains("Tipe")').text().replace('Tipe:', '').trim();
  const status = $('.infozingle p:contains("Status")').text().replace('Status:', '').trim();
  const totalEpisodes = $('.infozingle p:contains("Total Episode")').text().replace('Total Episode:', '').trim();
  const duration = $('.infozingle p:contains("Durasi")').text().replace('Durasi:', '').trim();
  const releaseDate = $('.infozingle p:contains("Tanggal Rilis")').text().replace('Tanggal Rilis:', '').trim();
  const studio = $('.infozingle p:contains("Studio")').text().replace('Studio:', '').trim();
  const genres = [];
  $('.infozingle p:contains("Genre") a').each((_, g) => genres.push($(g).text().trim()));

  const synopsis = $('.sinopc').text().trim();
  const poster = $('.fotoanime img').attr('src');

  const episodes = [];
  $('.episodelist ul li').each((_, el) => {
    const epTitle = $(el).find('a').text().trim();
    const epLink = $(el).find('a').attr('href');
    const epDate = $(el).find('.zeebr').text().trim();
    if (epLink && epTitle && epLink.includes('/episode/')) {
      episodes.push({ title: epTitle, link: epLink, date: epDate });
    }
  });

  // Sort episodes logically (Otakudesu lists newest first; reverse so Ep 1 is first)
  const episodesAsc = [...episodes].reverse();

  return {
    title,
    japanese,
    score,
    producer,
    type,
    status,
    totalEpisodes,
    duration,
    releaseDate,
    studio,
    genres,
    synopsis,
    poster,
    episodes: episodesAsc
  };
}

// 4. Episode Details & Stream
async function getEpisodeDetail(url) {
  const res = await client.get(url);
  const $ = cheerio.load(res.data);

  const title = $('h1.posttl').text().trim() || $('title').text().trim();
  const defaultIframe = $('.responsive-embed-stream iframe').attr('src') || $('iframe').attr('src') || '';

  // Prev & Next navigation
  const prevEp = $('.flir a:contains("Previous"), .flir a:contains("Prev Episode")').attr('href') || null;
  const nextEp = $('.flir a:contains("Next"), .flir a:contains("Next Eps")').attr('href') || null;
  const allEp = $('.flir a:contains("See All"), .flir a:contains("All Episodes")').attr('href') || null;

  // Mirror qualities
  const mirrors = [];
  $('.mirrorstream ul li a, .mirrorstream a').each((_, el) => {
    const name = $(el).text().trim();
    const dataContent = $(el).attr('data-content');
    if (name && dataContent) {
      mirrors.push({
        name,
        dataContent
      });
    }
  });

  return {
    title,
    defaultIframe,
    prevEp,
    nextEp,
    allEp,
    mirrors
  };
}

// 5. Resolve Mirror Iframe URL
async function resolveMirror(url, dataContent) {
  const nonceData = await getNonce(url);
  if (!nonceData) {
    throw new Error('Failed to obtain nonce for mirror');
  }

  const payload = JSON.parse(Buffer.from(dataContent, 'base64').toString('utf8'));
  const form = new URLSearchParams();
  for (const k in payload) {
    form.append(k, payload[k]);
  }
  form.append('nonce', nonceData.nonce);
  form.append('action', nonceData.actionMirror);

  const res = await client.post('/wp-admin/admin-ajax.php', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Referer': url,
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  if (res.data && res.data.data) {
    const decodedHtml = Buffer.from(res.data.data, 'base64').toString('utf8');
    const $ = cheerio.load(decodedHtml);
    const iframeSrc = $('iframe').attr('src') || '';
    return { iframeSrc, rawHtml: decodedHtml };
  }

  throw new Error('No mirror data returned');
}

// 6. Extract Direct Video MP4 from Desustream / Stream URL
async function extractDirectVideo(iframeUrl) {
  if (!iframeUrl) return null;

  try {
    const res = await client.get(iframeUrl, {
      headers: {
        'Referer': BASE_URL + '/'
      }
    });

    // Check for direct <source src="..."> or video src
    const match = res.data.match(/<source[^>]+src="([^">]+)"/i) || res.data.match(/<video[^>]+src="([^">]+)"/i);
    if (match && match[1]) {
      return match[1].replace(/&amp;/g, '&');
    }
  } catch (err) {
    console.error('Error extracting direct video from iframe:', err.message);
  }
  return null;
}

// Cache for all anime list
let cachedAllAnime = null;
let allAnimeExpiry = 0;

// 7. Get All Anime List (A-Z) from /anime-list/
async function getAllAnimeList() {
  const now = Date.now();
  if (cachedAllAnime && now < allAnimeExpiry) {
    return cachedAllAnime;
  }

  const res = await client.get('/anime-list/');
  const $ = cheerio.load(res.data);

  const groups = [];
  let totalCount = 0;

  $('.bariskelom').each((_, el) => {
    let letter = $(el).find('.barispenz a').text().trim() || $(el).find('.barispenz').text().trim();
    if (!letter) {
      letter = $(el).find('a[name]').attr('name') || '';
    }
    letter = letter.trim().toUpperCase();

    const items = [];
    $(el).find('.jdlbar a').each((__, a) => {
      const rawTitle = $(a).text().trim().replace(/<[^>]*>/g, '').trim();
      const link = $(a).attr('href');
      if (rawTitle && link && link.includes('/anime/')) {
        items.push({
          title: rawTitle,
          link: link
        });
        totalCount++;
      }
    });

    if (letter && items.length > 0) {
      // Clean and normalize accented character (e.g. Ü -> U)
      let cleanLetter = letter.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
      if (!cleanLetter || !/^[A-Z0-9#]/.test(cleanLetter)) {
        const firstChar = items[0].title.charAt(0).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        cleanLetter = /^[A-Z]/.test(firstChar) ? firstChar : '#';
      }

      const groupKey = /^[0-9#]/.test(cleanLetter) ? '#' : cleanLetter;
      const existing = groups.find(g => g.letter === groupKey);
      if (existing) {
        existing.items.push(...items);
      } else {
        groups.push({
          letter: groupKey,
          items
        });
      }
    }
  });

  // Sort groups: '#' first, then A-Z
  groups.sort((a, b) => {
    if (a.letter === '#') return -1;
    if (b.letter === '#') return 1;
    return a.letter.localeCompare(b.letter);
  });

  if (totalCount > 0) {
    cachedAllAnime = { groups, totalCount };
    allAnimeExpiry = now + (60 * 60 * 1000); // 1 hour cache
  }

  return { groups, totalCount };
}

module.exports = {
  getHome,
  searchAnime,
  getAnimeDetail,
  getEpisodeDetail,
  resolveMirror,
  extractDirectVideo,
  getAllAnimeList
};
