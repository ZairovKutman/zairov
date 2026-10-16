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

const stage = document.querySelector<HTMLElement>('[data-sculpture]');
const canvas = stage?.querySelector<HTMLCanvasElement>('[data-sculpture-canvas]');
const fallback = stage?.querySelector('[data-sculpture-fallback]') ?? null;
const mobile = window.matchMedia('(max-width: 767px)').matches;

if (stage && canvas && root.classList.contains('is-rich') && !reduce) {
  const boot = () => {
    import('./sculpture')
      .then(({ mountSculpture }) => {
        mountSculpture({ canvas, host: stage, fallback });
      })
      .catch(() => {
        canvas.hidden = true;
        if (fallback instanceof HTMLElement) fallback.hidden = false;
      });
  };

  if (mobile && 'requestIdleCallback' in window) {
    window.requestIdleCallback(boot, { timeout: 1200 });
  } else {
    boot();
  }
}
