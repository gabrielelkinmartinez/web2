/* Utilidades */
const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);

const trapFocus = (container) => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];
  const focusable = qsa(focusableSelectors.join(','), container).filter((node) => node.offsetParent !== null);
  if (!focusable.length) return () => {};
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const handleFocus = (event) => {
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', handleFocus);
  return () => container.removeEventListener('keydown', handleFocus);
};

/* Header y navegación */
const body = document.body;
const header = qs('[data-header]');
const burger = qs('[data-nav-toggle]');
const navPanel = qs('[data-nav-panel]');
const navDrawer = qs('[data-nav-drawer]');
const navLinks = qsa('.nav__link');
let releaseFocus = () => {};

/* Caminos y rutas base */
const baseElement = document.querySelector('base');
let baseUrl;
try {
  const href = baseElement?.getAttribute('href') || './';
  baseUrl = new URL(href, window.location.href);
} catch (error) {
  baseUrl = new URL(window.location.href);
}
const basePath = (() => {
  const path = baseUrl.pathname.replace(/\/$/, '');
  return path || '/';
})();
const protocolPattern = /^[a-z][a-z0-9+.-]*:/i;

const resolveToUrl = (value) => {
  if (value instanceof URL) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (protocolPattern.test(trimmed)) {
      try {
        return new URL(trimmed);
      } catch (error) {
        return new URL(baseUrl.href);
      }
    }
    if (trimmed.startsWith('//')) {
      return new URL(`${window.location.protocol}${trimmed}`);
    }
    const candidate = trimmed.startsWith('/') ? `.${trimmed}` : trimmed || './';
    return new URL(candidate, baseUrl.href);
  }
  return new URL(String(value || './'), baseUrl.href);
};

const normalizePath = (value) => {
  const url = resolveToUrl(value);
  let path = url.pathname;
  if (basePath !== '/' && path.startsWith(basePath)) {
    path = path.slice(basePath.length) || '/';
  }
  if (!path.startsWith('/')) path = `/${path}`;
  if (path === '/' || path === '') return '/';
  path = path.replace(/\/index\.html$/, '');
  if (path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
};

const closeNav = () => {
  body.classList.remove('is-locked');
  navPanel?.classList.remove('is-active');
  navDrawer?.classList.remove('is-active');
  burger?.setAttribute('aria-expanded', 'false');
  burger?.focus();
  releaseFocus();
};

const openNav = () => {
  body.classList.add('is-locked');
  navPanel?.classList.add('is-active');
  navDrawer?.classList.add('is-active');
  burger?.setAttribute('aria-expanded', 'true');
  releaseFocus = trapFocus(navDrawer);
  const firstLink = qs('.nav__drawer .nav__link');
  firstLink?.focus();
};

on(burger, 'click', () => {
  if (navDrawer?.classList.contains('is-active')) {
    closeNav();
  } else {
    openNav();
  }
});

on(navPanel, 'click', (event) => {
  if (event.target === navPanel) closeNav();
});

on(document, 'keydown', (event) => {
  if (event.key === 'Escape' && navDrawer?.classList.contains('is-active')) {
    closeNav();
  }
});

const updateHeaderState = () => {
  if (!header) return;
  const scrolled = window.scrollY > 16;
  header.classList.toggle('header--scrolled', scrolled);
};

updateHeaderState();
on(window, 'scroll', updateHeaderState);

/* Marca de navegación activa */
const currentPath = normalizePath(window.location.href);

navLinks.forEach((link) => {
  const matchesAttr = link.dataset.match
    ? link.dataset.match
        .split(',')
        .map((value) => normalizePath(value.trim()))
        .filter(Boolean)
    : [];
  const hrefAttr = link.getAttribute('href') || link.href;
  const hrefPath = normalizePath(hrefAttr);
  const pathsToCheck = [hrefPath, ...matchesAttr];
  const isActive = pathsToCheck.some((path) => currentPath === path || currentPath.startsWith(`${path}/`));
  if (isActive) {
    link.setAttribute('aria-current', 'page');
  }
});

/* Slider */
const slider = qs('[data-slider]');
if (slider) {
  const slides = qsa('[data-slide]', slider);
  const prevBtn = qs('[data-slider-prev]', slider);
  const nextBtn = qs('[data-slider-next]', slider);
  const dots = qsa('[data-slider-dot]', slider);
  let index = 0;
  let autoplayId;

  const setBackgrounds = () => {
    slides.forEach((slide) => {
      const bg = slide.dataset.bg;
      if (bg && !slide.style.backgroundImage) {
        slide.style.backgroundImage = `url("${bg}")`;
      }
    });
  };

  const activate = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, idx) => {
      const isActive = idx === index;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      dots[idx]?.classList.toggle('is-active', isActive);
    });
  };

  const next = () => activate(index + 1);
  const prev = () => activate(index - 1);

  const startAutoplay = () => {
    stopAutoplay();
    autoplayId = setInterval(next, 5000);
  };

  const stopAutoplay = () => {
    if (autoplayId) clearInterval(autoplayId);
  };

  on(nextBtn, 'click', () => {
    next();
    startAutoplay();
  });
  on(prevBtn, 'click', () => {
    prev();
    startAutoplay();
  });

  dots.forEach((dot, dotIndex) => {
    on(dot, 'click', () => {
      activate(dotIndex);
      startAutoplay();
    });
  });

  on(slider, 'mouseenter', stopAutoplay);
  on(slider, 'mouseleave', startAutoplay);
  on(slider, 'focusin', stopAutoplay);
  on(slider, 'focusout', startAutoplay);

  on(slider, 'keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
      startAutoplay();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prev();
      startAutoplay();
    }
  });

  setBackgrounds();
  activate(0);
  startAutoplay();
}

