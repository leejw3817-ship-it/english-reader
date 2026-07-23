// English Reader — Main Application Logic
// Handles data loading, UI rendering, routing, and user interactions

((global) => {
  'use strict';

  // ==================== State ====================
  const STATE = {
    articles: [],
    meta: {},
    loading: true,
    error: null,
    currentCategory: 'All',
    currentUseCase: '',
    currentQuery: '',
    readArticles: new Set(),
    fontSize: 18,
    articlesPerPage: 24,
    currentPage: 1,
    theme: 'light',
  };

  // ==================== DOM Helpers ====================
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  // ==================== Init ====================
  async function init() {
    loadTheme();
    setupRoutes();
    await loadArticles();
    if (STATE.articles.length > 0) {
      SearchEngine.init(STATE.articles);
    }
    setupGlobalListeners();
    Router.run();
  }

  // ==================== Theme ====================
  function loadTheme() {
    const saved = localStorage.getItem('er-theme');
    if (saved) {
      STATE.theme = saved;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      STATE.theme = 'dark';
    }
    applyTheme();
  }

  function toggleTheme() {
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('er-theme', STATE.theme);
    applyTheme();
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', STATE.theme);
  }

  // ==================== Data Loading ====================
  async function loadArticles() {
    STATE.loading = true;
    try {
      const resp = await fetch('data/articles.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      STATE.articles = data.articles || [];
      STATE.meta = { lastUpdated: data.lastUpdated, totalArticles: data.totalArticles || data.articles?.length || 0 };

      // Cache in localStorage for offline fallback
      try {
        localStorage.setItem('er-cached-articles', JSON.stringify(data));
      } catch (_) { /* storage full */ }

      console.log(`📰 Loaded ${STATE.articles.length} articles`);
    } catch (err) {
      console.warn('Failed to load articles.json, trying cache...', err.message);
      STATE.error = err.message;
      // Try localStorage cache
      const cached = localStorage.getItem('er-cached-articles');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          STATE.articles = data.articles || [];
          STATE.meta = data.meta || {};
          console.log(`📦 Loaded ${STATE.articles.length} articles from cache`);
        } catch (_) { /* corrupt cache */ }
      }
    }
    STATE.loading = false;

    // Restore read articles
    try {
      const read = JSON.parse(localStorage.getItem('er-read-articles') || '[]');
      STATE.readArticles = new Set(read);
    } catch (_) {}
  }

  // ==================== Routing Setup ====================
  function setupRoutes() {
    Router.on('/', () => showHome());
    Router.on('/search', (ctx) => showSearch(ctx.query.q || ''));
    Router.on('/article/:id', (ctx) => showArticle(ctx.params.id));
    Router.on('/category/:name', (ctx) => showCategory(ctx.params.name));
  }

  // ==================== View: Home ====================
  function showHome() {
    hideAllViews();
    $('#viewHome').classList.remove('hidden');

    const filtered = filterArticles(STATE.currentCategory, '');
    renderArticleGrid(filtered);
    updateStats(filtered.length);
    updateFilterPills(STATE.currentCategory);
  }

  // ==================== View: Search ====================
  function showSearch(query) {
    hideAllViews();
    $('#viewHome').classList.remove('hidden');
    $('#activeFilterLabel').textContent = query ? `搜索："${query}"` : '全部分类';

    if (!query) {
      return showHome();
    }

    STATE.currentQuery = query;
    $('#heroSearchInput').value = query;

    const results = SearchEngine.search(query, 50);
    const filtered = results.map((r) => r.item);

    // Render as search results
    renderSearchResults(query, results);
    updateStats(filtered.length, query);

    // Clear filter pills
    $$('.filter-pill').forEach((p) => p.classList.remove('active'));
    $('.filter-pill[data-category="All"]')?.classList.add('active');
  }

  // ==================== View: Article Detail ====================
  function showArticle(id) {
    hideAllViews();
    $('#viewArticle').classList.remove('hidden');
    $('#floatToolbar').classList.remove('hidden');
    window.scrollTo(0, 0);

    const article = STATE.articles.find((a) => a.id === id);
    if (!article) {
      $('#articleDetail').innerHTML = `
        <div class="empty-state">
          <h3>文章未找到</h3>
          <p>该文章可能已被移除或链接有误。</p>
          <a href="#/" style="display:inline-block;margin-top:16px;color:var(--color-primary)">← 返回首页</a>
        </div>`;
      return;
    }

    // Mark as read
    STATE.readArticles.add(id);
    try {
      localStorage.setItem('er-read-articles', JSON.stringify([...STATE.readArticles]));
    } catch (_) {}

    renderArticleDetail(article);
  }

  // ==================== View: Category ====================
  function showCategory(name) {
    hideAllViews();
    $('#viewHome').classList.remove('hidden');
    STATE.currentCategory = name;
    STATE.currentQuery = '';

    const filtered = filterArticles(name, '');
    renderArticleGrid(filtered);
    updateStats(filtered.length);
    updateFilterPills(name);

    $('#heroSearchInput').value = '';
    $('#activeFilterLabel').textContent = `分类：${name}`;
  }

  // ==================== View Helpers ====================
  function hideAllViews() {
    $('#viewHome').classList.add('hidden');
    $('#viewArticle').classList.add('hidden');
    $('#floatToolbar').classList.add('hidden');
  }

  // ==================== Filter Logic ====================
  function filterArticles(category, query) {
    let filtered = [...STATE.articles];

    // Category filter
    if (category && category !== 'All') {
      filtered = filtered.filter(
        (a) => a.category && a.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Use-case filter
    if (STATE.currentUseCase) {
      filtered = filtered.filter(
        (a) => a.useCases && Array.isArray(a.useCases) && a.useCases.includes(STATE.currentUseCase)
      );
    }

    if (query) {
      const results = SearchEngine.search(query, 200);
      filtered = results.map((r) => r.item);
    }

    return filtered;
  }

  // ==================== Render: Article Grid ====================
  function renderArticleGrid(articles) {
    const grid = $('#articleGrid');
    const empty = $('#emptyState');
    const loadMore = $('#loadMore');

    if (!articles || articles.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      loadMore.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');

    const pageArticles = articles.slice(0, STATE.currentPage * STATE.articlesPerPage);
    grid.innerHTML = pageArticles.map((a) => renderCard(a)).join('');

    if (articles.length > pageArticles.length) {
      loadMore.classList.remove('hidden');
      $('#btnLoadMore').onclick = () => {
        STATE.currentPage++;
        renderArticleGrid(articles);
      };
    } else {
      loadMore.classList.add('hidden');
    }
  }

  function renderCard(article) {
    const dateStr = timeAgo(article.publishedAt);
    const wordCount = article.wordCount || 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const isRead = STATE.readArticles.has(article.id);
    const color = article.color || getSourceColor(article.source);
    const imageHtml = article.image
      ? `<img class="card-image" src="${escapeAttr(article.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : '';

    return `
      <div class="article-card" data-id="${escapeAttr(article.id)}" onclick="window.location.hash='/article/${escapeAttr(article.id)}'">
        ${isRead ? '<span class="card-read-badge" title="Read">✓</span>' : ''}
        <div class="card-source">
          <span class="card-source-dot" style="background:${escapeAttr(color)}"></span>
          ${escapeHtml(article.source)}
        </div>
        ${imageHtml}
        <h3 class="card-title">${escapeHtml(article.title)}</h3>
        <p class="card-desc">${escapeHtml(article.description || '')}</p>
        <div class="card-footer">
          ${(article.useCases || []).slice(0, 2).map(uc => `<span class="card-tag usecase-tag usecase-${escapeAttr(uc.toLowerCase())}">${usecaseEmoji(uc)} ${usecaseLabel(uc)}</span>`).join('')}
          <span>${dateStr}</span>
          <span class="card-dot">·</span>
          <span>${readTime} 分钟</span>
          <span class="card-dot">·</span>
          <span>${wordCount} 词</span>
        </div>
      </div>
    `;
  }

  // ==================== Render: Search Results ====================
  function renderSearchResults(query, results) {
    const grid = $('#articleGrid');
    const empty = $('#emptyState');
    const loadMore = $('#loadMore');
    loadMore.classList.add('hidden');

    if (!results || results.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    grid.innerHTML = `
      <div class="search-results-header" style="grid-column:1/-1">
        <h2>搜索 "${escapeHtml(query)}" 的结果</h2>
        <p class="sr-count">找到 ${results.length} 篇文章</p>
      </div>
      <div class="search-results-list" style="grid-column:1/-1">
        ${results.map((r) => {
          const a = r.item;
          const titleHtml = SearchEngine.highlight(a.title, r.matches?.filter((m) => m.key === 'title'));
          const snippetHtml = SearchEngine.highlight(
            (a.description || '').slice(0, 250),
            r.matches?.filter((m) => m.key === 'description' || m.key === 'content')
          );
          return `
            <a class="search-result-item" href="#/article/${escapeAttr(a.id)}">
              <div class="sr-title">${titleHtml}</div>
              <div class="sr-source">${escapeHtml(a.source)} · ${timeAgo(a.publishedAt)}</div>
              <div class="sr-snippet">${snippetHtml}</div>
            </a>
          `;
        }).join('')}
      </div>
    `;
  }

  // ==================== Render: Article Detail ====================
  function renderArticleDetail(article) {
    const dateStr = new Date(article.publishedAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const wordCount = article.wordCount || 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const color = article.color || getSourceColor(article.source);
    const content = article.content || article.description || '';

    $('#articleDetail').innerHTML = `
      <div class="ad-source-row">
        <span class="ad-source-badge">
          <span class="card-source-dot" style="background:${escapeAttr(color)}"></span>
          ${escapeHtml(article.source)}
        </span>
        <span class="card-tag ${escapeAttr(article.difficulty || 'intermediate')}">${capitalize(article.difficulty || 'intermediate')}</span>
        <span class="card-tag">${escapeHtml(article.category || 'General')}</span>
      </div>
      <h1>${escapeHtml(article.title)}</h1>
      <div class="ad-meta">
        <span>${dateStr}</span>
        <span class="ad-meta-dot">·</span>
        <span>${readTime} 分钟</span>
        <span class="ad-meta-dot">·</span>
        <span>${wordCount} 词</span>
        ${article.author ? `<span class="ad-meta-dot">·</span><span>作者：${escapeHtml(article.author)}</span>` : ''}
      </div>
      <div class="ad-content" style="font-size:${STATE.fontSize}px">
        ${sanitizeContent(content)}
      </div>
      <a class="ad-original" href="${escapeAttr(article.url)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
        在 ${escapeHtml(article.source)} 阅读原文
      </a>
    `;
  }

  // ==================== Stats Bar ====================
  function updateStats(visibleCount, query) {
    $('#articleCount').textContent = visibleCount;
    if (STATE.meta.lastUpdated) {
      $('#lastUpdated').textContent = timeAgo(STATE.meta.lastUpdated);
    }
    if (query) {
      $('#activeFilterLabel').textContent = `搜索："${query}"`;
    } else if (STATE.currentCategory === 'All') {
      $('#activeFilterLabel').textContent = '全部分类';
    }
  }

  // ==================== Filter Pills ====================
  function updateFilterPills(activeCategory) {
    $$('.filter-bar:not(.usecase-bar) .filter-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.category === activeCategory);
    });
  }

  function updateUseCasePills(activeUseCase) {
    $$('.usecase-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.usecase === activeUseCase);
    });
  }

  function usecaseLabel(uc) {
    const map = {
      'CET-4': '四级', 'CET-6': '六级', 'Post-grad': '考研',
      'Daily': '日常', 'Business': '商务', 'Academic': '学术',
      'IELTS': '雅思托福', 'Hot': '热点'
    };
    return map[uc] || uc;
  }

  function usecaseEmoji(uc) {
    const map = {
      'CET-4': '🎓', 'CET-6': '📖', 'Post-grad': '📝',
      'Daily': '💬', 'Business': '💼', 'Academic': '🔬',
      'IELTS': '🌍', 'Hot': '🔥'
    };
    return map[uc] || '';
  }

  // ==================== Global Event Listeners ====================
  function setupGlobalListeners() {
    // Hero search
    const heroInput = $('#heroSearchInput');
    const headerInput = $('#headerSearchInput');
    const searchClear = $('#searchClear');

    heroInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = heroInput.value.trim();
        if (q) Router.navigate(`/search?q=${encodeURIComponent(q)}`);
      }
    });

    // Header search
    headerInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = headerInput.value.trim();
        if (q) Router.navigate(`/search?q=${encodeURIComponent(q)}`);
      }
    });

    // Sync search inputs
    headerInput?.addEventListener('input', () => {
      searchClear?.classList.toggle('hidden', !headerInput.value);
    });
    searchClear?.addEventListener('click', () => {
      headerInput.value = '';
      searchClear.classList.add('hidden');
      Router.navigate('');
    });

    // Filter pills (category)
    $$('.filter-bar:not(.usecase-bar) .filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const cat = pill.dataset.category;
        STATE.currentCategory = cat;
        STATE.currentUseCase = '';
        STATE.currentQuery = '';
        STATE.currentPage = 1;
        $('#heroSearchInput').value = '';
        updateFilterPills(cat);
        updateUseCasePills('');
        if (cat === 'All') {
          Router.navigate('');
        } else {
          Router.navigate(`/category/${encodeURIComponent(cat)}`);
        }
      });
    });

    // Use-case filter pills
    $$('.usecase-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const uc = pill.dataset.usecase;
        const isActive = pill.classList.contains('active');
        STATE.currentUseCase = isActive ? '' : uc;
        STATE.currentPage = 1;
        updateUseCasePills(STATE.currentUseCase);
        const filtered = filterArticles(STATE.currentCategory, '');
        renderArticleGrid(filtered);
        updateStats(filtered.length);
      });
    });

    // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = $('#heroSearchInput') || $('#headerSearchInput');
        input?.focus();
        input?.select();
      }
      // Escape to dismiss tooltip
      if (e.key === 'Escape') {
        dismissVocabTooltip();
      }
    });

    // Floating toolbar: font size
    $('#fontSizeUp')?.addEventListener('click', () => {
      STATE.fontSize = Math.min(26, STATE.fontSize + 2);
      updateFontSize();
    });
    $('#fontSizeDown')?.addEventListener('click', () => {
      STATE.fontSize = Math.max(14, STATE.fontSize - 2);
      updateFontSize();
    });
    $('#fontSizeReset')?.addEventListener('click', () => {
      STATE.fontSize = 18;
      updateFontSize();
    });
    $('#scrollTop')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Show/hide float toolbar on scroll
    window.addEventListener('scroll', () => {
      const toolbar = $('#floatToolbar');
      if (!toolbar || toolbar.classList.contains('hidden')) return;
      toolbar.style.opacity = window.scrollY < 400 ? '0' : '1';
    });

    // Theme toggle (keyboard shortcut: Ctrl+Shift+T)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      }
    });

    // Vocabulary tooltip: double-click on article content
    document.addEventListener('dblclick', (e) => {
      const adContent = e.target.closest('.ad-content');
      if (!adContent) return;
      handleVocabLookup(e);
    });

    // Nav links active state
    updateNavLinks();
  }

  function updateFontSize() {
    const content = $('.ad-content');
    if (content) {
      content.style.fontSize = STATE.fontSize + 'px';
    }
  }

  function updateNavLinks() {
    window.addEventListener('hashchange', () => {
      const path = window.location.hash.slice(1) || '/';
      $$('.nav-link').forEach((link) => {
        link.classList.toggle('active', link.dataset.route === `/${path.split('?')[0]}`);
      });
    });
  }

  // ==================== Vocabulary Helper ====================
  async function handleVocabLookup(e) {
    const selection = window.getSelection();
    const word = selection?.toString().trim().toLowerCase().replace(/[^a-z-]/g, '');
    if (!word || word.length < 3) return;

    // Skip common stop words
    const stopWords = new Set(['the', 'and', 'that', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some', 'them', 'who', 'its', 'from', 'with', 'this', 'what', 'when', 'make', 'like', 'more', 'than', 'just', 'also', 'about', 'into', 'over', 'than', 'then', 'very']);
    if (stopWords.has(word)) return;

    dismissVocabTooltip();

    let def = null;
    try {
      const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data[0]) {
          def = {
            word: data[0].word,
            phonetic: data[0].phonetic || data[0].phonetics?.[0]?.text || '',
            meanings: data[0].meanings?.slice(0, 2) || [],
            audio: data[0].phonetics?.find((p) => p.audio)?.audio || null,
          };
        }
      }
    } catch (_) { /* API unavailable */ }

    if (!def || !def.meanings.length) return;

    // Build tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'vocab-tooltip';
    tooltip.id = 'vocabTooltip';

    const meaning = def.meanings[0];
    const definition = meaning.definitions?.[0];

    tooltip.innerHTML = `
      <button class="vt-close" onclick="document.getElementById('vocabTooltip')?.remove()">&times;</button>
      <div class="vt-word">${escapeHtml(def.word)}</div>
      ${def.phonetic ? `<div class="vt-phonetic">${escapeHtml(def.phonetic)}</div>` : ''}
      ${meaning.partOfSpeech ? `<div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:4px">${escapeHtml(meaning.partOfSpeech)}</div>` : ''}
      ${definition ? `<div class="vt-def">${escapeHtml(definition.definition)}</div>` : ''}
      ${definition?.example ? `<div class="vt-example">"${escapeHtml(definition.example)}"</div>` : ''}
      ${def.audio ? `<div class="vt-audio" onclick="new Audio('${escapeAttr(def.audio)}').play()">🔊 播放发音</div>` : ''}
    `;

    // Position tooltip near the clicked word
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    tooltip.style.left = Math.min(rect.left, window.innerWidth - 380) + 'px';
    tooltip.style.top = (rect.bottom + 8) + 'px';

    document.body.appendChild(tooltip);

    // Auto-dismiss on click outside
    setTimeout(() => {
      document.addEventListener('click', function dismiss(e) {
        if (!tooltip.contains(e.target)) {
          tooltip.remove();
          document.removeEventListener('click', dismiss);
        }
      });
    }, 0);
  }

  function dismissVocabTooltip() {
    const el = document.getElementById('vocabTooltip');
    if (el) el.remove();
  }

  // ==================== Content Sanitizer ====================
  function sanitizeContent(html) {
    if (!html) return '<p>暂无内容，请点击"阅读原文"查看完整文章。</p>';
    // Basic sanitization: strip scripts, event handlers, iframes
    let clean = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/\s(on\w+)=/gi, ' data-removed=$1=')
      .replace(/<img[^>]*>/gi, (match) => {
        // Keep img but add loading=lazy and remove event handlers
        return match
          .replace(/\s(on\w+)=/gi, ' data-removed=$1=')
          .replace(/<img/i, '<img loading="lazy"');
      });
    return clean || '<p>暂无内容。</p>';
  }

  // ==================== Utility Functions ====================
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/</g, '&lt;');
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '未知';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return '未知';
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  }

  function capitalize(str) {
    // 中文化难度标签
    const map = { beginner: '入门', intermediate: '中级', advanced: '高级' };
    if (!str) return '';
    return map[str.toLowerCase()] || str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getSourceColor(source) {
    const colors = {
      'BBC News': '#bb1919',
      'BBC Technology': '#bb1919',
      'BBC Business': '#bb1919',
      'NPR': '#e7792b',
      'The Guardian': '#052962',
      'The Guardian Technology': '#052962',
      'Scientific American': '#00a86b',
      'MIT Technology Review': '#000000',
      'Aeon': '#4a4a4a',
      'Smithsonian Magazine': '#c41230',
      'Popular Science': '#1a1a1a',
      'Quanta Magazine': '#2d6ca2',
    };
    return colors[source] || '#5f6368';
  }

  // ==================== Boot ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
