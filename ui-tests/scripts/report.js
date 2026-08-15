/*
 * Copyright (c) Agriya Khetarpal
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Behaviour for the PDF export report. With this, we reimplement the parts of the
 * Playwright reporter that we use, which are as follows:
 * - status filters; and
 * - the search box; and
 * - the speedboard; and
 * - the theme selector.
 */

(function () {
  'use strict';

  var THEMES = ['dark-mode', 'light-mode', 'system'];
  var THEME_KEY = 'theme';
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  /* ---------------------------------------------------------------- theme */

  function currentTheme() {
    var stored = null;
    try {
      stored = window.localStorage.getItem(THEME_KEY);
    } catch (e) {
      /* localStorage is unavailable when the report is opened over file:// */
    }
    return THEMES.indexOf(stored) === -1 ? 'system' : stored;
  }

  function applyTheme(theme) {
    var resolved =
      theme === 'system'
        ? prefersDark.matches
          ? 'dark-mode'
          : 'light-mode'
        : theme;
    var root = document.documentElement;
    root.classList.remove('dark-mode', 'light-mode');
    root.classList.add(resolved);
  }

  function setTheme(theme) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* Not fatal, the choice just will not survive a reload */
    }
    applyTheme(theme);
  }

  /* --------------------------------------------------------------- filter */

  // Splits on whitespace, honouring single and double quotes.
  function tokenize(expression) {
    var result = [];
    var token = [];
    var quote;
    for (var i = 0; i < expression.length; ++i) {
      var c = expression[i];
      if (quote && c === '\\' && expression[i + 1] === quote) {
        token.push(quote);
        ++i;
      } else if (c === '"' || c === "'") {
        if (quote === c) {
          result.push(token.join('').toLowerCase());
          token = [];
          quote = undefined;
        } else if (quote) {
          token.push(c);
        } else {
          quote = c;
        }
      } else if (quote) {
        token.push(c);
      } else if (c === ' ') {
        if (token.length) {
          result.push(token.join('').toLowerCase());
          token = [];
        }
      } else {
        token.push(c);
      }
    }
    if (token.length) result.push(token.join('').toLowerCase());
    return result;
  }

  function parseFilter(expression) {
    var filter = { status: [], text: [] };
    tokenize(expression || '').forEach(function (token) {
      var not = token.charAt(0) === '!';
      if (not) token = token.slice(1);
      if (!token) return;
      if (token.indexOf('s:') === 0)
        filter.status.push({ name: token.slice(2), not: not });
      else filter.text.push({ name: token, not: not });
    });
    return filter;
  }

  function matches(filter, card) {
    var status = card.dataset.status;
    if (filter.status.length) {
      var statusMatch = filter.status.some(function (token) {
        return token.not ? status !== token.name : status === token.name;
      });
      if (!statusMatch) return false;
    } else if (status === 'skipped') {
      return false;
    }
    var location = card.dataset.file + ':' + card.dataset.line;
    return filter.text.every(function (token) {
      var hit =
        card.dataset.text.indexOf(token.name) !== -1 ||
        location.indexOf(token.name) !== -1;
      return token.not ? !hit : hit;
    });
  }

  /* ------------------------------------------------------------- duration */

  function msToString(ms) {
    if (ms < 0 || !isFinite(ms)) return '-';
    if (ms === 0) return '0ms';
    if (ms < 1000) return ms.toFixed(0) + 'ms';
    var seconds = ms / 1000;
    if (seconds < 60) return seconds.toFixed(1) + 's';
    var minutes = seconds / 60;
    if (minutes < 60) return minutes.toFixed(1) + 'm';
    var hours = minutes / 60;
    if (hours < 24) return hours.toFixed(1) + 'h';
    return (hours / 24).toFixed(1) + 'd';
  }

  /* ----------------------------------------------------------------- view */

  var cards = [].slice.call(document.querySelectorAll('.pdf-card'));
  var chips = [].slice.call(document.querySelectorAll('.chip[data-file-chip]'));
  var speedboardChip = document.getElementById('speedboard-chip');
  var speedboardGrid = document.getElementById('speedboard-grid');
  var noResults = document.getElementById('no-results');
  var filteredStats = document.getElementById('filtered-stats');
  var searchInput = document.getElementById('search-input');

  // Where each card sits in the grouped view, so the speedboard can borrow the
  // cards and hand them back rather than the page shipping two copies of every
  // embedded PDF. cards is in document order, so re-appending in that order
  // rebuilds each grid exactly as it was rendered.
  var homes = cards.map(function (card) {
    return { card: card, parent: card.parentNode };
  });

  function searchParams() {
    var hash = window.location.hash;
    var query =
      hash.indexOf('?') === -1 ? '' : hash.slice(hash.indexOf('?') + 1);
    return new URLSearchParams(query);
  }

  function render() {
    var params = searchParams();
    var query = params.get('q') || '';
    var speedboard = params.has('speedboard');
    var filter = parseFilter(query);

    if (searchInput && document.activeElement !== searchInput)
      searchInput.value = query ? query.trim() + ' ' : '';

    var visible = [];
    cards.forEach(function (card) {
      var show = matches(filter, card);
      card.hidden = !show;
      if (show) visible.push(card);
    });

    if (speedboard) {
      visible
        .slice()
        .sort(function (a, b) {
          return Number(b.dataset.duration) - Number(a.dataset.duration);
        })
        .forEach(function (card) {
          speedboardGrid.appendChild(card);
        });
    } else if (speedboardGrid.firstChild) {
      homes.forEach(function (home) {
        home.parent.appendChild(home.card);
      });
    }

    speedboardChip.hidden = !speedboard;
    chips.forEach(function (chip) {
      var hasVisible = !!chip.querySelector('.pdf-card:not([hidden])');
      chip.hidden = speedboard || !hasVisible;
    });
    if (noResults) noResults.hidden = visible.length > 0;

    if (filteredStats) {
      if (query) {
        var duration = visible.reduce(function (total, card) {
          return total + Number(card.dataset.duration);
        }, 0);
        filteredStats.hidden = false;
        filteredStats.textContent =
          'Filtered: ' +
          visible.length +
          (visible.length ? ' (' + msToString(duration) + ')' : '');
      } else {
        filteredStats.hidden = true;
      }
    }

    [].forEach.call(
      document.querySelectorAll('nav [data-token]'),
      function (link) {
        var token = link.dataset.token;
        link.setAttribute(
          'aria-selected',
          String(token ? query.split(' ').indexOf(token) !== -1 : false)
        );
        // Clicking a status replaces any status that's already in the query, and
        // leaves the speedboard, in the same way Playwright's nav links do.
        link.setAttribute(
          'href',
          token ? '#?q=' + encodeURIComponent(token) : '#?'
        );
      }
    );

    var speedboardLink = document.getElementById('speedboard-link');
    speedboardLink.setAttribute('aria-selected', String(speedboard));
    var next = new URLSearchParams();
    if (query) next.set('q', query);
    if (!speedboard) next.set('speedboard', '');
    speedboardLink.setAttribute(
      'href',
      '#?' + next.toString().replace(/speedboard=$/, 'speedboard')
    );
  }

  /* ------------------------------------------------------------- wiring */

  window.addEventListener('hashchange', render);
  prefersDark.addEventListener('change', function () {
    applyTheme(currentTheme());
  });

  var form = document.getElementById('search-form');
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var params = searchParams();
    var query = searchInput.value.trim();
    var next = new URLSearchParams();
    if (query) next.set('q', query);
    var hash = '#?' + next.toString();
    if (params.has('speedboard'))
      hash += (next.toString() ? '&' : '') + 'speedboard';
    if (hash === window.location.hash) render();
    else window.location.hash = hash;
  });

  // Chip headers collapse, like the file headers in Playwright's report.
  var collapsible = document.querySelectorAll('.chip-header[aria-expanded]');
  [].forEach.call(collapsible, function (header) {
    header.addEventListener('click', function () {
      var expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', String(!expanded));
      header.classList.toggle('expanded-true', !expanded);
      header.classList.toggle('expanded-false', expanded);
      header.querySelector('.chip-arrow-down').hidden = expanded;
      header.querySelector('.chip-arrow-right').hidden = !expanded;
      var body = document.getElementById(header.getAttribute('aria-controls'));
      if (body) body.hidden = expanded;
    });
  });

  // Settings popover.
  var settingsButton = document.getElementById('settings-button');
  var settingsDialog = document.getElementById('settings-dialog');
  var themeSelect = document.getElementById('theme-select');

  themeSelect.value = currentTheme();
  themeSelect.addEventListener('change', function () {
    setTheme(themeSelect.value);
  });

  settingsButton.addEventListener('click', function (event) {
    event.preventDefault();
    if (settingsDialog.open) {
      settingsDialog.close();
      return;
    }
    var anchor = settingsButton.getBoundingClientRect();
    settingsDialog.style.top = anchor.bottom + window.scrollY + 4 + 'px';
    settingsDialog.style.left = 'auto';
    settingsDialog.style.right =
      document.documentElement.clientWidth - anchor.right + 'px';
    settingsDialog.show();
  });

  document.addEventListener('click', function (event) {
    if (
      settingsDialog.open &&
      !settingsDialog.contains(event.target) &&
      !settingsButton.contains(event.target)
    )
      settingsDialog.close();
  });

  // Chrome and Firefox refuse to navigate the top level to a data: URL, so the
  // embedded PDF is handed over as a blob instead.
  var blobUrls = new WeakMap();
  [].forEach.call(
    document.querySelectorAll('.pdf-card-preview'),
    function (link) {
      link.addEventListener('click', function (event) {
        var href = link.getAttribute('href') || '';
        var comma = href.indexOf(',');
        if (href.indexOf('data:') !== 0 || comma === -1) return;
        event.preventDefault();
        var url = blobUrls.get(link);
        if (!url) {
          // Decode synchronously: window.open only survives inside the gesture.
          var binary = window.atob(href.slice(comma + 1));
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; ++i)
            bytes[i] = binary.charCodeAt(i);
          url = URL.createObjectURL(
            new Blob([bytes], { type: 'application/pdf' })
          );
          blobUrls.set(link, url);
        }
        window.open(url, '_blank', 'noopener');
      });
    }
  );

  // Show the run's start time in the reader's locale, not the build machine's.
  var startedAt = document.getElementById('started-at');
  if (startedAt && startedAt.dataset.iso) {
    var started = new Date(startedAt.dataset.iso);
    if (!isNaN(started.getTime()))
      startedAt.textContent = started.toLocaleString();
  }

  applyTheme(currentTheme());
  render();
})();
