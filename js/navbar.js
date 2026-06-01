(function () {
  'use strict';

  const navbar = document.getElementById('navbar');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    });
  }

  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const bar1 = document.getElementById('h1');
  const bar2 = document.getElementById('h2');
  const bar3 = document.getElementById('h3');

  let menuOpen = false;

  function toggleMenu(force) {
    if (!mobileMenu || !bar1 || !bar2 || !bar3) return;

    menuOpen = force !== undefined ? force : !menuOpen;

    mobileMenu.classList.toggle('open', menuOpen);
    bar1.style.transform = menuOpen ? 'translateY(8px) rotate(45deg)' : '';
    bar2.style.opacity = menuOpen ? '0' : '1';
    bar3.style.transform = menuOpen ? 'translateY(-8px) rotate(-45deg)' : '';
  }

  if (hamburger) {
    hamburger.addEventListener('click', () => toggleMenu());
  }

  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  document.addEventListener('click', function (e) {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;

    e.preventDefault();

    const offset = 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top,
      behavior: 'smooth'
    });
  });
})();