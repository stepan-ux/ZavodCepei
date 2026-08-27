// Current language used by getTranslation
var currentLang = 'ru';

/**
 * Get a translation value by dot-separated key.
 * Falls back to the key itself if translation is missing.
 */
function getTranslation(key) {
  if (typeof translations === 'undefined') return key;
  var keys = key.split('.');
  var value = translations[currentLang];
  for (var i = 0; i < keys.length; i++) {
    if (!value || typeof value !== 'object') {
      value = undefined;
      break;
    }
    value = value[keys[i]];
  }
  return typeof value === 'string' ? value : key;
}

/**
 * Replace {placeholders} in a translation string.
 */
function formatTranslation(key, params) {
  var text = getTranslation(key);
  if (!params) return text;
  for (var k in params) {
    if (params.hasOwnProperty(k)) {
      text = text.split('{' + k + '}').join(params[k]);
    }
  }
  return text;
}

// Expose helpers globally for other scripts (e.g. catalog.js)
window.getTranslation = getTranslation;
window.formatTranslation = formatTranslation;
window.getCurrentLang = function () { return currentLang; };

document.addEventListener('DOMContentLoaded', function () {
  initLanguage();
  initHamburger();
  initHeroSlider();
  initCursorChain();
  initRequestForm();
  initFaqAccordion();
  initStickySections();
});

/* ===== Language switcher ===== */
function initLanguage() {
  var savedLang = localStorage.getItem('site-lang');
  var initialLang = savedLang === 'en' ? 'en' : 'ru';
  applyLanguage(initialLang);

  var buttons = document.querySelectorAll('.lang-switcher__btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      applyLanguage(this.getAttribute('data-lang'));
    });
  }
}

/* ===== Mobile hamburger menu ===== */
function initHamburger() {
  var hamburger = document.querySelector('.hamburger');
  var nav = document.querySelector('.nav');
  if (!hamburger || !nav) return;

  function setMenuOpen(isOpen) {
    if (isOpen) {
      nav.classList.add('nav--open');
      hamburger.setAttribute('aria-expanded', 'true');
    } else {
      nav.classList.remove('nav--open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  }

  // Toggle menu on hamburger click
  hamburger.addEventListener('click', function () {
    var isOpen = nav.classList.contains('nav--open');
    setMenuOpen(!isOpen);
  });

  // Close menu when a navigation link is clicked
  var navLinks = nav.querySelectorAll('a');
  for (var i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener('click', function () {
      setMenuOpen(false);
    });
  }

  // Reset menu on desktop widths
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1150) {
      setMenuOpen(false);
    }
  });
}

function applyLanguage(lang) {
  if (!translations || !translations[lang]) return;

  currentLang = lang;
  localStorage.setItem('site-lang', lang);
  document.documentElement.lang = lang;

  // Text content
  var textElements = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < textElements.length; i++) {
    var el = textElements[i];
    var key = el.getAttribute('data-i18n');
    var value = getTranslation(key);
    if (typeof value === 'string') {
      el.textContent = value;
    }
  }

  // Placeholders
  var placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  for (var j = 0; j < placeholderElements.length; j++) {
    var pEl = placeholderElements[j];
    var pKey = pEl.getAttribute('data-i18n-placeholder');
    var pValue = getTranslation(pKey);
    if (typeof pValue === 'string') {
      pEl.setAttribute('placeholder', pValue);
    }
  }

  // Aria labels
  var ariaElements = document.querySelectorAll('[data-i18n-aria]');
  for (var k = 0; k < ariaElements.length; k++) {
    var aEl = ariaElements[k];
    var aKey = aEl.getAttribute('data-i18n-aria');
    var aValue = getTranslation(aKey);
    if (typeof aValue === 'string') {
      aEl.setAttribute('aria-label', aValue);
    }
  }

  // Update active state on language buttons
  var buttons = document.querySelectorAll('.lang-switcher__btn');
  for (var b = 0; b < buttons.length; b++) {
    if (buttons[b].getAttribute('data-lang') === lang) {
      buttons[b].classList.add('lang-switcher__btn--active');
    } else {
      buttons[b].classList.remove('lang-switcher__btn--active');
    }
  }

  // Notify other modules (e.g. catalog re-render)
  var event;
  if (typeof CustomEvent === 'function') {
    event = new CustomEvent('languageChanged', { detail: { lang: lang } });
  } else {
    event = document.createEvent('CustomEvent');
    event.initCustomEvent('languageChanged', true, true, { lang: lang });
  }
  document.dispatchEvent(event);
}

