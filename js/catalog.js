document.addEventListener('DOMContentLoaded', function () {
  var grid = document.getElementById('catalog-grid');
  var modal = document.getElementById('catalog-modal');
  var modalTitle = document.getElementById('modal-title');
  var modalProducts = document.getElementById('modal-products');
  var closeBtn = modal ? modal.querySelector('.modal__close') : null;
  var overlay = modal ? modal.querySelector('.modal__overlay') : null;

  if (!grid || !modal) return;

  /**
   * Returns a localized field from a data object if the corresponding
   * `field_<lang>` key exists, otherwise falls back to `field`.
   */
  function localized(obj, field) {
    var lang = (typeof window.getCurrentLang === 'function') ? window.getCurrentLang() : 'ru';
    var localizedValue = obj[field + '_' + lang];
    return localizedValue !== undefined ? localizedValue : obj[field];
  }

  /**
   * Translates the special "on request" spec value; leaves physical units unchanged.
   */
  function translateSpecValue(value) {
    if (value === 'по заявке') {
      return getTranslation('catalog.onRequest');
    }
    return value;
  }
  var categoriesData = [];
  var currentCategory = null;

  function renderCategories() {
    grid.innerHTML = '';
    categoriesData.forEach(function (category) {
      grid.appendChild(createCategoryCard(category));
    });
  }

  // Load catalog data
  fetch('./data/catalog.json')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(function (data) {
      categoriesData = data.categories || [];
      renderCategories();
    })
    .catch(function (error) {
      console.error('Failed to load catalog:', error);
      grid.innerHTML = '<p>' + escapeHtml(getTranslation('catalog.errors.loadError')) + '</p>';
    });

  // Re-render catalog when language is switched
  document.addEventListener('languageChanged', function () {
    if (categoriesData.length) {
      renderCategories();
    }
    if (currentCategory && modal.classList.contains('modal--open')) {
      openModal(currentCategory);
    }
  });


  function createCategoryCard(category) {
    var card = document.createElement('article');
    card.className = 'category-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', getTranslation('catalog.openCategory') + ' ' + localized(category, 'name'));

    var categoryName = localized(category, 'name');
    var categoryDesc = localized(category, 'description');

    card.innerHTML =
      '<img class="category-card__icon" src="' + escapeHtml(category.icon) + '" alt="' + escapeHtml(categoryName) + '" loading="lazy">' +
      '<h2 class="category-card__title">' + escapeHtml(categoryName) + '</h2>' +
      '<p class="category-card__desc">' + escapeHtml(categoryDesc) + '</p>';

    function open() {
      openModal(category);
    }

    card.addEventListener('click', open);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    return card;
  }

  function openModal(category) {
    currentCategory = category;
    var categoryName = localized(category, 'name');
    modalTitle.textContent = categoryName;
    modalProducts.innerHTML = '';

    category.products.forEach(function (product) {
      var item = document.createElement('div');
      item.className = 'product-item';

      item.innerHTML =
        '<h3 class="product-item__name">' + escapeHtml(localized(product, 'name')) + '</h3>' +
        '<p class="product-item__spec">' + escapeHtml(getTranslation('catalog.stepLabel')) + ' ' + escapeHtml(translateSpecValue(product.step)) + '</p>' +
        '<p class="product-item__spec">' + escapeHtml(getTranslation('catalog.loadLabel')) + ' ' + escapeHtml(translateSpecValue(product.load)) + '</p>' +
        '<button class="btn btn--primary product-item__btn" type="button">' + escapeHtml(getTranslation('catalog.requestPrice')) + '</button>';

      var requestBtn = item.querySelector('.product-item__btn');
      requestBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (typeof openRequestForm === 'function') {
          openRequestForm();
        } else {
          console.warn('openRequestForm is not defined');
        }
      });

      modalProducts.appendChild(item);
    });

    modal.classList.add('modal--open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    currentCategory = null;
    modal.classList.remove('modal--open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (closeBtn) {
    closeBtn.setAttribute('aria-label', getTranslation('catalog.modalCloseAria'));
    closeBtn.addEventListener('click', closeModal);
  }
  if (overlay) overlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('modal--open')) {
      closeModal();
    }
  });

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;

    return div.innerHTML;
  }
});

