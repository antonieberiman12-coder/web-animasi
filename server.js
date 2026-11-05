const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const scraper = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Home (Ongoing & Completed anime)
app.get('/api/home', async (req, res) => {
  try {
    const data = await scraper.getHome();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Search Anime
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query parameter q is required' });
  }

  try {
    const results = await scraper.searchAnime(query);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Anime Detail
app.get('/api/anime', async (req, res) => {
  const animeUrl = req.query.url;
  if (!animeUrl) {
    return res.status(400).json({ success: false, error: 'Query parameter url is required' });
  }

  try {
    const data = await scraper.getAnimeDetail(animeUrl);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Episode Detail
app.get('/api/episode', async (req, res) => {
  const epUrl = req.query.url;
  if (!epUrl) {
    return res.status(400).json({ success: false, error: 'Query parameter url is required' });
  }

  try {
    const data = await scraper.getEpisodeDetail(epUrl);
    
    // Try extracting direct video mp4 if default iframe exists
    let directVideo = null;
    if (data.defaultIframe) {
      directVideo = await scraper.extractDirectVideo(data.defaultIframe);
    }

    res.json({
      success: true,
      data: {
        ...data,
        directVideo
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Mirror resolution
app.get('/api/mirror', async (req, res) => {
  const { url, content } = req.query;
  if (!url || !content) {
    return res.status(400).json({ success: false, error: 'url and content parameters required' });
  }

  try {
    const mirror = await scraper.resolveMirror(url, content);
    let directVideo = null;
    if (mirror.iframeSrc) {
      directVideo = await scraper.extractDirectVideo(mirror.iframeSrc);
    }

    res.json({
      success: true,
      data: {
        ...mirror,
        directVideo
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Direct Video Stream Proxy (with Range header support for Android)
app.get('/api/video-stream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).send('Missing video URL');
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const response = await axios({
      method: 'get',
      url: videoUrl,
      headers: headers,
      responseType: 'stream',
      timeout: 30000
    });

    res.status(response.status);

    const headersToForward = [
      'content-range',
      'content-length',
      'content-type',
      'accept-ranges',
      'last-modified',
      'etag'
    ];

    headersToForward.forEach((h) => {
      if (response.headers[h]) {
        res.setHeader(h, response.headers[h]);
      }
    });

    if (!res.getHeader('content-type')) {
      res.setHeader('content-type', 'video/mp4');
    }
    if (!res.getHeader('accept-ranges')) {
      res.setHeader('accept-ranges', 'bytes');
    }

    response.data.pipe(res);
  } catch (err) {
    console.error('Video stream error:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Error streaming video: ' + err.message);
    }
  }
});

// 7. Sandboxed Safe Player Embed Proxy (strips CSP & injects anti-redirect shields)
app.get('/api/player-embed', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing player URL');
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://otakudesu.blog/'
      },
      timeout: 10000
    });

    let html = response.data;

    // Inject Anti-Redirect & Anti-Popup Neutralizer Script
    const neutralizer = `
      <script>
        // Kill window.open
        window.open = function() { console.log('Blocked popup window.open'); return null; };
        // Freeze location changes
        window.onbeforeunload = null;
        // Kill clickjacking transparent overlay links
        document.addEventListener('DOMContentLoaded', function() {
          const links = document.querySelectorAll('a[target="_blank"]');
          links.forEach(l => {
            if (l.href && !l.href.includes('desustream') && !l.href.includes('otakudesu')) {
              l.style.display = 'none';
              l.onclick = function(e) { e.preventDefault(); e.stopPropagation(); return false; };
            }
          });
        });
      </script>
    `;

    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + neutralizer);
    } else {
      html = neutralizer + html;
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading player embed: ' + err.message);
  }
});

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export for Vercel and start server locally
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Web Animasi Server is running at http://localhost:${PORT}`);
    console.log(`📱 For Android in same Wi-Fi, open: http://<YOUR-IP-ADDRESS>:${PORT}`);
  });
}

module.exports = app;
