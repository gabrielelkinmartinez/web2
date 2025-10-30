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
const dropdownTimers = new WeakMap();
const navDropdownItems = qsa('.nav__item--has-menu');
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

const getDropdownParts = (item) => {
  if (!item) return {};
  const trigger = qs('[data-dropdown-toggle]', item);
  const menu = qs('.nav__menu', item);
  return { trigger, menu };
};

const closeDropdown = (item) => {
  if (!item) return;
  const { trigger, menu } = getDropdownParts(item);
  if (!trigger || !menu) return;
  item.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
  menu.hidden = true;
};

const openDropdown = (item) => {
  if (!item) return;
  const { trigger, menu } = getDropdownParts(item);
  if (!trigger || !menu) return;
  navDropdownItems.forEach((other) => {
    if (other !== item) closeDropdown(other);
  });
  item.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');
  menu.hidden = false;
};

const clearDropdownTimer = (item) => {
  const id = dropdownTimers.get(item);
  if (id) {
    clearTimeout(id);
    dropdownTimers.delete(item);
  }
};

const scheduleDropdownClose = (item) => {
  clearDropdownTimer(item);
  const timeoutId = setTimeout(() => closeDropdown(item), 180);
  dropdownTimers.set(item, timeoutId);
};

navDropdownItems.forEach((item) => {
  const { trigger, menu } = getDropdownParts(item);
  if (!trigger || !menu) return;
  trigger.setAttribute('aria-expanded', 'false');
  menu.hidden = true;

  on(item, 'pointerenter', () => {
    clearDropdownTimer(item);
    openDropdown(item);
  });

  on(item, 'pointerleave', () => {
    scheduleDropdownClose(item);
  });

  on(trigger, 'click', (event) => {
    event.preventDefault();
    const isOpen = item.classList.contains('is-open');
    if (isOpen) {
      closeDropdown(item);
    } else {
      openDropdown(item);
    }
  });

  on(trigger, 'focus', () => {
    clearDropdownTimer(item);
    openDropdown(item);
  });

  on(trigger, 'keydown', (event) => {
    if (event.key === 'Escape') {
      closeDropdown(item);
      trigger.focus();
    }
  });

  on(item, 'focusout', (event) => {
    const next = event.relatedTarget;
    if (!item.contains(next)) {
      scheduleDropdownClose(item);
    }
  });
});

on(document, 'pointerdown', (event) => {
  const targetItem = event.target.closest('.nav__item--has-menu');
  if (!targetItem) {
    navDropdownItems.forEach((item) => closeDropdown(item));
  }
});

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

/* Brochure fallbacks */
qsa('[data-brochure-section]').forEach((section) => {
  const figures = qsa('figure', section);
  const cleanup = () => {
    if (!section.querySelector('figure')) {
      section.remove();
    }
  };
  figures.forEach((figure) => {
    const img = qs('img', figure);
    if (!img) return;
    img.addEventListener(
      'error',
      () => {
        figure.remove();
        cleanup();
      },
      { once: true }
    );
    if (img.complete && img.naturalWidth === 0) {
      img.dispatchEvent(new Event('error'));
    }
  });
  cleanup();
});

/* Brochure interactive viewer */
(() => {
  const brochureSections = qsa('[data-brochure-section]');
  if (!brochureSections.length) return;

  const ICONS = {
    left: 'M15.53 5.47a.75.75 0 0 1 0 1.06L11.06 11l4.47 4.47a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 0 1 1.06 0Z',
    right: 'M8.47 5.47a.75.75 0 0 0 0 1.06L12.94 11l-4.47 4.47a.75.75 0 0 0 1.06 1.06l5-5a.75.75 0 0 0 0-1.06l-5-5a.75.75 0 0 0-1.06 0Z',
    expand: 'M5.75 9a.75.75 0 0 1-1.5 0V4.75A1.75 1.75 0 0 1 6 3h4.25a.75.75 0 0 1 0 1.5H6a.25.25 0 0 0-.25.25V9Zm12.5 0a.75.75 0 0 0 1.5 0V4.75A1.75 1.75 0 0 0 18 3h-4.25a.75.75 0 0 0 0 1.5H18c.14 0 .25.11.25.25V9Zm0 6a.75.75 0 0 1 1.5 0v4.25A1.75 1.75 0 0 1 18 21h-4.25a.75.75 0 0 1 0-1.5H18c.14 0 .25-.11.25-.25V15ZM5 18.25V14a.75.75 0 0 0-1.5 0v4.25A1.75 1.75 0 0 0 5.25 20H9.5a.75.75 0 0 0 0-1.5H5.25a.25.25 0 0 1-.25-.25Z',
    close: 'M7.22 5.22a.75.75 0 1 0-1.06 1.06L10.94 11l-4.78 4.72a.75.75 0 1 0 1.06 1.06L12 12.06l4.78 4.72a.75.75 0 0 0 1.06-1.06L13.06 11l4.78-4.72a.75.75 0 1 0-1.06-1.06L12 9.94 7.22 5.22Z',
    zoomIn: 'M11 4a7 7 0 1 0 4.606 12.226l3.584 3.584a.75.75 0 1 0 1.06-1.06l-3.584-3.585A7 7 0 0 0 11 4Zm0 1.5a5.5 5.5 0 1 1-5.5 5.5A5.5 5.5 0 0 1 11 5.5Zm0 2a.75.75 0 0 1 .75.75V10h1.75a.75.75 0 0 1 0 1.5H11.75v1.75a.75.75 0 0 1-1.5 0V11.5H8.5a.75.75 0 0 1 0-1.5h1.75V8.25A.75.75 0 0 1 11 7.5Z',
    zoomOut: 'M11 4a7 7 0 1 0 4.606 12.226l3.584 3.584a.75.75 0 1 0 1.06-1.06l-3.584-3.585A7 7 0 0 0 11 4Zm0 1.5a5.5 5.5 0 1 1-5.5 5.5 5.5 5.5 0 0 1 5.5-5.5Zm2.25 5.75a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5h4.5Z'
  };

  const createIcon = (type) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('brochure-viewer__icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', ICONS[type]);
    svg.append(path);
    return svg;
  };

  const createController = (pages) => {
    const spreads = [];
    if (pages.length) {
      spreads.push([0]);
      for (let index = 1; index < pages.length; index += 2) {
        const spread = [index];
        if (pages[index + 1]) spread.push(index + 1);
        spreads.push(spread);
      }
    }

    let current = 0;
    const listeners = new Set();

    const clampIndex = (value) => {
      if (!spreads.length) return 0;
      return Math.max(0, Math.min(value, spreads.length - 1));
    };

    const notify = () => listeners.forEach((listener) => listener(current));

    const getSpreadMeta = (index) => {
      const spread = spreads[index] || [];
      const total = pages.length;
      if (!spread.length) return { label: '', pages: [] };
      const pageNumbers = spread.map((pageIndex) => pageIndex + 1);
      const first = pageNumbers[0];
      const last = pageNumbers[pageNumbers.length - 1];
      let label;
      if (index === 0 && spread.length === 1) {
        label = `Portada (pág. ${first} de ${total})`;
      } else if (pageNumbers.length === 1) {
        label = `Página ${first} de ${total}`;
      } else {
        label = `Páginas ${first}-${last} de ${total}`;
      }
      return { label, pages: pageNumbers };
    };

    return {
      pages,
      spreads,
      get index() {
        return current;
      },
      get totalSpreads() {
        return spreads.length;
      },
      get totalPages() {
        return pages.length;
      },
      canPrev() {
        return current > 0;
      },
      canNext() {
        return current < spreads.length - 1;
      },
      go(nextIndex) {
        const target = clampIndex(nextIndex);
        if (target === current) return;
        current = target;
        notify();
      },
      prev() {
        this.go(current - 1);
      },
      next() {
        this.go(current + 1);
      },
      subscribe(listener) {
        listeners.add(listener);
        listener(current);
        return () => listeners.delete(listener);
      },
      getMeta(index = current) {
        return getSpreadMeta(index);
      }
    };
  };

  const createViewer = (controller, { title, mode }) => {
    const root = document.createElement('div');
    root.className = `brochure-viewer brochure-viewer--${mode}`;
    root.setAttribute('data-brochure-viewer', mode);

    const stage = document.createElement('div');
    stage.className = 'brochure-viewer__stage';
    stage.setAttribute('tabindex', '0');
    stage.setAttribute('role', 'application');
    stage.setAttribute('aria-label', title || 'Visor de brochure');
    stage.dataset.dragging = 'false';

    const spreadsWrapper = document.createElement('div');
    spreadsWrapper.className = 'brochure-viewer__spreads';
    stage.append(spreadsWrapper);

    const spreadElements = [];
    const spreadContents = [];

    controller.spreads.forEach((spread) => {
      const spreadEl = document.createElement('div');
      spreadEl.className = 'brochure-viewer__spread';
      if (spread.length === 1) {
        spreadEl.classList.add('brochure-viewer__spread--single');
      }

      const positioner = document.createElement('div');
      positioner.className = 'brochure-viewer__spread-positioner';

      const content = document.createElement('div');
      content.className = 'brochure-viewer__spread-content';

      spread.forEach((pageIndex) => {
        const page = controller.pages[pageIndex];
        if (!page) return;
        const isLink = Boolean(page.href);
        const pageEl = document.createElement(isLink ? 'a' : 'div');
        pageEl.className = 'brochure-viewer__page';
        if (isLink) {
          pageEl.href = page.href;
          pageEl.target = '_blank';
          pageEl.rel = 'noopener noreferrer';
          pageEl.setAttribute('aria-label', `${page.caption || page.alt || `Página ${pageIndex + 1}`} (abrir en pestaña nueva)`);
        }
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = page.alt || `Página ${pageIndex + 1}`;
        img.src = page.src;
        img.addEventListener('load', scheduleBounds);
        pageEl.append(img);
        content.append(pageEl);
      });

      positioner.append(content);
      spreadEl.append(positioner);
      spreadsWrapper.append(spreadEl);
      spreadElements.push(spreadEl);
      spreadContents.push(content);
    });

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'brochure-viewer__nav brochure-viewer__nav--prev';
    prevButton.setAttribute('aria-label', 'Página anterior');
    prevButton.append(createIcon('left'));

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'brochure-viewer__nav brochure-viewer__nav--next';
    nextButton.setAttribute('aria-label', 'Página siguiente');
    nextButton.append(createIcon('right'));

    stage.append(prevButton, nextButton);

    const controls = document.createElement('div');
    controls.className = 'brochure-viewer__controls';

    const indicator = document.createElement('span');
    indicator.className = 'brochure-viewer__indicator';
    indicator.textContent = '';
    controls.append(indicator);

    const actions = document.createElement('div');
    actions.className = 'brochure-viewer__actions';
    controls.append(actions);

    const zoomButton = document.createElement('button');
    zoomButton.type = 'button';
    zoomButton.className = 'brochure-viewer__button brochure-viewer__button--zoom';
    zoomButton.setAttribute('aria-label', 'Activar lupa');
    zoomButton.setAttribute('aria-pressed', 'false');
    const zoomInIcon = createIcon('zoomIn');
    const zoomOutIcon = createIcon('zoomOut');
    zoomOutIcon.hidden = true;
    const zoomLabel = document.createElement('span');
    zoomLabel.className = 'brochure-viewer__button-label';
    zoomLabel.textContent = 'Activar lupa';
    zoomButton.append(zoomInIcon, zoomOutIcon, zoomLabel);
    actions.append(zoomButton);

    const expandButton = document.createElement('button');
    expandButton.type = 'button';
    expandButton.className = 'brochure-viewer__button brochure-viewer__button--fullscreen';
    expandButton.setAttribute('aria-label', 'Abrir brochure a pantalla completa');
    const expandIcon = createIcon('expand');
    const expandLabel = document.createElement('span');
    expandLabel.className = 'brochure-viewer__button-label';
    expandLabel.textContent = 'Pantalla completa';
    expandButton.append(expandIcon, expandLabel);
    actions.append(expandButton);

    root.append(stage, controls);

    const baseScale = 1;
    const zoomScale = mode === 'overlay' ? 3.1 : 2.3;
    let currentScale = baseScale;
    let offsetX = 0;
    let offsetY = 0;
    let maxOffsetX = 0;
    let maxOffsetY = 0;
    let activeSpreadIndex = 0;
    let zoomed = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startOffsetX = 0;
    let startOffsetY = 0;
    let boundsFrame = null;

    const cleanupFns = [];

    const applyTransformState = () => {
      root.style.setProperty('--brochure-scale', String(currentScale));
      root.style.setProperty('--brochure-translate-x', `${offsetX}px`);
      root.style.setProperty('--brochure-translate-y', `${offsetY}px`);
    };

    function clampOffset(value, limit) {
      if (!Number.isFinite(limit) || limit <= 0) return 0;
      return Math.min(Math.max(value, -limit), limit);
    }

    function recalcBounds() {
      const content = spreadContents[activeSpreadIndex];
      if (!content) {
        offsetX = 0;
        offsetY = 0;
        applyTransformState();
        return;
      }
      const stageRect = stage.getBoundingClientRect();
      const baseWidth = content.offsetWidth || stageRect.width;
      const baseHeight = content.offsetHeight || stageRect.height;
      const scaledWidth = baseWidth * currentScale;
      const scaledHeight = baseHeight * currentScale;
      maxOffsetX = Math.max(0, (scaledWidth - stageRect.width) / 2);
      maxOffsetY = Math.max(0, (scaledHeight - stageRect.height) / 2);
      offsetX = clampOffset(offsetX, maxOffsetX);
      offsetY = clampOffset(offsetY, maxOffsetY);
      applyTransformState();
    }

    function scheduleBounds() {
      if (boundsFrame) cancelAnimationFrame(boundsFrame);
      boundsFrame = requestAnimationFrame(recalcBounds);
    }

    applyTransformState();
    scheduleBounds();

    const handleResize = () => scheduleBounds();
    window.addEventListener('resize', handleResize);
    cleanupFns.push(() => window.removeEventListener('resize', handleResize));

    prevButton.addEventListener('click', () => controller.prev());
    nextButton.addEventListener('click', () => controller.next());
    stage.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        controller.prev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        controller.next();
      } else if (event.key === ' ') {
        event.preventDefault();
        toggleZoom();
      }
    });

    stage.addEventListener('dblclick', (event) => {
      event.preventDefault();
      toggleZoom();
    });

    const applyZoomState = () => {
      root.classList.toggle('brochure-viewer--zoomed', zoomed);
      zoomButton.setAttribute('aria-pressed', zoomed ? 'true' : 'false');
      zoomInIcon.hidden = zoomed;
      zoomOutIcon.hidden = !zoomed;
      const zoomLabelText = zoomed ? 'Salir de la lupa' : 'Activar lupa';
      zoomLabel.textContent = zoomLabelText;
      zoomButton.setAttribute('aria-label', zoomed ? 'Desactivar lupa' : 'Activar lupa');
      zoomButton.title = zoomed ? 'Salir de la lupa (doble clic o barra espaciadora)' : 'Activar lupa (arrastra el brochure para recorrerlo)';
      stage.dataset.dragging = 'false';
    };

    const setZoom = (value, { force = false } = {}) => {
      const next = Boolean(value);
      if (!force && next === zoomed) return;
      zoomed = next;
      currentScale = zoomed ? zoomScale : baseScale;
      offsetX = 0;
      offsetY = 0;
      applyZoomState();
      applyTransformState();
      scheduleBounds();
    };

    const toggleZoom = () => {
      const next = !zoomed;
      setZoom(next, { force: true });
      if (next) {
        stage.focus({ preventScroll: true });
      }
    };

    zoomButton.addEventListener('click', () => toggleZoom());

    const endDrag = () => {
      pointerId = null;
      stage.dataset.dragging = 'false';
    };

    stage.addEventListener('pointerdown', (event) => {
      if (!zoomed) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startOffsetX = offsetX;
      startOffsetY = offsetY;
      stage.dataset.dragging = 'true';
      stage.setPointerCapture(pointerId);
    });

    stage.addEventListener('pointermove', (event) => {
      if (!zoomed || pointerId !== event.pointerId || stage.dataset.dragging !== 'true') return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      offsetX = clampOffset(startOffsetX + deltaX, maxOffsetX);
      offsetY = clampOffset(startOffsetY + deltaY, maxOffsetY);
      applyTransformState();
    });

    const handlePointerRelease = (event) => {
      if (pointerId !== event.pointerId) return;
      stage.releasePointerCapture(pointerId);
      endDrag();
    };

    stage.addEventListener('pointerup', handlePointerRelease);
    stage.addEventListener('pointercancel', handlePointerRelease);
    stage.addEventListener('lostpointercapture', endDrag);

    const handleWheel = (event) => {
      if (!zoomed) return;
      event.preventDefault();
      offsetX = clampOffset(offsetX - event.deltaX, maxOffsetX);
      offsetY = clampOffset(offsetY - event.deltaY, maxOffsetY);
      applyTransformState();
    };
    stage.addEventListener('wheel', handleWheel, { passive: false });
    cleanupFns.push(() => stage.removeEventListener('wheel', handleWheel));

    const update = (index) => {
      spreadElements.forEach((spreadEl, spreadIndex) => {
        spreadEl.classList.toggle('is-active', spreadIndex === index);
      });
      prevButton.disabled = !controller.canPrev();
      nextButton.disabled = !controller.canNext();
      const meta = controller.getMeta(index);
      indicator.textContent = meta.label || '';
      activeSpreadIndex = index;
      if (!zoomed) {
        offsetX = 0;
        offsetY = 0;
        applyTransformState();
      }
      scheduleBounds();
    };

    const unsubscribe = controller.subscribe(update);
    setZoom(false, { force: true });

    cleanupFns.push(() => {
      if (boundsFrame) cancelAnimationFrame(boundsFrame);
    });

    return {
      root,
      expandButton,
      unsubscribe,
      setZoom,
      getZoom: () => zoomed,
      destroy: () => cleanupFns.forEach((fn) => fn?.())
    };
  };

  const createOverlay = (controller, { title, trigger }) => {
    const overlay = document.createElement('div');
    overlay.className = 'brochure-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title || 'Brochure digital');
    overlay.hidden = true;

    const content = document.createElement('div');
    content.className = 'brochure-overlay__content';
    overlay.append(content);

    const { root, unsubscribe, setZoom, destroy: destroyViewer } = createViewer(controller, { title, mode: 'overlay' });
    content.append(root);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'brochure-overlay__close';
    closeButton.setAttribute('aria-label', 'Cerrar brochure');
    closeButton.append(createIcon('close'));
    content.append(closeButton);

    let releaseFocus = () => {};
    let ownsLock = false;

    const close = () => {
      if (overlay.hidden) return;
      overlay.classList.remove('is-open');
      setZoom(false, { force: true });
      const handle = releaseFocus;
      releaseFocus = () => {};
      if (typeof handle === 'function') handle();
      if (ownsLock) {
        body.classList.remove('is-locked');
      }
      ownsLock = false;
      setTimeout(() => {
        overlay.hidden = true;
        trigger?.focus();
      }, 180);
    };

    const open = () => {
      if (!overlay.hidden) return;
      overlay.hidden = false;
      setZoom(false, { force: true });
      requestAnimationFrame(() => {
        overlay.classList.add('is-open');
      });
      if (!body.classList.contains('is-locked')) {
        body.classList.add('is-locked');
        ownsLock = true;
      }
      releaseFocus = trapFocus(content);
      closeButton.focus();
    };

    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close();
      }
    });
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        controller.prev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        controller.next();
      }
    });

    return {
      root: overlay,
      open,
      close,
      destroy: () => {
        unsubscribe();
        destroyViewer?.();
        overlay.remove();
      },
      setZoom: (value, options) => setZoom(value, options)
    };
  };

  brochureSections.forEach((section) => {
    const grid = qs('.brochure-grid', section);
    if (!grid) return;

    const figures = qsa('figure', grid);
    if (!figures.length) return;

    const pages = figures
      .map((figure, index) => {
        const img = qs('img', figure);
        if (!img) return null;
        const anchor = qs('a', figure);
        const caption = qs('figcaption', figure);
        const src = img.getAttribute('data-src') || img.getAttribute('src');
        if (!src) return null;
        return {
          src,
          alt: img.getAttribute('alt') || `Página ${index + 1}`,
          caption: caption?.textContent?.trim(),
          href: anchor?.getAttribute('href')
        };
      })
      .filter(Boolean);

    if (!pages.length) return;

    const heading = qs('.program-detail__subheading, h2, h3', section);
    const title = heading?.textContent?.trim() || 'Brochure digital';
    if (heading) {
      heading.remove();
    }

    const controller = createController(pages);
    const inlineViewer = createViewer(controller, { title, mode: 'inline' });

    grid.insertAdjacentElement('beforebegin', inlineViewer.root);
    grid.remove();

    if (inlineViewer.expandButton) {
      let overlay;
      inlineViewer.expandButton.addEventListener('click', () => {
        inlineViewer.setZoom(false, { force: true });
        if (!overlay) {
          overlay = createOverlay(controller, { title, trigger: inlineViewer.expandButton });
          document.body.append(overlay.root);
        }
        overlay.open();
      });
    }
  });
})();

