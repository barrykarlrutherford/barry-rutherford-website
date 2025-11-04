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
});
