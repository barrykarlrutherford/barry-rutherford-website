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