/* Búsqueda global */
(() => {
  const triggers = qsa('[data-global-search-trigger]');
  if (!triggers.length) return;

  const removeDiacritics = (value) => {
    try {
      return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    } catch (error) {
      return value;
    }
  };

  const toToken = (value) => removeDiacritics(String(value || '').toLowerCase());
  const registry = new Map();
  const loadedSources = new Set();
  const weightBySource = {
    news: 3,
    activities: 2,
    page: 1.2,
    other: 1
  };

  const numberFormatter = new Intl.NumberFormat('es-CO');
  const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  let pageContentRegistered = false;
  let isOpen = false;
  let releaseFocus = () => {};
  let lastTrigger = null;

  const now = () => new Date();

  const buildSvg = (path) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    inner.setAttribute('fill', 'currentColor');
    inner.setAttribute('d', path);
    svg.appendChild(inner);
    return svg;
  };

  const createOverlay = () => {
    const root = document.createElement('div');
    root.className = 'search-layer';
    root.setAttribute('aria-hidden', 'true');

    const backdrop = document.createElement('div');
    backdrop.className = 'search-layer__backdrop';
    root.appendChild(backdrop);

    const dialog = document.createElement('div');
    dialog.className = 'search-layer__dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'global-search-title');

    const header = document.createElement('header');
    header.className = 'search-layer__header';

    const title = document.createElement('h2');
    title.className = 'search-layer__title';
    title.id = 'global-search-title';
    title.textContent = 'Buscar en el Centro de Idiomas';
    header.appendChild(title);

    const hint = document.createElement('p');
    hint.className = 'search-layer__hint';
    hint.id = 'global-search-hint';
    hint.textContent = 'Escribe para buscar noticias, actividades y contenido del sitio. Usa Esc para cerrar.';
    header.appendChild(hint);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'search-layer__input';

    const icon = document.createElement('span');
    icon.className = 'search-layer__input-icon';
    icon.appendChild(buildSvg('M10 2a8 8 0 1 1-4.9 14.3l-2.4 2.4-1.4-1.4 2.4-2.4A8 8 0 0 1 10 2Zm0 2a6 6 0 1 0 4.2 10.2A6 6 0 0 0 10 4Z'));
    inputWrap.appendChild(icon);

    const input = document.createElement('input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.placeholder = 'Buscar noticias, actividades o secciones…';
    input.className = 'search-layer__field';
    input.setAttribute('aria-describedby', 'global-search-hint');
    inputWrap.appendChild(input);

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'search-layer__clear';
    clearButton.setAttribute('aria-label', 'Limpiar búsqueda');
    clearButton.hidden = true;
    clearButton.appendChild(buildSvg('M18.3 5.7 13 11l5.3 5.3-1.4 1.4L11.6 12.4 6.3 17.7 4.9 16.3 10.2 11 4.9 5.7 6.3 4.3 11.6 9.6 16.9 4.3Z'));
    inputWrap.appendChild(clearButton);

    header.appendChild(inputWrap);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'search-layer__close';
    closeButton.setAttribute('aria-label', 'Cerrar búsqueda');
    closeButton.appendChild(buildSvg('M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3 10.6 10.6 16.9 4.3Z'));
    header.appendChild(closeButton);

    dialog.appendChild(header);

    const body = document.createElement('div');
    body.className = 'search-layer__body';

    const status = document.createElement('div');
    status.className = 'search-layer__status';
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    body.appendChild(status);

    const results = document.createElement('div');
    results.className = 'search-layer__results';
    results.setAttribute('role', 'list');
    body.appendChild(results);

    const empty = document.createElement('div');
    empty.className = 'search-layer__empty';
    empty.hidden = true;
    empty.innerHTML = '<p>No encontramos coincidencias. Intenta con otros términos o revisa la escritura.</p>';
    body.appendChild(empty);

    const footer = document.createElement('footer');
    footer.className = 'search-layer__footer';
    footer.innerHTML = '<p>Atajo rápido: <kbd>Ctrl</kbd> + <kbd>K</kbd></p>';
    body.appendChild(footer);

    dialog.appendChild(body);
    root.appendChild(dialog);

    const setVisibility = (visible) => {
      root.classList.toggle('is-open', visible);
      root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    };

    const toggleClear = (show) => {
      clearButton.hidden = !show;
    };

    const showStatus = (message) => {
      if (!message) {
        status.hidden = true;
        status.textContent = '';
        return;
      }
      status.hidden = false;
      status.textContent = message;
    };

    const hideStatus = () => showStatus('');

    return {
      root,
      dialog,
      input,
      results,
      empty,
      clearButton,
      showStatus,
      hideStatus,
      setVisibility,
      toggleClear,
      backdrop,
      closeButton
    };
  };

  const overlay = createOverlay();
  document.body.appendChild(overlay.root);

  const sortEntries = (a, b) => {
    const weightDiff = (weightBySource[b.sourceId] || 1) - (weightBySource[a.sourceId] || 1);
    if (weightDiff !== 0) return weightDiff;
    const timeA = a.date ? a.date.getTime() : 0;
    const timeB = b.date ? b.date.getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    return a.title.localeCompare(b.title, 'es');
  };

  const buildEntry = (sourceId, item) => {
    if (!item || !item.id || !item.title || !item.url) return null;
    const entry = {
      id: item.id,
      sourceId,
      badge: item.badge || '',
      title: item.title,
      description: item.description || '',
      url: item.url,
      meta: item.meta || '',
      tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
      date: item.date ? new Date(item.date) : null
    };
    const searchText = [entry.title, entry.description, entry.meta, entry.tags.join(' ')].filter(Boolean).join(' ');
    entry.tokens = toToken(searchText);
    return entry;
  };

  const register = (sourceId, items = []) => {
    if (!Array.isArray(items) || !items.length) {
      loadedSources.add(sourceId);
      return;
    }
    const entries = items.map((item) => buildEntry(sourceId, item)).filter(Boolean);
    entries.forEach((entry) => {
      registry.set(entry.id, entry);
    });
    loadedSources.add(sourceId);
    if (isOpen) {
      renderResults(filterResults(overlay.input.value.trim()));
    }
  };

  const ensurePageContent = () => {
    if (pageContentRegistered) return;
    const main = qs('#main-content');
    if (!main) return;
    const headings = qsa('h1, h2, h3', main);
    const entries = [];
    headings.forEach((heading, index) => {
      const text = heading.textContent?.trim();
      if (!text) return;
      if (!heading.id) {
        heading.id = `section-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
      }
      let snippet = '';
      let sibling = heading.nextElementSibling;
      while (sibling) {
        if (sibling.matches('p, ul, ol')) {
          snippet = sibling.textContent?.trim() || '';
          if (snippet.length > 180) {
            snippet = `${snippet.slice(0, 177).trim()}…`;
          }
          break;
        }
        if (sibling.matches('h1, h2, h3')) break;
        sibling = sibling.nextElementSibling;
      }
      entries.push({
        id: `page:${heading.id}`,
        badge: 'Esta página',
        title: text,
        description: snippet,
        url: `#${heading.id}`,
        meta: document.title
      });
    });
    if (entries.length) {
      register('page', entries);
    }
    pageContentRegistered = true;
  };

  const remoteSources = [
    {
      id: 'news',
      label: 'Noticias',
      url: './noticias/data/noticias.json',
      transform: (payload) => {
        const items = Array.isArray(payload?.news) ? payload.news : [];
        return items.map((article) => {
          const date = article.publishedAt ? new Date(article.publishedAt) : null;
          const year = article.year ?? date?.getFullYear();
          const metaParts = [];
          if (date) metaParts.push(`Publicado ${dateFormatter.format(date)}`);
          if (article.author) metaParts.push(article.author);
          if (article.category) metaParts.push(article.category);
          if (year) metaParts.push(String(year));
          return {
            id: `news:${article.slug || Math.random().toString(36).slice(2)}`,
            badge: 'Noticias',
            title: article.title || 'Noticia',
            description: article.summary || '',
            url: `./noticias/detalle/?noticia=${encodeURIComponent(article.slug || '')}`,
            meta: metaParts.join(' · '),
            tags: [article.category, year, ...(Array.isArray(article.tags) ? article.tags : [])],
            date: date ? date.toISOString() : undefined
          };
        });
      }
    },
    {
      id: 'activities',
      label: 'Actividades',
      url: './actividades/data/actividades.json',
      transform: (payload) => {
        const items = Array.isArray(payload?.activities) ? payload.activities : [];
        return items.map((activity) => {
          const start = activity.startDate ? new Date(activity.startDate) : null;
          const end = activity.endDate ? new Date(activity.endDate) : null;
          const dateLabel =
            start && end
              ? start.toDateString() === end.toDateString()
                ? dateFormatter.format(start)
                : `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`
              : start
              ? dateFormatter.format(start)
              : '';
          const metaParts = [];
          if (dateLabel) metaParts.push(dateLabel);
          if (activity.category) metaParts.push(activity.category);
          if (activity.modality) metaParts.push(activity.modality);
          return {
            id: `activities:${activity.slug || Math.random().toString(36).slice(2)}`,
            badge: 'Actividades',
            title: activity.title || 'Actividad',
            description: activity.summary || activity.featuredSummary || '',
            url: `./actividades/detalle/?actividad=${encodeURIComponent(activity.slug || '')}`,
            meta: metaParts.join(' · '),
            tags: [
              activity.location,
              activity.modality,
              ...(Array.isArray(activity.tags) ? activity.tags : [])
            ],
            date: start ? start.toISOString() : undefined
          };
        });
      }
    }
  ];

  const loadSource = async (source) => {
    if (loadedSources.has(source.id)) return;
    try {
      overlay.showStatus(`Cargando ${source.label.toLowerCase()}…`);
      const response = await fetch(resolveToUrl(source.url), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const entries = source.transform(payload) || [];
      register(source.id, entries);
    } catch (error) {
      console.warn(`No fue posible cargar ${source.label}`, error);
    } finally {
      overlay.hideStatus();
    }
  };

  const ensureRemoteSources = async () => {
    const pending = remoteSources.filter((source) => !loadedSources.has(source.id)).map(loadSource);
    if (pending.length) {
      try {
        await Promise.all(pending);
      } catch (error) {
        /* handled individually */
      }
    }
  };

  const getInitialResults = () => {
    const entries = Array.from(registry.values()).sort(sortEntries);
    return entries.slice(0, 8);
  };

  const filterResults = (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return getInitialResults();
    }
    const tokens = trimmed
      .split(/\s+/)
      .map((token) => toToken(token))
      .filter(Boolean);
    if (!tokens.length) {
      return getInitialResults();
    }
    const matches = [];
    registry.forEach((entry) => {
      if (tokens.every((token) => entry.tokens.includes(token))) {
        matches.push(entry);
      }
    });
    return matches.sort(sortEntries).slice(0, 20);
  };

  const renderResults = (entries) => {
    overlay.results.innerHTML = '';
    if (!entries.length) {
      overlay.empty.hidden = false;
      overlay.results.setAttribute('aria-busy', 'false');
      return;
    }
    overlay.empty.hidden = true;
    overlay.results.setAttribute('aria-busy', 'false');
    const fragment = document.createDocumentFragment();
    entries.forEach((entry) => {
      const item = document.createElement('a');
      item.className = 'search-layer__result';
      item.href = entry.url;
      item.setAttribute('role', 'listitem');
      item.dataset.source = entry.sourceId;

      const badge = document.createElement('span');
      badge.className = 'search-layer__result-badge';
      badge.textContent = entry.badge || 'Resultado';
      item.appendChild(badge);

      const title = document.createElement('span');
      title.className = 'search-layer__result-title';
      title.textContent = entry.title;
      item.appendChild(title);

      if (entry.meta) {
        const meta = document.createElement('span');
        meta.className = 'search-layer__result-meta';
        meta.textContent = entry.meta;
        item.appendChild(meta);
      }

      if (entry.description) {
        const description = document.createElement('p');
        description.className = 'search-layer__result-description';
        description.textContent = entry.description;
        item.appendChild(description);
      }

      on(item, 'click', () => {
        closeSearch();
      });

      fragment.appendChild(item);
    });
    overlay.results.appendChild(fragment);
  };

  const handleInput = (event) => {
    const value = event.target.value;
    overlay.toggleClear(Boolean(value));
    renderResults(filterResults(value));
  };

  const resetInput = () => {
    overlay.input.value = '';
    overlay.toggleClear(false);
    renderResults(getInitialResults());
  };

  const openSearch = async (trigger) => {
    if (isOpen) return;
    lastTrigger = trigger || null;
    closeNav?.();
    body.classList.add('is-locked');
    overlay.setVisibility(true);
    overlay.hideStatus();
    overlay.empty.hidden = true;
    overlay.results.innerHTML = '';
    overlay.results.setAttribute('aria-busy', 'true');
    overlay.toggleClear(false);
    overlay.input.value = '';
    ensurePageContent();
    await ensureRemoteSources();
    renderResults(getInitialResults());
    isOpen = true;
    releaseFocus = trapFocus(overlay.dialog);
    overlay.input.focus();
  };

  const closeSearch = () => {
    if (!isOpen) return;
    isOpen = false;
    overlay.setVisibility(false);
    releaseFocus();
    body.classList.remove('is-locked');
    if (lastTrigger) {
      lastTrigger.focus();
    }
  };

  on(overlay.backdrop, 'click', closeSearch);
  on(overlay.closeButton, 'click', closeSearch);
  on(overlay.input, 'input', handleInput);
  on(overlay.clearButton, 'click', resetInput);
  on(overlay.input, 'keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
    }
  });
  on(document, 'keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    } else if (event.key === 'Escape' && isOpen) {
      closeSearch();
    }
  });

  triggers.forEach((trigger) => {
    on(trigger, 'click', (event) => {
      event.preventDefault();
      openSearch(trigger);
    });
  });

  if (!window.__siteSearch) {
    window.__siteSearch = {};
  }

  window.__siteSearch.register = (sourceId, items) => {
    register(sourceId, items);
  };

  window.__siteSearch.registerPageContent = () => {
    ensurePageContent();
  };

  window.__siteSearch.markLoaded = (sourceId) => {
    loadedSources.add(sourceId);
  };
})();

