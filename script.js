// Hero background parallax
(() => {
    const hero = document.querySelector('.hero');
    const parallaxImg = document.querySelector('.hero__parallax-img');
    if (!hero || !parallaxImg) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const factor = 0.42;
    let ticking = false;

    const update = () => {
        const rect = hero.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
            parallaxImg.style.transform = `translate3d(0, ${-rect.top * factor}px, 0)`;
        }
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    update();
})();

// Mobile navigation
(() => {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (!toggle || !menu) return;

    const closeMenu = () => {
        menu.classList.remove('is-open');
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
    };

    toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        menu.classList.toggle('is-open', !isOpen);
        document.body.classList.toggle('nav-open', !isOpen);
        toggle.setAttribute('aria-expanded', String(!isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    });

    menu.addEventListener('click', event => {
        if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.nav-container')) closeMenu();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.classList.contains('is-open')) {
            closeMenu();
            toggle.focus();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeMenu();
    });
})();

// Replace the static latest-writing fallback with public post metadata from Beehiiv.
(() => {
    const list = document.querySelector('[data-latest-writing]');
    if (!list) return;

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const createPostCard = post => {
        const card = document.createElement('article');
        card.className = 'essay-card';

        if (post.thumbnailUrl) {
            const imageLink = document.createElement('a');
            imageLink.className = 'essay-card__image-link';
            imageLink.href = post.url;

            const image = document.createElement('img');
            image.className = 'essay-card__image';
            image.src = post.thumbnailUrl;
            image.alt = '';
            image.loading = 'lazy';
            image.decoding = 'async';
            imageLink.append(image);
            card.append(imageLink);
        }

        const meta = document.createElement('p');
        meta.className = 'essay-card__meta';
        meta.textContent = dateFormatter.format(new Date(post.publishedAt));
        card.append(meta);

        const title = document.createElement('h3');
        title.className = 'essay-card__title';
        const titleLink = document.createElement('a');
        titleLink.href = post.url;
        titleLink.textContent = post.title;
        title.append(titleLink);
        card.append(title);

        if (post.excerpt) {
            const excerpt = document.createElement('p');
            excerpt.className = 'essay-card__excerpt';
            excerpt.textContent = post.excerpt;
            card.append(excerpt);
        }

        const readLink = document.createElement('a');
        readLink.className = 'essay-card__more';
        readLink.href = post.url;
        readLink.textContent = 'Read on Writing →';
        card.append(readLink);

        return card;
    };

    fetch('/api/latest-writing', { headers: { Accept: 'application/json' } })
        .then(response => {
            if (!response.ok) throw new Error(`Latest writing returned ${response.status}`);
            return response.json();
        })
        .then(payload => {
            if (!Array.isArray(payload.data) || !payload.data.length) return;
            list.replaceChildren(...payload.data.map(createPostCard));
        })
        .catch(() => {
            // Keep the server-rendered American Endgame card as the fallback.
        });
})();

// Give the fixed header a more defined state after leaving the top.
(() => {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    const updateNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
})();

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Scroll-triggered pop-in animations
(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Elements to reveal as they scroll into view.
    const selectors = [
        '.hero-title',
        '.hero-tagline',
        '.hero-subtitle',
        '.section-title',
        '.section-intro',
        '.about-content',
        '.project-card',
        '.writing-intro',
        '.writing-project',
        '.writing-note',
        '.category-title',
        '.category-intro',
        '.explore-item',
        '.art-filters',
        '.art-item',
        '.art-item--cta',
        '.essay-card',
        '.reading-list a',
        '.connect-intro',
        '.connect-link',
        '.portrait-content'
    ];

    const targets = document.querySelectorAll(selectors.join(','));

    // Stagger items that share the same parent so groups (grids, lists) cascade in.
    const groupCounters = new Map();
    targets.forEach(el => {
        el.classList.add('reveal');
        const parent = el.parentElement;
        const index = groupCounters.get(parent) || 0;
        groupCounters.set(parent, index + 1);
        el.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 90}ms`);
    });

    if (prefersReduced || !('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('in-view'));
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(el => observer.observe(el));
})();

// Shared overlay modals (excerpts and art lightbox)
(() => {
    let activeOverlay = null;
    let lastFocused = null;

    const closeOverlay = () => {
        if (!activeOverlay) return;
        activeOverlay.hidden = true;
        document.body.classList.remove('excerpt-open');
        if (lastFocused) lastFocused.focus();
        activeOverlay = null;
    };

    const openOverlay = (overlay, trigger) => {
        lastFocused = trigger;
        activeOverlay = overlay;
        overlay.hidden = false;
        document.body.classList.add('excerpt-open');
        const closeBtn = overlay.querySelector('[data-excerpt-close]');
        if (closeBtn) closeBtn.focus();
        const dialog = overlay.querySelector('.excerpt-modal__dialog');
        if (dialog) dialog.scrollTop = 0;
    };

    document.querySelectorAll('[data-excerpt-target]').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const modal = document.getElementById(trigger.getAttribute('data-excerpt-target'));
            if (modal) openOverlay(modal, trigger);
        });
    });

    const lightbox = document.getElementById('art-lightbox');
    if (lightbox) {
        const lightboxFigure = lightbox.querySelector('.lightbox__figure');
        const lightboxCaption = lightbox.querySelector('.lightbox__caption');

        document.querySelectorAll('.art-item__trigger').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const fullSrc = trigger.getAttribute('data-art-full');
                const caption = trigger.getAttribute('data-art-caption') || '';
                if (lightboxFigure && fullSrc) {
                    let lightboxImg = lightboxFigure.querySelector('.lightbox__img');
                    if (!lightboxImg) {
                        lightboxImg = document.createElement('img');
                        lightboxImg.className = 'lightbox__img';
                        lightboxFigure.insertBefore(lightboxImg, lightboxCaption);
                    }
                    lightboxImg.src = fullSrc;
                    lightboxImg.alt = caption;
                }
                if (lightboxCaption) lightboxCaption.textContent = caption;
                openOverlay(lightbox, trigger);
            });
        });
    }

    document.querySelectorAll('[data-excerpt-close]').forEach(el => {
        el.addEventListener('click', closeOverlay);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && activeOverlay) closeOverlay();
    });

    // Art gallery category filters
    const filters = document.querySelectorAll('.art-filter');
    const items = document.querySelectorAll('.art-item');
    if (filters.length && items.length) {
        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');

                if (filter !== 'all') {
                    const matching = [...items].filter(item => item.getAttribute('data-category') === filter);
                    if (!matching.length) {
                        return;
                    }
                }

                filters.forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');
                items.forEach(item => {
                    const category = item.getAttribute('data-category');
                    item.classList.toggle('is-hidden', filter !== 'all' && category !== filter);
                });
            });
        });
    }
})();

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
        link.removeAttribute('aria-current');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'location');
        }
    });
});
