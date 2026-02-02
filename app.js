// AstaMasterPro v9c2 — app.js (ROOT) [patch v1.2: badge per anno a scelta + toggle prev badges]
(function () {
  'use strict';

  var DATA_DIRS = ['data/']; // root
  var IMG_BASE = 'img/';
  var THEME_KEY = 'amp-theme';

  var $ = function (s) { return document.querySelector(s); };

  var SELECTED_COD = null,
      SEASONS = [],
      CUR = null,
      PREV = null,
      INDEX = [];

  var ROLE_CACHE = {}; // ROLE_CACHE[seasonKey][role][metric__minPres]

  // ---------- Utilità di formattazione ----------
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>\"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function fmt(v, d) {
    if (d === void 0) d = 2;
    if (v == null) return '—';
    var n = Number(v);
    return isFinite(n) ? n.toFixed(d).replace('.', ',') : String(v);
  }
  function fmtInt(v) {
    if (v == null) return '—';
    var n = Number(v);
    return isFinite(n) ? String(Math.round(n)) : String(v);
  }
  function fmtPercent(x) {
    if (x == null) return '—';
    var v = Number(x);
    if (!isFinite(v)) return String(x);
    if (v <= 1) v *= 100;
    return (v.toFixed(1) + '%').replace('.', ',');
  }
  function norm(s) {
    try {
      return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    } catch (e) {
      return String(s == null ? '' : s).toLowerCase().trim();
    }
  }
  function highlightMatch(t, q) {
    var lt = String(t == null ? '' : t),
        qq = String(q == null ? '' : q);
    var i = lt.toLowerCase().indexOf(qq.toLowerCase());
    if (i < 0) return escapeHtml(lt);
    var e = i + qq.length;
    return escapeHtml(lt.slice(0, i)) + '<mark>' + escapeHtml(lt.slice(i, e)) + '</mark>' + escapeHtml(lt.slice(e));
  }
  function seasonStr(key) { return String(key || '').replace('_','/').replace('-','/'); }

  // ---------- Foto giocatore ----------
  var PHOTO_EXTS = ['jpg', 'png', 'webp'];
  function setPlayerPhoto(cod) {
    var img = $('#playerPhoto');
    if (!img) return;
    var i = 0;
    function next() {
      if (i >= PHOTO_EXTS.length) { img.src = IMG_BASE + 'placeholder.svg'; return; }
      img.src = IMG_BASE + cod + '.' + PHOTO_EXTS[i++];
    }
    img.onerror = function () { next(); };
    next();
  }

  // ---------- Tema & toggle card ----------
  var TGL_KEYS = { cur: 'toggle-current', prev: 'toggle-prev', hist: 'toggle-storico' };
  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    var sw = $('#switchTheme');
    if (sw) sw.checked = (mode === 'dark');
  }
  function setupTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    applyTheme((saved === 'light' || saved === 'dark') ? saved : 'dark');
    var sw = $('#switchTheme');
    if (sw) sw.addEventListener('change', function (e) {
      var mode = e.target.checked ? 'dark' : 'light';
      applyTheme(mode);
      localStorage.setItem(THEME_KEY, mode);
    });
  }
  function applyToggles() {
    var bCur = localStorage.getItem(TGL_KEYS.cur) !== 'off';
    var bPrev = localStorage.getItem(TGL_KEYS.prev) !== 'off';
    var bHist = localStorage.getItem(TGL_KEYS.hist) !== 'off';
    var el;
    el = $('#switchCurrent'); if (el) el.checked = bCur;
    el = $('#wrapCurrent');  if (el) el.classList.toggle('hidden', !bCur);
    el = $('#switchPrev');   if (el) el.checked = bPrev;
    el = $('#wrapPrev');     if (el) el.classList.toggle('hidden', !bPrev);
    el = $('#switchStorico');if (el) el.checked = bHist;
    el = $('#wrapStorico');  if (el) el.classList.toggle('hidden', !bHist);
  }
  function setupToggles() {
    var el;
    el = $('#switchCurrent'); if (el) el.addEventListener('change', e => { localStorage.setItem(TGL_KEYS.cur, e.target.checked ? 'on' : 'off'); applyToggles(); });
    el = $('#switchPrev');    if (el) el.addEventListener('change', e => { localStorage.setItem(TGL_KEYS.prev, e.target.checked ? 'on' : 'off'); applyToggles(); });
    el = $('#switchStorico'); if (el) el.addEventListener('change', e => { localStorage.setItem(TGL_KEYS.hist, e.target.checked ? 'on' : 'off'); applyToggles(); });
    applyToggles();
  }

  // ---------- Opzioni persistenti ----------
  var OPT_KEYS = {
    minPresRankCur: 'amp-minPresRankCur',
    minPresRankPrev: 'amp-minPresRankPrev',
    mvPrevBadge: 'amp-mvPrevBadge',
    fmPrevBadge: 'amp-fmPrevBadge',
    affPrevBadge: 'amp-affPrevBadge',
    showDelta: 'amp-showDelta',
    showDetails: 'amp-showDetails',
    histShowBM: 'amp-histShowBM',
    histShowPerPres: 'amp-histShowPerPres',
    histSelSeasons: 'amp-histSelSeasons',
    useIndicators: 'amp-useIndicators',
    rankBadgeMetric: 'amp-rankBadgeMetric',
    showRolePos: 'amp-showRolePos',

    // v1.2 – NUOVE
    rankBadgeSeason: 'amp-rankBadgeSeason',     // selezione anno badge Rank FM/MV
    badgeSeasonValues: 'amp-badgeSeasonValues', // selezione anno badge FM/MV (soglie)
    badgeSeasonAff: 'amp-badgeSeasonAff',       // selezione anno badge Aff (soglia)
    showPrevBadges: 'amp-showPrevBadges'        // toggle per nascondere/mostrare badge "stag. precedente"
  };
  var OPTS = null;

  function loadOptions() {
    function qn(k, d) { var v = localStorage.getItem(k); if (v == null) return d; var n = Number(v); return isFinite(n) ? n : d; }
    function qb(k, d) { var v = localStorage.getItem(k); if (v == null) return d; return v === '1'; }
    function qarr(k, d) { var v = localStorage.getItem(k); try { return v ? JSON.parse(v) : d; } catch (e) { return d; } }
    function qs(k, d) { var v = localStorage.getItem(k); return (v == null) ? d : v; }

    var o = {
      minPresRankCur: qn(OPT_KEYS.minPresRankCur,10),
      minPresRankPrev: qn(OPT_KEYS.minPresRankPrev,10),
      mvPrevBadge: qn(OPT_KEYS.mvPrevBadge,6.20),
      fmPrevBadge: qn(OPT_KEYS.fmPrevBadge,6.50),
      affPrevBadge: qn(OPT_KEYS.affPrevBadge,70),
      showDelta: qb(OPT_KEYS.showDelta,true),
      showDetails: qb(OPT_KEYS.showDetails,true),
      histShowBM: qb(OPT_KEYS.histShowBM,true),
      histShowPerPres: qb(OPT_KEYS.histShowPerPres,true),
      histSelSeasons: qarr(OPT_KEYS.histSelSeasons,[]),
      useIndicators: qb(OPT_KEYS.useIndicators,false),
      showRolePos: qb(OPT_KEYS.showRolePos,true),
      rankBadgeMetric: (localStorage.getItem(OPT_KEYS.rankBadgeMetric) || 'FM'),

      // v1.2
      rankBadgeSeason: qs(OPT_KEYS.rankBadgeSeason,""),
      badgeSeasonValues: qs(OPT_KEYS.badgeSeasonValues,""),
      badgeSeasonAff: qs(OPT_KEYS.badgeSeasonAff,""),
      showPrevBadges: qb(OPT_KEYS.showPrevBadges, true)
    };

    function set(id, val, isC) { var el = $('#'+id); if (!el) return; if (isC) el.checked = !!val; else el.value = val; }
    set('opt_minPresRankCur', o.minPresRankCur);
    set('opt_minPresRankPrev', o.minPresRankPrev);
    set('opt_mvPrevBadge', o.mvPrevBadge);
    set('opt_fmPrevBadge', o.fmPrevBadge);
    set('opt_affPrevBadge', o.affPrevBadge);
    set('opt_showDelta', o.showDelta, true);
    set('opt_showDetails', o.showDetails, true);
    set('opt_histShowBM', o.histShowBM, true);
    set('opt_histShowPerPres', o.histShowPerPres, true);
    set('opt_useIndicators', o.useIndicators, true);
    set('opt_showRolePos', o.showRolePos, true);
    set('opt_rankBadgeMetric', o.rankBadgeMetric);

    // nuovi controlli (se presenti in index.html)
    set('opt_rankBadgeSeason', o.rankBadgeSeason);
    set('opt_badgeSeasonValues', o.badgeSeasonValues);
    set('opt_badgeSeasonAff', o.badgeSeasonAff);
    set('opt_showPrevBadges', o.showPrevBadges, true);

    return o;
  }
  function persistOptions() {
    localStorage.setItem(OPT_KEYS.minPresRankCur, String(OPTS.minPresRankCur));
    localStorage.setItem(OPT_KEYS.minPresRankPrev, String(OPTS.minPresRankPrev));
    localStorage.setItem(OPT_KEYS.mvPrevBadge, String(OPTS.mvPrevBadge));
    localStorage.setItem(OPT_KEYS.fmPrevBadge, String(OPTS.fmPrevBadge));
    localStorage.setItem(OPT_KEYS.affPrevBadge, String(OPTS.affPrevBadge));
    localStorage.setItem(OPT_KEYS.showDelta, OPTS.showDelta ? '1' : '0');
    localStorage.setItem(OPT_KEYS.showDetails, OPTS.showDetails ? '1' : '0');
    localStorage.setItem(OPT_KEYS.histShowBM, OPTS.histShowBM ? '1' : '0');
    localStorage.setItem(OPT_KEYS.histShowPerPres, OPTS.histShowPerPres ? '1' : '0');
    localStorage.setItem(OPT_KEYS.histSelSeasons, JSON.stringify(OPTS.histSelSeasons || []));
    localStorage.setItem(OPT_KEYS.useIndicators, OPTS.useIndicators ? '1' : '0');
    localStorage.setItem(OPT_KEYS.showRolePos, OPTS.showRolePos ? '1' : '0');
    localStorage.setItem(OPT_KEYS.rankBadgeMetric, OPTS.rankBadgeMetric);

    // v1.2
    localStorage.setItem(OPT_KEYS.rankBadgeSeason, OPTS.rankBadgeSeason || '');
    localStorage.setItem(OPT_KEYS.badgeSeasonValues, OPTS.badgeSeasonValues || '');
    localStorage.setItem(OPT_KEYS.badgeSeasonAff, OPTS.badgeSeasonAff || '');
    localStorage.setItem(OPT_KEYS.showPrevBadges, OPTS.showPrevBadges ? '1' : '0');
  }

  // ---------- Opzioni: popolamento stagioni ----------
  function populateHistSeasonOptions() {
    var host = $('#opt_histSeasons');
    if (!host) return;
    host.innerHTML = '';
    if (!SEASONS.length) { host.textContent = '—'; return; }

    if (!OPTS.histSelSeasons || !OPTS.histSelSeasons.length) {
      OPTS.histSelSeasons = SEASONS.map(function (s) { return s.seasonKey; });
      persistOptions();
    }
    SEASONS.forEach(function (s) {
      var id = 'opt_hist_' + s.seasonKey;
      var label = document.createElement('label');
      label.style.display = 'block';
      label.style.margin = '.15rem 0';
      label.innerHTML = '<input type="checkbox" id="' + id + '"> ' + seasonStr(s.seasonKey);
      host.appendChild(label);
      var cb = label.querySelector('input');
      cb.checked = OPTS.histSelSeasons.indexOf(s.seasonKey) >= 0;
      cb.addEventListener('change', function () {
        var set = new Set(OPTS.histSelSeasons || []);
        if (cb.checked) set.add(s.seasonKey); else set.delete(s.seasonKey);
        OPTS.histSelSeasons = Array.from(set);
        persistOptions();
        if (SELECTED_COD) selectPlayer(SELECTED_COD);
      });
    });
  }
  // popola i 3 select (rank/FM-MV/Aff) con le stagioni trovate
  function populateAllBadgeSeasonOptions(){
    var map = [
      { id: 'opt_rankBadgeSeason',   key: 'rankBadgeSeason'   },
      { id: 'opt_badgeSeasonValues', key: 'badgeSeasonValues' },
      { id: 'opt_badgeSeasonAff',    key: 'badgeSeasonAff'    }
    ];
    map.forEach(function (m){
      var el = document.querySelector('#'+m.id);
      if(!el) return;
      el.innerHTML = '';
      var optNone = document.createElement('option');
      optNone.value = '';
      optNone.textContent = 'Nessuna';
      el.appendChild(optNone);

      SEASONS.forEach(function(s){
        var o = document.createElement('option');
        o.value = s.seasonKey;
        o.textContent = seasonStr(s.seasonKey);
        el.appendChild(o);
      });

      var lastKey = SEASONS.length ? SEASONS[SEASONS.length-1].seasonKey : '';
      var sel = OPTS[m.key] || lastKey || '';
      if (sel && !SEASONS.some(function(x){ return x.seasonKey===sel; })) sel = '';
      el.value = sel;
      OPTS[m.key] = sel;
    });
    persistOptions();
  }

  function setupOptions() {
    OPTS = loadOptions();

    function syncNums() {
      OPTS.minPresRankCur = Number($('#opt_minPresRankCur').value) || 10;
      OPTS.minPresRankPrev = Number($('#opt_minPresRankPrev').value) || 10;
      OPTS.mvPrevBadge = Number($('#opt_mvPrevBadge').value) || 6.20;
      OPTS.fmPrevBadge = Number($('#opt_fmPrevBadge').value) || 6.50;
      OPTS.affPrevBadge = Number($('#opt_affPrevBadge').value) || 70;
      persistOptions();
      if (SELECTED_COD) selectPlayer(SELECTED_COD);
    }
    function syncBools() {
      OPTS.showDelta = $('#opt_showDelta')?.checked ?? OPTS.showDelta;
      OPTS.showDetails = $('#opt_showDetails')?.checked ?? OPTS.showDetails;
      OPTS.histShowBM = $('#opt_histShowBM')?.checked ?? OPTS.histShowBM;
      OPTS.histShowPerPres = $('#opt_histShowPerPres')?.checked ?? OPTS.histShowPerPres;
      OPTS.useIndicators = $('#opt_useIndicators')?.checked ?? OPTS.useIndicators;
      OPTS.showRolePos = $('#opt_showRolePos')?.checked ?? OPTS.showRolePos;
      OPTS.showPrevBadges = $('#opt_showPrevBadges')?.checked ?? OPTS.showPrevBadges;
      persistOptions();
      if (SELECTED_COD) selectPlayer(SELECTED_COD);
    }

    ['opt_minPresRankCur','opt_minPresRankPrev','opt_mvPrevBadge','opt_fmPrevBadge','opt_affPrevBadge']
      .forEach(function (id) { var el = $('#'+id); if (el) el.addEventListener('change', syncNums); });

    ['opt_showDelta','opt_showDetails','opt_histShowBM','opt_histShowPerPres','opt_useIndicators','opt_showRolePos','opt_showPrevBadges']
      .forEach(function (id) { var el = $('#'+id); if (el) el.addEventListener('change', syncBools); });

    var selRankMetric = document.querySelector('#opt_rankBadgeMetric');
    if (selRankMetric) selRankMetric.addEventListener('change', function () {
      OPTS.rankBadgeMetric = (selRankMetric.value === 'MV') ? 'MV' : 'FM';
      persistOptions();
      if (SELECTED_COD) selectPlayer(SELECTED_COD);
    });

    function bindSel(id,key){
      var el=document.querySelector('#'+id);
      if(!el) return;
      el.addEventListener('change', function(){
        OPTS[key]=el.value||'';
        persistOptions();
        if(SELECTED_COD) selectPlayer(SELECTED_COD);
      });
    }
    bindSel('opt_rankBadgeSeason','rankBadgeSeason');
    bindSel('opt_badgeSeasonValues','badgeSeasonValues');
    bindSel('opt_badgeSeasonAff','badgeSeasonAff');

    function close() { var d = document.querySelector('details.options'); if (d) d.removeAttribute('open'); }
    var b = $('#btnCloseOptions'); if (b) b.addEventListener('click', close);
    b = $('#btnCloseOptionsTop'); if (b) b.addEventListener('click', close);

    var r = $('#btnResetOptions');
    if (r) r.addEventListener('click', function () {
      Object.keys(OPT_KEYS).forEach(function (k) { localStorage.removeItem(OPT_KEYS[k]); });
      Object.keys(TGL_KEYS).forEach(function (k) { localStorage.removeItem(TGL_KEYS[k]); });
      localStorage.removeItem(THEME_KEY);
      OPTS = loadOptions();
      setupTheme();
      applyToggles();
      populateHistSeasonOptions();
      populateAllBadgeSeasonOptions();
      if (SELECTED_COD) selectPlayer(SELECTED_COD);
      alert('Impostazioni ripristinate.');
    });

    return OPTS;
  }

  // ---------- Caricamento stagioni ----------
  function candidateSeasonKeys() {
    var y = (new Date()).getFullYear();
    var keys = [];
    for (var yy = y - 8; yy <= y + 1; yy++) keys.push(yy + '_' + (yy + 1));
    return keys.reverse();
  }
  function fileCandidatesFor(key) {
    var start = Number(String(key).split('_')[0]);
    var next = start + 1;
    return [key + '.json', start + '.json', (String(start) + '-' + String(next) + '.json')];
  }
  function normRow(obj) {
    var R = String(obj['R'] || obj['ruolo'] || obj['r'] || '').toUpperCase();
    var isP = (R === 'P');
    function takef(k) { var v = obj[k]; if (v === '' || v == null) return null; var n = Number(v); return isFinite(n) ? n : v; }
    function takei(k) { var v = obj[k]; if (v === '' || v == null) return 0; var n = Number(v); return isFinite(n) ? Math.trunc(n) : 0; }
    return {
      cod: obj['COD'] || obj['cod'] || obj['Cod'] || obj['Id'] || obj['ID'],
      nome: obj['Nome'] || obj['nome'],
      sq: obj['Sq'] || obj['squadra'] || obj['Sq.'] || obj['Team'],
      r: R,
      p: takei('P'),
      aff: takef('Aff%'),
      mvt: takef('MVT'),
      fmt: takef('FMT'),
      mvc: takef('MVC'),
      mvf: takef('MVF'),
      fmc: takef('FMC'),
      fmf: takef('FMF'),
      mvdst: takef('MVDSt'),
      mvdlt: takef('MVDlt'),
      fmdst: takef('FMDSt'),
      fmdlt: takef('FMDlt'),
      gf: takei('GF'),
      gfr: takei('GFR'),
      rs: takei('RS'),
      as: takei('AS'),
      ag: takei('AG'),
      a: takei('A'),
      e: takei('E'),
      gs: isP ? takei('GS') : null,
      gsr: isP ? takei('GSR') : null,
      rp: isP ? takei('RP') : null
    };
  }
  function parseRaw(raw) {
    var rows = [];
    if (Array.isArray(raw)) rows = raw;
    else if (raw && Array.isArray(raw.players)) {
      if (Array.isArray(raw.columns) && Array.isArray(raw.players[0])) {
        var cols = raw.columns;
        rows = raw.players.map(function (r) {
          var o = {}; for (var i = 0; i < cols.length; i++) o[cols[i]] = (r[i] == null ? null : r[i]);
          return o;
        });
      } else rows = raw.players;
    } else return null;

    var normed = rows.map(normRow).filter(function (r) { return r.cod && r.nome; });
    return normed;
  }
  function tryFetch(path) {
    return fetch(path, { cache: 'no-store' })
      .then(function (res) { if (!res.ok) return null; return res.json(); })
      .catch(function (err) { console.warn('fetch failed', path, err); return null; });
  }
  async function loadSeasonAuto(key) {
    for (var d = 0; d < DATA_DIRS.length; d++) {
      var dir = DATA_DIRS[d];
      var files = fileCandidatesFor(key);
      for (var i = 0; i < files.length; i++) {
        var path = dir + files[i];
        var raw = await tryFetch(path);
        if (raw) {
          var rows = parseRaw(raw);
          if (!rows) continue;
          var start = Number(String(key).split('_')[0]);
          return { seasonKey: key, seasonStart: start, players: rows, _path: path };
        }
      }
    }
    return null;
  }
  async function discoverSeasons() {
    var keys = candidateSeasonKeys();
    var out = [];
    for (var i = 0; i < keys.length; i++) {
      var s = await loadSeasonAuto(keys[i]);
      if (s) out.push(s);
    }
    out.sort(function (a, b) { return a.seasonStart - b.seasonStart; });
    if (!out.length) {
      console.error('Nessuna stagione trovata. Assicurati che i file JSON siano in /data e si chiamino YYYY_YYYY+1.json o YYYY.json o YYYY-YYYY+1.json');
    } else {
      console.log('Stagioni caricate:', out.map(function (x) { return x._path; }));
    }
    return out;
  }

  // ---------- Indice ricerca ----------
  function buildIndex() {
    INDEX = [];
    var prevMap = new Map();
    if (PREV) PREV.players.forEach(function (p) { prevMap.set(String(p.cod), p); });
    if (!CUR) return;
    CUR.players.forEach(function (c) {
      var pr = prevMap.get(String(c.cod));
      var changedRole = !!(pr && pr.r && c.r && pr.r !== c.r);
      var changedTeam = !!(pr && pr.sq && c.sq && pr.sq !== c.sq);
      INDEX.push({
        cod: String(c.cod),
        nome: c.nome,
        ruolo: c.r,
        squadra: c.sq,
        prevRuolo: pr ? pr.r : null,
        prevSquadra: pr ? pr.sq : null,
        changedRole: changedRole,
        changedTeam: changedTeam
      });
    });
  }

  // ---------- UI: lista risultati ----------
  function hideResults() { var p = $('#panelResults'); if (p) p.classList.add('hidden'); }
  function showResults() { var p = $('#panelResults'); if (p) p.classList.remove('hidden'); }
  function renderResults(items, q) {
    var ul = $('#results'); if (!ul) return;
    ul.innerHTML = '';
    items.slice(0, 120).forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'result-item';
      li.setAttribute('role', 'option');
      li.tabIndex = 0;
      var title = '<span class="result-title">' + highlightMatch(item.nome, q) + '</span>';
      var meta = '<span class="result-meta">' + escapeHtml(item.ruolo) + ' · ' + escapeHtml(item.squadra) + '</span>';
      var badges = [];
      if (OPTS.showPrevBadges) { // mostra i segnali di confronto solo se attivati
        if (item.changedRole)   badges.push('<span class="badge warn" title="Cambio ruolo vs Stag. prec.">Cambio Ruolo</span>');
        if (item.changedTeam)   badges.push('<span class="badge alert" title="Cambio squadra vs Stag. prec.">Cambio Squadra</span>');
      }
      li.innerHTML = title + '<span>' + meta + ' ' + badges.join(' ') + '</span>';
      li.addEventListener('click', function () { selectPlayer(item.cod); });
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter') selectPlayer(item.cod); });
      ul.appendChild(li);
    });
  }
  function search(q) {
    var nq = norm(q);
    var ul = $('#results');
    if (!nq) { if (ul) ul.innerHTML = ''; return; }
    var res = INDEX.filter(function (x) { return norm(x.nome).includes(nq); });
    renderResults(res, q);
  }

  // ---------- Icone/etichette ----------
  function iconOrIndicator(iconKey, indicator) {
    if (OPTS.useIndicators) return (indicator ? indicator + ' ' : '');
    if (!iconKey) return '';
    return '<img src="' + IMG_BASE + 'ico/' + iconKey + '.svg" class="ico stat" alt="" onerror="this.style.display=\'none\'"> ';
  }
  function labelWithMark(text, iconKey, indicator) { return iconOrIndicator(iconKey, indicator) + escapeHtml(text); }

  // ---------- Distribuzioni & ranking ----------
  function ensureRoleCache(seasonKey) { if (!ROLE_CACHE[seasonKey]) ROLE_CACHE[seasonKey] = {}; return ROLE_CACHE[seasonKey]; }
  function getRoleDistribution(seasonObj, role, metric, minPres) {
    if (!seasonObj) return null;
    var seasonKey = seasonObj.seasonKey;
    var r = String(role || '').toUpperCase(); if (!r) return null;
    var cacheSeason = ensureRoleCache(seasonKey);
    if (!cacheSeason[r]) cacheSeason[r] = {};
    var key = metric + '__' + String(minPres);
    if (!cacheSeason[r][key]) {
      var vals = seasonObj.players
        .filter(function (p) { return (p.r === r) && ((Number(p.p) || 0) >= (minPres || 0)); })
        .map(function (p) { return Number(p[metric]); })
        .filter(function (n) { return isFinite(n); })
        .sort(function (a, b) { return a - b; });
      var N = vals.length;
      var mean = N ? vals.reduce(function (a, b) { return a + b; }, 0) / N : 0;
      var variance = N ? vals.reduce(function (s, x) { var d = x - mean; return s + d * d; }, 0) / N : 0;
      var std = Math.sqrt(variance);
      cacheSeason[r][key] = { vals: vals, N: N, mean: mean, std: std };
    }
    return cacheSeason[r][key];
  }
  function computeRankForSeason(seasonObj, metric, value, role, minPres) {
    try {
      var v = Number(value); if (!isFinite(v)) return null;
      var dist = getRoleDistribution(seasonObj, role, metric, minPres);
      if (!dist || !dist.N) return null;
      var vals = dist.vals, N = dist.N, mean = dist.mean, std = dist.std;
      var less = 0, equal = 0, eps = 1e-9;
      for (var i = 0; i < vals.length; i++) {
        var x = vals[i];
        if (x < v - eps) less++;
        else if (Math.abs(x - v) <= eps) equal++;
      }
      var mid = less + 0.5 * equal;
      var pct = mid / N;
      var z = std > 0 ? (v - mean) / std : 0;
      var rank = Math.max(1, N - (less + equal) + 1); // ex aequo → stessa posizione
      return { pct: pct, z: z, N: N, rank: rank };
    } catch (e) { return null; }
  }

  // ---------- Helpers UI righe ----------
  function addBadge(arr, text, cls, title) {
    if (cls === void 0) cls = 'info';
    arr.push('<span class="badge ' + cls + '"' + (title ? (' title="' + escapeHtml(title) + '"') : '') + '>' + escapeHtml(text) + '</span>');
  }
  function row(label, value, opts) {
    opts = opts || {};
    var display = opts.percent ? fmtPercent(value) : fmt(value);
    return '<div class="row"><span class="key">' + escapeHtml(label) + '</span><span class="val">' + display + '</span></div>';
  }
  function rowInt(label, value) { return '<div class="row"><span class="key">' + escapeHtml(label) + '</span><span class="val">' + fmtInt(value) + '</span></div>'; }
  function rowHTML(labelHtml, value, opts) {
    opts = opts || {};
    var display = opts.percent ? fmtPercent(value) : fmt(value);
    return '<div class="row"><span class="key">' + labelHtml + '</span><span class="val">' + display + '</span></div>';
  }
  function rowHTMLInt(labelHtml, value) { return '<div class="row"><span class="key">' + labelHtml + '</span><span class="val">' + fmtInt(value) + '</span></div>'; }

  // ---------- Render card (corrente / precedente / storico) ----------
  function renderCurrent(rec) {
    var el = $('#cardCurrent');
    if (!rec) { el.innerHTML = '<div class="small">Giocatore non trovato nella stagione corrente.</div>'; return; }
    var isP = (rec.r === 'P');
    var parts = [];
    parts.push(row('Squadra', rec.sq));
    parts.push(row('Ruolo', rec.r));
    parts.push(rowInt('Presenze', rec.p));
    parts.push(row('Affidabilità %', rec.aff, { percent: true }));
    parts.push(row('MV (Tot)', rec.mvt));
    parts.push(row('FM (Tot)', rec.fmt));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'GS'  : 'Gol',            isP ? 'gol_subiti'        : 'gol',         isP ? '🔴🧠' : '⚽'), isP ? rec.gs  : rec.gf));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'GSR' : 'Gol su Rigore',  isP ? 'gol_subiti_rigore' : 'gol_rigore',  isP ? '🅁🔴🧠' : '🅁⚽'), isP ? rec.gsr : rec.gfr));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'Rigori Parati' : 'Rigori Sbagliati', isP ? 'rigori_parati' : 'rigori_sbagliati', isP ? '🅁🟢🧠' : '🅁🔴⚽'), isP ? rec.rp : rec.rs));
    parts.push(rowHTMLInt(labelWithMark('Assist', 'assist', '🎯'), rec.as));
    parts.push(rowHTMLInt(labelWithMark('Autogol', 'autogol', '🔴⚽'), rec.ag));
    parts.push(rowHTMLInt(labelWithMark('Ammonizioni', 'ammonizioni', '🟡'), rec.a));
    parts.push(rowHTMLInt(labelWithMark('Espulsioni', 'espulsioni', '🟥'), rec.e));
    if (OPTS.showDelta) { parts.push(row('Δ squadra MV (σ)', rec.mvdlt)); parts.push(row('Δ squadra FM (σ)', rec.fmdlt)); }

    var lines = [];
    if (OPTS.showRolePos) {
      var y = seasonStr(CUR.seasonKey);
      var rkFM = computeRankForSeason(CUR, 'fmt', rec.fmt, rec.r, OPTS.minPresRankCur);
      var rkMV = computeRankForSeason(CUR, 'mvt', rec.mvt, rec.r, OPTS.minPresRankCur);
      if (rkFM || rkMV) {
        lines.push('<div class="separator" style="border:none;margin:.4rem 0 0"></div>');
        lines.push('<div class="small"><strong>Posizione nel ruolo</strong> — ' + escapeHtml(y) + '</div>');
        if (rkFM) {
          lines.push('<div class="row"><span class="key">FM ' + escapeHtml(y) + ' – Percentile (' + rkFM.rank + '° su ' + rkFM.N + ')</span><span class="val">' + fmt(rkFM.pct * 100, 1).replace('.', ',') + '%</span></div>');
          lines.push(row('FM – Z‑score', rkFM.z));
        }
        if (rkMV) {
          lines.push('<div class="row"><span class="key">MV ' + escapeHtml(y) + ' – Percentile (' + rkMV.rank + '° su ' + rkMV.N + ')</span><span class="val">' + fmt(rkMV.pct * 100, 1).replace('.', ',') + '%</span></div>');
          lines.push(row('MV – Z‑score', rkMV.z));
        }
        lines.push('<div class="small" style="opacity:.9;margin-top:.3rem"><em>Percentile: percentuale di giocatori del ruolo con metrica ≤ al valore. Z‑score: deviazioni standard dalla media.</em></div>');
      }
    }
    var det = [];
    if (OPTS.showDetails) {
      det.push(row('MV (Casa)', rec.mvc));
      det.push(row('MV (Fuori)', rec.mvf));
      det.push(row('FM (Casa)', rec.fmc));
      det.push(row('FM (Fuori)', rec.fmf));
      det.push(row('σ MV', rec.mvdst));
      det.push(row('σ FM', rec.fmdst));
    }
    el.innerHTML = parts.join('') + lines.join('') + (OPTS.showDetails ? ('<details class="small"><summary>Dettagli</summary><div class="card-body" style="padding:.6rem 0 0">' + det.join('') + '</div></details>') : '');
  }
  function renderPrev(rec, prevSeasonKey) {
    var el = $('#cardPrev');
    if (!rec) { el.innerHTML = '<div class="small">Nessun dato stagione precedente.</div>'; return; }
    var isP = (rec.r === 'P');
    var parts = [];
    parts.push(row('Squadra', rec.sq));
    parts.push(row('Ruolo', rec.r));
    parts.push(rowInt('Presenze', rec.p));
    parts.push(row('Affidabilità %', rec.aff, { percent: true }));
    parts.push(row('MV (Tot)', rec.mvt));
    parts.push(row('FM (Tot)', rec.fmt));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'GS'  : 'Gol',            isP ? 'gol_subiti'        : 'gol',         isP ? '🔴🧠' : '⚽'), isP ? rec.gs  : rec.gf));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'GSR' : 'Gol su Rigore',  isP ? 'gol_subiti_rigore' : 'gol_rigore',  isP ? '🅁🔴🧠' : '🅁⚽'), isP ? rec.gsr : rec.gfr));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'Rigori Parati' : 'Rigori Sbagliati', isP ? 'rigori_parati' : 'rigori_sbagliati', isP ? '🅁🟢🧠' : '🅁🔴⚽'), isP ? rec.rp : rec.rs));
    parts.push(rowHTMLInt(labelWithMark('Assist', 'assist', '🎯'), rec.as));
    parts.push(rowHTMLInt(labelWithMark('Autogol', 'autogol', '🔴⚽'), rec.ag));
    parts.push(rowHTMLInt(labelWithMark('Ammonizioni', 'ammonizioni', '🟡'), rec.a));
    parts.push(rowHTMLInt(labelWithMark('Espulsioni', 'espulsioni', '🟥'), rec.e));
    if (OPTS.showDelta) { parts.push(row('Δ squadra MV (σ)', rec.mvdlt)); parts.push(row('Δ squadra FM (σ)', rec.fmdlt)); }

    var lines = [];
    if (OPTS.showRolePos) {
      var y = seasonStr(prevSeasonKey);
      var rkFM = computeRankForSeason(PREV, 'fmt', rec.fmt, rec.r, OPTS.minPresRankPrev);
      var rkMV = computeRankForSeason(PREV, 'mvt', rec.mvt, rec.r, OPTS.minPresRankPrev);
      if (rkFM || rkMV) {
        lines.push('<div class="separator" style="border:none;margin:.4rem 0 0"></div>');
        lines.push('<div class="small"><strong>Posizione nel ruolo</strong> — ' + escapeHtml(y) + '</div>');
        if (rkFM) {
          lines.push('<div class="row"><span class="key">FM ' + escapeHtml(y) + ' – Percentile (' + rkFM.rank + '° su ' + rkFM.N + ')</span><span class="val">' + fmt(rkFM.pct * 100, 1).replace('.', ',') + '%</span></div>');
          lines.push(row('FM – Z‑score', rkFM.z));
        }
        if (rkMV) {
          lines.push('<div class="row"><span class="key">MV ' + escapeHtml(y) + ' – Percentile (' + rkMV.rank + '° su ' + rkMV.N + ')</span><span class="val">' + fmt(rkMV.pct * 100, 1).replace('.', ',') + '%</span></div>');
          lines.push(row('MV – Z‑score', rkMV.z));
        }
        lines.push('<div class="small" style="opacity:.9;margin-top:.3rem"><em>Percentile: percentuale di giocatori del ruolo con metrica ≤ al valore. Z‑score: deviazioni standard dalla media.</em></div>');
      }
    }
    var det = [];
    if (OPTS.showDetails) {
      det.push(row('MV (Casa)', rec.mvc));
      det.push(row('MV (Fuori)', rec.mvf));
      det.push(row('FM (Casa)', rec.fmc));
      det.push(row('FM (Fuori)', rec.fmf));
      det.push(row('σ MV', rec.mvdst));
      det.push(row('σ FM', rec.fmdst));
    }
    el.innerHTML = parts.join('') + lines.join('') + (OPTS.showDetails ? ('<details class="small"><summary>Dettagli</summary><div class="card-body" style="padding:.6rem 0 0">' + det.join('') + '</div></details>') : '');
  }
  function renderStorico(cod) {
    var el = $('#cardStorico');
    var found = [];
    SEASONS.forEach(function (s) {
      var rec = s.players.find(function (p) { return String(p.cod) === String(cod); });
      if (rec) found.push({ seasonStart: s.seasonStart, seasonKey: s.seasonKey, rec: rec });
    });
    if (!found.length) { el.innerHTML = '<div class="small">Nessun dato storico disponibile.</div>'; return; }

    var sel = new Set((OPTS.histSelSeasons && OPTS.histSelSeasons.length) ? OPTS.histSelSeasons : SEASONS.map(function (x) { return x.seasonKey; }));
    var filtered = found.filter(function (x) { return sel.has(x.seasonKey); });
    if (!filtered.length) { el.innerHTML = '<div class="small">Nessun dato storico per le stagioni selezionate.</div>'; return; }

    filtered.sort(function (a, b) { return a.seasonStart - b.seasonStart; });
    var n = filtered.length;
    var list = filtered.map(function (x) { return seasonStr(x.seasonKey); }).join(', ');
    var presTot = filtered.reduce(function (s, x) { return s + (Number(x.rec.p) || 0); }, 0);
    var mvNum = filtered.reduce(function (s, x) { return s + ((Number(x.rec.mvt) || 0) * (Number(x.rec.p) || 0)); }, 0);
    var fmNum = filtered.reduce(function (s, x) { return s + ((Number(x.rec.fmt) || 0) * (Number(x.rec.p) || 0)); }, 0);
    var mvW = presTot ? (mvNum / presTot) : null;
    var fmW = presTot ? (fmNum / presTot) : null;
    var r0 = filtered[0].rec || {};
    var isP = (r0.r === 'P');

    function sum(k) { return filtered.reduce(function (s, x) { return s + (Number(x.rec[k]) || 0); }, 0); }
    var gfTot = sum('gf'), asTot = sum('as'), agTot = sum('ag'), ammTot = sum('a'), espTot = sum('e');
    var gfrTot = sum('gfr'), rsTot = sum('rs');
    var gsTot = isP ? sum('gs') : null, gsrTot = isP ? sum('gsr') : null, rpTot = isP ? sum('rp') : null;

    var blocchi = [];
    blocchi.push('<div class="small"><strong>Stagioni</strong>: ' + escapeHtml(list) + ' • <strong>Anni</strong>: ' + n + '</div>');
    var dati = [];
    dati.push(rowInt('Presenze totali', presTot));
    dati.push(row('Pres. medie/stagione', n ? (presTot / n) : null));
    dati.push(row('MV pesata', mvW));
    dati.push(row('FM pesata', fmW));
    if (!isP) {
      dati.push(rowInt('Gol totali', gfTot));
      dati.push(rowInt('Gol su rigore totali', gfrTot));
      dati.push(rowInt('Rigori sbagliati totali', rsTot));
    } else {
      dati.push(rowInt('GS totali', gsTot));
      dati.push(rowInt('GSR totali', gsrTot));
      dati.push(rowInt('RP totali', rpTot));
    }
    dati.push(rowInt('Assist totali', asTot));
    if (!isP) { dati.push(rowInt('Autogol totali', agTot)); }
    dati.push(rowInt('Ammonizioni totali', ammTot));
    dati.push(rowInt('Espulsioni totali', espTot));
    blocchi.push('<div class="small" style="margin-top:.4rem"><strong>Dati statistici</strong></div>' + dati.join(''));

    if (OPTS.histShowBM) {
      var bm = [];
      if (!isP) {
        bm.push(row('Gol medi/stagione', n ? (gfTot / n) : null));
        bm.push(row('Gol su rigore medi/stagione', n ? (gfrTot / n) : null));
        bm.push(row('Rigori sbagliati medi/stagione', n ? (rsTot / n) : null));
      } else {
        bm.push(row('GS medi/stagione', n ? (gsTot / n) : null));
        bm.push(row('GSR medi/stagione', n ? (gsrTot / n) : null));
        bm.push(row('RP medi/stagione', n ? (rpTot / n) : null));
      }
      bm.push(row('Assist medi/stagione', n ? (asTot / n) : null));
      if (!isP) { bm.push(row('Autogol medi/stagione', n ? (agTot / n) : null)); }
      bm.push(row('Amm. medie/stagione', n ? (ammTot / n) : null));
      bm.push(row('Esp. medie/stagione', n ? (espTot / n) : null));
      blocchi.push('<div class="small" style="margin-top:.6rem"><strong>Bonus/malus</strong></div>' + bm.join(''));
    }

    if (OPTS.histShowPerPres) {
      var sp = [];
      if (!isP) {
        sp.push(row('Presenze per gol', gfTot > 0 ? presTot / gfTot : null));
        sp.push(row('Presenze per gol su rigore', (gfrTot > 0) ? presTot / gfrTot : null));
        sp.push(row('Presenze per rigore sbagliato', (rsTot > 0) ? presTot / rsTot : null));
      } else {
        sp.push(row('GS per presenza', (presTot > 0 && gsTot != null) ? (gsTot / presTot) : null));
        sp.push(row('GSR per presenza', (presTot > 0 && gsrTot != null) ? (gsrTot / presTot) : null));
        sp.push(row('Presenze per rigore parato', (rpTot > 0) ? (presTot / rpTot) : null));
      }
      sp.push(row('Presenze per assist', asTot > 0 ? presTot / asTot : null));
      if (!isP) { sp.push(row('Presenze per autogol', agTot > 0 ? presTot / agTot : null)); }
      sp.push(row('Presenze per amm.', ammTot > 0 ? presTot / ammTot : null));
      sp.push(row('Presenze per esp.', espTot > 0 ? presTot / espTot : null));
      blocchi.push('<div class="small" style="margin-top:.6rem"><strong>Statistiche per presenza</strong></div>' + sp.join(''));
    }
    el.innerHTML = blocchi.join('');
  }

  // ---------- Badge legacy "stagione precedente" (FM/MV/Aff + Ranking) ----------
  function buildRankingBadges(prevRec, idx) {
    var b = [];
    if (!prevRec) return b;
    var y = seasonStr(PREV.seasonKey);

    // Soglie MV/FM/Aff su stagione precedente
    if (Number(prevRec.mvt) >= OPTS.mvPrevBadge) addBadge(b, 'MV ' + y + ' ' + fmt(prevRec.mvt, 2), 'good', 'Soglia: ' + OPTS.mvPrevBadge);
    if (Number(prevRec.fmt) >= OPTS.fmPrevBadge) addBadge(b, 'FM ' + y + ' ' + fmt(prevRec.fmt, 2), 'good', 'Soglia: ' + OPTS.fmPrevBadge);
    var aff = prevRec.aff;
    var affPct = (aff != null ? (Number(aff) > 1 ? Number(aff) : Number(aff) * 100) : null);
    if (affPct != null && affPct >= OPTS.affPrevBadge) addBadge(b, 'Aff ' + y + ' ' + fmtPercent(aff), 'good', 'Soglia: ' + OPTS.affPrevBadge + '%');

    // Metrica ranking configurabile (solo per PREV)
    var mKey = (OPTS.rankBadgeMetric === 'MV') ? 'mvt' : 'fmt';
    var mLbl = (mKey === 'mvt') ? 'MV' : 'FM';
    var value = prevRec[mKey];
    var rk_prev = computeRankForSeason(PREV, mKey, value, prevRec.r, OPTS.minPresRankPrev);
    if (rk_prev) addBadge(b, 'Ranking ' + y + ' ' + prevRec.r + ': ' + rk_prev.rank + '°/' + rk_prev.N, 'info', mLbl + ' ' + y + ' – z=' + fmt(rk_prev.z) + '; pct=' + fmt(rk_prev.pct * 100, 1) + '%');

    // Se cambio ruolo, calcola anche il ranking nel nuovo
    if (idx && idx.changedRole && idx.ruolo && prevRec.r && idx.ruolo !== prevRec.r) {
      var rk_new = computeRankForSeason(PREV, mKey, value, idx.ruolo, OPTS.minPresRankPrev);
      if (rk_new) addBadge(b, 'Ranking ' + y + ' nuovo ' + idx.ruolo + ': ' + rk_new.rank + '°/' + rk_new.N, 'info', mLbl + ' ' + y + ' – z=' + fmt(rk_new.z) + '; pct=' + fmt(rk_new.pct * 100, 1) + '%');
    }
    return b;
  }

  // ---------- Nuovi badge: stagione a scelta ----------
  function buildSeasonRankingBadges(seasonObj, seasonRec) {
    var b = [];
    if (!seasonObj || !seasonRec) return b;
    var y = seasonStr(seasonObj.seasonKey);
    var isCurrent = (CUR && seasonObj.seasonKey === CUR.seasonKey);
    var minPres = isCurrent ? OPTS.minPresRankCur : OPTS.minPresRankPrev;

    var rkFM = computeRankForSeason(seasonObj, 'fmt', seasonRec.fmt, seasonRec.r, minPres);
    if (rkFM) addBadge(b, 'Rank FM ' + y + ' ' + rkFM.rank + '°/' + rkFM.N, 'info', 'FM ' + y + ' – z=' + fmt(rkFM.z) + '; pct=' + fmt(rkFM.pct * 100, 1) + '%');

    var rkMV = computeRankForSeason(seasonObj, 'mvt', seasonRec.mvtPerfetto, Maurizio—ecco **il file `app.js` completo** (versione *v1.2*), già comprensivo di:

- **Selettori anno**:  
  - `opt_rankBadgeSeason` (Rank **FM/MV** per stagione scelta, **mostrato per primo**).  
  - `opt_badgeSeasonValues` (badge **FM/MV** dell’anno scelto, con **soglie** esistenti).  
  - `opt_badgeSeasonAff` (badge **Aff** dell’anno scelto, con **soglia** esistente).  
- **Toggle** per la **stagione precedente** in testata:  
  - `opt_showPrevBadges` → ON = mostra *Cambio Ruolo / Cambio Squadra* + (eventuali) badge calcolati sulla **precedente**; OFF = **non mostra** nulla della precedente in **testata**.  
- **Card** “Posizione nel ruolo” e tutto il resto **immutato**.  
- **Compatibilità** con i JSON che già usi (`YYYY_YYYY+1.json`, `YYYY.json`, `YYYY-YYYY+1.json`) e discovery automatico in `/data`.

> **Importante (HTML)**: assicurati che in `index.html` ci siano *questi* ID nei controlli:  
> `opt_rankBadgeSeason`, `opt_badgeSeasonValues`, `opt_badgeSeasonAff`, `opt_showPrevBadges`, `opt_rankBadgeMetric` (oltre a quelli già presenti).  
> Se vuoi, dopo aver incollato `app.js`, ti mando anche **l’`index.html` completo** allineato.

---

## `app.js` (incolla tutto)

```js
// AstaMasterPro v9c2 — app.js (ROOT) [patch v1.2: selettori anno per badge + toggle badge "stagione precedente"]
(function () {
  'use strict';

  // --- PATHS / STATE ---------------------------------------------------------
  var DATA_DIRS = ['data/']; // cartella dati
  var IMG_BASE = 'img/';     // cartella immagini
  var THEME_KEY = 'amp-theme';

  var $ = function (s) { return document.querySelector(s); };

  var SELECTED_COD = null, SEASONS = [], CUR = null, PREV = null, INDEX = [];
  var ROLE_CACHE = {}; // ROLE_CACHE[seasonKey][role][metric__minPres]

  // --- UTILS FORMATTING ------------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>\"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function fmt(v, d) { if (d === void 0) d = 2; if (v == null) return '—'; var n = Number(v); return isFinite(n) ? n.toFixed(d).replace('.', ',') : String(v); }
  function fmtInt(v) { if (v == null) return '—'; var n = Number(v); return isFinite(n) ? String(Math.round(n)) : String(v); }
  function fmtPercent(x) { if (x == null) return '—'; var v = Number(x); if (!isFinite(v)) return String(x); if (v <= 1) v *= 100; return (v.toFixed(1) + '%').replace('.', ','); }
  function norm(s){ try{ return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }catch(e){ return String(s==null?'':s).toLowerCase().trim(); } }
  function highlightMatch(t, q) {
    var lt = String(t == null ? '' : t), qq = String(q == null ? '' : q);
    var i = lt.toLowerCase().indexOf(qq.toLowerCase());
    if (i < 0) return escapeHtml(lt);
    var e = i + qq.length;
    return escapeHtml(lt.slice(0, i)) + '<mark>' + escapeHtml(lt.slice(i, e)) + '</mark>' + escapeHtml(lt.slice(e));
  }
  function seasonStr(key) { return String(key || '').replace('_','/').replace('-','/'); }

  // --- FOTO GIOCATORE --------------------------------------------------------
  var PHOTO_EXTS = ['jpg','png','webp'];
  function setPlayerPhoto(cod){
    var img = $('#playerPhoto'); if (!img) return;
    var i = 0; function next(){ if (i >= PHOTO_EXTS.length) { img.src = IMG_BASE + 'placeholder.svg'; return; } img.src = IMG_BASE + cod + '.' + PHOTO_EXTS[i++]; }
    img.onerror = next; next();
  }

  // --- SWITCH TEMA -----------------------------------------------------------
  var TGL_KEYS = { cur:'toggle-current', prev:'toggle-prev', hist:'toggle-storico' };
  function applyTheme(mode){ document.documentElement.setAttribute('data-theme', mode); var sw = $('#switchTheme'); if (sw) sw.checked = (mode === 'dark'); }
  function setupTheme(){
    var saved = localStorage.getItem(THEME_KEY);
    applyTheme((saved === 'light' || saved === 'dark') ? saved : 'dark');
    var sw = $('#switchTheme');
    if (sw) sw.addEventListener('change', function(e){ var mode = e.target.checked ? 'dark' : 'light'; applyTheme(mode); localStorage.setItem(THEME_KEY, mode); });
  }

  // --- TOGGLE VISIBILITÀ CARD ------------------------------------------------
  function applyToggles(){
    var bCur = localStorage.getItem(TGL_KEYS.cur)  !== 'off';
    var bPrev= localStorage.getItem(TGL_KEYS.prev) !== 'off';
    var bHist= localStorage.getItem(TGL_KEYS.hist) !== 'off';
    var el;
    el = $('#switchCurrent'); if (el) el.checked = bCur;
    el = $('#wrapCurrent');  if (el) el.classList.toggle('hidden', !bCur);
    el = $('#switchPrev');   if (el) el.checked = bPrev;
    el = $('#wrapPrev');     if (el) el.classList.toggle('hidden', !bPrev);
    el = $('#switchStorico');if (el) el.checked = bHist;
    el = $('#wrapStorico');  if (el) el.classList.toggle('hidden', !bHist);
  }
  function setupToggles(){
    var el;
    el = $('#switchCurrent'); if (el) el.addEventListener('change', e => { localStorage.setItem(TGL_KEYS.cur,  e.target.checked ? 'on':'off'); applyToggles(); });
    el = $('#switchPrev');    if (el) el.addEventListener('change', e => { localStorage.setItem(TGL_KEYS.prev, e.target.checked ? 'on':'off'); applyToggles(); });
    el = $('#switchStorico'); if (el) el.addEventListener('change', e => { localStorage.setItem(TGL_KEYS.hist, e.target.checked ? 'on':'off'); applyToggles(); });
    applyToggles();
  }

  // --- OPZIONI PERSISTENTI ---------------------------------------------------
  var OPT_KEYS = {
    minPresRankCur: 'amp-minPresRankCur',
    minPresRankPrev:'amp-minPresRankPrev',
    mvPrevBadge:    'amp-mvPrevBadge',
    fmPrevBadge:    'amp-fmPrevBadge',
    affPrevBadge:   'amp-affPrevBadge',
    showDelta:      'amp-showDelta',
    showDetails:    'amp-showDetails',
    histShowBM:     'amp-histShowBM',
    histShowPerPres:'amp-histShowPerPres',
    histSelSeasons: 'amp-histSelSeasons',
    useIndicators:  'amp-useIndicators',
    rankBadgeMetric:'amp-rankBadgeMetric',
    showRolePos:    'amp-showRolePos',
    // v1.2: selettori anno + toggle badge prev
    rankBadgeSeason:   'amp-rankBadgeSeason',    // Rank FM/MV – stagione scelta
    badgeSeasonValues: 'amp-badgeSeasonValues',  // FM/MV – stagione scelta
    badgeSeasonAff:    'amp-badgeSeasonAff',     // Aff – stagione scelta
    showPrevBadges:    'amp-showPrevBadges'      // ON/OFF badge legati alla "stagione precedente" in testata
  };
  var OPTS = null;

  function loadOptions(){
    function qn(k,d){ var v = localStorage.getItem(k); if (v==null) return d; var n = Number(v); return isFinite(n) ? n : d; }
    function qb(k,d){ var v = localStorage.getItem(k); if (v==null) return d; return v === '1'; }
    function qarr(k,d){ var v = localStorage.getItem(k); try { return v ? JSON.parse(v) : d; } catch(e){ return d; } }
    function qs(k,d){ var v = localStorage.getItem(k); return (v==null) ? d : v; }

    var o = {
      minPresRankCur: qn(OPT_KEYS.minPresRankCur,10),
      minPresRankPrev:qn(OPT_KEYS.minPresRankPrev,10),
      mvPrevBadge:    qn(OPT_KEYS.mvPrevBadge,6.20),
      fmPrevBadge:    qn(OPT_KEYS.fmPrevBadge,6.50),
      affPrevBadge:   qn(OPT_KEYS.affPrevBadge,70),
      showDelta:      qb(OPT_KEYS.showDelta,true),
      showDetails:    qb(OPT_KEYS.showDetails,true),
      histShowBM:     qb(OPT_KEYS.histShowBM,true),
      histShowPerPres:qb(OPT_KEYS.histShowPerPres,true),
      histSelSeasons: qarr(OPT_KEYS.histSelSeasons,[]),
      useIndicators:  qb(OPT_KEYS.useIndicators,false),
      showRolePos:    qb(OPT_KEYS.showRolePos,true),
      rankBadgeMetric:(localStorage.getItem(OPT_KEYS.rankBadgeMetric) || 'FM'),
      // v1.2
      rankBadgeSeason:   qs(OPT_KEYS.rankBadgeSeason,""),
      badgeSeasonValues: qs(OPT_KEYS.badgeSeasonValues,""),
      badgeSeasonAff:    qs(OPT_KEYS.badgeSeasonAff,""),
      showPrevBadges:    qb(OPT_KEYS.showPrevBadges,true)
    };

    function set(id, val, isC){ var el = $('#'+id); if (!el) return; if (isC) el.checked = !!val; else el.value = val; }
    set('opt_minPresRankCur', o.minPresRankCur);
    set('opt_minPresRankPrev',o.minPresRankPrev);
    set('opt_mvPrevBadge',    o.mvPrevBadge);
    set('opt_fmPrevBadge',    o.fmPrevBadge);
    set('opt_affPrevBadge',   o.affPrevBadge);
    set('opt_showDelta',      o.showDelta,true);
    set('opt_showDetails',    o.showDetails,true);
    set('opt_histShowBM',     o.histShowBM,true);
    set('opt_histShowPerPres',o.histShowPerPres,true);
    set('opt_useIndicators',  o.useIndicators,true);
    set('opt_showRolePos',    o.showRolePos,true);
    set('opt_rankBadgeMetric',o.rankBadgeMetric);
    // v1.2
    set('opt_rankBadgeSeason',   o.rankBadgeSeason);
    set('opt_badgeSeasonValues', o.badgeSeasonValues);
    set('opt_badgeSeasonAff',    o.badgeSeasonAff);
    set('opt_showPrevBadges',    o.showPrevBadges, true);

    return o;
  }

  function persistOptions(){
    localStorage.setItem(OPT_KEYS.minPresRankCur, String(OPTS.minPresRankCur));
    localStorage.setItem(OPT_KEYS.minPresRankPrev,String(OPTS.minPresRankPrev));
    localStorage.setItem(OPT_KEYS.mvPrevBadge,    String(OPTS.mvPrevBadge));
    localStorage.setItem(OPT_KEYS.fmPrevBadge,    String(OPTS.fmPrevBadge));
    localStorage.setItem(OPT_KEYS.affPrevBadge,   String(OPTS.affPrevBadge));
    localStorage.setItem(OPT_KEYS.showDelta,      OPTS.showDelta?'1':'0');
    localStorage.setItem(OPT_KEYS.showDetails,    OPTS.showDetails?'1':'0');
    localStorage.setItem(OPT_KEYS.histShowBM,     OPTS.histShowBM?'1':'0');
    localStorage.setItem(OPT_KEYS.histShowPerPres,OPTS.histShowPerPres?'1':'0');
    localStorage.setItem(OPT_KEYS.histSelSeasons, JSON.stringify(OPTS.histSelSeasons||[]));
    localStorage.setItem(OPT_KEYS.useIndicators,  OPTS.useIndicators?'1':'0');
    localStorage.setItem(OPT_KEYS.showRolePos,    OPTS.showRolePos?'1':'0');
    localStorage.setItem(OPT_KEYS.rankBadgeMetric,OPTS.rankBadgeMetric);
    // v1.2
    localStorage.setItem(OPT_KEYS.rankBadgeSeason,   OPTS.rankBadgeSeason||'');
    localStorage.setItem(OPT_KEYS.badgeSeasonValues, OPTS.badgeSeasonValues||'');
    localStorage.setItem(OPT_KEYS.badgeSeasonAff,    OPTS.badgeSeasonAff||'');
    localStorage.setItem(OPT_KEYS.showPrevBadges,    OPTS.showPrevBadges?'1':'0');
  }

  function populateHistSeasonOptions(){
    var host = $('#opt_histSeasons'); if (!host) return;
    host.innerHTML = '';
    if (!SEASONS.length) { host.textContent = '—'; return; }

    if (!OPTS.histSelSeasons || !OPTS.histSelSeasons.length) {
      OPTS.histSelSeasons = SEASONS.map(function (s) { return s.seasonKey; });
      persistOptions();
    }
    SEASONS.forEach(function (s) {
      var id = 'opt_hist_' + s.seasonKey;
      var label = document.createElement('label');
      label.style.display = 'block'; label.style.margin = '.15rem 0';
      label.innerHTML = '<input type="checkbox" id="'+id+'"> ' + seasonStr(s.seasonKey);
      host.appendChild(label);
      var cb = label.querySelector('input');
      cb.checked = OPTS.histSelSeasons.indexOf(s.seasonKey) >= 0;
      cb.addEventListener('change', function(){
        var set = new Set(OPTS.histSelSeasons || []);
        if (cb.checked) set.add(s.seasonKey); else set.delete(s.seasonKey);
        OPTS.histSelSeasons = Array.from(set);
        persistOptions(); if (SELECTED_COD) selectPlayer(SELECTED_COD);
      });
    });
  }

  // Popola i tre select con stagioni realmente caricate; default = ultima disponibile
  function populateAllBadgeSeasonOptions(){
    var map = [
      { id:'opt_rankBadgeSeason',   key:'rankBadgeSeason'   },
      { id:'opt_badgeSeasonValues', key:'badgeSeasonValues' },
      { id:'opt_badgeSeasonAff',    key:'badgeSeasonAff'    }
    ];
    map.forEach(function(m){
      var el = document.querySelector('#'+m.id); if (!el) return;
      el.innerHTML = '';
      var optNone = document.createElement('option'); optNone.value = ''; optNone.textContent = 'Nessuna'; el.appendChild(optNone);

      SEASONS.forEach(function (s) {
        var o = document.createElement('option'); o.value = s.seasonKey; o.textContent = seasonStr(s.seasonKey); el.appendChild(o);
      });

      var lastKey = SEASONS.length ? SEASONS[SEASONS.length-1].seasonKey : '';
      var sel = OPTS[m.key] || lastKey || '';
      if (sel && !SEASONS.some(function(x){ return x.seasonKey === sel; })) sel = '';
      el.value = sel; OPTS[m.key] = sel;
    });
    persistOptions();
  }

  function setupOptions(){
    OPTS = loadOptions();

    function syncNums(){
      OPTS.minPresRankCur  = Number($('#opt_minPresRankCur').value)  || 10;
      OPTS.minPresRankPrev = Number($('#opt_minPresRankPrev').value) || 10;
      OPTS.mvPrevBadge     = Number($('#opt_mvPrevBadge').value)     || 6.20;
      OPTS.fmPrevBadge     = Number($('#opt_fmPrevBadge').value)     || 6.50;
      OPTS.affPrevBadge    = Number($('#opt_affPrevBadge').value)    || 70;
      persistOptions(); if (SELECTED_COD) selectPlayer(SELECTED_COD);
    }
    function syncBools(){
      OPTS.showDelta        = $('#opt_showDelta').checked;
      OPTS.showDetails      = $('#opt_showDetails').checked;
      OPTS.histShowBM       = $('#opt_histShowBM').checked;
      OPTS.histShowPerPres  = $('#opt_histShowPerPres').checked;
      OPTS.useIndicators    = $('#opt_useIndicators').checked;
      OPTS.showRolePos      = $('#opt_showRolePos').checked;
      OPTS.showPrevBadges   = $('#opt_showPrevBadges') ? $('#opt_showPrevBadges').checked : true;
      persistOptions(); if (SELECTED_COD) selectPlayer(SELECTED_COD);
    }

    ['opt_minPresRankCur','opt_minPresRankPrev','opt_mvPrevBadge','opt_fmPrevBadge','opt_affPrevBadge']
      .forEach(function(id){ var el = $('#'+id); if (el) el.addEventListener('change', syncNums); });

    ['opt_showDelta','opt_showDetails','opt_histShowBM','opt_histShowPerPres','opt_useIndicators','opt_showRolePos','opt_showPrevBadges']
      .forEach(function(id){ var el = $('#'+id); if (el) el.addEventListener('change', syncBools); });

    var selRankMetric = document.querySelector('#opt_rankBadgeMetric');
    if (selRankMetric) selRankMetric.addEventListener('change', function(){
      OPTS.rankBadgeMetric = (selRankMetric.value === 'MV') ? 'MV' : 'FM';
      persistOptions(); if (SELECTED_COD) selectPlayer(SELECTED_COD);
    });

    function bindSel(id,key){
      var el = document.querySelector('#'+id); if (!el) return;
      el.addEventListener('change', function(){ OPTS[key] = el.value || ''; persistOptions(); if (SELECTED_COD) selectPlayer(SELECTED_COD); });
    }
    bindSel('opt_rankBadgeSeason','rankBadgeSeason');
    bindSel('opt_badgeSeasonValues','badgeSeasonValues');
    bindSel('opt_badgeSeasonAff','badgeSeasonAff');

    function close(){ var d = document.querySelector('details.options'); if (d) d.removeAttribute('open'); }
    var b = $('#btnCloseOptions');    if (b) b.addEventListener('click', close);
    b = $('#btnCloseOptionsTop');     if (b) b.addEventListener('click', close);

    var r = $('#btnResetOptions');
    if (r) r.addEventListener('click', function(){
      Object.keys(OPT_KEYS).forEach(function(k){ localStorage.removeItem(OPT_KEYS[k]); });
      Object.keys(TGL_KEYS).forEach(function(k){ localStorage.removeItem(TGL_KEYS[k]); });
      localStorage.removeItem(THEME_KEY);
      OPTS = loadOptions(); setupTheme(); applyToggles();
      populateHistSeasonOptions(); populateAllBadgeSeasonOptions();
      if (SELECTED_COD) selectPlayer(SELECTED_COD);
      alert('Impostazioni ripristinate.');
    });

    return OPTS;
  }

  // --- DISCOVERY STAGIONI / DATA LAYER --------------------------------------
  function candidateSeasonKeys(){ var y = (new Date()).getFullYear(); var keys=[]; for (var yy=y-8; yy<=y+1; yy++){ keys.push(yy+'_'+(yy+1)); } return keys.reverse(); }
  function fileCandidatesFor(key){ var start = Number(String(key).split('_')[0]), next = start + 1; return [key+'.json', start+'.json', (String(start)+'-'+String(next)+'.json')]; }

  function normRow(obj){
    var R = String(obj['R'] || obj['ruolo'] || obj['r'] || '').toUpperCase();
    var isP = (R === 'P');
    function takef(k){ var v = obj[k]; if (v === '' || v == null) return null; var n = Number(v); return isFinite(n) ? n : v; }
    function takei(k){ var v = obj[k]; if (v === '' || v == null) return 0; var n = Number(v); return isFinite(n) ? Math.trunc(n) : 0; }
    return {
      cod: obj['COD'] || obj['cod'] || obj['Cod'] || obj['Id'] || obj['ID'],
      nome: obj['Nome'] || obj['nome'],
      sq: obj['Sq'] || obj['squadra'] || obj['Sq.'] || obj['Team'],
      r: R, p: takei('P'), aff: takef('Aff%'),
      mvt: takef('MVT'), fmt: takef('FMT'),
      mvc: takef('MVC'), mvf: takef('MVF'),
      fmc: takef('FMC'), fmf: takef('FMF'),
      mvdst: takef('MVDSt'), mvdlt: takef('MVDlt'),
      fmdst: takef('FMDSt'), fmdlt: takef('FMDlt'),
      gf: takei('GF'), gfr: takei('GFR'), rs: takei('RS'),
      as: takei('AS'), ag: takei('AG'), a: takei('A'), e: takei('E'),
      gs: isP ? takei('GS') : null, gsr: isP ? takei('GSR') : null, rp: isP ? takei('RP') : null
    };
  }

  function parseRaw(raw){
    var rows = [];
    if (Array.isArray(raw)) rows = raw;
    else if (raw && Array.isArray(raw.players)) {
      if (Array.isArray(raw.columns) && Array.isArray(raw.players[0])) {
        var cols = raw.columns;
        rows = raw.players.map(function(r){ var o={}; for (var i=0;i<cols.length;i++) o[cols[i]] = (r[i]==null ? null : r[i]); return o; });
      } else rows = raw.players;
    } else return null;
    return rows.map(normRow).filter(function(r){ return r.cod && r.nome; });
  }

  function tryFetch(path){
    return fetch(path, { cache:'no-store' })
      .then(function(res){ if (!res.ok) return null; return res.json(); })
      .catch(function(err){ console.warn('fetch failed', path, err); return null; });
  }

  async function loadSeasonAuto(key){
    for (var d=0; d<DATA_DIRS.length; d++){
      var dir = DATA_DIRS[d], files = fileCandidatesFor(key);
      for (var i=0; i<files.length; i++){
        var path = dir + files[i], raw = await tryFetch(path);
        if (raw){
          var rows = parseRaw(raw); if (!rows) continue;
          var start = Number(String(key).split('_')[0]);
          return { seasonKey:key, seasonStart:start, players:rows, _path:path };
        }
      }
    }
    return null;
  }

  async function discoverSeasons(){
    var keys = candidateSeasonKeys(), out = [];
    for (var i=0; i<keys.length; i++){ var s = await loadSeasonAuto(keys[i]); if (s) out.push(s); }
    out.sort(function(a,b){ return a.seasonStart - b.seasonStart; });
    if (!out.length) console.error('Nessuna stagione trovata in /data (nomi accettati: YYYY_YYYY+1.json, YYYY.json, YYYY-YYYY+1.json)');
    else console.log('Stagioni caricate:', out.map(function(x){ return x._path; }));
    return out;
  }

  function buildIndex(){
    INDEX = [];
    var prevMap = new Map();
    if (PREV) PREV.players.forEach(function(p){ prevMap.set(String(p.cod), p); });
    if (!CUR) return;
    CUR.players.forEach(function(c){
      var pr = prevMap.get(String(c.cod));
      var changedRole = !!(pr && pr.r && c.r && pr.r !== c.r);
      var changedTeam = !!(pr && pr.sq && c.sq && pr.sq !== c.sq);
      INDEX.push({
        cod:String(c.cod), nome:c.nome, ruolo:c.r, squadra:c.sq,
        prevRuolo: pr?pr.r:null, prevSquadra: pr?pr.sq:null,
        changedRole: changedRole, changedTeam: changedTeam
      });
    });
  }

  // --- SEARCH UI -------------------------------------------------------------
  function hideResults(){ var p = $('#panelResults'); if (p) p.classList.add('hidden'); }
  function showResults(){ var p = $('#panelResults'); if (p) p.classList.remove('hidden'); }

  function renderResults(items, q){
    var ul = $('#results'); if (!ul) return; ul.innerHTML = '';
    items.slice(0,120).forEach(function(item){
      var li = document.createElement('li');
      li.className = 'result-item'; li.setAttribute('role','option'); li.tabIndex = 0;
      var title = '<span class="result-title">'+highlightMatch(item.nome, q)+'</span>';
      var meta  = '<span class="result-meta">'+escapeHtml(item.ruolo)+' · '+escapeHtml(item.squadra)+'</span>';
      var badges = [];
      if (item.changedRole)  badges.push('<span class="badge warn" title="Cambio ruolo vs Stag. prec.">Cambio Ruolo</span>');
      if (item.changedTeam)  badges.push('<span class="badge alert" title="Cambio squadra vs Stag. prec.">Cambio Squadra</span>');
      li.innerHTML = title + '<span>' + meta + ' ' + badges.join(' ') + '</span>';
      li.addEventListener('click',   function(){ selectPlayer(item.cod); });
      li.addEventListener('keydown', function(e){ if (e.key === 'Enter') selectPlayer(item.cod); });
      ul.appendChild(li);
    });
  }

  function search(q){
    var nq = norm(q), ul = $('#results');
    if (!nq){ if (ul) ul.innerHTML = ''; return; }
    var res = INDEX.filter(function(x){ return norm(x.nome).includes(nq); });
    renderResults(res, q);
  }

  // --- ICON / LABEL ----------------------------------------------------------
  function iconOrIndicator(iconKey, indicator){
    if (OPTS.useIndicators) return (indicator ? indicator+' ' : '');
    if (!iconKey) return '';
    return '<img src="'+IMG_BASE+'ico/'+iconKey+'.svg" class="ico stat" alt="" onerror="this.style.display=\'none\'"> ';
  }
  function labelWithMark(text, iconKey, indicator){ return iconOrIndicator(iconKey, indicator) + escapeHtml(text); }

  // --- RANKING (CACHE PER RUOLO) --------------------------------------------
  function ensureRoleCache(seasonKey){ if (!ROLE_CACHE[seasonKey]) ROLE_CACHE[seasonKey] = {}; return ROLE_CACHE[seasonKey]; }
  function getRoleDistribution(seasonObj, role, metric, minPres){
    if (!seasonObj) return null;
    var seasonKey = seasonObj.seasonKey, r = String(role||'').toUpperCase(); if (!r) return null;
    var cacheSeason = ensureRoleCache(seasonKey); if (!cacheSeason[r]) cacheSeason[r] = {};
    var key = metric+'__'+String(minPres);
    if (!cacheSeason[r][key]){
      var vals = seasonObj.players
        .filter(function(p){ return (p.r === r) && ((Number(p.p)||0) >= (minPres||0)); })
        .map(function(p){ return Number(p[metric]); })
        .filter(function(n){ return isFinite(n); })
        .sort(function(a,b){ return a - b; });
      var N = vals.length, mean = N ? vals.reduce(function(a,b){ return a+b; },0) / N : 0;
      var variance = N ? vals.reduce(function(s,x){ var d=x-mean; return s+d*d; },0) / N : 0;
      var std = Math.sqrt(variance);
      cacheSeason[r][key] = { vals: vals, N: N, mean: mean, std: std };
    }
    return cacheSeason[r][key];
  }

  function computeRankForSeason(seasonObj, metric, value, role, minPres){
    try{
      var v = Number(value); if (!isFinite(v)) return null;
      var dist = getRoleDistribution(seasonObj, role, metric, minPres); if (!dist || !dist.N) return null;
      var vals = dist.vals, N = dist.N, mean = dist.mean, std = dist.std;
      var less = 0, equal = 0, eps = 1e-9;
      for (var i=0;i<vals.length;i++){ var x = vals[i]; if (x < v-eps) less++; else if (Math.abs(x-v) <= eps) equal++; }
      var mid = less + 0.5*equal, pct = mid / N, z = std>0 ? (v-mean)/std : 0;
      var rank = Math.max(1, N - (less + equal) + 1); // ex-aequo → stessa posizione
      return { pct:pct, z:z, N:N, rank:rank };
    }catch(e){ return null; }
  }

  // --- UI HELPERS ------------------------------------------------------------
  function addBadge(arr, text, cls, title){ if (cls === void 0) cls = 'info'; arr.push('<span class="badge '+cls+'"' + (title ? (' title="'+escapeHtml(title)+'"') : '') + '>'+escapeHtml(text)+'</span>'); }
  function row(label, value, opts){ opts = opts || {}; var display = opts.percent ? fmtPercent(value) : fmt(value); return '<div class="row"><span class="key">'+escapeHtml(label)+'</span><span class="val">'+display+'</span></div>'; }
  function rowInt(label, value){ return '<div class="row"><span class="key">'+escapeHtml(label)+'</span><span class="val">'+fmtInt(value)+'</span></div>'; }
  function rowHTML(labelHtml, value, opts){ opts = opts || {}; var display = opts.percent ? fmtPercent(value) : fmt(value); return '<div class="row"><span class="key">'+labelHtml+'</span><span class="val">'+display+'</span></div>'; }
  function rowHTMLInt(labelHtml, value){ return '<div class="row"><span class="key">'+labelHtml+'</span><span class="val">'+fmtInt(value)+'</span></div>'; }

  // --- RENDER CARD: STAGIONE CORRENTE ---------------------------------------
  function renderCurrent(rec){
    var el = $('#cardCurrent');
    if (!rec){ el.innerHTML = '<div class="small">Giocatore non trovato nella stagione corrente.</div>'; return; }
    var isP = (rec.r === 'P');
    var parts = [];
    parts.push(row('Squadra', rec.sq));
    parts.push(row('Ruolo', rec.r));
    parts.push(rowInt('Presenze', rec.p));
    parts.push(row('Affidabilità %', rec.aff, {percent:true}));
    parts.push(row('MV (Tot)', rec.mvt));
    parts.push(row('FM (Tot)', rec.fmt));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'GS' : 'Gol', isP ? 'gol_subiti' : 'gol', isP ? '🔴🧠' : '⚽'), isP ? rec.gs : rec.gf));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'GSR' : 'Gol su Rigore', isP ? 'gol_subiti_rigore' : 'gol_rigore', isP ? '🅁🔴🧠' : '🅁⚽'), isP ? rec.gsr : rec.gfr));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'Rigori Parati' : 'Rigori Sbagliati', isP ? 'rigori_parati' : 'rigori_sbagliati', isP ? '🅁🟢🧠' : '🅁🔴⚽'), isP ? rec.rp : rec.rs));
    parts.push(rowHTMLInt(labelWithMark('Assist', 'assist', '🎯'), rec.as));
    parts.push(rowHTMLInt(labelWithMark('Autogol', 'autogol', '🔴⚽'), rec.ag));
    parts.push(rowHTMLInt(labelWithMark('Ammonizioni', 'ammonizioni', '🟡'), rec.a));
    parts.push(rowHTMLInt(labelWithMark('Espulsioni', 'espulsioni', '🟥'), rec.e));
    if (OPTS.showDelta){ parts.push(row('Δ squadra MV (σ)', rec.mvdlt)); parts.push(row('Δ squadra FM (σ)', rec.fmdlt)); }

    var lines = [];
    if (OPTS.showRolePos){
      var y = seasonStr(CUR.seasonKey);
      var rkFM = computeRankForSeason(CUR, 'fmt', rec.fmt, rec.r, OPTS.minPresRankCur);
      var rkMV = computeRankForSeason(CUR, 'mvt', rec.mvt, rec.r, OPTS.minPresRankCur);
      if (rkFM || rkMV){
        lines.push('<div class="separator" style="border:none;margin:.4rem 0 0"></div>');
        lines.push('<div class="small"><strong>Posizione nel ruolo</strong> — '+escapeHtml(y)+'</div>');
        if (rkFM){
          lines.push('<div class="row"><span class="key">FM '+escapeHtml(y)+' – Percentile ('+rkFM.rank+'° su '+rkFM.N+')</span><span class="val">'+fmt(rkFM.pct*100,1).replace('.', ',')+'%</span></div>');
          lines.push(row('FM – Z‑score', rkFM.z));
        }
        if (rkMV){
          lines.push('<div class="row"><span class="key">MV '+escapeHtml(y)+' – Percentile ('+rkMV.rank+'° su '+rkMV.N+')</span><span class="val">'+fmt(rkMV.pct*100,1).replace('.', ',')+'%</span></div>');
          lines.push(row('MV – Z‑score', rkMV.z));
        }
        lines.push('<div class="small" style="opacity:.9;margin-top:.3rem"><em>Percentile: percentuale di giocatori del ruolo con metrica ≤ al valore. Z‑score: deviazioni standard dalla media.</em></div>');
      }
    }
    var det = [];
    if (OPTS.showDetails){
      det.push(row('MV (Casa)', rec.mvc));
      det.push(row('MV (Fuori)', rec.mvf));
      det.push(row('FM (Casa)', rec.fmc));
      det.push(row('FM (Fuori)', rec.fmf));
      det.push(row('σ MV', rec.mvdst));
      det.push(row('σ FM', rec.fmdst));
    }
    el.innerHTML = parts.join('') + lines.join('') + (OPTS.showDetails ? ('<details class="small"><summary>Dettagli</summary><div class="card-body" style="padding:.6rem 0 0">'+det.join('')+'</div></details>') : '');
  }

  // --- RENDER CARD: STAGIONE PRECEDENTE -------------------------------------
  function renderPrev(rec, prevSeasonKey){
    var el = $('#cardPrev');
    if (!rec){ el.innerHTML = '<div class="small">Nessun dato stagione precedente.</div>'; return; }
    var isP = (rec.r === 'P');
    var parts = [];
    parts.push(row('Squadra', rec.sq));
    parts.push(row('Ruolo', rec.r));
    parts.push(rowInt('Presenze', rec.p));
    parts.push(row('Affidabilità %', rec.aff, {percent:true}));
    parts.push(row('MV (Tot)', rec.mvt));
    parts.push(row('FM (Tot)', rec.fmt));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'GS' : 'Gol', isP ? 'gol_subiti' : 'gol', isP ? '🔴🧠' : '⚽'), isP ? rec.gs : rec.gf));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'GSR' : 'Gol su Rigore', isP ? 'gol_subiti_rigore' : 'gol_rigore', isP ? '🅁🔴🧠' : '🅁⚽'), isP ? rec.gsr : rec.gfr));
    parts.push(rowHTMLInt(labelWithMark(isP ? 'Rigori Parati' : 'Rigori Sbagliati', isP ? 'rigori_parati' : 'rigori_sbagliati', isP ? '🅁🟢🧠' : '🅁🔴⚽'), isP ? rec.rp : rec.rs));
    parts.push(rowHTMLInt(labelWithMark('Assist', 'assist', '🎯'), rec.as));
    parts.push(rowHTMLInt(labelWithMark('Autogol', 'autogol', '🔴⚽'), rec.ag));
    parts.push(rowHTMLInt(labelWithMark('Ammonizioni', 'ammonizioni', '🟡'), rec.a));
    parts.push(rowHTMLInt(labelWithMark('Espulsioni', 'espulsioni', '🟥'), rec.e));
    if (OPTS.showDelta){ parts.push(row('Δ squadra MV (σ)', rec.mvdlt)); parts.push(row('Δ squadra FM (σ)', rec.fmdlt)); }

    var lines = [];
    if (OPTS.showRolePos){
      var y = seasonStr(prevSeasonKey);
      var rkFM = computeRankForSeason(PREV, 'fmt', rec.fmt, rec.r, OPTS.minPresRankPrev);
      var rkMV = computeRankForSeason(PREV, 'mvt', rec.mvt, rec.r, OPTS.minPresRankPrev);
      if (rkFM || rkMV){
        lines.push('<div class="separator" style="border:none;margin:.4rem 0 0"></div>');
        lines.push('<div class="small"><strong>Posizione nel ruolo</strong> — '+escapeHtml(y)+'</div>');
        if (rkFM){
          lines.push('<div class="row"><span class="key">FM '+escapeHtml(y)+' – Percentile ('+rkFM.rank+'° su '+rkFM.N+')</span><span class="val">'+fmt(rkFM.pct*100,1).replace('.', ',')+'%</span></div>');
          lines.push(row('FM – Z‑score', rkFM.z));
        }
        if (rkMV){
          lines.push('<div class="row"><span class="key">MV '+escapeHtml(y)+' – Percentile ('+rkMV.rank+'° su '+rkMV.N+')</span><span class="val">'+fmt(rkMV.pct*100,1).replace('.', ',')+'%</span></div>');
          lines.push(row('MV – Z‑score', rkMV.z));
        }
        lines.push('<div class="small" style="opacity:.9;margin-top:.3rem"><em>Percentile: percentuale di giocatori del ruolo con metrica ≤ al valore. Z‑score: deviazioni standard dalla media.</em></div>');
      }
    }
    var det = [];
    if (OPTS.showDetails){
      det.push(row('MV (Casa)', rec.mvc));
      det.push(row('MV (Fuori)', rec.mvf));
      det.push(row('FM (Casa)', rec.fmc));
      det.push(row('FM (Fuori)', rec.fmf));
      det.push(row('σ MV', rec.mvdst));
      det.push(row('σ FM', rec.fmdst));
    }
    el.innerHTML = parts.join('') + lines.join('') + (OPTS.showDetails ? ('<details class="small"><summary>Dettagli</summary><div class="card-body" style="padding:.6rem 0 0">'+det.join('')+'</div></details>') : '');
  }

  // --- RENDER CARD: STORICO --------------------------------------------------
  function renderStorico(cod){
    var el = $('#cardStorico');
    var found = [];
    SEASONS.forEach(function(s){
      var rec = s.players.find(function(p){ return String(p.cod) === String(cod); });
      if (rec) found.push({ seasonStart:s.seasonStart, seasonKey:s.seasonKey, rec:rec });
    });
    if (!found.length){ el.innerHTML = '<div class="small">Nessun dato storico disponibile.</div>'; return; }

    var sel = new Set((OPTS.histSelSeasons && OPTS.histSelSeasons.length) ? OPTS.histSelSeasons : SEASONS.map(function(x){ return x.seasonKey; }));
    var filtered = found.filter(function(x){ return sel.has(x.seasonKey); });
    if (!filtered.length){ el.innerHTML = '<div class="small">Nessun dato storico per le stagioni selezionate.</div>'; return; }

    filtered.sort(function(a,b){ return a.seasonStart - b.seasonStart; });
    var n = filtered.length;
    var list = filtered.map(function(x){ return seasonStr(x.seasonKey); }).join(', ');
    var presTot = filtered.reduce(function(s,x){ return s + (Number(x.rec.p)||0); }, 0);
    var mvNum = filtered.reduce(function(s,x){ return s + ((Number(x.rec.mvt)||0) * (Number(x.rec.p)||0)); }, 0);
    var fmNum = filtered.reduce(function(s,x){ return s + ((Number(x.rec.fmt)||0) * (Number(x.rec.p)||0)); }, 0);
    var mvW = presTot ? (mvNum / presTot) : null;
    var fmW = presTot ? (fmNum / presTot) : null;
    var r0 = filtered[0].rec || {};
    var isP = (r0.r === 'P');

    function sum(k){ return filtered.reduce(function(s,x){ return s + (Number(x.rec[k])||0); }, 0); }
    var gfTot = sum('gf'), asTot = sum('as'), agTot = sum('ag'), ammTot = sum('a'), espTot = sum('e');
    var gfrTot = sum('gfr'), rsTot = sum('rs');
    var gsTot = isP ? sum('gs')  : null,
        gsrTot= isP ? sum('gsr') : null,
        rpTot = isP ? sum('rp')  : null;

    var blocchi = [];
    blocchi.push('<div class="small"><strong>Stagioni</strong>: '+escapeHtml(list)+' • <strong>Anni</strong>: '+n+'</div>');
    var dati = [];
    dati.push(rowInt('Presenze totali', presTot));
    dati.push(row('Pres. medie/stagione', n ? (presTot / n) : null));
    dati.push(row('MV pesata', mvW));
    dati.push(row('FM pesata', fmW));
    if (!isP){
      dati.push(rowInt('Gol totali', gfTot));
      dati.push(rowInt('Gol su rigore totali', gfrTot));
      dati.push(rowInt('Rigori sbagliati totali', rsTot));
    } else {
      dati.push(rowInt('GS totali', gsTot));
      dati.push(rowInt('GSR totali', gsrTot));
      dati.push(rowInt('RP totali', rpTot));
    }
    dati.push(rowInt('Assist totali', asTot));
    if (!isP) dati.push(rowInt('Autogol totali', agTot));
    dati.push(rowInt('Ammonizioni totali', ammTot));
    dati.push(rowInt('Espulsioni totali', espTot));
    blocchi.push('<div class="small" style="margin-top:.4rem"><strong>Dati statistici</strong></div>'+dati.join(''));

    if (OPTS.histShowBM){
      var bm = [];
      if (!isP){
        bm.push(row('Gol medi/stagione', n ? (gfTot / n) : null));
        bm.push(row('Gol su rigore medi/stagione', n ? (gfrTot / n) : null));
        bm.push(row('Rigori sbagliati medi/stagione', n ? (rsTot / n) : null));
      } else {
        bm.push(row('GS medi/stagione', n ? (gsTot / n) : null));
        bm.push(row('GSR medi/stagione', n ? (gsrTot / n) : null));
        bm.push(row('RP medi/stagione', n ? (rpTot / n) : null));
      }
      bm.push(row('Assist medi/stagione', n ? (asTot / n) : null));
      if (!isP) bm.push(row('Autogol medi/stagione', n ? (agTot / n) : null));
      bm.push(row('Amm. medie/stagione', n ? (ammTot / n) : null));
      bm.push(row('Esp. medie/stagione', n ? (espTot / n) : null));
      blocchi.push('<div class="small" style="margin-top:.6rem"><strong>Bonus/malus</strong></div>'+bm.join(''));
    }

    if (OPTS.histShowPerPres){
      var sp = [];
      if (!isP){
        sp.push(row('Presenze per gol', gfTot > 0 ? presTot / gfTot : null));
        sp.push(row('Presenze per gol su rigore', (gfrTot > 0) ? presTot / gfrTot : null));
        sp.push(row('Presenze per rigore sbagliato', (rsTot > 0) ? presTot / rsTot : null));
      } else {
        sp.push(row('GS per presenza', (presTot > 0 && gsTot != null) ? (gsTot / presTot) : null));
        sp.push(row('GSR per presenza', (presTot > 0 && gsrTot != null) ? (gsrTot / presTot) : null));
        sp.push(row('Presenze per rigore parato', (rpTot > 0) ? (presTot / rpTot) : null));
      }
      sp.push(row('Presenze per assist', asTot > 0 ? presTot / asTot : null));
      if (!isP) sp.push(row('Presenze per autogol', agTot > 0 ? presTot / agTot : null));
      sp.push(row('Presenze per amm.',  ammTot > 0 ? presTot / ammTot : null));
      sp.push(row('Presenze per esp.',  espTot > 0 ? presTot / espTot : null));
      blocchi.push('<div class="small" style="margin-top:.6rem"><strong>Statistiche per presenza</strong></div>'+sp.join(''));
    }
    el.innerHTML = blocchi.join('');
  }

  // --- BADGE "STAGIONE PRECEDENTE" (legacy) ---------------------------------
  function buildRankingBadges(prevRec, idx){
    var b = []; if (!prevRec || !PREV) return b;
    var y = seasonStr(PREV.seasonKey);
    // Soglie su precedente (MV/FM/Aff) — mantenute per compatibilità (mostrate solo se OPTS.showPrevBadges = true)
    if (Number(prevRec.mvt) >= OPTS.mvPrevBadge) addBadge(b, 'MV '+y+' '+fmt(prevRec.mvt,2), 'good', 'Soglia: '+OPTS.mvPrevBadge);
    if (Number(prevRec.fmt) >= OPTS.fmPrevBadge) addBadge(b, 'FM '+y+' '+fmt(prevRec.fmt,2), 'good', 'Soglia: '+OPTS.fmPrevBadge);
    var aff = prevRec.aff; var affPct = (aff != null ? (Number(aff) > 1 ? Number(aff) : Number(aff)*100) : null);
    if (affPct != null && affPct >= OPTS.affPrevBadge) addBadge(b, 'Aff '+y+' '+fmtPercent(aff), 'good', 'Soglia: '+OPTS.affPrevBadge+'%');

    // Metrica ranking (FM/MV) su precedente, configurabile
    var mKey = (OPTS.rankBadgeMetric === 'MV') ? 'mvt' : 'fmt';
    var mLbl = (mKey === 'mvt') ? 'MV' : 'FM';
    var value = prevRec[mKey];
    var rk_prev = computeRankForSeason(PREV, mKey, value, prevRec.r, OPTS.minPresRankPrev);
    if (rk_prev) addBadge(b, 'Ranking '+y+' '+prevRec.r+': '+rk_prev.rank+'°/'+rk_prev.N, 'info', mLbl+' '+y+' – z='+fmt(rk_prev.z)+'; pct='+fmt(rk_prev.pct*100,1)+'%');

    // Cambio ruolo: ranking anche nel "nuovo" ruolo (se diverso)
    if (idx && idx.changedRole && idx.ruolo && prevRec.r && idx.ruolo !== prevRec.r){
      var rk_new = computeRankForSeason(PREV, mKey, value, idx.ruolo, OPTS.minPresRankPrev);
      if (rk_new) addBadge(b, 'Ranking '+y+' nuovo '+idx.ruolo+': '+rk_new.rank+'°/'+rk_new.N, 'info', mLbl+' '+y+' – z='+fmt(rk_new.z)+'; pct='+fmt(rk_new.pct*100,1)+'%');
    }
    return b;
  }

  // --- BADGE "SELEZIONE ANNO": RANKING + VALORI ------------------------------
  function buildSeasonRankingBadges(seasonObj, seasonRec){
    var b = []; if (!seasonObj || !seasonRec) return b;
    var y = seasonStr(seasonObj.seasonKey);
    var isCurrent = (CUR && seasonObj.seasonKey === CUR.seasonKey);
    var minPres = isCurrent ? OPTS.minPresRankCur : OPTS.minPresRankPrev;

    var rkFM = computeRankForSeason(seasonObj, 'fmt', seasonRec.fmt, seasonRec.r, minPres);
    if (rkFM) addBadge(b, 'Rank FM '+y+' '+rkFM.rank+'°/'+rkFM.N, 'info', 'FM '+y+' – z='+fmt(rkFM.z)+'; pct='+fmt(rkFM.pct*100,1)+'%');

    var rkMV = computeRankForSeason(seasonObj, 'mvt', seasonRec.mvt, seasonRec.r, minPres);
    if (rkMV) addBadge(b, 'Rank MV '+y+' '+rkMV.rank+'°/'+rkMV.N, 'info', 'MV '+y+' – z='+fmt(rkMV.z)+'; pct='+fmt(rkMV.pct*100,1)+'%');

    return b;
  }

  // --- SELEZIONE GIOCATORE (testata + card) ----------------------------------
  function selectPlayer(cod){
    SELECTED_COD = String(cod);
    $('#playerSection').classList.remove('hidden');
    $('#cardCurrent').innerHTML = '<span class="spinner"></span>';
    $('#cardPrev').innerHTML    = '<span class="spinner"></span>';
    $('#cardStorico').innerHTML = '<span class="spinner"></span>';

    var curRec  = CUR  && CUR.players.find(function(p){ return String(p.cod)===String(cod); });
    var prevRec = PREV ? PREV.players.find(function(p){ return String(p.cod)===String(cod); }) : null;

    $('#lblCurrent').textContent = 'Stagione ' + seasonStr(CUR ? CUR.seasonKey : '—');
    $('#lblPrev').textContent    = PREV ? ('Stagione ' + seasonStr(PREV.seasonKey)) : 'Stagione precedente';

    var idx = INDEX.find(function(x){ return String(x.cod)===String(cod); });
    var role = (idx && idx.ruolo ? idx.ruolo : (curRec ? curRec.r : ''));
    role = String(role||'').toUpperCase();
    var roleKnown = ['P','D','C','A'].indexOf(role) >= 0;
    var cls = roleKnown ? ('chip chip--role role--'+role) : 'badge';

    $('#playerName').textContent = (idx && idx.nome) || (curRec ? curRec.nome : 'Giocatore');
    setPlayerPhoto(String(cod));
    $('#playerMeta').innerHTML = '<span class="'+cls+'">'+escapeHtml(roleKnown? role : (role||'—'))+'</span>' +
                                 ' <span class="badge">'+escapeHtml((idx && idx.squadra) || (curRec ? curRec.sq : '—'))+'</span>';

    var hdr = [];

    // (A) Badge "stagione precedente" in testata → SOLO se opt attivo
    if (OPTS.showPrevBadges){
      if (idx && idx.changedRole)  addBadge(hdr, 'Cambio Ruolo',   'warn');
      if (idx && idx.changedTeam)  addBadge(hdr, 'Cambio Squadra', 'alert');
      if (PREV && prevRec && typeof buildRankingBadges === 'function'){
        buildRankingBadges(prevRec, idx).forEach(function(x){ hdr.push(x); });
      }
    }

    // (B) Rank FM/MV per stagione scelta (mostrato PRIMA)
    if (OPTS.rankBadgeSeason){
      var s1 = SEASONS.find(function(s){ return s.seasonKey === OPTS.rankBadgeSeason; });
      var r1 = s1 && s1.players.find(function(p){ return String(p.cod)===String(cod); });
      if (r1) buildSeasonRankingBadges(s1, r1).forEach(function(x){ hdr.push(x); });
    }

    // (C) FM/MV per stagione scelta (valori con soglie)
    if (OPTS.badgeSeasonValues){
      var s2 = SEASONS.find(function(s){ return s.seasonKey === OPTS.badgeSeasonValues; });
      var r2 = s2 && s2.players.find(function(p){ return String(p.cod)===String(cod); });
      if (r2){
        var y2 = seasonStr(s2.seasonKey);
        if (Number(r2.mvt) >= OPTS.mvPrevBadge) addBadge(hdr, 'MV '+y2+' '+fmt(r2.mvt,2), 'good', 'Soglia: '+OPTS.mvPrevBadge);
        if (Number(r2.fmt) >= OPTS.fmPrevBadge) addBadge(hdr, 'FM '+y2+' '+fmt(r2.fmt,2), 'good', 'Soglia: '+OPTS.fmPrevBadge);
      }
    }

    // (D) Aff per stagione scelta (valore con soglia)
    if (OPTS.badgeSeasonAff){
      var s3 = SEASONS.find(function(s){ return s.seasonKey === OPTS.badgeSeasonAff; });
      var r3 = s3 && s3.players.find(function(p){ return String(p.cod)===String(cod); });
      if (r3){
        var aff = r3.aff; var affPct = (aff != null ? (Number(aff) > 1 ? Number(aff) : Number(aff)*100) : null);
        var y3 = seasonStr(s3.seasonKey);
        if (affPct != null && affPct >= OPTS.affPrevBadge) addBadge(hdr, 'Aff '+y3+' '+fmtPercent(aff), 'good', 'Soglia: '+OPTS.affPrevBadge+'%');
      }
    }

    $('#playerBadges').innerHTML = hdr.join(' ');

    renderCurrent(curRec);
    renderPrev(prevRec, PREV ? PREV.seasonKey : null);
    renderStorico(cod);

    $('#results').innerHTML = ''; hideResults();
  }

  // --- WIRE UI ---------------------------------------------------------------
  function wireSearch(){
    var input = $('#searchInput'); if (!input) return;
    input.addEventListener('input', function(e){
      var v = e.target.value; if (v && v.length > 0) showResults(); else hideResults();
      clearTimeout(wireSearch._t); wireSearch._t = setTimeout(function(){ search(v); }, 150);
    });
  }
  document.addEventListener('keydown', function(e){
    if ((e.ctrlKey || e.metaKey) && (e.key === 'q' || e.key === 'Q')){
      var el = $('#searchInput'); if (el){ e.preventDefault(); el.focus(); if (el.select) el.select(); showResults(); }
    }
  });

  // --- INIT ------------------------------------------------------------------
  function init(){
    setupTheme(); setupToggles(); setupOptions(); wireSearch();
    discoverSeasons().then(function(list){
      SEASONS = list || [];
      if (!SEASONS.length){
        var msg = 'Nessun file stagione trovato in: '+DATA_DIRS.join(' · ')+' (es. 2024_2025.json, 2024.json o 2024-2025.json)';
        console.warn(msg); alert(msg); return;
      }
      CUR  = SEASONS[SEASONS.length-1];
      PREV = SEASONS.length >= 2 ? SEASONS[SEASONS.length-2] : null;

      $('#lblCurrent').textContent = 'Stagione ' + seasonStr(CUR.seasonKey);
      $('#lblPrev').textContent    = PREV ? ('Stagione ' + seasonStr(PREV.seasonKey)) : 'Stagione precedente';

      buildIndex();
      populateHistSeasonOptions();
      populateAllBadgeSeasonOptions();

      var info = $('#dataDirInfo'); if (info) info.textContent = 'Cartella dati: /data — Caricate '+SEASONS.length+' stagioni';
    }).catch(function(err){ console.error('Init error', err); alert('Errore durante inizializzazione. Vedi console (F12).'); });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init,0);
  else document.addEventListener('DOMContentLoaded', init);

})();