/* Actividades dinámicas */
(() => {
  const pageRoot = qs('[data-activities-page]');
  if (!pageRoot) return;

  const pageType = pageRoot.getAttribute('data-activities-page');
  if (!pageType) return;

  const dataUrl = resolveToUrl('./actividades/data/actividades.json');
  const now = new Date();

  const capitalize = (value = '') => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '');
  const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
  const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const dayFormatter = new Intl.DateTimeFormat('es-CO', { weekday: 'long' });
  const timeFormatter = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });

  const parseISODate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const pad = (value) => String(value).padStart(2, '0');
  const getMonthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  const getDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const formatMonthLabel = (date) => capitalize(monthFormatter.format(date));

  const formatDateRange = (start, end) => {
    if (!start) return '';
    if (!end || Number.isNaN(end.getTime()) || start.toDateString() === end.toDateString()) {
      return dateFormatter.format(start);
    }
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return `${start.getDate()} al ${end.getDate()} de ${monthFormatter.format(start)}`;
    }
    return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
  };

  const formatSchedule = (activity) => {
    if (!activity?.start) return '';
    const dayLabel = capitalize(dayFormatter.format(activity.start));
    if (!activity.hasStartTime) return dayLabel;
    const startTime = timeFormatter.format(activity.start);
    if (activity.end && activity.hasEndTime) {
      if (activity.start.toDateString() === activity.end.toDateString()) {
        const endTime = timeFormatter.format(activity.end);
        return `${dayLabel} · ${startTime} - ${endTime}`;
      }
      const endDay = capitalize(dayFormatter.format(activity.end));
      const endTime = timeFormatter.format(activity.end);
      return `${dayLabel} · ${startTime} — ${endDay} · ${endTime}`;
    }
    return `${dayLabel} · ${startTime}`;
  };

  const buildDetailLink = (slug) => `./actividades/detalle/?actividad=${encodeURIComponent(slug)}`;

  const icons = {
    calendar:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 4h-1V3a1 1 0 0 0-2 0v1H8V3a1 1 0 0 0-2 0v1H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm1 15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10h16Zm0-11H4V7a1 1 0 0 1 1-1h1v1a1 1 0 0 0 2 0V6h8v1a1 1 0 0 0 2 0V6h1a1 1 0 0 1 1 1Z"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm.5-13h-1.5v6l5.25 3.15.75-1.23-4.5-2.67Z"/></svg>',
    location:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z"/></svg>',
    category:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20 12.59V4a2 2 0 0 0-2-2h-8.59a2 2 0 0 0-1.41.59l-6 6A2 2 0 0 0 2 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 1.41-.59l6-6a2 2 0 0 0 .59-1.41ZM7 9A2 2 0 1 1 9 7 2 2 0 0 1 7 9Z"/></svg>',
    mode:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 1a9 9 0 0 0-9 9v5a4 4 0 0 0 4 4h1v-6H5v-3a7 7 0 1 1 14 0v3h-3v6h1a4 4 0 0 0 4-4v-5a9 9 0 0 0-9-9Z"/></svg>',
    audience:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z"/></svg>',
    tag: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="m21.41 11.58-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.41l9 9a2 2 0 0 0 2.82 0l7-7a2 2 0 0 0 0-2.83ZM7.5 9A1.5 1.5 0 1 1 9 7.5 1.5 1.5 0 0 1 7.5 9Z"/></svg>'
  };

  const state = {
    records: [],
    bySlug: new Map(),
    featured: [],
    highlights: [],
    months: [],
    monthIndex: 0,
    defaultMonthIndex: 0
  };

  const indexEls =
    pageType === 'index'
      ? {
          carousel: qs('[data-activities-carousel]'),
          carouselTrack: qs('[data-carousel-track]', pageRoot),
          carouselPrev: qs('[data-carousel-prev]', pageRoot),
          carouselNext: qs('[data-carousel-next]', pageRoot),
          carouselDots: qs('[data-carousel-dots]', pageRoot),
          carouselLoading: qs('[data-carousel-loading]', pageRoot),
          calendarMonth: qs('[data-calendar-month]', pageRoot),
          calendarDays: qs('[data-calendar-days]', pageRoot),
          calendarPrev: qs('[data-calendar-prev]', pageRoot),
          calendarNext: qs('[data-calendar-next]', pageRoot),
          listContainer: qs('[data-activities-list]', pageRoot),
          listLoading: qs('[data-activities-loading]', pageRoot),
          empty: qs('[data-activities-empty]', pageRoot),
          archiveContainer: qs('[data-activities-archive]', pageRoot),
          archiveLoading: qs('[data-archive-loading]', pageRoot)
        }
      : null;

  const detailEls =
    pageType === 'detail'
      ? {
          status: qs('[data-activity-status]', pageRoot),
          article: qs('[data-activity-article]', pageRoot),
          title: qs('[data-activity-title]', pageRoot),
          meta: qs('[data-activity-meta]', pageRoot),
          media: qs('[data-activity-media]', pageRoot),
          image: qs('[data-activity-image]', pageRoot),
          imageCaption: qs('[data-activity-image-caption]', pageRoot),
          body: qs('[data-activity-body]', pageRoot),
          footer: qs('[data-activity-footer]', pageRoot),
          ctaNote: qs('[data-activity-cta-note]', pageRoot),
          ctaButton: qs('[data-activity-cta]', pageRoot)
        }
      : null;

  const fetchData = async () => {
    if (window.__tramitesData?.payload) {
      return window.__tramitesData.payload;
    }
    const loadWithFetch = async () => {
      const response = await fetch(dataUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    };

    try {
      return await loadWithFetch();
    } catch (networkError) {
      console.warn('Fallo la carga del JSON mediante fetch.', networkError);
    }

    if (window.location.protocol === 'file:') {
      const localUrl = dataUrl.href;

      const parsePayload = (payload) => {
        if (!payload) {
          throw new Error('El archivo de actividades está vacío.');
        }
        if (typeof payload === 'object') return payload;
        return JSON.parse(payload);
      };

      const loadWithXHR = () =>
        new Promise((resolve, reject) => {
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', localUrl, true);
            xhr.overrideMimeType?.('application/json');
            xhr.responseType = 'json';
            xhr.onload = () => {
              const success = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300);
              if (!success) {
                reject(new Error(`XHR status ${xhr.status}`));
                return;
              }
              try {
                resolve(parsePayload(xhr.response ?? xhr.responseText));
              } catch (error) {
                reject(error);
              }
            };
            xhr.onerror = () => reject(new Error('No fue posible leer el archivo local de actividades.'));
            xhr.send();
          } catch (error) {
            reject(error);
          }
        });

      try {
        return await loadWithXHR();
      } catch (xhrError) {
        console.warn('No fue posible leer actividades usando XMLHttpRequest asíncrono.', xhrError);
      }

      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', localUrl, false);
        xhr.overrideMimeType?.('application/json');
        xhr.send(null);
        const success = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300);
        if (!success) {
          throw new Error(`XHR síncrono status ${xhr.status}`);
        }
        return parsePayload(xhr.response ?? xhr.responseText);
      } catch (syncError) {
        console.warn('No fue posible leer actividades usando XMLHttpRequest síncrono.', syncError);
      }
    }

    throw new Error('No fue posible cargar la información de actividades.');
  };

  const createRecord = (raw) => {
    if (!raw || !raw.slug) return null;
    const start = parseISODate(raw.startDate);
    if (!start) return null;
    const end = parseISODate(raw.endDate);
    const hasStartTime = typeof raw.startDate === 'string' && raw.startDate.includes('T');
    const hasEndTime = typeof raw.endDate === 'string' && raw.endDate.includes('T');
    const lastMoment = end && !Number.isNaN(end.getTime()) ? end : start;
    const timeline = raw.timeline || 'upcoming';
    const isPast = timeline === 'past' || lastMoment < now;
    return {
      ...raw,
      start,
      end: end && !Number.isNaN(end.getTime()) ? end : null,
      lastMoment,
      monthKey: getMonthKey(start),
      timeline,
      isPast,
      hasStartTime,
      hasEndTime,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      content: Array.isArray(raw.content) ? raw.content : [],
      cta: raw.cta && typeof raw.cta === 'object' ? raw.cta : null
    };
  };

  const prepareData = (raw) => {
    const records = Array.isArray(raw?.activities) ? raw.activities.map(createRecord).filter(Boolean) : [];
    records.sort((a, b) => a.start - b.start);
    state.records = records;
    state.bySlug = new Map(records.map((record) => [record.slug, record]));
    state.featured = (Array.isArray(raw?.featured) ? raw.featured : [])
      .map((slug) => state.bySlug.get(slug))
      .filter(Boolean);
    state.highlights = (Array.isArray(raw?.annualHighlights) ? raw.annualHighlights : [])
      .map((slug) => state.bySlug.get(slug))
      .filter(Boolean);

    const monthsMap = new Map();
    const todayKey = getMonthKey(now);

    records.forEach((record) => {
      const key = record.monthKey;
      if (!monthsMap.has(key)) {
        monthsMap.set(key, {
          key,
          year: record.start.getFullYear(),
          month: record.start.getMonth(),
          label: formatMonthLabel(record.start),
          activities: [],
          activityDates: new Set()
        });
      }
      const month = monthsMap.get(key);
      month.activities.push(record);
      month.activityDates.add(getDateKey(record.start));
    });

    if (!monthsMap.has(todayKey)) {
      const monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
      monthsMap.set(todayKey, {
        key: todayKey,
        year: monthDate.getFullYear(),
        month: monthDate.getMonth(),
        label: formatMonthLabel(monthDate),
        activities: [],
        activityDates: new Set()
      });
    }

    state.months = Array.from(monthsMap.values()).sort((a, b) =>
      a.year === b.year ? a.month - b.month : a.year - b.year
    );

    state.months.forEach((month) => {
      month.activities.sort((a, b) => a.start - b.start);
    });

    const currentMonthIndex = state.months.findIndex((month) => month.key === todayKey);

    const upcomingFuture = state.months
      .map((month, index) => ({ month, index }))
      .filter(({ month }) =>
        month.activities.some(
          (activity) => !activity.isPast && activity.timeline !== 'past' && activity.start >= now
        )
      );

    if (currentMonthIndex !== -1) {
      state.defaultMonthIndex = currentMonthIndex;
    } else if (upcomingFuture.length) {
      state.defaultMonthIndex = upcomingFuture[0].index;
    } else {
      const withUpcoming = state.months
        .map((month, index) => ({ month, index }))
        .filter(({ month }) => month.activities.some((activity) => activity.timeline !== 'past'));
      if (withUpcoming.length) {
        state.defaultMonthIndex = withUpcoming[withUpcoming.length - 1].index;
      } else {
        state.defaultMonthIndex = state.months.length ? state.months.length - 1 : 0;
      }
    }

    state.monthIndex = state.defaultMonthIndex;

    if (window.__siteSearch?.register) {
      const entries = state.records.map((activity) => ({
        id: `activities:${activity.slug}`,
        badge: 'Actividades',
        title: activity.title,
        description: activity.summary || activity.featuredSummary || '',
        url: buildDetailLink(activity.slug),
        meta: `${formatDateRange(activity.start, activity.end)}${activity.category ? ` · ${activity.category}` : ''}`,
        tags: [
          activity.modality,
          activity.location,
          activity.audience,
          ...(Array.isArray(activity.tags) ? activity.tags : [])
        ],
        date: activity.start ? activity.start.toISOString() : undefined
      }));
      window.__siteSearch.register('activities', entries);
    }
  };

  const highlightEventCard = (dateKey) => {
    if (!indexEls?.listContainer) return;
    const target = qs(`[data-activity-date="${dateKey}"]`, indexEls.listContainer);
    if (!target) return;
    target.classList.add('is-highlighted');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => target.classList.remove('is-highlighted'), 1600);
  };

  const renderCalendarDays = (month) => {
    if (!indexEls?.calendarDays) return;
    indexEls.calendarDays.innerHTML = '';
    const totalDays = new Date(month.year, month.month + 1, 0).getDate();
    const firstDay = new Date(month.year, month.month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < offset; i += 1) {
      const placeholder = document.createElement('div');
      placeholder.className = 'activities-calendar__day activities-calendar__day--muted';
      fragment.appendChild(placeholder);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const currentDate = new Date(month.year, month.month, day);
      const dateKey = getDateKey(currentDate);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'activities-calendar__day';
      button.textContent = String(day);
      const isToday = currentDate.toDateString() === now.toDateString();

      if (isToday) {
        button.classList.add('activities-calendar__day--today');
        button.setAttribute('aria-label', `Hoy ${dateFormatter.format(currentDate)}`);
      }

      if (month.activityDates.has(dateKey)) {
        button.classList.add('activities-calendar__day--has-event');
        button.setAttribute(
          'aria-label',
          `${isToday ? 'Hoy · ' : ''}Actividades programadas el ${dateFormatter.format(currentDate)}`
        );
        on(button, 'click', () => highlightEventCard(dateKey));
      } else if (!isToday) {
        button.disabled = true;
        button.classList.add('activities-calendar__day--muted');
      }

      fragment.appendChild(button);
    }

    let cells = offset + totalDays;
    while (cells % 7 !== 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'activities-calendar__day activities-calendar__day--muted';
      fragment.appendChild(placeholder);
      cells += 1;
    }

    indexEls.calendarDays.appendChild(fragment);
  };

  const renderMonthActivities = (month) => {
    if (!indexEls?.listContainer) return;
    indexEls.listLoading?.remove?.();

    indexEls.listContainer.innerHTML = '';

    if (!month.activities.length) {
      if (indexEls.empty) {
        indexEls.empty.hidden = false;
      }
      return;
    }

    if (indexEls.empty) {
      indexEls.empty.hidden = true;
    }

    const fragment = document.createDocumentFragment();

    month.activities.forEach((activity) => {
      const card = document.createElement('article');
      card.className = 'activities-event-card';
      card.setAttribute('role', 'listitem');
      card.dataset.activityDate = getDateKey(activity.start);
      if (activity.isPast) {
        card.classList.add('activities-event-card--past');
      }

      const date = document.createElement('p');
      date.className = 'activities-event-card__date';
      date.textContent = formatDateRange(activity.start, activity.end);
      card.appendChild(date);

      const title = document.createElement('h3');
      title.className = 'activities-event-card__title';
      title.textContent = activity.title;
      card.appendChild(title);

      const meta = document.createElement('ul');
      meta.className = 'activities-event-card__meta';

      const addMeta = (icon, label) => {
        if (!label) return;
        const item = document.createElement('li');
        item.innerHTML = `${icon}<span>${label}</span>`;
        meta.appendChild(item);
      };

      addMeta(icons.calendar, formatDateRange(activity.start, activity.end));
      addMeta(icons.clock, formatSchedule(activity));
      addMeta(icons.location, activity.location);
      addMeta(icons.mode, activity.modality);
      addMeta(icons.category, activity.category);

      if (meta.childElementCount) {
        card.appendChild(meta);
      }

      if (activity.summary) {
        const summary = document.createElement('p');
        summary.className = 'activities-event-card__summary';
        summary.textContent = activity.summary;
        card.appendChild(summary);
      }

      const link = document.createElement('a');
      link.className = 'activities-event-card__link';
      link.href = buildDetailLink(activity.slug);
      link.textContent = 'Más información';
      card.appendChild(link);

      fragment.appendChild(card);
    });

    indexEls.listContainer.appendChild(fragment);
  };

  const updateMonthSelection = (nextIndex) => {
    if (!state.months.length) {
      if (indexEls?.calendarMonth) {
        indexEls.calendarMonth.textContent = 'Sin actividades programadas';
      }
      if (indexEls?.empty) {
        indexEls.empty.hidden = false;
      }
      return;
    }

    const maxIndex = state.months.length - 1;
    state.monthIndex = Math.min(Math.max(nextIndex, 0), maxIndex);
    const month = state.months[state.monthIndex];

    if (indexEls?.calendarMonth) {
      indexEls.calendarMonth.textContent = month.label;
    }

    renderCalendarDays(month);
    renderMonthActivities(month);

    if (indexEls?.calendarPrev) {
      indexEls.calendarPrev.disabled = state.monthIndex === 0;
    }
    if (indexEls?.calendarNext) {
      indexEls.calendarNext.disabled = state.monthIndex === maxIndex;
    }
  };

  const createFeaturedSlide = (activity) => {
    const slide = document.createElement('article');
    slide.className = 'activities-carousel__slide';
    slide.setAttribute('role', 'listitem');

    const card = document.createElement('figure');
    card.className = 'activities-featured-card';
    card.setAttribute('data-theme', activity.theme || 'slate');

    if (activity.image) {
      const imageWrapper = document.createElement('div');
      imageWrapper.className = 'activities-featured-card__image';
      const img = document.createElement('img');
      img.src = activity.image;
      img.alt = activity.imageAlt || activity.title;
      img.loading = 'lazy';
      imageWrapper.appendChild(img);
      card.appendChild(imageWrapper);
    }

    const content = document.createElement('div');
    content.className = 'activities-featured-card__content';

    const date = document.createElement('p');
    date.className = 'activities-featured-card__date';
    date.textContent = formatDateRange(activity.start, activity.end);
    content.appendChild(date);

    const title = document.createElement('h3');
    title.className = 'activities-featured-card__title';
    title.textContent = activity.title;
    content.appendChild(title);

    if (activity.featuredSummary || activity.summary) {
      const summary = document.createElement('p');
      summary.className = 'activities-featured-card__summary';
      summary.textContent = activity.featuredSummary || activity.summary;
      content.appendChild(summary);
    }

    const meta = document.createElement('div');
    meta.className = 'activities-featured-card__meta';
    if (activity.modality) {
      const mode = document.createElement('span');
      mode.textContent = activity.modality;
      meta.appendChild(mode);
    }
    if (activity.location) {
      const location = document.createElement('span');
      location.textContent = activity.location;
      meta.appendChild(location);
    }
    if (meta.childElementCount) {
      content.appendChild(meta);
    }

    const button = document.createElement('a');
    button.className = 'btn btn--cta activities-featured-card__btn';
    button.href = buildDetailLink(activity.slug);
    button.textContent = 'Ver detalles';
    content.appendChild(button);

    card.appendChild(content);
    slide.appendChild(card);
    return slide;
  };

  const renderCarousel = (items) => {
    if (!indexEls?.carousel || !indexEls.carouselTrack) return;

    indexEls.carouselLoading?.remove?.();

    indexEls.carouselTrack.innerHTML = '';
    if (indexEls.carouselDots) {
      indexEls.carouselDots.innerHTML = '';
    }

    if (!items.length) {
      if (indexEls.carousel) {
        const status = document.createElement('p');
        status.className = 'activities-status';
        status.textContent = 'Pronto anunciaremos nuevas actividades destacadas.';
        indexEls.carousel.appendChild(status);
      }
      return;
    }

    const slides = items.map(createFeaturedSlide);
    slides.forEach((slide) => indexEls.carouselTrack.appendChild(slide));

    const dots = [];
    let currentIndex = 0;

    const goTo = (target) => {
      if (!slides.length) return;
      const total = slides.length;
      currentIndex = ((target % total) + total) % total;
      indexEls.carouselTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
      dots.forEach((dot, idx) => {
        dot.setAttribute('aria-selected', idx === currentIndex ? 'true' : 'false');
      });
    };

    if (indexEls.carouselDots) {
      items.forEach((activity, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'activities-carousel__dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Ver actividad ${idx + 1}: ${activity.title}`);
        dot.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
        on(dot, 'click', () => goTo(idx));
        indexEls.carouselDots.appendChild(dot);
        dots.push(dot);
      });
    }

    if (indexEls.carouselPrev) {
      on(indexEls.carouselPrev, 'click', () => goTo(currentIndex - 1));
    }
    if (indexEls.carouselNext) {
      on(indexEls.carouselNext, 'click', () => goTo(currentIndex + 1));
    }

    goTo(0);
  };

  const renderHighlights = (items) => {
    if (!indexEls?.archiveContainer) return;
    indexEls.archiveLoading?.remove?.();
    indexEls.archiveContainer.innerHTML = '';

    if (!items.length) {
      const message = document.createElement('p');
      message.className = 'activities-status';
      message.textContent = 'Estamos preparando los recuerdos destacados del año.';
      indexEls.archiveContainer.appendChild(message);
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach((activity) => {
      const card = document.createElement('a');
      card.className = 'activities-archive__item';
      card.href = buildDetailLink(activity.slug);
      card.setAttribute('role', 'listitem');

      if (activity.image) {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'activities-archive__image';
        const img = document.createElement('img');
        img.src = activity.image;
        img.alt = activity.imageAlt || activity.title;
        img.loading = 'lazy';
        imageWrapper.appendChild(img);
        card.appendChild(imageWrapper);
      }

      const content = document.createElement('div');
      content.className = 'activities-archive__content';

      const date = document.createElement('p');
      date.className = 'activities-archive__date';
      date.textContent = `${formatDateRange(activity.start, activity.end)} · ${activity.category}`;
      content.appendChild(date);

      const title = document.createElement('h3');
      title.className = 'activities-archive__title';
      title.textContent = activity.title;
      content.appendChild(title);

      if (activity.summary) {
        const summary = document.createElement('p');
        summary.className = 'activities-archive__summary';
        summary.textContent = activity.summary;
        content.appendChild(summary);
      }

      const cta = document.createElement('span');
      cta.className = 'activities-archive__cta';
      cta.textContent = 'Leer recuerdo \u2192';
      content.appendChild(cta);

      card.appendChild(content);
      fragment.appendChild(card);
    });

    indexEls.archiveContainer.appendChild(fragment);
  };

  const initIndexPage = () => {
    renderCarousel(state.featured);
    renderHighlights(state.highlights);
    updateMonthSelection(state.monthIndex);

    if (indexEls?.calendarPrev) {
      on(indexEls.calendarPrev, 'click', () => updateMonthSelection(state.monthIndex - 1));
    }
    if (indexEls?.calendarNext) {
      on(indexEls.calendarNext, 'click', () => updateMonthSelection(state.monthIndex + 1));
    }
  };

  const appendMetaItem = (icon, label) => {
    if (!detailEls?.meta || !label) return;
    const item = document.createElement('li');
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'activities-detail__meta-icon';
    iconWrapper.innerHTML = icon;
    const text = document.createElement('span');
    text.textContent = label;
    item.append(iconWrapper, text);
    detailEls.meta.appendChild(item);
  };

  const buildDetailBody = (activity) => {
    if (!detailEls?.body) return;
    detailEls.body.innerHTML = '';

    if (activity.summary) {
      const summary = document.createElement('p');
      summary.textContent = activity.summary;
      detailEls.body.appendChild(summary);
    }

    activity.content.forEach((block) => {
      if (!block || typeof block !== 'object') return;
      if (block.type === 'list' && Array.isArray(block.items)) {
        if (block.title) {
          const title = document.createElement('p');
          const strong = document.createElement('strong');
          strong.textContent = block.title;
          title.appendChild(strong);
          detailEls.body.appendChild(title);
        }
        const list = document.createElement('ul');
        block.items.forEach((entry) => {
          if (!entry) return;
          const li = document.createElement('li');
          li.textContent = entry;
          list.appendChild(li);
        });
        detailEls.body.appendChild(list);
      } else if (block.type === 'paragraph' && block.text) {
        const paragraph = document.createElement('p');
        paragraph.textContent = block.text;
        detailEls.body.appendChild(paragraph);
      }
    });
  };

  const renderDetailPage = (activity) => {
    if (!detailEls?.article) return;

    detailEls.status?.remove?.();
    detailEls.article.hidden = false;

    if (detailEls.title) {
      detailEls.title.textContent = activity.title;
    }

    if (detailEls.meta) {
      detailEls.meta.innerHTML = '';
      appendMetaItem(icons.calendar, formatDateRange(activity.start, activity.end));
      appendMetaItem(icons.clock, formatSchedule(activity));
      appendMetaItem(icons.location, activity.location);
      appendMetaItem(icons.mode, activity.modality);
      appendMetaItem(icons.category, activity.category);
      appendMetaItem(icons.audience, activity.audience);
      if (activity.tags.length) {
        appendMetaItem(icons.tag, activity.tags.join(', '));
      }
    }

    if (detailEls.media) {
      if (activity.image) {
        detailEls.media.hidden = false;
        if (detailEls.image) {
          detailEls.image.src = activity.image;
          detailEls.image.alt = activity.imageAlt || activity.title;
        }
        if (detailEls.imageCaption) {
          detailEls.imageCaption.hidden = !activity.imageAlt;
          if (activity.imageAlt) {
            detailEls.imageCaption.textContent = activity.imageAlt;
          }
        }
      } else {
        detailEls.media.hidden = true;
      }
    }

    buildDetailBody(activity);

    if (detailEls.footer) {
      if (activity.cta?.url) {
        detailEls.footer.hidden = false;
        if (detailEls.ctaButton) {
          detailEls.ctaButton.href = activity.cta.url;
          detailEls.ctaButton.textContent = activity.cta.label || 'Quiero participar';
        }
        if (detailEls.ctaNote) {
          detailEls.ctaNote.textContent = activity.cta.note || 'Consulta la información completa en el enlace.';
        }
      } else {
        detailEls.footer.hidden = true;
      }
    }

    document.title = `${activity.title} - Actividades Centro de Idiomas`;
  };

  const initDetailPage = () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('actividad') || params.get('slug');
    if (!slug) {
      if (detailEls?.status) {
        detailEls.status.innerHTML = `
          <p>No encontramos la actividad solicitada.</p>
          <p><a href="./actividades/">Volver a Actividades</a></p>
        `;
      }
      return;
    }

    const activity = state.bySlug.get(slug);
    if (!activity) {
      if (detailEls?.status) {
        detailEls.status.innerHTML = `
          <p>Esta actividad no está disponible o fue actualizada recientemente.</p>
          <p><a href="./actividades/">Regresar a Actividades</a></p>
        `;
      }
      return;
    }

    renderDetailPage(activity);
  };

  const showIndexError = () => {
    if (indexEls?.carouselLoading) {
      const message = indexEls.carouselLoading.querySelector('p');
      if (message) {
        message.textContent = 'No pudimos cargar las actividades destacadas en este momento.';
      }
    }
    if (indexEls?.listLoading) {
      const message = indexEls.listLoading.querySelector('p');
      if (message) {
        message.textContent =
          'No pudimos cargar la agenda. Revisa el archivo de actividades y vuelve a intentar recargando la página.';
      }
    }
    if (indexEls?.empty) {
      indexEls.empty.hidden = false;
    }
    if (indexEls?.archiveLoading) {
      const message = indexEls.archiveLoading.querySelector('p');
      if (message) {
        message.textContent = 'No fue posible cargar los recuerdos destacados.';
      }
    }
  };

  const showDetailError = (fallback) => {
    if (!detailEls?.status) return;
    detailEls.status.innerHTML = `
      <p>${fallback || 'No pudimos cargar la información de esta actividad.'}</p>
      <p>Vuelve a intentarlo más tarde o verifica que el archivo de actividades exista en la carpeta indicada.</p>
    `;
  };

  const init = async () => {
    try {
      const raw = await fetchData();
      prepareData(raw);

      if (pageType === 'index') {
        initIndexPage();
      } else if (pageType === 'detail') {
        initDetailPage();
      }
    } catch (error) {
      console.error('Error al cargar la información de actividades', error);
      if (pageType === 'index') {
        showIndexError();
      } else if (pageType === 'detail') {
        showDetailError();
      }
    }
  };

  init();
})();

