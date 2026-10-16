const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const progress = document.querySelector<HTMLElement>('[data-progress]');
const header = document.querySelector<HTMLElement>('[data-header]');
const navLinks = document.querySelectorAll<HTMLAnchorElement>('[data-nav]');
const sections = [...navLinks]
  .map((link) => {
    const href = link.getAttribute('href') || '';
    return href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
  })
  .filter((section): section is HTMLElement => section instanceof HTMLElement);

const uniqueSections = [...new Map(sections.map((section) => [section.id, section])).values()];

let ticking = false;

const onScroll = () => {
  if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);

  if (progress) {
    const max = root.scrollHeight - window.innerHeight;
    const value = max > 0 ? window.scrollY / max : 0;
    progress.style.transform = `scaleX(${value})`;
  }

  const marker = window.scrollY + 120;
  let current = '';
  for (const section of uniqueSections) {
    if (section.offsetTop <= marker) current = section.id;
  }
  navLinks.forEach((link) => {
    link.classList.toggle('is-current', link.getAttribute('href') === `#${current}`);
  });

  ticking = false;
};

const requestTick = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(onScroll);
};

window.addEventListener('scroll', requestTick, { passive: true });
window.addEventListener('resize', requestTick);
onScroll();

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href === '#') return;
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  event.preventDefault();

  const interest = link.getAttribute('data-interest');
  if (interest) {
    const select = document.querySelector<HTMLSelectElement>('select[name="interest"]');
    if (select && [...select.options].some((option) => option.value === interest)) {
      select.value = interest;
    }
  }

  history.pushState(null, '', href);
  target.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
});

if (!reduce && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        reveal.unobserve(entry.target);
      }
    },
    { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
  );
  document.querySelectorAll('[data-reveal]').forEach((node) => reveal.observe(node));
} else {
  document.querySelectorAll('[data-reveal]').forEach((node) => node.classList.add('is-in'));
}

const hero = document.querySelector<HTMLElement>('.hero');
if (hero && root.classList.contains('is-rich') && 'IntersectionObserver' in window) {
  const quiet = new IntersectionObserver(
    ([entry]) => {
      hero.classList.toggle('is-quiet', !entry.isIntersecting);
    },
    { threshold: 0 },
  );
  quiet.observe(hero);
}

const stage = document.querySelector<HTMLElement>('[data-parallax]');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (stage && root.classList.contains('is-rich') && finePointer) {
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let running = false;
  const max = 16;

  const tick = () => {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    stage.style.setProperty('--dx', cx.toFixed(2));
    stage.style.setProperty('--dy', cy.toFixed(2));
    if (Math.abs(tx - cx) > 0.06 || Math.abs(ty - cy) > 0.06) {
      requestAnimationFrame(tick);
      return;
    }
    running = false;
  };

  const start = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  };

  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    tx = ((event.clientX - rect.left) / rect.width - 0.5) * max;
    ty = ((event.clientY - rect.top) / rect.height - 0.5) * max;
    start();
  });

  stage.addEventListener('pointerleave', () => {
    tx = 0;
    ty = 0;
    start();
  });
}
