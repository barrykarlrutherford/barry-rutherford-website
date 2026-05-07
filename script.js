// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add active class to navigation based on scroll position
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Placeholder for hero photo - apply gradient if image missing
document.addEventListener('DOMContentLoaded', () => {
    const heroPhoto = document.getElementById('hero-photo');
    if (heroPhoto && (!heroPhoto.getAttribute('src') || heroPhoto.getAttribute('src').includes('barry-photo.jpg'))) {
        heroPhoto.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        heroPhoto.style.minHeight = '400px';
        heroPhoto.style.display = 'block';
    }

    loadNewsWidget();
});

function formatDate(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(date);
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

function renderNewsItems(widget, source) {
    const list = widget.querySelector('[data-news-list]');
    if (!list || !source) {
        return;
    }

    if (!source.items || source.items.length === 0) {
        list.innerHTML = `
            <article class="news-feed-item">
                <span class="news-item-source">${escapeHtml(source.name)}</span>
                <h4>Headlines are temporarily unavailable.</h4>
                <p>${escapeHtml(source.error || 'Try the source directly while the feed refreshes.')}</p>
                <a href="${escapeHtml(source.homepage)}" target="_blank" rel="noopener noreferrer">Open source →</a>
            </article>
        `;
        return;
    }

    list.innerHTML = source.items.map((item) => `
        <article class="news-feed-item">
            <span class="news-item-source">${escapeHtml(item.source || source.name)}${formatDate(item.published) ? ` · ${escapeHtml(formatDate(item.published))}` : ''}</span>
            <h4><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h4>
            ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}
            <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Read headline →</a>
        </article>
    `).join('');
}

function activateNewsSource(widget, sources, sourceIndex) {
    const tabs = widget.querySelectorAll('[data-news-source]');
    tabs.forEach((tab, index) => {
        tab.classList.toggle('active', index === sourceIndex);
        tab.setAttribute('aria-selected', index === sourceIndex ? 'true' : 'false');
    });

    renderNewsItems(widget, sources[sourceIndex]);
}

function renderNewsWidget(widget, payload) {
    const tabs = widget.querySelector('[data-news-tabs]');
    const updated = widget.querySelector('[data-news-updated]');
    const sources = (payload.sources || []).filter((source) => source.items.length);

    if (!tabs || !sources.length) {
        throw new Error('No news sources available');
    }

    if (updated) {
        updated.textContent = payload.updatedAt ? `Updated ${formatDate(payload.updatedAt)}` : 'Updated automatically';
    }

    tabs.innerHTML = sources.map((source, index) => `
        <button type="button" data-news-source="${index}" aria-selected="${index === 0 ? 'true' : 'false'}">
            ${escapeHtml(source.name)}
        </button>
    `).join('');

    tabs.querySelectorAll('[data-news-source]').forEach((tab) => {
        tab.addEventListener('click', () => {
            activateNewsSource(widget, sources, Number(tab.getAttribute('data-news-source')));
        });
    });

    activateNewsSource(widget, sources, 0);
}

async function loadNewsWidget() {
    const widget = document.querySelector('[data-news-widget]');
    if (!widget) {
        return;
    }

    try {
        const response = await fetch('/api/news', { headers: { Accept: 'application/json' } });
        if (!response.ok) {
            throw new Error(`News request failed with ${response.status}`);
        }

        renderNewsWidget(widget, await response.json());
    } catch (error) {
        const updated = widget.querySelector('[data-news-updated]');
        const list = widget.querySelector('[data-news-list]');
        if (updated) {
            updated.textContent = 'Headlines unavailable';
        }
        if (list) {
            list.innerHTML = `
                <article class="news-feed-item">
                    <span class="news-item-source">RSS feed</span>
                    <h4>Live headlines could not load.</h4>
                    <p>${escapeHtml(error.message)}</p>
                </article>
            `;
        }
    }
}