/* Noticias dinámicas */
(() => {
  const pageRoot = qs('[data-news-page]');
  if (!pageRoot) return;

  const pageType = pageRoot.getAttribute('data-news-page');
  if (!pageType) return;

  const resolveDataUrl = () => {
    try {
      return new URL('noticias/data/noticias.json', document.baseURI || window.location.href);
    } catch (error) {
      return new URL('./noticias/data/noticias.json', window.location.href);
    }
  };

  const dataUrl = resolveDataUrl();
  const numberFormatter = new Intl.NumberFormat('es-CO');
  const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const relativeFormatter =
    typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl ? new Intl.RelativeTimeFormat('es', { numeric: 'auto' }) : null;
  const now = new Date();
  const DEFAULT_YEAR = '2025';
  const DEFAULT_SEMESTER = 'segundo';
  const INITIAL_VISIBLE_COUNT = 2;
  const semesterLabels = {
    primer: 'Primer Semestre',
    segundo: 'Segundo Semestre'
  };

  const removeDiacritics = (value) => {
    try {
      return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    } catch (error) {
      return value;
    }
  };

  const toSearchToken = (value) => removeDiacritics(String(value || '').toLowerCase());
  const safeArray = (value) => (Array.isArray(value) ? value : []);
  const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

  const pickSemester = (record, published) => {
    if (record?.semester === 'primer' || record?.semester === 'segundo') return record.semester;
    if (isValidDate(published)) {
      return published.getMonth() < 6 ? 'primer' : 'segundo';
    }
    return 'primer';
  };

  const buildDetailLink = (slug) => `./noticias/detalle/?noticia=${encodeURIComponent(slug)}`;

  const indexEls =
    pageType === 'index'
      ? {
          form: qs('[data-news-filters]', pageRoot),
          searchInput: qs('[data-news-search]', pageRoot),
          yearSelect: qs('[data-news-year]', pageRoot),
          semesterSelect: qs('[data-news-semester]', pageRoot),
          list: qs('[data-news-list]', pageRoot),
          loading: qs('[data-news-loading]', pageRoot),
          empty: qs('[data-news-empty]', pageRoot),
          counter: qs('[data-news-counter]', pageRoot),
          reset: qs('[data-news-reset]', pageRoot),
          emptyReset: qs('[data-news-empty-reset]', pageRoot),
          showMoreWrapper: qs('[data-news-show-more-wrapper]', pageRoot),
          showMore: qs('[data-news-show-more]', pageRoot)
        }
      : null;

  const detailEls =
    pageType === 'detail'
      ? {
          status: qs('[data-news-status]', pageRoot),
          article: qs('[data-news-article]', pageRoot),
          category: qs('[data-news-category]', pageRoot),
          title: qs('[data-news-title]', pageRoot),
          meta: qs('[data-news-meta]', pageRoot),
          media: qs('[data-news-media]', pageRoot),
          image: qs('[data-news-image]', pageRoot),
          imageCaption: qs('[data-news-image-caption]', pageRoot),
          summary: qs('[data-news-summary]', pageRoot),
          body: qs('[data-news-body]', pageRoot),
          tags: qs('[data-news-tags]', pageRoot),
          footer: qs('[data-news-footer]', pageRoot),
          cta: qs('[data-news-cta]', pageRoot)
        }
      : null;

  const detailIcons = {
    calendar:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 4h-1V3a1 1 0 0 0-2 0v1H8V3a1 1 0 0 0-2 0v1H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm1 15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10h16Zm0-11H4V7a1 1 0 0 1 1-1h1v1a1 1 0 0 0 2 0V6h8v1a1 1 0 0 0 2 0V6h1a1 1 0 0 1 1 1Z"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm.5-13h-1.5v6l5.25 3.15.75-1.23-4.5-2.67Z"/></svg>',
    author:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z"/></svg>',
    academic:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M21 5.5 12 2 3 5.5v11a1 1 0 0 0 .66.94l8 3a1 1 0 0 0 .68 0l8-3A1 1 0 0 0 21 16.5Zm-9 12.92-6-2.25V7.32l6 2.25Zm8-2.25-6 2.25V9.57l6-2.25Z"/></svg>'
  };
  const state = {
    records: [],
    filtered: [],
    filters: {
      search: '',
      year: DEFAULT_YEAR,
      semester: DEFAULT_SEMESTER
    },
    visibleLimit: INITIAL_VISIBLE_COUNT,
    expanded: false,
    defaultYear: DEFAULT_YEAR,
    defaultSemester: DEFAULT_SEMESTER,
    bySlug: new Map(),
    total: 0,
    initialFiltersApplied: pageType !== 'index'
  };

  const setLoadingVisibility = (visible) => {
    if (!indexEls?.loading) return;
    indexEls.loading.hidden = !visible;
    indexEls.loading.setAttribute('aria-hidden', visible ? 'false' : 'true');
    indexEls.loading.style.display = visible ? '' : 'none';
  };

  const ensureValidFilters = () => {
    if (
      state.filters.year !== 'all' &&
      !state.records.some((article) => String(article.year) === state.filters.year)
    ) {
      state.filters.year = 'all';
    }
    if (!['primer', 'segundo', 'all'].includes(state.filters.semester)) {
      state.filters.semester = 'all';
    }
  };

  const syncFilterControls = () => {
    if (!indexEls) return;
    if (indexEls.searchInput && indexEls.searchInput.value !== state.filters.search) {
      indexEls.searchInput.value = state.filters.search;
    }
    if (indexEls.yearSelect) {
      const target = state.filters.year;
      const options = [...indexEls.yearSelect.options];
      if (options.some((option) => option.value === target)) {
        indexEls.yearSelect.value = target;
      } else if (options.length > 1) {
        indexEls.yearSelect.value = 'all';
        state.filters.year = 'all';
      }
    }
    if (indexEls.semesterSelect) {
      const target = state.filters.semester;
      const options = [...indexEls.semesterSelect.options];
      if (options.some((option) => option.value === target)) {
        indexEls.semesterSelect.value = target;
      } else if (options.length > 1) {
        indexEls.semesterSelect.value = 'all';
        state.filters.semester = 'all';
      }
    }
  };

  const applyInitialFiltersIfNeeded = () => {
    if (state.initialFiltersApplied || pageType !== 'index') return;

    const hasCombo = state.records.some(
      (article) => String(article.year) === DEFAULT_YEAR && article.semester === DEFAULT_SEMESTER
    );
    const hasYear = state.records.some((article) => String(article.year) === DEFAULT_YEAR);
    const hasSemester = state.records.some((article) => article.semester === DEFAULT_SEMESTER);

    let effectiveYear;
    let effectiveSemester;
    if (hasCombo) {
      effectiveYear = DEFAULT_YEAR;
      effectiveSemester = DEFAULT_SEMESTER;
    } else {
      effectiveYear = hasYear ? DEFAULT_YEAR : 'all';
      effectiveSemester = hasSemester ? DEFAULT_SEMESTER : 'all';
    }

    state.filters.year = effectiveYear;
    state.filters.semester = effectiveSemester;
    state.defaultYear = effectiveYear;
    state.defaultSemester = effectiveSemester;
    state.expanded = false;

    state.initialFiltersApplied = true;
  };

  const isUsingDefaultFilters = () => {
    const searchDefault = !state.filters.search;
    const yearDefault = state.filters.year === state.defaultYear;
    const semesterDefault = state.filters.semester === state.defaultSemester;
    return searchDefault && yearDefault && semesterDefault;
  };

  const hasActiveFilters = () => !isUsingDefaultFilters();

  const toggleResetButtons = () => {
    const active = hasActiveFilters();
    if (indexEls?.reset) indexEls.reset.hidden = !active;
    if (indexEls?.emptyReset) indexEls.emptyReset.hidden = !active;
  };

  const updateShowMoreVisibility = () => {
    if (!indexEls?.showMore) return;
    const wrapper = indexEls.showMoreWrapper;
    const total = state.filtered.length;
    const limit = Number.isFinite(state.visibleLimit) ? state.visibleLimit : total;
    const visible = Math.min(total, limit);
    const globalTotal = state.total;
    const hasExtraFiltered = total > visible;
    const hasExtraGlobal = isUsingDefaultFilters() && globalTotal > visible;
    const shouldShow = total > 0 && (hasExtraFiltered || hasExtraGlobal);

    if (shouldShow) {
      indexEls.showMore.hidden = false;
      indexEls.showMore.removeAttribute('aria-hidden');
      wrapper?.removeAttribute('hidden');
      wrapper?.setAttribute('aria-hidden', 'false');
    } else {
      indexEls.showMore.hidden = true;
      indexEls.showMore.setAttribute('aria-hidden', 'true');
      if (wrapper) {
        wrapper.hidden = true;
        wrapper.setAttribute('aria-hidden', 'true');
      }
    }
  };

  const populateYearOptions = () => {
    if (!indexEls?.yearSelect) return;
    const select = indexEls.yearSelect;
    qsa('option:not([value="all"])', select).forEach((option) => option.remove());

    const years = [
      ...new Set(
        state.records
          .map((article) => article.year)
          .filter((year) => typeof year === 'number' && !Number.isNaN(year))
      )
    ].sort((a, b) => b - a);

    const fragment = document.createDocumentFragment();
    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      fragment.appendChild(option);
    });
    select.appendChild(fragment);

    if (state.filters.year !== 'all' && !years.some((year) => String(year) === state.filters.year)) {
      state.filters.year = 'all';
    }
    select.value = state.filters.year;
  };

  const formatRelativeDate = (date) => {
    if (!relativeFormatter || !isValidDate(date)) return null;
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / 86400000);
    if (Math.abs(diffDays) >= 7) {
      const diffMonths = Math.round(diffDays / 30);
      if (Math.abs(diffMonths) >= 1) {
        return relativeFormatter.format(diffMonths, 'month');
      }
    }
    return relativeFormatter.format(diffDays, 'day');
  };

  const createTagFragment = (tags) => {
    const fragment = document.createDocumentFragment();
    tags.forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'news-card__tag';
      span.textContent = tag;
      fragment.appendChild(span);
    });
    return fragment;
  };

  const createCard = (article) => {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.setAttribute('role', 'listitem');

    const media = document.createElement('div');
    media.className = 'news-card__media';
    const img = document.createElement('img');
    img.src = article.image || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    img.alt = article.imageAlt || article.title;
    img.loading = 'lazy';
    media.appendChild(img);
    card.appendChild(media);

    const body = document.createElement('div');
    body.className = 'news-card__body';

    if (article.category) {
      const badge = document.createElement('span');
      badge.className = 'news-card__badge';
      badge.textContent = article.category;
      body.appendChild(badge);
    }

    const title = document.createElement('h3');
    title.className = 'news-card__title';
    const link = document.createElement('a');
    link.href = buildDetailLink(article.slug);
    link.textContent = article.title;
    link.setAttribute('aria-label', `Leer noticia: ${article.title}`);
    title.appendChild(link);
    body.appendChild(title);

    const metaParts = [];
    if (isValidDate(article.published)) {
      metaParts.push(`Publicado ${dateFormatter.format(article.published)}`);
    }
    if (article.author) {
      metaParts.push(article.author);
    }
    if (article.semester && article.year) {
      metaParts.push(`${semesterLabels[article.semester]} ${article.year}`);
    } else if (article.year) {
      metaParts.push(String(article.year));
    }

    if (metaParts.length) {
      const meta = document.createElement('p');
      meta.className = 'news-card__meta';
      meta.textContent = metaParts.join(' · ');
      body.appendChild(meta);
    }

    if (article.summary) {
      const summary = document.createElement('p');
      summary.className = 'news-card__summary';
      summary.textContent = article.summary;
      body.appendChild(summary);
    }

    if (article.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'news-card__tags';
      tags.appendChild(createTagFragment(article.tags));
      body.appendChild(tags);
    }

    const cta = document.createElement('a');
    cta.className = 'news-card__cta';
    cta.href = link.href;
    cta.innerHTML = 'Leer noticia <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="m13 5 7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6Z"/></svg>';
    cta.setAttribute('aria-label', `Leer noticia completa: ${article.title}`);
    body.appendChild(cta);

    card.appendChild(body);
    return card;
  };

  const updateCounter = () => {
    if (!indexEls?.counter) return;
    if (!state.total) {
      indexEls.counter.textContent = '';
      return;
    }

    const total = state.filtered.length;
    const limit = Number.isFinite(state.visibleLimit) ? state.visibleLimit : total;
    const visible = Math.min(total, limit);
    const visibleLabel = numberFormatter.format(visible);
    const totalLabel = numberFormatter.format(total);
    const globalLabel = numberFormatter.format(state.total);
    if (!total && hasActiveFilters()) {
      indexEls.counter.textContent = 'No hay coincidencias con los filtros aplicados.';
    } else if (visible < total) {
      indexEls.counter.textContent = `Mostrando ${visibleLabel} de ${totalLabel} noticias`;
    } else if (total === state.total && !hasActiveFilters()) {
      indexEls.counter.textContent = `${totalLabel} ${total === 1 ? 'noticia disponible' : 'noticias disponibles'}`;
    } else {
      indexEls.counter.textContent = `Mostrando ${totalLabel} de ${globalLabel} noticias`;
    }
  };

  const renderList = () => {
    if (!indexEls?.list) return;
    const { list, empty } = indexEls;

    list.innerHTML = '';
    setLoadingVisibility(false);

    if (!state.filtered.length) {
      if (empty) {
        empty.hidden = false;
        empty.removeAttribute('aria-hidden');
        empty.style.display = '';
      }
      updateCounter();
      toggleResetButtons();
      updateShowMoreVisibility();
      return;
    }

    if (empty) {
      empty.hidden = true;
      empty.setAttribute('aria-hidden', 'true');
      empty.style.display = 'none';
    }

    const fragment = document.createDocumentFragment();
    const items = state.visibleLimit === Infinity ? state.filtered : state.filtered.slice(0, state.visibleLimit);
    items.forEach((article) => {
      fragment.appendChild(createCard(article));
    });
    list.appendChild(fragment);

    updateCounter();
    toggleResetButtons();
    updateShowMoreVisibility();
  };

  const applyFilters = () => {
    applyInitialFiltersIfNeeded();
    ensureValidFilters();
    const query = toSearchToken(state.filters.search.trim());
    const { year, semester } = state.filters;

    state.filtered = state.records.filter((article) => {
      if (year !== 'all' && String(article.year) !== year) return false;
      if (semester !== 'all' && article.semester !== semester) return false;
      if (query && !article.searchPlain.includes(query)) return false;
      return true;
    });

    const filtersActive = hasActiveFilters();
    const shouldExpand = state.expanded || filtersActive;
    state.visibleLimit = shouldExpand ? Infinity : INITIAL_VISIBLE_COUNT;

    renderList();
    state.initialFiltersApplied = true;
    syncFilterControls();
  };

  const resetFilters = ({ focusSearch = false } = {}) => {
    state.filters = {
      search: '',
      year: state.defaultYear,
      semester: state.defaultSemester
    };
    state.expanded = false;
    state.initialFiltersApplied = true;
    applyFilters();
    if (indexEls?.searchInput && focusSearch) {
      indexEls.searchInput.focus();
    }
  };

  const handleSearchInput = (event) => {
    state.filters.search = event.target.value;
    applyFilters();
  };

  const handleYearChange = (event) => {
    state.filters.year = event.target.value;
    applyFilters();
  };

  const handleSemesterChange = (event) => {
    state.filters.semester = event.target.value;
    applyFilters();
  };

  const attachIndexEvents = () => {
    if (!indexEls) return;
    const { form, searchInput, yearSelect, semesterSelect, reset, emptyReset, showMore } = indexEls;

    if (form) {
      on(form, 'submit', (event) => {
        event.preventDefault();
        applyFilters();
      });
    }
    if (searchInput) {
      on(searchInput, 'input', handleSearchInput);
    }
    if (yearSelect) {
      on(yearSelect, 'change', handleYearChange);
    }
    if (semesterSelect) {
      on(semesterSelect, 'change', handleSemesterChange);
    }
    if (reset) {
      on(reset, 'click', () => resetFilters({ focusSearch: true }));
    }
    if (emptyReset) {
      on(emptyReset, 'click', () => resetFilters({ focusSearch: true }));
    }
    if (showMore) {
      on(showMore, 'click', () => {
        state.expanded = true;
        state.filters.search = '';
        state.filters.year = 'all';
        state.filters.semester = 'all';
        applyFilters();
        const cards = indexEls.list ? qsa('.news-card a', indexEls.list) : [];
        const focusTarget = cards[INITIAL_VISIBLE_COUNT] || cards[cards.length - 1];
        focusTarget?.focus?.();
      });
    }
  };

  const parseContentBlock = (block) => {
    if (!block || typeof block !== 'object') return '';
    if (block.type === 'paragraph' && block.text) return block.text;
    if (block.type === 'list' && Array.isArray(block.items)) {
      return [block.title, ...block.items].filter(Boolean).join(' ');
    }
    if (block.type === 'quote' && block.text) return block.text;
    if (block.type === 'heading' && block.text) return block.text;
    return '';
  };

  const prepareData = (payload) => {
    state.bySlug.clear();
    const items = Array.isArray(payload?.news) ? payload.news : [];

    state.records = items
      .map((raw) => {
        const published = raw.publishedAt ? new Date(raw.publishedAt) : null;
        const year = typeof raw.year === 'number' ? raw.year : published?.getFullYear();
        const semester = pickSemester(raw, published);
        const tags = safeArray(raw.tags).filter(Boolean);
        const contentText = safeArray(raw.content).map(parseContentBlock).filter(Boolean).join(' ');
        const searchCorpus = [
          raw.title,
          raw.summary,
          raw.category,
          raw.author,
          tags.join(' '),
          contentText,
          semesterLabels[semester],
          year
        ]
          .filter(Boolean)
          .join(' ');

        const article = {
          slug: raw.slug,
          title: raw.title || 'Noticia',
          summary: raw.summary || '',
          category: raw.category || '',
          author: raw.author || '',
          image: raw.image || '',
          imageAlt: raw.imageAlt || raw.title || '',
          published: published && isValidDate(published) ? published : null,
          year: typeof year === 'number' && !Number.isNaN(year) ? year : null,
          semester,
          tags,
          content: safeArray(raw.content),
          cta: raw.cta?.url ? { url: raw.cta.url, label: raw.cta.label || 'Ver más información' } : null,
          searchPlain: toSearchToken(searchCorpus),
          relative: formatRelativeDate(published)
        };

        if (!article.slug) {
          article.slug = `noticia-${Math.random().toString(36).slice(2, 10)}`;
        }

        return article;
      })
      .sort((a, b) => {
        const aTime = a.published?.getTime?.() ?? 0;
        const bTime = b.published?.getTime?.() ?? 0;
        return bTime - aTime;
    });

    state.records.forEach((article) => {
      state.bySlug.set(article.slug, article);
    });

    state.total = state.records.length;
    state.filtered = [...state.records];
    state.visibleLimit = INITIAL_VISIBLE_COUNT;
    state.expanded = false;
    state.defaultYear = DEFAULT_YEAR;
    state.defaultSemester = DEFAULT_SEMESTER;
    applyInitialFiltersIfNeeded();
    ensureValidFilters();
    syncFilterControls();

    if (window.__siteSearch?.register) {
      const entries = state.records.map((article) => {
        const metaParts = [];
        if (isValidDate(article.published)) {
          metaParts.push(`Publicado ${dateFormatter.format(article.published)}`);
        }
        if (article.author) {
          metaParts.push(article.author);
        }
        if (article.category) {
          metaParts.push(article.category);
        }
        if (article.semester && article.year) {
          metaParts.push(`${semesterLabels[article.semester]} ${article.year}`);
        } else if (article.year) {
          metaParts.push(String(article.year));
        }
        const primaryDescription =
          article.summary ||
          article.content
            .filter((block) => block.type === 'paragraph' && block.text)
            .map((block) => block.text)
            .find(Boolean) ||
          '';
        return {
          id: `news:${article.slug}`,
          badge: 'Noticias',
          title: article.title,
          description: primaryDescription,
          url: buildDetailLink(article.slug),
          meta: metaParts.join(' · '),
          tags: [article.category, ...(article.tags || []), article.author, article.year],
          date: article.published ? article.published.toISOString() : undefined
        };
      });
      window.__siteSearch.register('news', entries);
    }
  };

  const showIndexError = (message) => {
    if (!indexEls?.loading) return;
    indexEls.loading.hidden = false;
    indexEls.loading.classList.remove('news-status--loading');
    const spinner = qs('.news-status__spinner', indexEls.loading);
    if (spinner) spinner.remove();
    const text = qs('p', indexEls.loading) || document.createElement('p');
    text.textContent = message || 'No pudimos cargar las noticias en este momento. Intenta nuevamente más tarde.';
    if (!text.parentElement) {
      indexEls.loading.appendChild(text);
    }
  };

  const buildDetailContent = (article) => {
    if (!detailEls?.body) return;
    detailEls.body.innerHTML = '';

    if (article.summary) {
      const summary = document.createElement('p');
      summary.textContent = article.summary;
      summary.className = 'news-detail__lead';
      detailEls.body.appendChild(summary);
    }

    article.content.forEach((block) => {
      if (!block || typeof block !== 'object') return;
      if (block.type === 'paragraph' && block.text) {
        const paragraph = document.createElement('p');
        paragraph.textContent = block.text;
        detailEls.body.appendChild(paragraph);
      } else if (block.type === 'list' && Array.isArray(block.items)) {
        if (block.title) {
          const strong = document.createElement('p');
          strong.className = 'news-detail__list-title';
          strong.textContent = block.title;
          detailEls.body.appendChild(strong);
        }
        const list = document.createElement('ul');
        block.items.forEach((entry) => {
          if (!entry) return;
          const li = document.createElement('li');
          li.textContent = entry;
          list.appendChild(li);
        });
        detailEls.body.appendChild(list);
      } else if (block.type === 'quote' && block.text) {
        const quote = document.createElement('blockquote');
        quote.textContent = block.text;
        detailEls.body.appendChild(quote);
      } else if (block.type === 'heading' && block.text) {
        const heading = document.createElement(block.level === 3 ? 'h3' : 'h2');
        heading.textContent = block.text;
        detailEls.body.appendChild(heading);
      }
    });
  };

  const appendDetailMetaItem = (icon, label) => {
    if (!detailEls?.meta || !label) return;
    const item = document.createElement('li');
    if (icon) {
      const iconWrapper = document.createElement('span');
      iconWrapper.className = 'news-detail__meta-icon';
      iconWrapper.innerHTML = icon;
      item.appendChild(iconWrapper);
    }
    const text = document.createElement('span');
    text.textContent = label;
    item.appendChild(text);
    detailEls.meta.appendChild(item);
  };

  const renderDetailPage = (article) => {
    if (!detailEls?.article) return;
    detailEls.status?.remove?.();
    detailEls.article.hidden = false;

    if (detailEls.category) {
      detailEls.category.textContent = article.category || 'Noticias';
    }
    if (detailEls.title) {
      detailEls.title.textContent = article.title;
    }
    if (detailEls.meta) {
      detailEls.meta.innerHTML = '';
      const publishedLabel = isValidDate(article.published) ? dateFormatter.format(article.published) : '';
      appendDetailMetaItem(detailIcons.calendar, publishedLabel);
      appendDetailMetaItem(detailIcons.clock, article.relative || '');
      appendDetailMetaItem(detailIcons.author, article.author || '');
      let academicLabel = '';
      if (article.semester && article.year) {
        academicLabel = `${semesterLabels[article.semester]} ${article.year}`;
      } else if (article.year) {
        academicLabel = String(article.year);
      }
      appendDetailMetaItem(detailIcons.academic, academicLabel);
    }

    if (detailEls.media) {
      if (article.image) {
        detailEls.media.hidden = false;
        if (detailEls.image) {
          detailEls.image.src = article.image;
          detailEls.image.alt = article.imageAlt || article.title;
        }
        if (detailEls.imageCaption) {
          if (article.imageAlt) {
            detailEls.imageCaption.hidden = false;
            detailEls.imageCaption.textContent = article.imageAlt;
          } else {
            detailEls.imageCaption.hidden = true;
          }
        }
      } else {
        detailEls.media.hidden = true;
      }
    }

    if (detailEls.tags) {
      detailEls.tags.innerHTML = '';
      if (article.tags.length) {
        article.tags.forEach((tag) => {
          const span = document.createElement('span');
          span.className = 'news-detail__tag';
          span.textContent = tag;
          detailEls.tags.appendChild(span);
        });
        detailEls.tags.hidden = false;
      } else {
        detailEls.tags.hidden = true;
      }
    }

    buildDetailContent(article);

    if (detailEls.footer) {
      if (article.cta) {
        detailEls.footer.hidden = false;
        if (detailEls.cta) {
          detailEls.cta.href = article.cta.url;
          detailEls.cta.textContent = article.cta.label;
        }
      } else {
        detailEls.footer.hidden = true;
      }
    }

    document.title = `${article.title} - Noticias Centro de Idiomas`;
  };

  const showDetailError = (message) => {
    if (!detailEls?.status) return;
    detailEls.status.innerHTML = `
      <p>${message || 'No pudimos cargar la información de esta noticia.'}</p>
      <p><a href="./noticias/">Volver a todas las noticias</a></p>
    `;
  };

  const fetchData = async () => {
    const loadWithFetch = async () => {
      const response = await fetch(dataUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    };

    try {
      return await loadWithFetch();
    } catch (networkError) {
      console.warn('Fallo la carga del JSON de noticias mediante fetch.', networkError);
    }

    if (window.location.protocol === 'file:') {
      const localUrl = dataUrl.href;

      const parsePayload = (payload) => {
        if (!payload) {
          throw new Error('El archivo de noticias está vacío.');
        }
        if (typeof payload === 'object') return payload;
        return JSON.parse(payload);
      };

      const loadWithXHR = () =>
        new Promise((resolve, reject) => {
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', localUrl, true);
            xhr.overrideMimeType?.('application/json');
            xhr.responseType = 'json';
            xhr.onload = () => {
              const success = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300);
              if (!success) {
                reject(new Error(`XHR status ${xhr.status}`));
                return;
              }
              try {
                resolve(parsePayload(xhr.response ?? xhr.responseText));
              } catch (error) {
                reject(error);
              }
            };
            xhr.onerror = () => reject(new Error('No fue posible leer el archivo local de noticias.'));
            xhr.send();
          } catch (error) {
            reject(error);
          }
        });

      try {
        return await loadWithXHR();
      } catch (xhrError) {
        console.warn('No fue posible leer noticias usando XMLHttpRequest asíncrono.', xhrError);
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', localUrl, false);
          xhr.overrideMimeType?.('application/json');
          xhr.send(null);
          const success = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300);
          if (!success) {
            throw new Error(`XHR status ${xhr.status}`);
          }
          return parsePayload(xhr.responseText);
        } catch (syncError) {
          console.warn('No fue posible leer noticias usando XMLHttpRequest síncrono.', syncError);
        }
      }
    }

    throw new Error('No fue posible cargar la información de noticias.');
  };

  const initIndexPage = () => {
    populateYearOptions();
    syncFilterControls();
    attachIndexEvents();
  };

  const initDetailPage = () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('noticia') || params.get('slug');
    if (!slug) {
      showDetailError('No encontramos la noticia solicitada.');
      return;
    }
    const article = state.bySlug.get(slug);
    if (!article) {
      showDetailError('Esta noticia no está disponible o fue actualizada recientemente.');
      return;
    }
    renderDetailPage(article);
  };

  const init = async () => {
    if (indexEls?.loading) setLoadingVisibility(true);
    try {
      const data = await fetchData();
      prepareData(data);

      if (pageType === 'index') {
        initIndexPage();
        applyFilters();
      } else if (pageType === 'detail') {
        initDetailPage();
      }
    } catch (error) {
      console.error('Error al cargar la información de noticias', error);
      if (pageType === 'index') {
        showIndexError('No pudimos cargar las noticias en este momento. Recarga la página para intentarlo de nuevo.');
      } else if (pageType === 'detail') {
        showDetailError();
      }
    }
  };

  init();
})();

