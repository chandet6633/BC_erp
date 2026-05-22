document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Add scroll class to nav for transparency effect
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.style.background = 'rgba(5, 5, 5, 0.95)';
        nav.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
      } else {
        nav.style.background = 'rgba(5, 5, 5, 0.8)';
        nav.style.boxShadow = 'none';
      }
    });
  }
});