/* Tabs */
qsa('[data-tabs]').forEach((tabs) => {
  const tabButtons = qsa('[role="tab"]', tabs);
  const panels = qsa('[role="tabpanel"]', tabs);

  const activateTab = (newTab) => {
    tabButtons.forEach((tab) => {
      const selected = tab === newTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('tabindex', selected ? '0' : '-1');
    });
    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.id === newTab.getAttribute('aria-controls'));
      panel.hidden = panel.id !== newTab.getAttribute('aria-controls');
    });
    newTab.focus();
  };

  tabButtons.forEach((tab) => {
    on(tab, 'click', () => activateTab(tab));
    on(tab, 'keydown', (event) => {
      const currentIndex = tabButtons.indexOf(tab);
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % tabButtons.length;
        activateTab(tabButtons[nextIndex]);
      }
      if (event.key === 'ArrowLeft') {
        const prevIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
        activateTab(tabButtons[prevIndex]);
      }
      if (event.key === 'Home') {
        activateTab(tabButtons[0]);
      }
      if (event.key === 'End') {
        activateTab(tabButtons[tabButtons.length - 1]);
      }
    });
  });

  const initialTab = tabButtons.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabButtons[0];
  if (initialTab) activateTab(initialTab);
});

/* Acordeones */
qsa('.accordion').forEach((accordion) => {
  const items = qsa('.accordion__item', accordion);

  const closeAll = () => {
    items.forEach((item) => {
      const button = qs('.accordion__button', item);
      const panel = qs('.accordion__panel', item);
      button?.setAttribute('aria-expanded', 'false');
      panel.style.maxHeight = '0px';
    });
  };

  items.forEach((item) => {
    const button = qs('.accordion__button', item);
    const panel = qs('.accordion__panel', item);
    on(button, 'click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      closeAll();
      if (!isOpen) {
        button.setAttribute('aria-expanded', 'true');
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      }
    });
  });

  const first = items[0];
  if (first) {
    const firstButton = qs('.accordion__button', first);
    const firstPanel = qs('.accordion__panel', first);
    firstButton.setAttribute('aria-expanded', 'true');
    firstPanel.style.maxHeight = `${firstPanel.scrollHeight}px`;
  }
});

/* Back to top */
const backToTop = qs('[data-back-to-top]');
if (backToTop) {
  on(window, 'scroll', () => {
    const shouldShow = window.scrollY > 600;
    backToTop.classList.toggle('is-visible', shouldShow);
  });
  on(backToTop, 'click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* Lazy loading */
const lazyImages = qsa('img[data-src]');
if ('IntersectionObserver' in window && lazyImages.length) {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '0px 0px 200px 0px' });

  lazyImages.forEach((img) => observer.observe(img));
} else {
  lazyImages.forEach((img) => {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  });
}

/* Tabs anchor smooth scroll for in-page buttons */
qsa('[data-scroll-to]').forEach((trigger) => {
  on(trigger, 'click', (event) => {
    const targetId = trigger.getAttribute('data-scroll-to');
    const target = qs(targetId);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

/* Utility to close nav on link click (mobile) */
navLinks.forEach((link) => {
  on(link, 'click', () => {
    if (navDrawer?.classList.contains('is-active')) {
      closeNav();
    }
  });
});