/* Trámites dinámicos */
(() => {
  const pageRoot = qs('[data-procedures-page]');
  if (!pageRoot) return;
  const pageType = pageRoot.getAttribute('data-procedures-page') || 'index';

  const resolveDataUrl = () => {
    try {
      return new URL('tramites/data/tramites.json', document.baseURI || window.location.href);
    } catch (error) {
      return new URL('./tramites/data/tramites.json', window.location.href);
    }
  };

  const dataUrl = resolveDataUrl();
  const numberFormatter = new Intl.NumberFormat('es-CO');
  const dateFormatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const DEFAULT_YEAR = '2025';
  const DEFAULT_SEMESTER = 'segundo';
  const INITIAL_VISIBLE_COUNT = 6;
  const PLACEHOLDER_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const semesterLabels = {
    primer: 'Primer Semestre',
    segundo: 'Segundo Semestre'
  };

  const buildDetailLink = (slug) => `./tramites/detalle/?tramite=${encodeURIComponent(slug)}`;

  const indexEls =
    pageType === 'index'
      ? {
          form: qs('[data-procedures-filters]', pageRoot),
          searchInput: qs('[data-procedures-search]', pageRoot),
          yearSelect: qs('[data-procedures-year]', pageRoot),
          semesterSelect: qs('[data-procedures-semester]', pageRoot),
          list: qs('[data-procedures-list]', pageRoot),
          loading: qs('[data-procedures-loading]', pageRoot),
          empty: qs('[data-procedures-empty]', pageRoot),
          counter: qs('[data-procedures-counter]', pageRoot),
          reset: qs('[data-procedures-reset]', pageRoot),
          emptyReset: qs('[data-procedures-empty-reset]', pageRoot),
          showMoreWrapper: qs('[data-procedures-show-more-wrapper]', pageRoot),
          showMore: qs('[data-procedures-show-more]', pageRoot)
        }
      : null;

  const detailEls =
    pageType === 'detail'
      ? {
          status: qs('[data-procedure-status]', pageRoot),
          article: qs('[data-procedure-article]', pageRoot),
          category: qs('[data-procedure-category]', pageRoot),
          title: qs('[data-procedure-title]', pageRoot),
          meta: qs('[data-procedure-meta]', pageRoot),
          media: qs('[data-procedure-media]', pageRoot),
          image: qs('[data-procedure-image]', pageRoot),
          imageCaption: qs('[data-procedure-image-caption]', pageRoot),
          body: qs('[data-procedure-body]', pageRoot),
          footer: qs('[data-procedure-footer]', pageRoot),
          ctaNote: qs('[data-procedure-cta-note]', pageRoot),
          cta: qs('[data-procedure-cta]', pageRoot)
        }
      : null;

  const state = {
    records: [],
    filtered: [],
    bySlug: new Map(),
    total: 0,
    visibleLimit: INITIAL_VISIBLE_COUNT,
    expanded: false,
    initialFiltersApplied: false,
    defaultYear: DEFAULT_YEAR,
    defaultSemester: DEFAULT_SEMESTER,
    filters: {
      search: '',
      year: DEFAULT_YEAR,
      semester: DEFAULT_SEMESTER
    }
  };

  let eventsAttached = false;

  const removeDiacritics = (value) => {
    try {
      return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    } catch (error) {
      return value;
    }
  };

  const toSearchToken = (value) => removeDiacritics(String(value || '').toLowerCase());
  const safeArray = (value) => (Array.isArray(value) ? value : []);
  const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

  const setLoadingVisibility = (visible) => {
    if (!indexEls?.loading) return;
    indexEls.loading.hidden = !visible;
    indexEls.loading.setAttribute('aria-hidden', visible ? 'false' : 'true');
    indexEls.loading.style.display = visible ? '' : 'none';
  };

  const ensureValidFilters = () => {
    if (state.filters.year !== 'all') {
      const hasYear = state.records.some((procedure) => String(procedure.year) === state.filters.year);
      if (!hasYear) {
        state.filters.year = 'all';
      }
    }
    if (!['primer', 'segundo', 'all'].includes(state.filters.semester)) {
      state.filters.semester = 'all';
    }
  };

  const syncFilterControls = () => {
    if (!indexEls) return;
    if (indexEls.searchInput && indexEls.searchInput.value !== state.filters.search) {
      indexEls.searchInput.value = state.filters.search;
    }
    if (indexEls.yearSelect && indexEls.yearSelect.value !== state.filters.year) {
      indexEls.yearSelect.value = state.filters.year;
    }
    if (indexEls.semesterSelect && indexEls.semesterSelect.value !== state.filters.semester) {
      indexEls.semesterSelect.value = state.filters.semester;
    }
  };

  const applyInitialFiltersIfNeeded = () => {
    if (state.initialFiltersApplied || pageType !== 'index') return;

    const hasCombo = state.records.some(
      (procedure) => String(procedure.year) === DEFAULT_YEAR && procedure.semester === DEFAULT_SEMESTER
    );
    const hasYear = state.records.some((procedure) => String(procedure.year) === DEFAULT_YEAR);
    const hasSemester = state.records.some((procedure) => procedure.semester === DEFAULT_SEMESTER);

    let effectiveYear = DEFAULT_YEAR;
    let effectiveSemester = DEFAULT_SEMESTER;

    if (hasCombo) {
      effectiveYear = DEFAULT_YEAR;
      effectiveSemester = DEFAULT_SEMESTER;
    } else {
      effectiveYear = hasYear ? DEFAULT_YEAR : 'all';
      effectiveSemester = hasSemester ? DEFAULT_SEMESTER : 'all';
    }

    state.filters.year = effectiveYear;
    state.filters.semester = effectiveSemester;
    state.defaultYear = effectiveYear;
    state.defaultSemester = effectiveSemester;
    state.expanded = false;
    state.initialFiltersApplied = true;
  };

  const isUsingDefaultFilters = () => {
    const searchDefault = !state.filters.search;
    const yearDefault = state.filters.year === state.defaultYear;
    const semesterDefault = state.filters.semester === state.defaultSemester;
    return searchDefault && yearDefault && semesterDefault;
  };

  const hasActiveFilters = () => !isUsingDefaultFilters();

  const toggleResetButtons = () => {
    const active = hasActiveFilters();
    if (indexEls?.reset) indexEls.reset.hidden = !active;
    if (indexEls?.emptyReset) indexEls.emptyReset.hidden = !active;
  };

  const updateShowMoreVisibility = () => {
    if (!indexEls?.showMore) return;
    const wrapper = indexEls.showMoreWrapper;
    const total = state.filtered.length;
    const limit = Number.isFinite(state.visibleLimit) ? state.visibleLimit : total;
    const visible = Math.min(total, limit);
    const globalTotal = state.total;
    const hasExtraFiltered = total > visible;
    const hasExtraGlobal = isUsingDefaultFilters() && globalTotal > visible;
    const shouldShow = total > 0 && (hasExtraFiltered || hasExtraGlobal);

    if (shouldShow) {
      indexEls.showMore.hidden = false;
      indexEls.showMore.removeAttribute('aria-hidden');
      wrapper?.removeAttribute('hidden');
      wrapper?.setAttribute('aria-hidden', 'false');
    } else {
      indexEls.showMore.hidden = true;
      indexEls.showMore.setAttribute('aria-hidden', 'true');
      if (wrapper) {
        wrapper.hidden = true;
        wrapper.setAttribute('aria-hidden', 'true');
      }
    }
  };

  const populateYearOptions = () => {
    if (!indexEls?.yearSelect) return;
    const select = indexEls.yearSelect;
    qsa('option:not([value="all"])', select).forEach((option) => option.remove());

    const years = [
      ...new Set(
        state.records
          .map((procedure) => procedure.year)
          .filter((year) => typeof year === 'number' && !Number.isNaN(year))
      )
    ].sort((a, b) => b - a);

    const fragment = document.createDocumentFragment();
    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      fragment.appendChild(option);
    });
    select.appendChild(fragment);

    if (state.filters.year !== 'all' && !years.some((year) => String(year) === state.filters.year)) {
      state.filters.year = 'all';
    }
    select.value = state.filters.year;
  };

  const updateCounter = () => {
    if (!indexEls?.counter) return;
    if (!state.total) {
      indexEls.counter.textContent = 'No hay trámites publicados por el momento.';
      return;
    }

    const total = state.filtered.length;
    const limit = Number.isFinite(state.visibleLimit) ? state.visibleLimit : total;
    const visible = Math.min(total, limit);
    const visibleLabel = numberFormatter.format(visible);
    const totalLabel = numberFormatter.format(total);
    const globalLabel = numberFormatter.format(state.total);

    if (!total && hasActiveFilters()) {
      indexEls.counter.textContent = 'No hay trámites que coincidan con los filtros aplicados.';
    } else if (!total) {
      indexEls.counter.textContent = 'No hay trámites disponibles en este momento.';
    } else if (visible < total) {
      indexEls.counter.textContent = `Mostrando ${visibleLabel} de ${totalLabel} trámites`;
    } else if (total === state.total && isUsingDefaultFilters()) {
      indexEls.counter.textContent = `${totalLabel} ${total === 1 ? 'trámite disponible' : 'trámites disponibles'}`;
    } else {
      indexEls.counter.textContent = `Mostrando ${totalLabel} de ${globalLabel} trámites`;
    }
  };

  const createTagFragment = (tags) => {
    const fragment = document.createDocumentFragment();
    tags.forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'news-card__tag';
      span.textContent = tag;
      fragment.appendChild(span);
    });
    return fragment;
  };

  const createCard = (procedure) => {
    const detailUrl = buildDetailLink(procedure.slug);

    const card = document.createElement('article');
    card.className = 'news-card';
    card.setAttribute('role', 'listitem');

    const media = document.createElement('div');
    media.className = 'news-card__media';
    const img = document.createElement('img');
    img.src = procedure.image || PLACEHOLDER_IMAGE;
    img.alt = procedure.imageAlt || procedure.title;
    img.loading = 'lazy';
    media.appendChild(img);
    card.appendChild(media);

    const body = document.createElement('div');
    body.className = 'news-card__body';

    const badge = document.createElement('span');
    badge.className = 'news-card__badge';
    badge.textContent = procedure.category || 'Trámite';
    body.appendChild(badge);

    const title = document.createElement('h3');
    title.className = 'news-card__title';
    const link = document.createElement('a');
    link.href = detailUrl;
    link.textContent = procedure.title;
    link.setAttribute('aria-label', `Ver detalle del trámite: ${procedure.title}`);
    title.appendChild(link);
    body.appendChild(title);

    const metaParts = [];
    if (procedure.status) metaParts.push(procedure.status);
    if (procedure.processingTime) metaParts.push(`Tiempo: ${procedure.processingTime}`);
    if (procedure.delivery) metaParts.push(`Entrega: ${procedure.delivery}`);
    if (procedure.year && procedure.semester) {
      metaParts.push(`${semesterLabels[procedure.semester]} ${procedure.year}`);
    } else if (procedure.year) {
      metaParts.push(String(procedure.year));
    }

    if (metaParts.length) {
      const meta = document.createElement('p');
      meta.className = 'news-card__meta';
      meta.textContent = metaParts.join(' · ');
      body.appendChild(meta);
    }

    if (procedure.summary) {
      const summary = document.createElement('p');
      summary.className = 'news-card__summary';
      summary.textContent = procedure.summary;
      body.appendChild(summary);
    }

    const tagList = [
      ...procedure.tags,
      procedure.audience,
      procedure.cost ? `Costo: ${procedure.cost}` : '',
      procedure.semester ? semesterLabels[procedure.semester] : ''
    ].filter(Boolean);

    if (tagList.length) {
      const tags = document.createElement('div');
      tags.className = 'news-card__tags';
      tags.appendChild(createTagFragment(tagList));
      body.appendChild(tags);
    }

    const cta = document.createElement('a');
    cta.className = 'news-card__cta';
    cta.href = detailUrl;
    cta.innerHTML = `Ver detalles <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="m13 5 7 7-7 7-1.4-1.4L16.2 13H4v-2h12.2l-4.6-4.6Z"/></svg>`;
    cta.setAttribute('aria-label', `Ver detalles del trámite: ${procedure.title}`);
    body.appendChild(cta);

    card.appendChild(body);
    return card;
  };

  const renderList = () => {
    if (!indexEls?.list) return;
    const { list, empty } = indexEls;

    list.innerHTML = '';
    setLoadingVisibility(false);

    if (!state.filtered.length) {
      if (empty) {
        empty.hidden = false;
        empty.removeAttribute('aria-hidden');
        empty.style.display = '';
      }
      updateCounter();
      toggleResetButtons();
      updateShowMoreVisibility();
      return;
    }

    if (empty) {
      empty.hidden = true;
      empty.setAttribute('aria-hidden', 'true');
      empty.style.display = 'none';
    }

    const fragment = document.createDocumentFragment();
    const items = state.visibleLimit === Infinity ? state.filtered : state.filtered.slice(0, state.visibleLimit);
    items.forEach((procedure) => {
      fragment.appendChild(createCard(procedure));
    });
    list.appendChild(fragment);

    updateCounter();
    toggleResetButtons();
    updateShowMoreVisibility();
  };

  const applyFilters = () => {
    if (pageType !== 'index') return;
    applyInitialFiltersIfNeeded();
    ensureValidFilters();
    const query = toSearchToken((state.filters.search || '').trim());
    const { year, semester } = state.filters;

    state.filtered = state.records.filter((procedure) => {
      if (year !== 'all' && String(procedure.year) !== year) return false;
      if (semester !== 'all' && procedure.semester !== semester) return false;
      if (query && !procedure.searchPlain.includes(query)) return false;
      return true;
    });

    const filtersActive = hasActiveFilters();
    const shouldExpand = state.expanded || filtersActive;
    state.visibleLimit = shouldExpand ? Infinity : INITIAL_VISIBLE_COUNT;

    renderList();
    state.initialFiltersApplied = true;
    syncFilterControls();
  };

  const resetFilters = ({ focusSearch = false } = {}) => {
    state.filters.search = '';
    state.filters.year = state.defaultYear;
    state.filters.semester = state.defaultSemester;
    state.expanded = false;
    applyFilters();
    if (focusSearch && indexEls?.searchInput) {
      indexEls.searchInput.focus();
    }
  };

  const handleSearchInput = (event) => {
    state.filters.search = event.target.value;
    applyFilters();
  };

  const handleYearChange = (event) => {
    state.filters.year = event.target.value;
    applyFilters();
  };

  const handleSemesterChange = (event) => {
    state.filters.semester = event.target.value;
    applyFilters();
  };

  const attachIndexEvents = () => {
    if (eventsAttached) return;
    const { form, searchInput, yearSelect, semesterSelect, reset, emptyReset, showMore } = indexEls;

    if (form) {
      on(form, 'submit', (event) => {
        event.preventDefault();
        applyFilters();
      });
    }
    if (searchInput) {
      on(searchInput, 'input', handleSearchInput);
    }
    if (yearSelect) {
      on(yearSelect, 'change', handleYearChange);
    }
    if (semesterSelect) {
      on(semesterSelect, 'change', handleSemesterChange);
    }
    if (reset) {
      on(reset, 'click', () => resetFilters({ focusSearch: true }));
    }
    if (emptyReset) {
      on(emptyReset, 'click', () => resetFilters({ focusSearch: true }));
    }
    if (showMore) {
      on(showMore, 'click', () => {
        state.expanded = true;
        state.filters.search = '';
        state.filters.year = 'all';
        state.filters.semester = 'all';
        applyFilters();
        const cards = indexEls.list ? qsa('.news-card a', indexEls.list) : [];
        const focusTarget = cards[INITIAL_VISIBLE_COUNT] || cards[cards.length - 1];
        focusTarget?.focus?.();
      });
    }

    eventsAttached = true;
  };

  const registerSearchEntries = () => {
    if (!window.__siteSearch?.register) return;
    const entries = state.records.map((procedure) => {
      const metaParts = [];
      if (procedure.status) metaParts.push(procedure.status);
      if (procedure.processingTime) metaParts.push(`Tiempo: ${procedure.processingTime}`);
      if (procedure.year && procedure.semester) {
        metaParts.push(`${semesterLabels[procedure.semester]} ${procedure.year}`);
      } else if (procedure.year) {
        metaParts.push(String(procedure.year));
      }
      const description = procedure.summary || procedure.audience || '';
      return {
        id: `procedures:${procedure.slug}`,
        badge: 'Trámites',
        title: procedure.title,
        description,
        url: buildDetailLink(procedure.slug),
        meta: metaParts.join(' · '),
        tags: [
          procedure.category,
          procedure.status,
          ...safeArray(procedure.tags),
          procedure.audience,
          procedure.year ? String(procedure.year) : ''
        ].filter(Boolean),
        date: procedure.updated ? procedure.updated.toISOString() : undefined
      };
    });
    window.__siteSearch.register('procedures', entries);
  };

  const detailIcons = {
    status:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 10H6.83L5 14.83V5h14Z"/></svg>',
    audience:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z"/></svg>',
    time:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 1.75A10.25 10.25 0 1 0 22.25 12 10.26 10.26 0 0 0 12 1.75Zm0 18.5A8.25 8.25 0 1 1 20.25 12 8.26 8.26 0 0 1 12 20.25Zm.75-13h-1.5v5.5l4.5 2.7.75-1.23-3.75-2.22Z"/></svg>',
    delivery:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20 6h-3V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v13h2.18a3 3 0 0 0 5.64 0h3.36a3 3 0 0 0 5.64 0H22v-7Zm-5 0H4V4h11Zm-9 12a1 1 0 1 1 1-1 1 1 0 0 1-1 1Zm9 0a1 1 0 1 1 1-1 1 1 0 0 1-1 1Zm3-3h-.18a3 3 0 0 0-5.64 0H8.18a3 3 0 0 0-5.64 0H4V8h16Z"/></svg>',
    cost:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11 17.5h2v-1h2v-2h-2v-1h1.5a2.5 2.5 0 0 0 0-5H13v-1h-2v1H9v2h2v1h-1.5a2.5 2.5 0 0 0 0 5H11Zm0-6h2v2h-2Zm1-9a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a3 3 0 0 0-3 3v13a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm1 16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10h16Zm0-12H4V7a1 1 0 0 1 1-1h1v2h2V6h8v2h2V6h1a1 1 0 0 1 1 1Z"/></svg>'
  };

  const appendDetailMetaItem = (icon, label) => {
    if (!detailEls?.meta || !label) return;
    const li = document.createElement('li');
    if (icon) {
      const span = document.createElement('span');
      span.className = 'activities-detail__meta-icon';
      span.innerHTML = icon;
      li.appendChild(span);
    }
    const text = document.createElement('span');
    text.textContent = label;
    li.appendChild(text);
    detailEls.meta.appendChild(li);
  };

  const buildDetailContent = (procedure) => {
    if (!detailEls?.body) return;
    detailEls.body.innerHTML = '';

    const addParagraph = (text, strongLabel) => {
      if (!text) return;
      const paragraph = document.createElement('p');
      if (strongLabel) {
        const strong = document.createElement('strong');
        strong.textContent = `${strongLabel} `;
        paragraph.appendChild(strong);
        paragraph.append(document.createTextNode(text));
      } else {
        paragraph.textContent = text;
      }
      detailEls.body.appendChild(paragraph);
    };

    addParagraph(procedure.summary);
    addParagraph(procedure.audience, 'Dirigido a:');

    safeArray(procedure.content).forEach((block) => {
      if (!block || typeof block !== 'object') return;
      if (block.type === 'paragraph' && block.text) {
        addParagraph(block.text);
      } else if (block.type === 'list' && Array.isArray(block.items) && block.items.length) {
        if (block.title) {
          const heading = document.createElement('h3');
          heading.textContent = block.title;
          detailEls.body.appendChild(heading);
        }
        const list = document.createElement('ul');
        block.items.forEach((item) => {
          if (!item) return;
          const li = document.createElement('li');
          li.textContent = item;
          list.appendChild(li);
        });
        detailEls.body.appendChild(list);
      }
    });

    if (procedure.requirements.length) {
      const heading = document.createElement('h3');
      heading.textContent = 'Requisitos principales';
      detailEls.body.appendChild(heading);
      const list = document.createElement('ul');
      procedure.requirements.forEach((req) => {
        const li = document.createElement('li');
        li.textContent = req;
        list.appendChild(li);
      });
      detailEls.body.appendChild(list);
    }

    const infoItems = [
      procedure.processingTime ? `Tiempo de respuesta: ${procedure.processingTime}` : '',
      procedure.delivery ? `Entrega: ${procedure.delivery}` : '',
      procedure.cost ? `Costo: ${procedure.cost}` : ''
    ].filter(Boolean);

    if (infoItems.length) {
      const list = document.createElement('ul');
      infoItems.forEach((info) => {
        const li = document.createElement('li');
        li.textContent = info;
        list.appendChild(li);
      });
      detailEls.body.appendChild(list);
    }
  };

  const renderDetailPage = (procedure) => {
    if (!detailEls?.article) return;
    detailEls.status?.remove?.();
    detailEls.article.hidden = false;

    if (detailEls.category) {
      detailEls.category.textContent = procedure.category || 'Trámite';
    }
    if (detailEls.title) {
      detailEls.title.textContent = procedure.title;
    }
    if (detailEls.meta) {
      detailEls.meta.innerHTML = '';
      appendDetailMetaItem(detailIcons.status, procedure.status);
      appendDetailMetaItem(detailIcons.audience, procedure.audience);
      appendDetailMetaItem(detailIcons.time, procedure.processingTime);
      appendDetailMetaItem(detailIcons.delivery, procedure.delivery);
      appendDetailMetaItem(detailIcons.cost, procedure.cost);
      const academicLabel =
        procedure.semester && procedure.year
          ? `${semesterLabels[procedure.semester]} ${procedure.year}`
          : procedure.year
            ? String(procedure.year)
            : '';
      appendDetailMetaItem(detailIcons.calendar, academicLabel);
    }

    if (detailEls.media) {
      if (procedure.image) {
        detailEls.media.hidden = false;
        if (detailEls.image) {
          detailEls.image.src = procedure.image;
          detailEls.image.alt = procedure.imageAlt || procedure.title;
        }
        if (detailEls.imageCaption) {
          if (procedure.imageAlt) {
            detailEls.imageCaption.hidden = false;
            detailEls.imageCaption.textContent = procedure.imageAlt;
          } else {
            detailEls.imageCaption.hidden = true;
          }
        }
      } else {
        detailEls.media.hidden = true;
      }
    }

    buildDetailContent(procedure);

    if (detailEls.footer) {
      if (procedure.cta?.url) {
        detailEls.footer.hidden = false;
        if (detailEls.cta) {
          detailEls.cta.href = procedure.cta.url;
          detailEls.cta.textContent = procedure.cta.label || 'Ir al formulario';
        }
        if (detailEls.ctaNote) {
          const pieces = [];
          if (procedure.delivery) pieces.push(`Entrega: ${procedure.delivery}`);
          if (procedure.processingTime) pieces.push(`Tiempo estimado: ${procedure.processingTime}`);
          if (procedure.cost) pieces.push(`Costo: ${procedure.cost}`);
          detailEls.ctaNote.textContent =
            pieces.join(' · ') || 'Completa el formulario para continuar con el trámite.';
        }
      } else {
        detailEls.footer.hidden = true;
      }
    }

    document.title = `${procedure.title} - Trámites Centro de Idiomas`;
  };

  const showDetailError = (message) => {
    if (!detailEls?.status) return;
    detailEls.status.innerHTML = `
      <p>${message || 'No pudimos cargar la información de este trámite.'}</p>
      <p><a href="./tramites/">Volver a todos los trámites</a></p>
    `;
  };

  const initDetailPage = () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('tramite') || params.get('slug');
    if (!slug) {
      showDetailError('No encontramos el trámite solicitado.');
      return;
    }
    const procedure = state.bySlug.get(slug);
    if (!procedure) {
      showDetailError('Este trámite no está disponible o fue actualizado recientemente.');
      return;
    }
    renderDetailPage(procedure);
  };

  const prepareData = (payload) => {
    const items = Array.isArray(payload?.procedures) ? payload.procedures : [];
    state.bySlug.clear();
    state.records = items
      .map((raw) => {
        const rawYear = typeof raw.year === 'number' ? raw.year : Number.parseInt(raw.year, 10);
        const year = Number.isFinite(rawYear) ? rawYear : null;
        const semester = raw.semester === 'segundo' ? 'segundo' : 'primer';
        const updated = raw.updatedAt ? new Date(raw.updatedAt) : null;
        const tags = safeArray(raw.tags).filter(Boolean);
        const requirements = safeArray(raw.requirements).filter(Boolean);
        const searchCorpus = [
          raw.title,
          raw.summary,
          raw.category,
          raw.status,
          raw.audience,
          raw.processingTime,
          raw.delivery,
          raw.cost,
          tags.join(' '),
          requirements.join(' '),
          semesterLabels[semester],
          year
        ]
          .filter(Boolean)
          .join(' ');

        return {
          slug: raw.slug || `tramite-${Math.random().toString(36).slice(2, 10)}`,
          title: raw.title || 'Trámite',
          summary: raw.summary || '',
          category: raw.category || 'Trámite',
          status: raw.status || '',
          audience: raw.audience || '',
          processingTime: raw.processingTime || '',
          delivery: raw.delivery || '',
          cost: raw.cost || '',
          image: raw.image || '',
          imageAlt: raw.imageAlt || raw.title || '',
          year,
          semester,
          tags,
          updated: updated && isValidDate(updated) ? updated : null,
          requirements,
          content: safeArray(raw.content),
          cta: raw.cta?.url ? { url: raw.cta.url, label: raw.cta.label || 'Ir al formulario' } : null,
          searchPlain: toSearchToken(searchCorpus)
        };
      })
      .sort((a, b) => {
        const aTime = a.updated?.getTime?.() ?? 0;
        const bTime = b.updated?.getTime?.() ?? 0;
        if (aTime !== bTime) return bTime - aTime;
        const aYear = a.year ?? 0;
        const bYear = b.year ?? 0;
        return bYear - aYear;
      });

    state.records.forEach((procedure) => {
      state.bySlug.set(procedure.slug, procedure);
    });

    state.total = state.records.length;
    state.filtered = [...state.records];
    state.visibleLimit = INITIAL_VISIBLE_COUNT;
    state.expanded = false;
    state.filters.search = '';
    state.initialFiltersApplied = false;

    applyInitialFiltersIfNeeded();
    ensureValidFilters();
  };

  const showIndexError = (message) => {
    if (!indexEls?.loading) return;
    indexEls.loading.hidden = false;
    indexEls.loading.classList.remove('news-status--loading');
    const spinner = qs('.news-status__spinner', indexEls.loading);
    if (spinner) spinner.remove();
    const text = qs('p', indexEls.loading) || document.createElement('p');
    text.textContent = message || 'No pudimos cargar los trámites en este momento. Intenta nuevamente más tarde.';
    if (!text.parentElement) {
      indexEls.loading.appendChild(text);
    }
  };

  const fetchData = async () => {
    const loadWithFetch = async () => {
      const response = await fetch(dataUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    };

    try {
      return await loadWithFetch();
    } catch (networkError) {
      console.warn('Fallo la carga del JSON de trámites mediante fetch.', networkError);
    }

    if (window.location.protocol === 'file:') {
      const localUrl = dataUrl.href;

      const parsePayload = (payload) => {
        if (!payload) {
          throw new Error('El archivo de trámites está vacío.');
        }
        if (typeof payload === 'object') return payload;
        return JSON.parse(payload);
      };

      const loadWithXHR = () =>
        new Promise((resolve, reject) => {
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', localUrl, true);
            xhr.overrideMimeType?.('application/json');
            xhr.responseType = 'json';
            xhr.onload = () => {
              const success = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300);
              if (!success) {
                reject(new Error(`XHR status ${xhr.status}`));
                return;
              }
              try {
                resolve(parsePayload(xhr.response ?? xhr.responseText));
              } catch (error) {
                reject(error);
              }
            };
            xhr.onerror = () => reject(new Error('No fue posible leer el archivo local de trámites.'));
            xhr.send();
          } catch (error) {
            reject(error);
          }
        });

      try {
        return await loadWithXHR();
      } catch (xhrError) {
        console.warn('No fue posible leer trámites usando XMLHttpRequest asíncrono.', xhrError);
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', localUrl, false);
          xhr.overrideMimeType?.('application/json');
          xhr.send(null);
          const success = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300);
          if (!success) {
            throw new Error(`XHR status ${xhr.status}`);
          }
          return parsePayload(xhr.responseText);
        } catch (syncError) {
          console.warn('No fue posible leer trámites usando XMLHttpRequest síncrono.', syncError);
        }
      }
    }

    throw new Error('No fue posible cargar la información de trámites.');
  };

  const init = async () => {
    if (pageType === 'index' && indexEls?.loading) {
      setLoadingVisibility(true);
    }
    try {
      const data = await fetchData();
      prepareData(data);

      registerSearchEntries();

      if (pageType === 'index') {
        populateYearOptions();
        syncFilterControls();
        attachIndexEvents();
        applyFilters();
      } else if (pageType === 'detail') {
        initDetailPage();
      }
    } catch (error) {
      console.error('Error al cargar los trámites', error);
      if (pageType === 'index') {
        showIndexError('No pudimos cargar los trámites en este momento. Recarga la página para intentarlo de nuevo.');
      } else if (pageType === 'detail') {
        showDetailError('No pudimos cargar la información de este trámite.');
      }
    }
  };

  init();
})();