/* ===== Hero Slick Slider ===== */
function initHeroSlider() {
  var heroSlider = document.querySelector('.hero__slider');
  var heroChain = document.getElementById('hero-chain');

  if (!heroSlider || typeof jQuery === 'undefined') {
    return;
  }

  var $slider = jQuery(heroSlider);

  function moveChain(event, slick, currentSlide, nextSlide) {
    var slideIndex = typeof nextSlide === 'number' ? nextSlide : (typeof currentSlide === 'number' ? currentSlide : 0);
    if (heroChain) {
      var offset = slideIndex * 500;
      heroChain.style.transform = 'translateX(-' + offset + 'px)';
    }
  }

  $slider.on('init reInit beforeChange', moveChain);

  $slider.slick({
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: true,
    dots: true,
    infinite: true,
    speed: 600,
    slidesToShow: 1,
    slidesToScroll: 1,
    pauseOnHover: false
  });
}

/* ===== Cursor following chain (4 links, desktop only) ===== */
/**
 * Инициализация цепи, следующей за курсором (только десктоп)
 * Использует правильную физику: фиксированное расстояние между звеньями,
 * поворот каждого звена в направлении цепи.
 */
function initCursorChain() {
  const container = document.getElementById('cursor-chain');
  if (!container) return;

  const linkElements = container.querySelectorAll('[class^="cursor-chain__link"]');
  if (!linkElements.length) return;

  const numLinks = linkElements.length;
  const numNodes = numLinks + 1; // узлов на один больше
  const LINK_LENGTH = 30; // расстояние между узлами (длина звена)
  const ENABLED_BREAKPOINT = 1150;

  let isEnabled = window.innerWidth >= ENABLED_BREAKPOINT;
  let mouseX = 40;
  let mouseY = -20;

  // Массив узлов (nodes) длиной numNodes
  const nodes = Array.from({ length: numNodes }, (_, i) => ({ x: mouseX, y: mouseY + i * LINK_LENGTH }));

  function updateEnabled() {
    isEnabled = window.innerWidth >= ENABLED_BREAKPOINT;
    // Не управляем display – только флаг для анимации
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('resize', updateEnabled);

  function animate() {
    if (isEnabled) {
      // Первый узел = курсор
      nodes[0].x = mouseX;
      nodes[0].y = mouseY;

      // Остальные узлы: каждый на расстоянии LINK_LENGTH от предыдущего
      for (let i = 1; i < numNodes; i++) {
        const prev = nodes[i - 1];
        const curr = nodes[i];
        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) {
          // Если совпали, смещаем вправо
          nodes[i].x = prev.x + LINK_LENGTH;
          nodes[i].y = prev.y;
        } else {
          const normX = dx / dist;
          const normY = dy / dist;
          nodes[i].x = prev.x - normX * LINK_LENGTH;
          nodes[i].y = prev.y - normY * LINK_LENGTH;
        }
      }

      // Теперь для каждого звена (элемента) берём середину между двумя узлами
      for (let i = 0; i < numLinks; i++) {
        const nodeA = nodes[i];
        const nodeB = nodes[i + 1];
        const cx = (nodeA.x + nodeB.x) / 2;
        const cy = (nodeA.y + nodeB.y) / 2;
        const angle = Math.atan2(nodeB.y - nodeA.y, nodeB.x - nodeA.x);

        const el = linkElements[i];
        el.style.transform = `translate(${cx}px, ${cy}px) rotate(${angle}rad)`;
      }
    }

    requestAnimationFrame(animate);
  }

  updateEnabled();
  animate();
}

