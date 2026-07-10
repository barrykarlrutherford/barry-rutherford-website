(function () {
    'use strict';

    // Concept groups let a search for one word match related ideas in the
    // photo titles/captions (e.g. "dusk" also finds "sunset" and "twilight").
    var CONCEPT_GROUPS = [
        ['sunset', 'sunrise', 'dusk', 'twilight', 'golden hour', 'evening', 'glow'],
        ['mountain', 'mountains', 'peak', 'peaks', 'ridge', 'ridges', 'summit', 'alpine', 'range', 'hillside', 'mesa', 'overlook'],
        ['snow', 'snowy', 'winter', 'snow-capped', 'snow-covered', 'snow-dusted', 'snow-laden', 'snow-patched'],
        ['water', 'lake', 'ocean', 'coastal', 'sea'],
        ['rain', 'rainbow', 'storm', 'stormy', 'clouds', 'cloudy'],
        ['flower', 'flowers', 'bloom', 'blooms', 'blossom', 'columbine'],
        ['sculpture', 'metal', 'iron', 'welded', 'art', 'abstract'],
        ['night', 'moon', 'moonlit', 'starry', 'stars'],
        ['forest', 'trees', 'tree', 'pine', 'pines', 'aspen', 'woods', 'grove'],
        ['sky', 'clouds', 'cloud', 'cloudy'],
        ['valley', 'vista', 'panorama', 'view'],
        ['purple', 'lavender', 'violet'],
        ['orange', 'red', 'fiery'],
        ['pink', 'magenta'],
        ['bird', 'dove'],
        ['bike', 'bicycle', 'cycling'],
        ['home', 'homes', 'house', 'balcony', 'patio', 'window']
    ];

    var PAGE_SIZE = 12;
    var PAGE_WINDOW = 2;

    var searchInput = document.getElementById('photo-search-input');
    var grid = document.getElementById('photo-grid');
    var pagination = document.getElementById('photo-pagination');
    var emptyMessage = document.getElementById('photo-empty');
    var searchMeta = document.getElementById('photo-search-meta');

    if (!grid) return;

    var allItems = Array.prototype.slice.call(grid.querySelectorAll('.art-item')).map(function (el) {
        return { el: el, search: el.getAttribute('data-search') || '' };
    });

    var currentResults = allItems.slice();
    var currentPage = 1;
    var currentQuery = '';

    function expandTerm(term) {
        var expanded = [term];
        for (var i = 0; i < CONCEPT_GROUPS.length; i++) {
            var group = CONCEPT_GROUPS[i];
            if (group.indexOf(term) !== -1) {
                expanded = expanded.concat(group);
            }
        }
        return expanded;
    }

    function scoreItem(item, expandedTerms) {
        var score = 0;
        for (var i = 0; i < expandedTerms.length; i++) {
            if (item.search.indexOf(expandedTerms[i]) !== -1) {
                score += 1;
            }
        }
        return score;
    }

    function runSearch(query) {
        var trimmed = query.trim().toLowerCase();
        if (!trimmed) {
            return allItems.slice();
        }

        var words = trimmed.split(/\s+/).filter(Boolean);
        var expandedTerms = [];
        words.forEach(function (word) {
            expandTerm(word).forEach(function (term) {
                if (expandedTerms.indexOf(term) === -1) expandedTerms.push(term);
            });
        });

        var scored = allItems.map(function (item) {
            return { item: item, score: scoreItem(item, expandedTerms) };
        }).filter(function (entry) {
            return entry.score > 0;
        });

        scored.sort(function (a, b) {
            return b.score - a.score;
        });

        return scored.map(function (entry) {
            return entry.item;
        });
    }

    function totalPages() {
        return Math.max(1, Math.ceil(currentResults.length / PAGE_SIZE));
    }

    function renderPage() {
        var pages = totalPages();
        currentPage = Math.min(Math.max(1, currentPage), pages);

        var start = (currentPage - 1) * PAGE_SIZE;
        var end = start + PAGE_SIZE;
        var visible = currentResults.slice(start, end);
        var visibleSet = new Set(visible.map(function (item) { return item.el; }));

        allItems.forEach(function (item) {
            var shouldHide = currentResults.indexOf(item) === -1 || !visibleSet.has(item.el);
            item.el.classList.toggle('is-hidden', shouldHide);
        });

        if (emptyMessage) {
            emptyMessage.hidden = currentResults.length !== 0;
        }

        if (searchMeta) {
            searchMeta.textContent = currentQuery
                ? currentResults.length + ' of ' + allItems.length + ' photographs match “' + currentQuery + '”'
                : '';
        }

        renderPagination(pages);
    }

    function renderPagination(pages) {
        if (!pagination) return;
        pagination.innerHTML = '';

        if (pages <= 1) return;

        pagination.appendChild(makePageButton('← Prev', currentPage - 1, currentPage === 1));

        var start = Math.max(1, currentPage - PAGE_WINDOW);
        var end = Math.min(pages, currentPage + PAGE_WINDOW);

        if (start > 1) {
            pagination.appendChild(makePageButton('1', 1, false));
            if (start > 2) pagination.appendChild(makeEllipsis());
        }

        for (var p = start; p <= end; p++) {
            pagination.appendChild(makePageButton(String(p), p, false, p === currentPage));
        }

        if (end < pages) {
            if (end < pages - 1) pagination.appendChild(makeEllipsis());
            pagination.appendChild(makePageButton(String(pages), pages, false));
        }

        pagination.appendChild(makePageButton('Next →', currentPage + 1, currentPage === pages));
    }

    function makeEllipsis() {
        var span = document.createElement('span');
        span.className = 'art-page-ellipsis';
        span.textContent = '…';
        return span;
    }

    function makePageButton(label, targetPage, disabled, isActive) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'art-page-btn' + (isActive ? ' is-active' : '');
        button.textContent = label;
        button.disabled = !!disabled;
        if (isActive) button.setAttribute('aria-current', 'page');
        button.addEventListener('click', function () {
            currentPage = targetPage;
            renderPage();
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return button;
    }

    var debounceTimer = null;
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                currentQuery = searchInput.value;
                currentResults = runSearch(currentQuery);
                currentPage = 1;
                renderPage();
            }, 150);
        });
    }

    renderPage();
})();