/* Accessibility controls */
(() => {
  if (!body || body.dataset.accessibilityInitialized === 'true') return;
  body.dataset.accessibilityInitialized = 'true';

  const STORAGE_KEY = 'ci-accessibility-settings';
  const FONT_MIN = 0.85;
  const FONT_MAX = 1.35;
  const FONT_STEP = 0.1;
  const LINE_MIN = 0.9;
  const LINE_MAX = 1.7;
  const LINE_STEP = 0.1;
  const LETTER_MIN = -0.02;
  const LETTER_MAX = 0.12;
  const LETTER_STEP = 0.02;
  const CURSOR_MIN = 20;
  const CURSOR_MAX = 48;
  const CURSOR_STEP = 4;

  const defaultState = {
    fontScale: 1,
    lineHeight: 1,
    letterSpacing: 0,
    grayscale: false,
    invert: false,
    underline: false,
    cursor: false,
    cursorSize: 28,
    guide: false,
    speech: false
  };

  let state = { ...defaultState };
  let surface;
  let panel;
  let overlay;
  let accessTrigger;
  let closeButton;
  let guideElement;
  let releasePanelFocus = () => {};
  const controls = {};
  const speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let guideHalf = 9;

  const clamp = (value, min, max) => Math.min(Math.max(Number(value), min), max);

  const loadState = () => {
    try {
      const persisted = localStorage.getItem(STORAGE_KEY);
      if (!persisted) return;
      const parsed = JSON.parse(persisted);
      if (parsed && typeof parsed === 'object') {
        state = {
          ...defaultState,
          ...parsed
        };
      }
    } catch (error) {
      state = { ...defaultState };
    }
  };

  const persistState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* storage might be unavailable, ignore */
    }
  };

  const ensureSurface = () => {
    let wrapper = qs('.accessibility-surface');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'accessibility-surface';
      wrapper.setAttribute('data-access-surface', '');
      while (body.firstChild) {
        wrapper.appendChild(body.firstChild);
      }
      body.appendChild(wrapper);

      ['[data-back-to-top]'].forEach((selector) => {
        qsa(selector, wrapper).forEach((node) => {
          body.appendChild(node);
        });
      });
    }
    return wrapper;
  };

  const buildCursorValue = (size) => {
    const dimension = clamp(size, CURSOR_MIN, CURSOR_MAX);
    const radiusOuter = Math.max(dimension / 2 - 2, 6);
    const radiusInner = Math.max(radiusOuter / 2.4, 3);
    const strokeWidth = Math.max(2, dimension / 12);
    const center = dimension / 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" viewBox="0 0 ${dimension} ${dimension}"><circle cx="${center}" cy="${center}" r="${radiusOuter}" fill="none" stroke="%230d47a1" stroke-width="${strokeWidth}"/><circle cx="${center}" cy="${center}" r="${radiusInner}" fill="%231363df"/></svg>`;
    const encoded = encodeURIComponent(svg);
    return `url("data:image/svg+xml,${encoded}") ${Math.round(center)} ${Math.round(center)}, auto`;
  };

  const applyCursor = () => {
    if (state.cursor) {
      body.classList.add('accessibility--cursor');
      document.documentElement.style.setProperty('--access-cursor', buildCursorValue(state.cursorSize));
    } else {
      body.classList.remove('accessibility--cursor');
      document.documentElement.style.setProperty('--access-cursor', 'auto');
    }
  };

  const pointerMoveHandler = (event) => {
    if (!state.guide) return;
    guideElement.style.transform = `translate3d(0, ${Math.max(0, event.clientY - guideHalf)}px, 0)`;
  };

  const updateGuideState = () => {
    if (!guideElement) return;
    if (state.guide) {
      body.classList.add('accessibility--guide');
      guideElement.setAttribute('aria-hidden', 'false');
      guideHalf = Math.max(guideElement.getBoundingClientRect().height / 2, 9);
      surface.addEventListener('pointermove', pointerMoveHandler);
    } else {
      body.classList.remove('accessibility--guide');
      guideElement.setAttribute('aria-hidden', 'true');
      surface.removeEventListener('pointermove', pointerMoveHandler);
      guideElement.style.transform = 'translate3d(0, -999px, 0)';
    }
  };

  const speakFromEvent = (event) => {
    if (!state.speech || !speechSupported) return;
    const speakable = event.target.closest('p, h1, h2, h3, h4, h5, h6, li, a, button, label, span, blockquote');
    if (!speakable) return;
    const text = (speakable.innerText || speakable.textContent || '').trim();
    if (!text) return;
    if (text.length > 1200) return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    window.speechSynthesis.speak(utterance);
  };

  const updateSpeechState = () => {
    if (!speechSupported) return;
    if (state.speech) {
      surface.addEventListener('click', speakFromEvent);
    } else {
      surface.removeEventListener('click', speakFromEvent);
      window.speechSynthesis.cancel();
    }
  };

  const applyState = () => {
    state.fontScale = clamp(state.fontScale, FONT_MIN, FONT_MAX);
    state.lineHeight = clamp(state.lineHeight, LINE_MIN, LINE_MAX);
    state.letterSpacing = clamp(state.letterSpacing, LETTER_MIN, LETTER_MAX);
    state.cursorSize = clamp(state.cursorSize, CURSOR_MIN, CURSOR_MAX);

    document.documentElement.style.setProperty('--font-scale', state.fontScale.toFixed(2));
    document.documentElement.style.setProperty('--line-height-scale', state.lineHeight.toFixed(2));
    document.documentElement.style.setProperty('--letter-spacing', `${state.letterSpacing.toFixed(3)}em`);
    document.documentElement.style.setProperty('--access-grayscale', state.grayscale ? '1' : '0');
    document.documentElement.style.setProperty('--access-invert', state.invert ? '1' : '0');
    body.classList.toggle('accessibility--underline', Boolean(state.underline));
    applyCursor();
    updateGuideState();
    updateSpeechState();
  };

  const setPressed = (button, pressed) => {
    if (!button) return;
    button.setAttribute('aria-pressed', String(Boolean(pressed)));
  };

  const setToggleCopy = (button, activeText, inactiveText, active) => {
    if (!button) return;
    button.textContent = active ? activeText : inactiveText;
  };

  const updateUI = () => {
    if (controls.fontDecrease) {
      controls.fontDecrease.disabled = state.fontScale <= FONT_MIN + 0.01;
    }
    if (controls.fontIncrease) {
      controls.fontIncrease.disabled = state.fontScale >= FONT_MAX - 0.01;
    }
    if (controls.lineDecrease) {
      controls.lineDecrease.disabled = state.lineHeight <= LINE_MIN + 0.01;
    }
    if (controls.lineIncrease) {
      controls.lineIncrease.disabled = state.lineHeight >= LINE_MAX - 0.01;
    }
    if (controls.letterDecrease) {
      controls.letterDecrease.disabled = state.letterSpacing <= LETTER_MIN + 0.001;
    }
    if (controls.letterIncrease) {
      controls.letterIncrease.disabled = state.letterSpacing >= LETTER_MAX - 0.001;
    }
    if (controls.cursorDecrease) {
      controls.cursorDecrease.disabled = !state.cursor || state.cursorSize <= CURSOR_MIN + 0.5;
    }
    if (controls.cursorIncrease) {
      controls.cursorIncrease.disabled = !state.cursor || state.cursorSize >= CURSOR_MAX - 0.5;
    }
    setPressed(controls.grayscale, state.grayscale);
    setPressed(controls.invert, state.invert);
    setPressed(controls.underline, state.underline);
    setPressed(controls.cursorToggle, state.cursor);
    setPressed(controls.guide, state.guide);
    setPressed(controls.speech, state.speech);
    setToggleCopy(controls.grayscale, 'Desactivar', 'Activar', state.grayscale);
    setToggleCopy(controls.invert, 'Desactivar', 'Activar', state.invert);
    setToggleCopy(controls.underline, 'Desactivar', 'Activar', state.underline);
    setToggleCopy(controls.cursorToggle, 'Desactivar Cursor', 'Activar Cursor', state.cursor);
    setToggleCopy(controls.guide, 'Desactivar', 'Activar', state.guide);
    if (controls.speech) {
      setToggleCopy(controls.speech, 'Desactivar Click-para-Leer', 'Activar Click-para-Leer', state.speech);
    }
    if (controls.speech) {
      controls.speech.disabled = !speechSupported;
      if (!speechSupported) {
        controls.speech.textContent = 'No disponible en este navegador';
        controls.speech.setAttribute('aria-pressed', 'false');
      }
    }
    if (controls.cursorDecrease && controls.cursorIncrease) {
      controls.cursorDecrease.setAttribute('aria-disabled', String(controls.cursorDecrease.disabled));
      controls.cursorIncrease.setAttribute('aria-disabled', String(controls.cursorIncrease.disabled));
    }
    if (accessTrigger) {
      accessTrigger.setAttribute(
        'aria-expanded',
        panel?.classList.contains('accessibility-panel--open') ? 'true' : 'false'
      );
    }
  };

  const openPanel = () => {
    if (!panel) return;
    panel.classList.add('accessibility-panel--open');
    panel.setAttribute('aria-hidden', 'false');
    overlay?.classList.add('is-active');
    body.classList.add('accessibility-panel-open');
    accessTrigger?.setAttribute('aria-expanded', 'true');
    document.documentElement.style.setProperty('--panel-dim', '0.85');
    releasePanelFocus = trapFocus(panel);
    const firstInteractive = panel.querySelector(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    firstInteractive?.focus();
  };

  const closePanel = () => {
    if (!panel) return;
    panel.classList.remove('accessibility-panel--open');
    panel.setAttribute('aria-hidden', 'true');
    overlay?.classList.remove('is-active');
    body.classList.remove('accessibility-panel-open');
    accessTrigger?.setAttribute('aria-expanded', 'false');
    releasePanelFocus();
    releasePanelFocus = () => {};
    document.documentElement.style.setProperty('--panel-dim', '1');
    accessTrigger?.focus();
  };

  const handleAction = (action) => {
    switch (action) {
      case 'font-decrease':
        state.fontScale -= FONT_STEP;
        break;
      case 'font-increase':
        state.fontScale += FONT_STEP;
        break;
      case 'line-decrease':
        state.lineHeight -= LINE_STEP;
        break;
      case 'line-increase':
        state.lineHeight += LINE_STEP;
        break;
      case 'letter-decrease':
        state.letterSpacing -= LETTER_STEP;
        break;
      case 'letter-increase':
        state.letterSpacing += LETTER_STEP;
        break;
      case 'grayscale-toggle':
        state.grayscale = !state.grayscale;
        break;
      case 'invert-toggle':
        state.invert = !state.invert;
        break;
      case 'underline-toggle':
        state.underline = !state.underline;
        break;
      case 'cursor-toggle':
        state.cursor = !state.cursor;
        if (!state.cursor) {
          state.cursorSize = defaultState.cursorSize;
        }
        break;
      case 'cursor-decrease':
        state.cursor = true;
        state.cursorSize -= CURSOR_STEP;
        break;
      case 'cursor-increase':
        state.cursor = true;
        state.cursorSize += CURSOR_STEP;
        break;
      case 'guide-toggle':
        state.guide = !state.guide;
        break;
      case 'speech-toggle':
        if (!speechSupported) return;
        state.speech = !state.speech;
        break;
      case 'reset':
        state = { ...defaultState };
        if (speechSupported) {
          window.speechSynthesis.cancel();
        }
        break;
      default:
        break;
    }
    applyState();
    updateUI();
    persistState();
  };

  const createMarkup = () => {
    const template = document.createElement('template');
    const markup = `
      <div class="accessibility-panel__overlay" data-accessibility="overlay"></div>
      <aside class="accessibility-panel" id="accessibility-panel" role="dialog" aria-modal="true" aria-labelledby="accessibility-panel-title" aria-hidden="true" data-accessibility="panel">
        <div class="accessibility-panel__header">
          <div class="accessibility-panel__title-group">
            <p class="accessibility-panel__eyebrow">Inclusión</p>
            <h2 class="accessibility-panel__title" id="accessibility-panel-title">Opciones de Accesibilidad</h2>
          </div>
          <button type="button" class="accessibility-panel__close" data-accessibility-close aria-label="Cerrar menú de accesibilidad">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <button type="button" class="accessibility-reset" data-access-action="reset">
          <span class="accessibility-reset__icon" aria-hidden="true">↺</span>
          <span>Restablecer Ajustes</span>
        </button>
        <div class="accessibility-panel__body">
          <section class="accessibility-section">
            <h3>Tamaño del Texto</h3>
            <div class="accessibility-actions">
              <button type="button" class="accessibility-action" data-access-action="font-decrease">Disminuir</button>
              <button type="button" class="accessibility-action" data-access-action="font-increase">Aumentar</button>
            </div>
          </section>
          <section class="accessibility-section">
            <h3>Espaciado de Texto</h3>
            <div class="accessibility-subsection">
              <p class="accessibility-subtitle">Interlineado:</p>
              <div class="accessibility-actions">
                <button type="button" class="accessibility-action" data-access-action="line-decrease">Disminuir</button>
                <button type="button" class="accessibility-action" data-access-action="line-increase">Aumentar</button>
              </div>
            </div>
            <div class="accessibility-subsection">
              <p class="accessibility-subtitle">Espacio entre letras:</p>
              <div class="accessibility-actions">
                <button type="button" class="accessibility-action" data-access-action="letter-decrease">Disminuir</button>
                <button type="button" class="accessibility-action" data-access-action="letter-increase">Aumentar</button>
              </div>
            </div>
          </section>
          <section class="accessibility-section">
            <h3>Modo Grises</h3>
            <div class="accessibility-actions">
              <button type="button" class="accessibility-action" data-access-action="grayscale-toggle" aria-pressed="false">Activar</button>
            </div>
          </section>
          <section class="accessibility-section">
            <h3>Invertir Colores</h3>
            <div class="accessibility-actions">
              <button type="button" class="accessibility-action" data-access-action="invert-toggle" aria-pressed="false">Activar</button>
            </div>
          </section>
          <section class="accessibility-section">
            <h3>Subrayar Enlaces</h3>
            <div class="accessibility-actions">
              <button type="button" class="accessibility-action" data-access-action="underline-toggle" aria-pressed="false">Activar</button>
            </div>
          </section>
          <section class="accessibility-section">
            <h3>Cursor Personalizado</h3>
            <div class="accessibility-actions">
              <button type="button" class="accessibility-action" data-access-action="cursor-toggle" aria-pressed="false">Activar Cursor</button>
              <button type="button" class="accessibility-action" data-access-action="cursor-decrease" aria-disabled="true" disabled>Disminuir</button>
              <button type="button" class="accessibility-action" data-access-action="cursor-increase" aria-disabled="true" disabled>Aumentar</button>
            </div>
          </section>
          <section class="accessibility-section">
            <h3>Guía de Lectura</h3>
            <div class="accessibility-actions">
              <button type="button" class="accessibility-action" data-access-action="guide-toggle" aria-pressed="false">Activar</button>
            </div>
          </section>
          <section class="accessibility-section">
            <h3>Texto a Voz</h3>
            <div class="accessibility-actions">
              <button type="button" class="accessibility-action" data-access-action="speech-toggle" aria-pressed="false">Activar Click-para-Leer</button>
            </div>
          </section>
          <section class="accessibility-section accessibility-section--link">
            <a class="accessibility-link" href="https://www.unillanos.edu.co/index.php?option=com_content&amp;view=article&amp;id=5092" target="_blank" rel="noopener noreferrer">
              <span>Ayudas para Discapacidad Visual</span>
              <small>(JAWS y ZOOMTEXT)</small>
            </a>
          </section>
        </div>
      </aside>
      <button type="button" class="floating-button floating-button--access" data-accessibility-trigger aria-haspopup="dialog" aria-controls="accessibility-panel" aria-expanded="false" aria-label="Abrir opciones de accesibilidad">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 2.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm9 6.4h-5.7v13h-2.6v-6h-1.4v6H8.7v-13H3a1.3 1.3 0 1 1 0-2.6h6.6a2.6 2.6 0 0 1 1.8.7l.6.6.6-.6a2.6 2.6 0 0 1 1.8-.7H21a1.3 1.3 0 1 1 0 2.6Z"/>
        </svg>
      </button>
      <a class="floating-button floating-button--whatsapp" href="https://api.whatsapp.com/send/?phone=573112004339&amp;text=Hola%2C+quisiera+m%C3%A1s+informaci%C3%B3n+sobre+el+Centro+de+Idiomas.&amp;type=phone_number&amp;app_absent=0" target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 2a9.9 9.9 0 0 0-8.5 15.4L2 22l4.8-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.7-2.7-.2-.3A8 8 0 1 1 12 20Zm4-5.9c-.2-.1-1.2-.6-1.4-.7s-.3-.1-.4.1c-.1.2-.5.7-.6.8-.1.2-.2.1-.4 0a6.5 6.5 0 0 1-3-2.6c-.3-.4.3-.4.8-1.4 0-.1 0-.2-.1-.3l-.6-1.4c-.1-.3-.3-.3-.5-.3h-.4c-.1 0-.3 0-.4.2-.2.2-.8.7-.8 1.8s.8 2.1.9 2.3c.1.2 1.5 2.4 3.7 3.4.5.2.9.3 1.2.4.5.1 1 .1 1.3 0 .4-.1 1.2-.5 1.4-.9.2-.4.2-.7.1-.9-.1-.1-.2-.2-.4-.3Z"/>
        </svg>
      </a>
      <div class="accessibility-guide" data-accessibility="guide" aria-hidden="true"></div>
    `;
    template.innerHTML = markup.trim();
    body.appendChild(template.content);

    overlay = qs('[data-accessibility="overlay"]');
    panel = qs('[data-accessibility="panel"]');
    accessTrigger = qs('[data-accessibility-trigger]');
    closeButton = qs('[data-accessibility-close]');
    guideElement = qs('[data-accessibility="guide"]');

    controls.fontDecrease = qs('[data-access-action="font-decrease"]', panel);
    controls.fontIncrease = qs('[data-access-action="font-increase"]', panel);
    controls.lineDecrease = qs('[data-access-action="line-decrease"]', panel);
    controls.lineIncrease = qs('[data-access-action="line-increase"]', panel);
    controls.letterDecrease = qs('[data-access-action="letter-decrease"]', panel);
    controls.letterIncrease = qs('[data-access-action="letter-increase"]', panel);
    controls.grayscale = qs('[data-access-action="grayscale-toggle"]', panel);
    controls.invert = qs('[data-access-action="invert-toggle"]', panel);
    controls.underline = qs('[data-access-action="underline-toggle"]', panel);
    controls.cursorToggle = qs('[data-access-action="cursor-toggle"]', panel);
    controls.cursorDecrease = qs('[data-access-action="cursor-decrease"]', panel);
    controls.cursorIncrease = qs('[data-access-action="cursor-increase"]', panel);
    controls.guide = qs('[data-access-action="guide-toggle"]', panel);
    controls.speech = qs('[data-access-action="speech-toggle"]', panel);

    body.classList.add('has-floating-controls');
  };

  const attachEvents = () => {
    on(accessTrigger, 'click', () => {
      if (panel?.classList.contains('accessibility-panel--open')) {
        closePanel();
      } else {
        openPanel();
      }
    });

    on(closeButton, 'click', closePanel);
    on(overlay, 'click', closePanel);
    on(document, 'keydown', (event) => {
      if (event.key === 'Escape' && panel?.classList.contains('accessibility-panel--open')) {
        closePanel();
      }
    });

    on(panel, 'click', (event) => {
      const actionButton = event.target.closest('[data-access-action]');
      if (!actionButton || actionButton.disabled) return;
      event.preventDefault();
      handleAction(actionButton.getAttribute('data-access-action'));
    });
  };

  const init = () => {
    surface = ensureSurface();
    loadState();
    createMarkup();
    applyState();
    updateUI();
    attachEvents();
  };

  init();
})();
