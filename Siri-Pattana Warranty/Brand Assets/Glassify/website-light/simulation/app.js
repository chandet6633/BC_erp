/**
 * Film Tinting Simulator - Main Application (Image-Based Version)
 * จำลองติดฟิล์ม
 */

(function () {
  'use strict';

  // ===================================
  // State Management
  // ===================================
  const state = {
    currentTab: 'exterior',
    selectedVehicle: 'ECO/COMPACT',
    frontFilm: 'ไม่ติดฟิล์ม',
    surroundFilm: 'ไม่ติดฟิล์ม',
    frontVlt: 35,
    surroundVlt: 35,
    // VLT Variant selections (e.g., "L05", "L15", "35")
    frontVariant: null,
    surroundVariant: null,
    // Interior view - two sided comparison
    interiorLeftFilm: 'ไม่ติดฟิล์ม',
    interiorRightFilm: 'ไม่ติดฟิล์ม',
    interiorLeftVlt: 35,
    interiorRightVlt: 35,
    interiorLeftVariant: null,
    interiorRightVariant: null,
    tintBoundaryPosition: 50 // percentage from left
  };

  // Vehicle image paths
  // Vehicle image paths are now loaded from data/vehicles.js

  // Window regions for each vehicle (polygon coordinates as percentages)
  // Format: array of [x%, y%] points for polygon clip-path
  // Coordinates are based on actual window positions in the vehicle images
  // All vehicles face left with front at ~20-35% from left edge
  // Window regions are now loaded from data/vehicles.js

  // ===================================
  // DOM Elements
  // ===================================
  const elements = {
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Exterior Controls - Buttons
    vehicleSelect: document.getElementById('vehicle-select'),
    frontFilmBtn: document.getElementById('front-film-btn'),
    frontFilmText: document.getElementById('front-film-text'),
    surroundFilmBtn: document.getElementById('surround-film-btn'),
    surroundFilmText: document.getElementById('surround-film-text'),
    frontVltSelect: document.getElementById('front-vlt-select'),
    surroundVltSelect: document.getElementById('surround-vlt-select'),

    // Interior Controls - Two Sided Comparison
    interiorLeftFilmBtn: document.getElementById('interior-left-film-btn'),
    interiorLeftFilmText: document.getElementById('interior-left-film-text'),
    interiorLeftVltSelect: document.getElementById('interior-left-vlt-select'),
    interiorLeftPrice: document.getElementById('interior-left-price'),
    interiorRightFilmBtn: document.getElementById('interior-right-film-btn'),
    interiorRightFilmText: document.getElementById('interior-right-film-text'),
    interiorRightVltSelect: document.getElementById('interior-right-vlt-select'),
    interiorRightPrice: document.getElementById('interior-right-price'),
    tintOverlayLeft: document.getElementById('tint-overlay-left'),
    tintOverlayRight: document.getElementById('tint-overlay-right'),
    tintLabelLeft: document.getElementById('tint-label-left'),
    tintLabelRight: document.getElementById('tint-label-right'),

    // Display Areas
    carContainer: document.getElementById('car-container'),
    boundarySlider: document.getElementById('boundary-slider'),
    sliderHandle: document.getElementById('slider-handle'),

    // Spec Tables (Desktop)
    frontSpecTable: document.getElementById('front-spec-table'),
    surroundSpecTable: document.getElementById('surround-spec-table'),
    interiorSpecTable: document.getElementById('interior-spec-table'),
    frontFilmTitle: document.getElementById('front-film-title'),
    surroundFilmTitle: document.getElementById('surround-film-title'),
    interiorFilmTitle: document.getElementById('interior-film-title'),

    // Spec Tables (Mobile)
    frontSpecTableMobile: document.getElementById('front-spec-table-mobile'),
    surroundSpecTableMobile: document.getElementById('surround-spec-table-mobile'),
    frontFilmTitleMobile: document.getElementById('front-film-title-mobile'),
    surroundFilmTitleMobile: document.getElementById('surround-film-title-mobile'),
    mobileSpecAccordion: document.getElementById('mobile-spec-accordion'),
    specAccordionToggle: document.getElementById('spec-accordion-toggle'),

    // Spec Panels
    exteriorSpecPanel: document.getElementById('exterior-spec-panel'),
    interiorSpecPanel: document.getElementById('interior-spec-panel'),
    exteriorSpecToggle: document.getElementById('exterior-spec-toggle'),
    interiorSpecToggle: document.getElementById('interior-spec-toggle'),

    // Film Popup
    filmPopupOverlay: document.getElementById('film-popup-overlay'),
    filmPopupClose: document.getElementById('film-popup-close'),
    filmBrandsContainer: document.getElementById('film-brands-container'),

    // Vehicle Popup
    vehicleSelectBtn: document.getElementById('vehicle-select-btn'),
    vehicleSelectText: document.getElementById('vehicle-select-text'),
    vehiclePopupOverlay: document.getElementById('vehicle-popup-overlay'),
    vehiclePopupClose: document.getElementById('vehicle-popup-close'),

    // Pickup Variant Popup
    pickupVariantPopupOverlay: document.getElementById('pickup-variant-popup-overlay'),
    pickupVariantPopupClose: document.getElementById('pickup-variant-popup-close')
  };

  // Current popup target (which film selector triggered the popup)
  let currentPopupTarget = null;

  // ===================================
  // Initialization
  // ===================================
  function init() {
    populateFilmBrands();
    setupEventListeners();
    renderVehicle();
    updateSpecTables();
    updateTintOverlay();
    updatePriceDisplay();
    updateFilmButtonText();
  }

  function populateFilmBrands() {
    // Populate film options for each brand section
    const brandContainers = document.querySelectorAll('.brand-films');

    brandContainers.forEach(container => {
      const brand = container.dataset.brand;
      let html = '';

      // No longer add "no film" option here - it's now in HTML at the top

      // Add films matching this brand
      Object.keys(FILMS).forEach(filmName => {
        const film = FILMS[filmName];
        if (film.brand === brand) {
          // Check if film has VLT variations
          if (film.variations) {
            html += `<div class="film-option-group">
              <div class="film-option-header" data-film="${filmName}">${filmName}</div>
              <div class="film-variants">`;

            // Add variant buttons
            Object.keys(film.variations).forEach(variantKey => {
              const variant = film.variations[variantKey];
              html += `<button class="variant-btn" data-film="${filmName}" data-variant="${variantKey}">
                <span class="variant-name">${variantKey}</span>
                <span class="variant-vlt">${variant.vlt}%</span>
              </button>`;
            });

            html += `</div></div>`;
          } else {
            html += `<button class="film-option" data-film="${filmName}">${filmName}</button>`;
          }
        }
      });

      container.innerHTML = html;
    });
  }

  function updateFilmButtonText() {
    // Helper to format film name with variant
    const formatFilmName = (filmName, variant) => {
      if (filmName === 'ไม่ติดฟิล์ม') return 'เลือกฟิล์ม';
      if (variant) return `${filmName} (${variant})`;
      return filmName;
    };

    if (elements.frontFilmText) {
      elements.frontFilmText.textContent = formatFilmName(state.frontFilm, state.frontVariant);
    }
    if (elements.surroundFilmText) {
      elements.surroundFilmText.textContent = formatFilmName(state.surroundFilm, state.surroundVariant);
    }
    // Interior - two sided
    if (elements.interiorLeftFilmText) {
      const text = state.interiorLeftFilm === 'ไม่ติดฟิล์ม' ? 'ไม่ติดฟิล์ม' : formatFilmName(state.interiorLeftFilm, state.interiorLeftVariant);
      elements.interiorLeftFilmText.textContent = text;
    }
    if (elements.interiorRightFilmText) {
      const text = state.interiorRightFilm === 'ไม่ติดฟิล์ม' ? 'ไม่ติดฟิล์ม' : formatFilmName(state.interiorRightFilm, state.interiorRightVariant);
      elements.interiorRightFilmText.textContent = text;
    }
  }

  function populateSelect(selectElement, filmList) {
    selectElement.innerHTML = '';
    filmList.forEach(filmName => {
      const option = document.createElement('option');
      option.value = filmName;
      option.textContent = filmName;
      selectElement.appendChild(option);
    });
  }

  // ===================================
  // Event Listeners
  // ===================================
  function setupEventListeners() {
    // Tab switching
    elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Exterior controls
    if (elements.vehicleSelect) {
      elements.vehicleSelect.addEventListener('change', (e) => {
        state.selectedVehicle = e.target.value;
        renderVehicle();
        updatePriceDisplay();
      });
    }

    // Film selection buttons - open popup
    if (elements.frontFilmBtn) {
      elements.frontFilmBtn.addEventListener('click', () => openFilmPopup('front'));
    }
    if (elements.surroundFilmBtn) {
      elements.surroundFilmBtn.addEventListener('click', () => openFilmPopup('surround'));
    }
    // Interior - two sided
    if (elements.interiorLeftFilmBtn) {
      elements.interiorLeftFilmBtn.addEventListener('click', () => openFilmPopup('interior-left'));
    }
    if (elements.interiorRightFilmBtn) {
      elements.interiorRightFilmBtn.addEventListener('click', () => openFilmPopup('interior-right'));
    }

    // VLT Controls
    if (elements.frontVltSelect) {
      elements.frontVltSelect.addEventListener('change', (e) => {
        state.frontVlt = parseInt(e.target.value);
        renderVehicle();
      });
    }

    if (elements.surroundVltSelect) {
      elements.surroundVltSelect.addEventListener('change', (e) => {
        state.surroundVlt = parseInt(e.target.value);
        renderVehicle();
      });
    }

    // Interior VLT - two sided
    if (elements.interiorLeftVltSelect) {
      elements.interiorLeftVltSelect.addEventListener('change', (e) => {
        state.interiorLeftVlt = parseInt(e.target.value);
        updateTintOverlay();
      });
    }
    if (elements.interiorRightVltSelect) {
      elements.interiorRightVltSelect.addEventListener('change', (e) => {
        state.interiorRightVlt = parseInt(e.target.value);
        updateTintOverlay();
      });
    }

    // Film popup close
    if (elements.filmPopupClose) {
      elements.filmPopupClose.addEventListener('click', closeFilmPopup);
    }
    if (elements.filmPopupOverlay) {
      elements.filmPopupOverlay.addEventListener('click', (e) => {
        if (e.target === elements.filmPopupOverlay) {
          closeFilmPopup();
        }
      });
    }

    // Film option selection (regular films without variants)
    document.querySelectorAll('.film-option').forEach(option => {
      option.addEventListener('click', () => {
        const filmName = option.dataset.film;
        selectFilm(filmName, null);
      });
    });

    // Top "no film" option
    const noFilmTopBtn = document.querySelector('.film-option-none-top');
    if (noFilmTopBtn) {
      noFilmTopBtn.addEventListener('click', () => {
        selectFilm('ไม่ติดฟิล์ม', null);
      });
    }

    // Variant button selection
    document.querySelectorAll('.variant-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filmName = btn.dataset.film;
        const variant = btn.dataset.variant;
        selectFilm(filmName, variant);
      });
    });

    // Spec panel toggles
    if (elements.exteriorSpecToggle) {
      elements.exteriorSpecToggle.addEventListener('click', () => {
        elements.exteriorSpecPanel.classList.toggle('collapsed');
      });
    }

    if (elements.interiorSpecToggle) {
      elements.interiorSpecToggle.addEventListener('click', () => {
        elements.interiorSpecPanel.classList.toggle('collapsed');
      });
    }

    // Mobile spec accordion toggle
    if (elements.specAccordionToggle) {
      elements.specAccordionToggle.addEventListener('click', () => {
        if (elements.mobileSpecAccordion) {
          elements.mobileSpecAccordion.classList.toggle('expanded');
        }
      });
    }

    // Vehicle popup - open
    if (elements.vehicleSelectBtn) {
      elements.vehicleSelectBtn.addEventListener('click', openVehiclePopup);
    }

    // Vehicle popup - close
    if (elements.vehiclePopupClose) {
      elements.vehiclePopupClose.addEventListener('click', closeVehiclePopup);
    }
    if (elements.vehiclePopupOverlay) {
      elements.vehiclePopupOverlay.addEventListener('click', (e) => {
        if (e.target === elements.vehiclePopupOverlay) {
          closeVehiclePopup();
        }
      });
    }

    // Vehicle option selection
    document.querySelectorAll('.vehicle-option').forEach(option => {
      option.addEventListener('click', () => {
        const vehicleType = option.dataset.vehicle;
        // If PICKUP is selected, show the variant popup instead
        if (vehicleType === 'PICKUP') {
          closeVehiclePopup();
          openPickupVariantPopup();
        } else {
          selectVehicle(vehicleType);
        }
      });
    });

    // Pickup variant popup - close
    if (elements.pickupVariantPopupClose) {
      elements.pickupVariantPopupClose.addEventListener('click', closePickupVariantPopup);
    }
    if (elements.pickupVariantPopupOverlay) {
      elements.pickupVariantPopupOverlay.addEventListener('click', (e) => {
        if (e.target === elements.pickupVariantPopupOverlay) {
          closePickupVariantPopup();
        }
      });
    }

    // Pickup variant option selection
    document.querySelectorAll('.pickup-variant-option').forEach(option => {
      option.addEventListener('click', () => {
        const pickupVariant = option.dataset.pickupVariant;
        selectVehicle(pickupVariant);
        closePickupVariantPopup();
      });
    });

    // Brand header toggle (collapsible sections)
    document.querySelectorAll('.brand-header[data-brand-toggle]').forEach(header => {
      header.addEventListener('click', () => {
        const brandSection = header.closest('.brand-section');
        if (brandSection) {
          brandSection.classList.toggle('collapsed');
          // Update toggle icon
          const icon = header.querySelector('.brand-toggle-icon');
          if (icon) {
            icon.textContent = brandSection.classList.contains('collapsed') ? '▶' : '▼';
          }
        }
      });
    });

    // Boundary slider (interior view)
    setupSliderDrag();
    initQuiz();
    initHeatVision();
  }

  function openFilmPopup(target) {
    currentPopupTarget = target;
    if (elements.filmPopupOverlay) {
      elements.filmPopupOverlay.classList.add('active');
    }
    // Highlight currently selected film
    highlightSelectedFilm();
  }

  function closeFilmPopup() {
    if (elements.filmPopupOverlay) {
      elements.filmPopupOverlay.classList.remove('active');
    }
    currentPopupTarget = null;
  }

  // ===================================
  // Vehicle Popup Functions
  // ===================================
  function openVehiclePopup() {
    if (elements.vehiclePopupOverlay) {
      elements.vehiclePopupOverlay.classList.add('active');
    }
    // Highlight currently selected vehicle
    highlightSelectedVehicle();
  }

  function closeVehiclePopup() {
    if (elements.vehiclePopupOverlay) {
      elements.vehiclePopupOverlay.classList.remove('active');
    }
  }

  // ===================================
  // Pickup Variant Popup Functions
  // ===================================
  function openPickupVariantPopup() {
    if (elements.pickupVariantPopupOverlay) {
      elements.pickupVariantPopupOverlay.classList.add('active');
    }
    // Highlight currently selected pickup variant
    highlightSelectedPickupVariant();
  }

  function closePickupVariantPopup() {
    if (elements.pickupVariantPopupOverlay) {
      elements.pickupVariantPopupOverlay.classList.remove('active');
    }
  }

  function highlightSelectedPickupVariant() {
    document.querySelectorAll('.pickup-variant-option').forEach(option => {
      const variant = option.dataset.pickupVariant;
      const isSelected = variant === state.selectedVehicle ||
        (state.selectedVehicle === 'PICKUP' && variant === 'PICKUP-4DOOR');
      option.classList.toggle('selected', isSelected);
    });
  }

  function highlightSelectedVehicle() {
    document.querySelectorAll('.vehicle-option').forEach(option => {
      option.classList.toggle('selected', option.dataset.vehicle === state.selectedVehicle);
    });
  }

  function selectVehicle(vehicleType) {
    state.selectedVehicle = vehicleType;

    // Update hidden select for compatibility
    if (elements.vehicleSelect) {
      elements.vehicleSelect.value = vehicleType;
    }

    // Update button text
    if (elements.vehicleSelectText) {
      const displayNames = {
        'ECO/COMPACT': 'ECO / COMPACT',
        'SEDAN-M': 'SEDAN (M)',
        'SEDAN-L': 'SEDAN (L)',
        'PICKUP': 'PICK UP',
        'PICKUP-SINGLE': 'กระบะตอนเดียว',
        'PICKUP-CAB': 'กระบะแคป',
        'PICKUP-4DOOR': 'กระบะ 4 ประตู',
        'SUV': 'SUV',
        'PPV': 'PPV'
      };
      elements.vehicleSelectText.textContent = displayNames[vehicleType] || vehicleType;
    }

    // Update UI
    highlightSelectedVehicle();
    renderVehicle();
    updatePriceDisplay();
    updateInteriorPrices();

    // Close popup
    closeVehiclePopup();
  }

  function highlightSelectedFilm() {
    let selectedFilm = '';
    let selectedVariant = null;
    if (currentPopupTarget === 'front') {
      selectedFilm = state.frontFilm;
      selectedVariant = state.frontVariant;
    } else if (currentPopupTarget === 'surround') {
      selectedFilm = state.surroundFilm;
      selectedVariant = state.surroundVariant;
    } else if (currentPopupTarget === 'interior-left') {
      selectedFilm = state.interiorLeftFilm;
      selectedVariant = state.interiorLeftVariant;
    } else if (currentPopupTarget === 'interior-right') {
      selectedFilm = state.interiorRightFilm;
      selectedVariant = state.interiorRightVariant;
    }

    // Highlight regular film options
    document.querySelectorAll('.film-option').forEach(option => {
      option.classList.toggle('selected', option.dataset.film === selectedFilm);
    });

    // Highlight top no-film option
    const noFilmTopBtn = document.querySelector('.film-option-none-top');
    if (noFilmTopBtn) {
      noFilmTopBtn.classList.toggle('selected', selectedFilm === 'ไม่ติดฟิล์ม');
    }

    // Highlight variant buttons
    document.querySelectorAll('.variant-btn').forEach(btn => {
      const isSelected = btn.dataset.film === selectedFilm && btn.dataset.variant === selectedVariant;
      btn.classList.toggle('selected', isSelected);
    });

    // Highlight film group headers
    document.querySelectorAll('.film-option-header').forEach(header => {
      header.classList.toggle('selected', header.dataset.film === selectedFilm);
    });
  }

  function selectFilm(filmName, variant = null) {
    if (currentPopupTarget === 'front') {
      state.frontFilm = filmName;
      state.frontVariant = variant;
      renderVehicle();
      updateSpecTables();
      updatePriceDisplay();
    } else if (currentPopupTarget === 'surround') {
      state.surroundFilm = filmName;
      state.surroundVariant = variant;
      renderVehicle();
      updateSpecTables();
      updatePriceDisplay();
    } else if (currentPopupTarget === 'interior-left') {
      state.interiorLeftFilm = filmName;
      state.interiorLeftVariant = variant;
      updateTintOverlay();
      updateInteriorPrices();
    } else if (currentPopupTarget === 'interior-right') {
      state.interiorRightFilm = filmName;
      state.interiorRightVariant = variant;
      updateTintOverlay();
      updateInteriorPrices();
    }

    updateFilmButtonText();
    closeFilmPopup();
  }

  function switchTab(tabId) {
    state.currentTab = tabId;

    elements.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    elements.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
  }

  // ===================================
  // Vehicle Rendering (Image-Based)
  // ===================================

  // Helper to get film color (uses variant color if selected)
  function getFilmColor(filmName, variant) {
    const film = FILMS[filmName];
    if (!film) return 'transparent';

    // If variant is selected and film has variations, use variant color
    if (variant && film.variations && film.variations[variant]) {
      return film.variations[variant].color;
    }

    return film.color;
  }

  // Helper to get film VLT (uses variant VLT if selected)
  function getFilmVlt(filmName, variant) {
    const film = FILMS[filmName];
    if (!film) return 100;  // No film = 100% VLT (transparent)

    // If variant is selected and film has variations, use variant VLT
    if (variant && film.variations && film.variations[variant]) {
      return film.variations[variant].vlt;
    }

    return film.vlt;
  }

  function renderVehicle() {
    const vehicleType = state.selectedVehicle;
    const imagePath = VEHICLE_IMAGES[vehicleType];
    const windows = VEHICLE_WINDOWS[vehicleType];
    const frontFilm = FILMS[state.frontFilm];
    const surroundFilm = FILMS[state.surroundFilm];

    // Build HTML for car display
    let html = `
      <div class="vehicle-image-wrapper">
        <img 
          src="${imagePath}" 
          alt="${vehicleType}" 
          class="vehicle-image"
        >
        <div class="window-overlays">
    `;

    // Add front windshield tint overlay with clarity effect
    if (frontFilm && frontFilm.id !== 'none' && windows.front) {
      // Create exterior gradient (Lighter top, Darker bottom)
      const vlt = getFilmVlt(state.frontFilm, state.frontVariant);
      const baseColor = getFilmColor(state.frontFilm, state.frontVariant);
      const gradient = getExteriorGradient(baseColor, vlt);
      const clipPath = polygonToClipPath(windows.front);
      const clarityFilter = getClarityFilter(frontFilm.clarity);

      html += `
        <div class="window-tint front-tint" style="
          clip-path: ${clipPath};
          -webkit-clip-path: ${clipPath};
          background: ${gradient};
          opacity: 0.9;
          ${clarityFilter}
        "></div>
      `;
    }

    // Add side windows tint overlay with clarity effect
    if (surroundFilm && surroundFilm.id !== 'none' && windows.side) {
      const vlt = getFilmVlt(state.surroundFilm, state.surroundVariant);
      const baseColor = getFilmColor(state.surroundFilm, state.surroundVariant);
      const gradient = getExteriorGradient(baseColor, vlt);
      const clipPath = polygonToClipPath(windows.side);
      const clarityFilter = getClarityFilter(surroundFilm.clarity);

      html += `
        <div class="window-tint side-tint" style="
          clip-path: ${clipPath};
          -webkit-clip-path: ${clipPath};
          background: ${gradient};
          opacity: 0.9;
          ${clarityFilter}
        "></div>
      `;
    }

    // Add rear window tint overlay (uses surround film) with clarity effect
    if (surroundFilm && surroundFilm.id !== 'none' && windows.rear) {
      const vlt = getFilmVlt(state.surroundFilm, state.surroundVariant);
      const baseColor = getFilmColor(state.surroundFilm, state.surroundVariant);
      const gradient = getExteriorGradient(baseColor, vlt);
      const clipPath = polygonToClipPath(windows.rear);
      const clarityFilter = getClarityFilter(surroundFilm.clarity);

      html += `
        <div class="window-tint rear-tint" style="
          clip-path: ${clipPath};
          -webkit-clip-path: ${clipPath};
          background: ${gradient};
          opacity: 0.9;
          ${clarityFilter}
        "></div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    elements.carContainer.innerHTML = html;

    // Update Heat Vision if active
    if (typeof renderHeatWaves === 'function' && typeof isHeatVisionActive !== 'undefined' && isHeatVisionActive) {
      renderHeatWaves();
    }
  }

  // Convert polygon points to CSS clip-path
  function polygonToClipPath(points) {
    const pathString = points.map(p => `${p[0]}% ${p[1]}%`).join(', ');
    return `polygon(${pathString})`;
  }

  // Get clarity-based visual effect for window tint
  // Higher clarity (4) = cleaner, more transparent look
  // Lower clarity (1) = more saturated, hazy appearance
  function getClarityFilter(clarity) {
    if (!clarity || clarity <= 0) return '';

    // Clarity 1 (Metallic) = more saturated, slight haze
    // Clarity 4 (Sputtering) = clean, minimal distortion
    const filters = {
      1: 'filter: saturate(1.3) contrast(0.95);',  // Metallic - more saturation, slight haze
      2: 'filter: saturate(1.15) contrast(0.98);', // Nano Ceramic
      3: 'filter: saturate(1.05) contrast(1.0);',  // IR Nano Ceramic
      4: 'filter: saturate(1.0) contrast(1.02);'   // Sputtering - cleanest look
    };

    return filters[clarity] || '';
  }

  // Update price display
  function updatePriceDisplay() {
    const frontFilm = FILMS[state.frontFilm];
    const surroundFilm = FILMS[state.surroundFilm];
    const sizeIndex = VEHICLE_SIZE_MAP[state.selectedVehicle] || 0;

    let frontPrice = 0;
    let surroundPrice = 0;
    let totalPrice = 0;
    let discount = 0;
    let isSameSeries = false;

    // Get individual prices first
    frontPrice = frontFilm ? (frontFilm.priceFront[sizeIndex] || 0) : 0;
    surroundPrice = surroundFilm ? (surroundFilm.priceSidesRear[sizeIndex] || 0) : 0;
    const regularTotal = frontPrice + surroundPrice;

    // Check if same series for special pricing logic
    if (frontFilm && surroundFilm &&
      frontFilm.id !== 'none' && surroundFilm.id !== 'none' &&
      frontFilm.id === surroundFilm.id) {
      isSameSeries = true;
      // If same series, use the all round price for total
      const allRoundPrice = frontFilm.priceAllRound[sizeIndex] || 0;

      // Calculate discount if the all-round price is actually cheaper
      if (allRoundPrice < regularTotal) {
        discount = regularTotal - allRoundPrice;
        totalPrice = allRoundPrice;
      } else {
        totalPrice = regularTotal;
      }
    } else {
      totalPrice = regularTotal;
    }

    // Update price display elements if they exist
    const priceContainer = document.getElementById('price-display');
    if (priceContainer) {
      let html = `
        <div class="price-item">
          <div class="price-header">ฟิล์มกระจกหน้า</div>
          <div class="price-detail">
            <span class="film-name">${state.frontFilm}</span>
            <span class="film-price">${formatPrice(frontPrice)} บาท</span>
          </div>
        </div>
        
        <div class="price-item">
          <div class="price-header">ฟิล์มรอบคัน</div>
          <div class="price-detail">
            <span class="film-name">${state.surroundFilm}</span>
            <span class="film-price">${formatPrice(surroundPrice)} บาท</span>
          </div>
        </div>
      `;

      // Append discount row if applicable
      if (discount > 0) {
        html += `
          <div class="price-discount">
             <span class="discount-label">✨ ส่วนลดพิเศษ (ติดตั้งรอบคัน)</span>
             <span class="discount-value">-${formatPrice(discount)} บาท</span>
          </div>
        `;
      }

      html += `
        <div class="price-total">
          <span class="total-label">รวมราคาประมาณ</span>
          <span class="total-value">${formatPrice(totalPrice)} บาท</span>
        </div>
      `;

      priceContainer.innerHTML = html;
    }
  }


  // ===================================
  // Spec Tables
  // ===================================
  function updateSpecTables() {
    updateFrontSpecTable();
    updateSurroundSpecTable();
  }

  function updateFrontSpecTable() {
    const film = FILMS[state.frontFilm];
    const variantName = state.frontVariant ? ` (${state.frontVariant})` : '';
    const titleText = `ข้อมูลฟิล์มกระจกหน้า ${state.frontFilm}${variantName}`;
    const tableHtml = generateSpecTableRows(film, state.frontVariant);

    // Update desktop table
    if (elements.frontFilmTitle) elements.frontFilmTitle.textContent = titleText;
    if (elements.frontSpecTable) elements.frontSpecTable.innerHTML = tableHtml;

    // Update mobile table
    if (elements.frontFilmTitleMobile) elements.frontFilmTitleMobile.textContent = titleText;
    if (elements.frontSpecTableMobile) elements.frontSpecTableMobile.innerHTML = tableHtml;
  }

  function updateSurroundSpecTable() {
    const film = FILMS[state.surroundFilm];
    const variantName = state.surroundVariant ? ` (${state.surroundVariant})` : '';
    const titleText = `ข้อมูลฟิล์มรอบคัน ${state.surroundFilm}${variantName}`;
    const tableHtml = generateSpecTableRows(film, state.surroundVariant);

    // Update desktop table
    if (elements.surroundFilmTitle) elements.surroundFilmTitle.textContent = titleText;
    if (elements.surroundSpecTable) elements.surroundSpecTable.innerHTML = tableHtml;

    // Update mobile table
    if (elements.surroundFilmTitleMobile) elements.surroundFilmTitleMobile.textContent = titleText;
    if (elements.surroundSpecTableMobile) elements.surroundSpecTableMobile.innerHTML = tableHtml;
  }

  function updateInteriorSpecTable() {
    const film = FILMS[state.interiorFilm];
    elements.interiorFilmTitle.textContent = `ข้อมูลฟิล์ม ${state.interiorFilm}`;
    elements.interiorSpecTable.innerHTML = generateSpecTableRows(film, null);
  }

  /**
   * Generate spec table rows - uses variant-specific data when available
   * @param {Object} film - The film object from FILMS
   * @param {string|null} variant - The selected variant key (e.g., "Blue", "L05")
   */
  function generateSpecTableRows(film, variant) {
    if (!film || film.id === 'none') {
      return `<tr><td colspan="2" style="text-align:center;padding:1rem;">ไม่ได้เลือกฟิล์ม</td></tr>`;
    }

    // Get variant-specific data if a variant is selected
    let specs = {
      heatRejection: film.heatRejection,
      vlt: film.vlt,
      irRejection: film.irRejection,
      uvRejection: film.uvRejection,
      glareReduction: film.glareReduction,
      digitalBoost: film.digitalBoost,
      clarity: film.clarity
    };

    // Override with variant-specific values if available
    if (variant && film.variations && film.variations[variant]) {
      const v = film.variations[variant];
      if (v.heatRejection !== undefined) specs.heatRejection = v.heatRejection;
      if (v.vlt !== undefined) specs.vlt = v.vlt;
      if (v.irRejection !== undefined) specs.irRejection = v.irRejection;
      if (v.uvRejection !== undefined) specs.uvRejection = v.uvRejection;
      if (v.glareReduction !== undefined) specs.glareReduction = v.glareReduction;
      if (v.digitalBoost !== undefined) specs.digitalBoost = v.digitalBoost;
      if (v.clarity !== undefined) specs.clarity = v.clarity;
    }

    return `
      <tr>
        <td>การตัดความร้อนจากแสงแดด</td>
        <td>${specs.heatRejection}%</td>
      </tr>
      <tr>
        <td>แสงส่องผ่าน</td>
        <td>${specs.vlt}%</td>
      </tr>
      <tr>
        <td>การตัดความร้อนจากสเปกตรัมอินฟราเรด</td>
        <td>${specs.irRejection}%</td>
      </tr>
      <tr>
        <td>การตัดรังสี UV</td>
        <td>${specs.uvRejection}%</td>
      </tr>
      <tr>
        <td>การสะท้อนแสง</td>
        <td>${specs.glareReduction}%</td>
      </tr>
      <tr>
        <td>% รองรับสัญญาณ Digital Boost</td>
        <td>${specs.digitalBoost}%</td>
      </tr>
      <tr>
        <td>ความใสของฟิล์ม</td>
        <td>${CLARITY_LABELS[specs.clarity] || 'N/A'}</td>
      </tr>
    `;
  }

  // ===================================
  // Interior View - Two Sided Tint Overlay
  // ===================================
  function updateTintOverlay() {
    // Left side
    const leftFilm = FILMS[state.interiorLeftFilm];
    const tintLeft = elements.tintOverlayLeft;

    if (leftFilm && leftFilm.id !== 'none' && tintLeft) {
      // Use VLT from selected variant
      const vlt = getFilmVlt(state.interiorLeftFilm, state.interiorLeftVariant);
      tintLeft.style.background = getFilmColor(state.interiorLeftFilm, state.interiorLeftVariant);
      tintLeft.style.opacity = 0.95;
      const clarityFilter = getClarityFilter(leftFilm.clarity);
      if (clarityFilter) {
        tintLeft.style.filter = clarityFilter.replace('filter: ', '').replace(';', '');
      }
    } else if (tintLeft) {
      tintLeft.style.opacity = 0;
    }

    // Right side
    const rightFilm = FILMS[state.interiorRightFilm];
    const tintRight = elements.tintOverlayRight;

    if (rightFilm && rightFilm.id !== 'none' && tintRight) {
      // Use VLT from selected variant
      const vlt = getFilmVlt(state.interiorRightFilm, state.interiorRightVariant);
      tintRight.style.background = getFilmColor(state.interiorRightFilm, state.interiorRightVariant);
      tintRight.style.opacity = 0.95;
      const clarityFilter = getClarityFilter(rightFilm.clarity);
      if (clarityFilter) {
        tintRight.style.filter = clarityFilter.replace('filter: ', '').replace(';', '');
      }
    } else if (tintRight) {
      tintRight.style.opacity = 0;
    }

    // Update labels with variant info
    if (elements.tintLabelLeft) {
      let leftText = state.interiorLeftFilm === 'ไม่ติดฟิล์ม' ? 'ไม่ติดฟิล์ม' : state.interiorLeftFilm;
      if (state.interiorLeftVariant) leftText += ` (${state.interiorLeftVariant})`;
      elements.tintLabelLeft.textContent = leftText;
    }
    if (elements.tintLabelRight) {
      let rightText = state.interiorRightFilm === 'ไม่ติดฟิล์ม' ? 'ไม่ติดฟิล์ม' : state.interiorRightFilm;
      if (state.interiorRightVariant) rightText += ` (${state.interiorRightVariant})`;
      elements.tintLabelRight.textContent = rightText;
    }

    updateInteriorPrices();
  }

  function updateInteriorPrices() {
    const sizeIndex = VEHICLE_SIZE_MAP[state.selectedVehicle] || 0;

    // Left side price
    const leftFilm = FILMS[state.interiorLeftFilm];
    const leftPrice = leftFilm ? (leftFilm.priceFront[sizeIndex] || 0) : 0;
    if (elements.interiorLeftPrice) {
      elements.interiorLeftPrice.innerHTML = leftPrice > 0
        ? `<span class="price-label">ราคากระจกหน้า:</span> <span class="price-value">${formatPrice(leftPrice)} บาท</span>`
        : '<span class="price-label">ไม่มีราคา</span>';
    }

    // Right side price
    const rightFilm = FILMS[state.interiorRightFilm];
    const rightPrice = rightFilm ? (rightFilm.priceFront[sizeIndex] || 0) : 0;
    if (elements.interiorRightPrice) {
      elements.interiorRightPrice.innerHTML = rightPrice > 0
        ? `<span class="price-label">ราคากระจกหน้า:</span> <span class="price-value">${formatPrice(rightPrice)} บาท</span>`
        : '<span class="price-label">ไม่มีราคา</span>';
    }
  }

  // ===================================
  // Slider Drag Logic
  // ===================================
  function setupSliderDrag() {
    const slider = elements.boundarySlider;
    const handle = elements.sliderHandle;
    const container = document.getElementById('interior-container');
    const overlayLeft = elements.tintOverlayLeft;
    const overlayRight = elements.tintOverlayRight;

    if (!slider || !handle) return;

    let isDragging = false;

    function startDrag(e) {
      isDragging = true;
      e.preventDefault();
      document.body.style.cursor = 'ew-resize';
    }

    function stopDrag() {
      isDragging = false;
      document.body.style.cursor = '';
    }

    function doDrag(e) {
      if (!isDragging) return;

      const rect = container.getBoundingClientRect();
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      let x = clientX - rect.left;

      // Clamp to container bounds
      x = Math.max(50, Math.min(rect.width - 50, x));

      const percentage = (x / rect.width) * 100;
      state.tintBoundaryPosition = percentage;

      // Update slider position
      slider.style.left = `${percentage}%`;

      // Update overlay widths - left takes percentage, right takes remainder
      if (overlayLeft) {
        overlayLeft.style.width = `${percentage}%`;
      }
      if (overlayRight) {
        overlayRight.style.left = `${percentage}%`;
        overlayRight.style.width = `${100 - percentage}%`;
      }
    }

    // Mouse events
    handle.addEventListener('mousedown', startDrag);
    slider.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);

    // Touch events
    handle.addEventListener('touchstart', startDrag, { passive: false });
    slider.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', doDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
  }

  // ===================================
  // Color Helpers for Realism
  // ===================================

  // Create a realistic exterior glass gradient
  function getExteriorGradient(hexColor, vlt) {
    // 1. Convert user's calibrated color (Interior View) to HSL
    const hsl = hexToHsl(hexColor);

    // 2. Darken significantly for exterior look
    // Base lightness for exterior should be much lower (glass absorbs light)
    // For VLT 5%, max lightness ~10%. For VLT 60%, max lightness ~30%
    const exteriorLightness = Math.max(5, Math.min(30, vlt * 0.5));

    // 3. Create Gradient: Lighter Top (Sky Reflection) -> Darker Bottom (Ground)
    // Reduce saturation slightly for exterior realism
    const s = Math.max(0, hsl.s * 0.7);

    // Top Color (Sky Reflection): Slightly lighter, bluer shift
    const topL = Math.min(100, exteriorLightness + 15);
    const topColor = hslToHex(hsl.h, s, topL);

    // Bottom Color (Ground/Interior): Darker
    const botL = Math.max(0, exteriorLightness - 5);
    const botColor = hslToHex(hsl.h, s, botL);

    return `linear-gradient(180deg, ${topColor} 0%, ${botColor} 100%)`;
  }

  // Helper: Hex to HSL object
  function hexToHsl(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('#')) hex = hex.slice(1);

    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    }

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  // Helper: HSL to Hex string
  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  // ===================================
  // Smart Recommendation Quiz (Advanced)
  // ===================================
  function initQuiz() {
    const modal = document.getElementById('quiz-modal');
    const startBtn = document.getElementById('recommend-btn');
    const closeBtn = document.querySelector('.close-quiz');
    const options = document.querySelectorAll('.quiz-option');
    const backBtns = document.querySelectorAll('.quiz-back-btn');

    if (startBtn) startBtn.addEventListener('click', openQuiz);
    if (closeBtn) closeBtn.addEventListener('click', closeQuiz);

    // Back buttons
    backBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const step = parseInt(e.target.dataset.back);
        switchQuizStep(step);
      });
    });

    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        const value = opt.dataset.value;
        const currentStepEl = opt.closest('.quiz-step');

        // Safety check if element found
        if (!currentStepEl) return;

        const currentStepId = currentStepEl.id;
        const stepNum = parseInt(currentStepId.replace('quiz-step-', ''));

        handleQuizOption(stepNum, value);
      });
    });

    // Close on outside click
    window.addEventListener('click', (e) => {
      if (e.target === modal) closeQuiz();
    });
  }

  let quizState = {
    driving: null,      // day, night, mix
    vision: null,       // normal, concerned
    connectivity: null, // critical, normal
    style: null,        // black, reflective, soft
    budget: null        // budget, standard, high, premium
  };

  function openQuiz() {
    const modal = document.getElementById('quiz-modal');
    if (modal) {
      modal.style.display = 'flex';
      switchQuizStep(1);
      // Reset state
      quizState = { driving: null, vision: null, connectivity: null, style: null, budget: null };
    }
  }

  function closeQuiz() {
    const modal = document.getElementById('quiz-modal');
    if (modal) modal.style.display = 'none';
  }

  function switchQuizStep(step) {
    document.querySelectorAll('.quiz-step').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`quiz-step-${step}`);
    if (target) target.classList.add('active');
  }

  function handleQuizOption(step, value) {
    // Save state
    switch (step) {
      case 1: quizState.driving = value; break;
      case 2: quizState.vision = value; break;
      case 3: quizState.connectivity = value; break;
      case 4: quizState.style = value; break;
      case 5: quizState.budget = value; break;
    }

    // Navigation
    if (step < 5) {
      switchQuizStep(step + 1);
    } else {
      // Final step -> Calculate
      calculateAdvancedRecommendation();
      closeQuiz();
    }
  }

  function calculateAdvancedRecommendation() {
    const { driving, vision, connectivity, style, budget } = quizState;
    console.log("Quiz Results:", quizState);

    // 1. Filter viable films based on Hard Constraints
    let viableFilms = Object.keys(FILMS).filter(key => {
      const f = FILMS[key];
      return f.id !== 'none' && f.brand !== 'FINNIX' && f.brand !== '3M';
    });

    // Constraint: Connectivity (Digital Boost)
    if (connectivity === 'critical') {
      viableFilms = viableFilms.filter(key => FILMS[key].digitalBoost >= 90);
    }

    // Constraint: Vision (Concerned) -> Filter out very hazy films or extremely dark front
    if (vision === 'concerned') {
      viableFilms = viableFilms.filter(key => FILMS[key].clarity >= 3);
    }

    // Constraint: Budget (Price All Round - Avg Size M/L index 1-2)
    // Indexes: 1=Sedan M, 2=Sedan L
    const getPrice = (name) => {
      const p = FILMS[name].priceAllRound;
      return (p[1] + p[2]) / 2;
    };

    viableFilms = viableFilms.filter(key => {
      const p = getPrice(key);
      if (budget === 'budget') return p <= 5000;
      if (budget === 'standard') return p > 4000 && p <= 9000;
      if (budget === 'high') return p > 8000 && p <= 16000;
      if (budget === 'premium') return p > 15000;
      return true;
    });

    // If filtering removed everything, fallback to budget-appropriate list
    if (viableFilms.length === 0) {
      console.warn("Filters too strict, resetting constraints.");
      viableFilms = Object.keys(FILMS).filter(key => {
        const f = FILMS[key];
        return f.id !== 'none' && f.brand !== 'FINNIX' && f.brand !== '3M';
      });
      // Re-apply only budget
      viableFilms = viableFilms.filter(key => {
        const p = getPrice(key);
        if (budget === 'budget') return p <= 5000;
        if (budget === 'standard') return p <= 9000;
        if (budget === 'high') return p > 8000;
        if (budget === 'premium') return p > 12000;
        return true;
      });
    }

    // 2. Score Calculation
    let scores = viableFilms.map(filmName => {
      let score = 0;
      const film = FILMS[filmName];
      const price = getPrice(filmName);

      // Budget Priority (Ensure Premium films win Premium budget)
      if (budget === 'premium') {
        if (price > 15000) score += 50; // Massive boost for actual premium films
        else if (price < 10000) score -= 20; // Penalty for cheap films in premium category
      } else if (budget === 'high') {
        if (price >= 8000 && price <= 16000) score += 20;
      }

      // Heat Priority
      if (driving === 'day') {
        score += film.heatRejection * 0.5; // High weight on heat
      } else if (driving === 'mix') {
        score += film.heatRejection * 0.3;
      }

      // Clarity Priority (Night)
      if (driving === 'night') {
        if (film.clarity >= 4) score += 30;
        else if (film.clarity === 3) score += 15;
        score -= (film.glareReduction * 0.5); // Penalty for high reflection at night
      }

      // Vision Concern
      if (vision === 'concerned') {
        if (film.clarity >= 4) score += 40; // Huge bonus for sputtering
        if (film.clarity <= 2) score -= 20; // Penalty for standard ceramic/metallic
      }

      // Aesthetics
      if (style === 'black') {
        // Prefer consistent black color (low VLR, neutral tone)
        if (film.glareReduction < 15 && film.color === '#1a1a1a') score += 20;
        if (film.type === 'Metallic') score -= 10;
      } else if (style === 'reflective') {
        // Prefer Metallic or high glare reduction
        if (film.type === 'Metallic' || film.glareReduction > 15) score += 25;
      } else if (style === 'soft') {
        // Prefer lighter tones or Digital Ceramatrix style
        if (film.id === 'digital-ceramatrix' || film.id === 'executive-boost') score += 20;
      }

      return { name: filmName, score: score };
    });

    // Sort by score
    scores.sort((a, b) => b.score - a.score);
    const winner = scores[0].name;

    console.log("Winner:", winner, scores);

    // 3. Select Variants based on needs
    let frontVar = null, surroundVar = null;
    const winFilm = FILMS[winner];
    const vars = winFilm.variations ? Object.keys(winFilm.variations) : [];

    // Helper to find variant closest to target VLT
    const findVar = (targetVlt) => {
      if (!winFilm.variations) return null;
      let best = null, minDiff = 100;
      for (let k in winFilm.variations) {
        let diff = Math.abs(winFilm.variations[k].vlt - targetVlt);
        if (diff < minDiff) {
          minDiff = diff;
          best = k;
        }
      }
      return best;
    };

    // Determine target VLTs
    let targetFront = 40; // Safe default
    let targetSurround = 15; // Dark default

    if (driving === 'night' || vision === 'concerned') {
      targetFront = 60; // Aim for LIGHTER front (50-60%) for max clarity
      targetSurround = 20; // Aim for DARKER surround (15-25%)
    } else if (style === 'black' || driving === 'day') {
      targetFront = 35; // Standard Front
      targetSurround = 5; // Darkest Surround
    } else if (driving === 'mix') {
      targetFront = 40;
      targetSurround = 15;
    }

    if (style === 'soft') {
      targetFront = 50;
      targetSurround = 30;
    }

    // 1. Select Front Variant first (Independent)
    const findClosest = (target, pool) => {
      let best = null, minDiff = 100;
      pool.forEach(k => {
        let diff = Math.abs(winFilm.variations[k].vlt - target);
        if (diff < minDiff) {
          minDiff = diff;
          best = k;
        }
      });
      return best;
    };

    const allVars = Object.keys(winFilm.variations);
    frontVar = findClosest(targetFront, allVars);

    // 2. Select Surround Variant (Dependent: Must be darker)
    if (frontVar) {
      const frontVlt = winFilm.variations[frontVar].vlt;

      // Filter for variants strictly darker (Lower VLT)
      const darkerVars = allVars.filter(k => winFilm.variations[k].vlt < frontVlt);

      if (darkerVars.length > 0) {
        // Pick closest to targetSurround from darker options
        surroundVar = findClosest(targetSurround, darkerVars);
      } else {
        // If Front is already the darkest option, forced to use same
        surroundVar = frontVar;
      }
    } else {
      // Fallback if something fails
      frontVar = allVars[0];
      surroundVar = allVars[0];
    }

    applyRecommendation(winner, frontVar, winner, surroundVar);

    // Show Feedback Message (Simple alert or custom modal could go here)
    // alert(`แนะนำฟิล์ม: ${winner}\nรุ่นที่เหมาะกับคุณที่สุด!`);
  }

  function applyRecommendation(front, frontVar, surround, surroundVar) {
    state.frontFilm = front;
    state.frontVariant = frontVar;
    state.surroundFilm = surround;
    state.surroundVariant = surroundVar;
    state.interiorLeftFilm = front;
    state.interiorLeftVariant = frontVar;
    state.interiorRightFilm = surround;
    state.interiorRightVariant = surroundVar;

    renderVehicle();
    updateSpecTables();
    updatePriceDisplay();
    updateTintOverlay();

    updateFilmButtonText();
  }

  // ===================================
  // Heat Vision Visualizer
  // ===================================

  let isHeatVisionActive = false;

  function initHeatVision() {
    const btn = document.getElementById('heat-vision-btn');
    if (btn) {
      btn.addEventListener('click', toggleHeatVision);
    }

    // Create SVG defs for gradients if not exists
    if (!document.getElementById('heat-defs')) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "heat-defs";
      svg.style.position = 'absolute';
      svg.style.width = '0';
      svg.style.height = '0';
      svg.innerHTML = `
        <defs>
          <linearGradient id="grad-heat-in" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#ff4d4d;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ffaa00;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="grad-heat-reflect" x1="0%" y1="0%" x2="0%" y2="100%">
             <stop offset="0%" style="stop-color:#ffaa00;stop-opacity:1" />
             <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
          </linearGradient>
          <linearGradient id="grad-heat-pass" x1="0%" y1="0%" x2="0%" y2="100%">
             <stop offset="0%" style="stop-color:#ff0000;stop-opacity:0.5" />
             <stop offset="100%" style="stop-color:#550000;stop-opacity:0" />
          </linearGradient>
        </defs>
      `;
      document.body.appendChild(svg);
    }
  }

  function toggleHeatVision() {
    isHeatVisionActive = !isHeatVisionActive;

    const btn = document.getElementById('heat-vision-btn');
    const overlay = document.getElementById('heat-vision-overlay');
    const carContainer = document.querySelector('.car-container'); // Use querySelector to be safe or elements.carContainer if available scope

    if (isHeatVisionActive) {
      if (btn) btn.classList.add('active');
      if (overlay) overlay.classList.add('active');
      if (carContainer) carContainer.classList.add('heat-active');
      renderHeatWaves();
    } else {
      if (btn) btn.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      if (carContainer) carContainer.classList.remove('heat-active');

      const raysOuter = document.getElementById('rays-outer');
      const raysInner = document.getElementById('rays-inner');
      const valDisplay = document.getElementById('heat-value-display');

      if (raysOuter) raysOuter.innerHTML = '';
      if (raysInner) raysInner.innerHTML = '';
      if (valDisplay) valDisplay.textContent = '0%';
    }
  }

  function renderHeatWaves() {
    if (!isHeatVisionActive) return;

    const raysOuter = document.getElementById('rays-outer');
    const raysInner = document.getElementById('rays-inner');
    const badge = document.getElementById('heat-stats');

    if (!raysOuter || !raysInner) return;

    // Clear previous
    raysOuter.innerHTML = '';
    raysInner.innerHTML = '';

    // Calculate stats
    const stats = calculateStats();

    // Update Stats Display
    updateHeatStatsDisplay(stats);

    // Generate Rays
    // Use elements.carContainer dimension
    const container = elements.carContainer;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 400;

    const rayCount = 15; // Base rays

    // SVG strings
    let outerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="position: absolute; top:0; left:0;">`;
    let innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="position: absolute; top:0; left:0;">`;

    // Use IR Rejection for visual simulation of ray bounce
    const visualRejection = stats.irRejection || 0;

    for (let i = 0; i < rayCount; i++) {
      const x = (width / rayCount) * i + (Math.random() * 20); // Distributed across width
      const startY = -50; // Above screen
      const hitY = height * 0.45 + (Math.random() * 40 - 20); // Impact zone (windshield area approx)

      // Incoming Ray (Outer)
      outerHTML += `<path class="heat-ray-path ray-incoming" d="M${x},${startY} L${x},${hitY}" style="animation-duration: ${1 + Math.random()}s; animation-delay: -${Math.random()}s" />`;

      // Reflection Logic
      if (Math.random() * 100 < visualRejection) {
        // Bounce off (Outer)
        const destX = x + (Math.random() * 100 - 50); // Bounce left/right randomly
        const destY = startY; // Back up
        // Q defines a quadratic bezier curve
        outerHTML += `<path class="heat-ray-path ray-reflected" d="M${x},${hitY} Q${x},${hitY - 50} ${destX},${destY}" style="animation-duration: ${1.5 + Math.random()}s" />`;
      } else {
        // Transmission (Inner - passes through)
        const endY = height + 50;
        // Ray continues down
        innerHTML += `<path class="heat-ray-path ray-transmitted" d="M${x},${hitY} L${x + (Math.random() * 40 - 20)},${endY}" style="animation-duration: ${2 + Math.random()}s" />`;
      }
    }

    outerHTML += '</svg>';
    innerHTML += '</svg>';

    raysOuter.innerHTML = outerHTML;
    raysInner.innerHTML = innerHTML;
  }

  function calculateStats() {
    let totalIR = 0, totalUV = 0, totalVLT = 0, totalHeat = 0;
    let count = 0;

    const getStat = (filmName, variant, prop) => {
      const film = FILMS[filmName];
      if (!film) return 0;
      if (variant && film.variations && film.variations[variant]) return film.variations[variant][prop] || film[prop] || 0;
      return film[prop] || 0;
    };

    const addFilm = (filmName, variant) => {
      if (filmName && filmName !== 'ไม่ติดฟิล์ม') {
        totalIR += getStat(filmName, variant, 'irRejection');
        totalUV += getStat(filmName, variant, 'uvRejection');
        totalVLT += getStat(filmName, variant, 'vlt');
        totalHeat += getStat(filmName, variant, 'heatRejection');
        count++;
      }
    };

    // Calculate based on active films (Front + Surround or Interior L/R)
    if (state.currentTab === 'exterior') {
      addFilm(state.frontFilm, state.frontVariant);
      addFilm(state.surroundFilm, state.surroundVariant);
    } else {
      addFilm(state.interiorLeftFilm, state.interiorLeftVariant);
      addFilm(state.interiorRightFilm, state.interiorRightVariant);
    }

    if (count === 0) return { irRejection: 0, uvRejection: 0, vlt: 100, heatRejection: 0 };

    return {
      irRejection: Math.round(totalIR / count),
      uvRejection: Math.round(totalUV / count * 10) / 10,
      vlt: Math.round(totalVLT / count),
      heatRejection: Math.round(totalHeat / count)
    };
  }

  function updateHeatStatsDisplay(stats) {
    const badge = document.getElementById('heat-stats');
    if (!badge) return;

    // Update badge HTML with translated labels
    badge.innerHTML = `
        <div class="heat-stat-row main-stat">
            <span class="heat-label">ลดความร้อนรวม</span>
            <span class="heat-value">${stats.heatRejection}%</span>
        </div>
        <div class="heat-stat-divider"></div>
        <div class="heat-stat-grid">
            <div class="heat-stat-item">
                <span class="heat-label-sm">กัน UV</span>
                <span class="heat-value-sm">${stats.uvRejection}%</span>
            </div>
            <div class="heat-stat-item">
                <span class="heat-label-sm">กัน IR</span>
                <span class="heat-value-sm">${stats.irRejection}%</span>
            </div>
            <div class="heat-stat-item">
                <span class="heat-label-sm">แสงผ่าน</span>
                <span class="heat-value-sm">${stats.vlt}%</span>
            </div>
        </div>
      `;
  }

  // ===================================
  // Initialize App
  // ===================================
  document.addEventListener('DOMContentLoaded', init);

})();