/* ===== Request form pop-up ===== */
function initRequestForm() {
  var modal = document.getElementById('request-modal');
  var form = document.getElementById('request-form');
  var successBlock = document.getElementById('request-success');
  var closeBtn = modal ? modal.querySelector('.request-modal__close') : null;
  var overlay = modal ? modal.querySelector('.request-modal__overlay') : null;
  var successBtn = document.getElementById('request-success-btn');
  var phoneInput = document.getElementById('request-phone');
  var fileInput = document.getElementById('request-files');
  var fileList = document.getElementById('file-list');
  var openTriggers = document.querySelectorAll('.js-open-request');

  if (!modal || !form) return;

  var selectedFiles = [];
  var allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'dwg', 'doc', 'docx', 'xls', 'xlsx'];
  var maxFileSize = 10 * 1024 * 1024;
  var maxFilesCount = 5;

  function openRequestForm() {
    resetForm();
    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var nameInput = document.getElementById('request-name');
    if (nameInput) nameInput.focus();
  }

  function closeRequestForm() {
    modal.classList.remove('modal--open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Global function for external callers (e.g. catalog price button)
  window.openRequestForm = openRequestForm;

  for (var t = 0; t < openTriggers.length; t++) {
    openTriggers[t].addEventListener('click', function (e) {
      e.preventDefault();
      openRequestForm();
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeRequestForm);
  if (overlay) overlay.addEventListener('click', closeRequestForm);
  if (successBtn) successBtn.addEventListener('click', closeRequestForm);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('modal--open')) {
      closeRequestForm();
    }
  });

  // Phone mask: +7 (___) ___-__-__
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      applyPhoneMask(phoneInput);
    });
  }

  // Inline contact form in #contacts: prefill and open the unified request form
  var contactForm = document.getElementById('contact-form');
  var contactPhone = document.getElementById('contact-phone');
  if (contactPhone) {
    contactPhone.addEventListener('input', function () {
      applyPhoneMask(contactPhone);
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var contactName = document.getElementById('contact-name');
      var contactEmail = document.getElementById('contact-email');
      var contactMessage = document.getElementById('contact-message');

      openRequestForm();

      if (form.elements.name && contactName) form.elements.name.value = contactName.value;
      if (phoneInput && contactPhone) phoneInput.value = contactPhone.value;
      if (form.elements.email && contactEmail) form.elements.email.value = contactEmail.value;
      if (form.elements.message && contactMessage) form.elements.message.value = contactMessage.value;

      contactForm.reset();
    });
  }

  // File selection handling
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      selectedFiles = Array.prototype.slice.call(fileInput.files);
      validateAndRenderFiles();
    });
  }

  function validateAndRenderFiles() {
    var errors = [];
    var validFiles = [];

    if (selectedFiles.length > maxFilesCount) {
      errors.push(formatTranslation('requestForm.errors.tooManyFiles', { count: maxFilesCount }));
    }

    for (var f = 0; f < selectedFiles.length; f++) {
      var file = selectedFiles[f];
      if (file.size > maxFileSize) {
        errors.push(formatTranslation('requestForm.errors.fileTooBig', { name: file.name }));
        continue;
      }

      var ext = file.name.split('.').pop().toLowerCase();
      if (allowedExtensions.indexOf(ext) === -1) {
        errors.push(formatTranslation('requestForm.errors.fileInvalidExt', { name: file.name }));
        continue;
      }

      validFiles.push(file);
    }

    selectedFiles = validFiles;
    renderFileList();
    showFieldError('files', errors.length ? errors.join(' ') : '');
  }

  function renderFileList() {
    if (!fileList) return;
    fileList.innerHTML = '';

    for (var f = 0; f < selectedFiles.length; f++) {
      var li = document.createElement('li');
      li.textContent = selectedFiles[f].name + ' (' + formatFileSize(selectedFiles[f].size) + ')';
      fileList.appendChild(li);
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function showFieldError(fieldId, message) {
    var errorEl = document.getElementById('error-' + fieldId);
    if (errorEl) {
      errorEl.textContent = message;
      if (message) errorEl.classList.add('is-visible');
      else errorEl.classList.remove('is-visible');
    }

    var input = form.querySelector('[name="' + fieldId + '"]') || document.getElementById('request-' + fieldId);
    if (input) {
      if (message) input.classList.add('is-invalid');
      else input.classList.remove('is-invalid');
    }
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function resetForm() {
    form.reset();
    selectedFiles = [];
    if (fileList) fileList.innerHTML = '';
    var fields = ['name', 'phone', 'email', 'files'];
    for (var i = 0; i < fields.length; i++) {
      showFieldError(fields[i], '');
    }
    form.classList.remove('is-hidden');
    if (successBlock) successBlock.setAttribute('hidden', '');
  }

  /**
   * Phone mask helper: formats input as +7 (___) ___-__-__.
   */
  function applyPhoneMask(input) {
    var value = input.value.replace(/\D/g, '');

    if (value.length > 0 && value.charAt(0) !== '7') {
      if (value.charAt(0) === '8') {
        value = '7' + value.slice(1);
      } else {
        value = '7' + value;
      }
    }

    var formatted = '+7';
    if (value.length > 1) formatted += ' (' + value.substring(1, 4);
    if (value.length >= 4) formatted += ') ' + value.substring(4, 7);
    if (value.length >= 7) formatted += '-' + value.substring(7, 9);
    if (value.length >= 9) formatted += '-' + value.substring(9, 11);

    input.value = formatted;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Simple honeypot spam protection
    var honeypot = form.elements.honeypot;
    if (honeypot && honeypot.value) {
      return;
    }

    var isValid = true;

    var name = form.elements.name.value.trim();
    var phone = form.elements.phone.value.trim();
    var email = form.elements.email.value.trim();

    if (!name) {
      showFieldError('name', getTranslation('requestForm.errors.nameRequired'));
      isValid = false;
    } else if (name.length < 2) {
      showFieldError('name', getTranslation('requestForm.errors.nameShort'));
      isValid = false;
    } else {
      showFieldError('name', '');
    }

    if (!phone) {
      showFieldError('phone', getTranslation('requestForm.errors.phoneRequired'));
      isValid = false;
    } else if (phone.replace(/\D/g, '').length < 11) {
      showFieldError('phone', getTranslation('requestForm.errors.phoneIncomplete'));
      isValid = false;
    } else {
      showFieldError('phone', '');
    }

    if (!email) {
      showFieldError('email', getTranslation('requestForm.errors.emailRequired'));
      isValid = false;
    } else if (!validateEmail(email)) {
      showFieldError('email', getTranslation('requestForm.errors.emailInvalid'));
      isValid = false;
    } else {
      showFieldError('email', '');
    }

    var fileErrors = [];
    if (selectedFiles.length > maxFilesCount) {
      fileErrors.push(formatTranslation('requestForm.errors.tooManyFiles', { count: maxFilesCount }));
    }
    for (var f = 0; f < selectedFiles.length; f++) {
      if (selectedFiles[f].size > maxFileSize) {
        fileErrors.push(formatTranslation('requestForm.errors.fileTooBig', { name: selectedFiles[f].name }));
      }
    }

    if (fileErrors.length) {
      showFieldError('files', fileErrors.join(' '));
      isValid = false;
    } else {
      showFieldError('files', '');
    }

    if (!isValid) return;

    // Simulate successful submit
    console.log('Form submitted:', {
      name: name,
      phone: phone,
      email: email,
      message: form.elements.message.value.trim(),
      files: selectedFiles.map(function (f) { return f.name; })
    });

    form.classList.add('is-hidden');
    if (successBlock) successBlock.removeAttribute('hidden');
    selectedFiles = [];
    if (fileList) fileList.innerHTML = '';
  });
}

function initStickySections() {
  var scroller = document.querySelector('.scroll');
  if (!scroller) return;
  var sections = Array.prototype.slice.call(scroller.querySelectorAll(':scope > section'));
  if (!sections.length) return;

  function update() {
    var viewHeight = scroller.clientHeight;
    sections.forEach(function (section) {
      var overflow = section.offsetHeight - viewHeight;
      section.style.setProperty('--stick-top', (overflow > 0 ? -overflow : 0) + 'px');
    });
  }

  if (typeof ResizeObserver === 'function') {
    var observer = new ResizeObserver(update);
    observer.observe(scroller);
    sections.forEach(function (section) { observer.observe(section); });
  } else {
    window.addEventListener('resize', update);
  }
  window.addEventListener('load', update);
  document.addEventListener('languageChanged', update);
  update();
}

/* ===== FAQ accordion ===== */
function initFaqAccordion() {
  var accordion = document.querySelector('.faq-accordion');
  if (!accordion) return;

  var items = accordion.querySelectorAll('.faq-item');

  accordion.addEventListener('click', function (e) {
    var btn = e.target.closest('.faq-question');
    if (!btn) return;

    var item = btn.closest('.faq-item');
    var answerId = btn.getAttribute('aria-controls');
    var answer = document.getElementById(answerId);
    var isOpen = item.classList.contains('is-open');

    // Close all other items so only one stays open
    for (var i = 0; i < items.length; i++) {
      var other = items[i];
      if (other === item) continue;
      other.classList.remove('is-open');
      var otherBtn = other.querySelector('.faq-question');
      if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      var otherAnswerId = otherBtn ? otherBtn.getAttribute('aria-controls') : null;
      var otherAnswer = otherAnswerId ? document.getElementById(otherAnswerId) : null;
      if (otherAnswer) otherAnswer.setAttribute('aria-hidden', 'true');
    }

    // Toggle current item
    if (isOpen) {
      item.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (answer) answer.setAttribute('aria-hidden', 'true');
    } else {
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      if (answer) answer.setAttribute('aria-hidden', 'false');
    }
  });
}
