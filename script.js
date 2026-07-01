// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        if (href === '#essays') {
            e.preventDefault();
            const target = document.querySelector('#essays');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            document.dispatchEvent(new CustomEvent('show-coming-soon', {
                detail: {
                    trigger: this,
                    message: 'Essays and screenplays are coming soon.'
                }
            }));
            return;
        }

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
        '.essays-coming-soon',
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

// Shared overlay modals (excerpts, art lightbox, coming soon)
(() => {
    let activeOverlay = null;
    let lastFocused = null;

    const comingSoonModal = document.getElementById('coming-soon-modal');
    const comingSoonMessage = document.getElementById('coming-soon-message');

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

    const showComingSoon = (trigger, message) => {
        if (comingSoonMessage) comingSoonMessage.textContent = message;
        if (comingSoonModal) openOverlay(comingSoonModal, trigger);
    };

    document.addEventListener('show-coming-soon', e => {
        const { trigger, message } = e.detail;
        showComingSoon(trigger, message);
    });

    document.querySelectorAll('[data-excerpt-target]').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const modal = document.getElementById(trigger.getAttribute('data-excerpt-target'));
            if (modal) openOverlay(modal, trigger);
        });
    });

    document.querySelectorAll('[data-coming-soon]').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const label = trigger.getAttribute('data-coming-soon');
            showComingSoon(trigger, `${label} are coming soon.`);
        });
    });

    const lightbox = document.getElementById('art-lightbox');
    if (lightbox) {
        const lightboxImg = lightbox.querySelector('.lightbox__img');
        const lightboxCaption = lightbox.querySelector('.lightbox__caption');

        document.querySelectorAll('.art-item__trigger').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const fullSrc = trigger.getAttribute('data-art-full');
                const caption = trigger.getAttribute('data-art-caption') || '';
                if (lightboxImg && fullSrc) {
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
                        showComingSoon(btn, `${btn.textContent.trim()} content is coming soon.`);
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
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});