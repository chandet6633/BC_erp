// Film product specifications database
// Rebuilt for SATHON 4 new series

const CLARITY_LABELS = {
  1: "Metallic",
  2: "Nano Ceramic",
  3: "IR Nano Ceramic",
  4: "Sputtering Nano Ceramic"
};

const VEHICLE_SIZE_MAP = {
  'ECO/COMPACT': 0,
  'SEDAN-M': 1,
  'SEDAN-L': 2,
  'PICKUP': 5,
  'PICKUP-SINGLE': 3,
  'PICKUP-CAB': 4,
  'PICKUP-4DOOR': 5,
  'SUV': 6,
  'PPV': 7
};

const FILMS = {
  "ไม่ติดฟิล์ม": {
    id: "none",
    brand: "",
    type: "",
    vlt: 100,
    heatRejection: 0,
    uvRejection: 0,
    irRejection: 0,
    glareReduction: 0,
    digitalBoost: 0,
    clarity: 0,
    color: "transparent",
    priceAllRound: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    priceFront: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    priceSidesRear: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  "CERAMIC CRYSTAL CX-95": {
    id: "glassify-ultimate",
    brand: "GLASSIFY",
    type: "Sputter Nano Ceramic",
    vlt: 10,
    heatRejection: 95.5,
    uvRejection: 99,
    irRejection: 99,
    glareReduction: 10,
    digitalBoost: 99,
    clarity: 4,
    color: "#22252a",
    priceAllRound: [12500, 14000, 15500, 9500, 9500, 11000, 15500, 15500, 18000, 19500],
    priceFront: [5000, 5500, 6000, 4500, 4500, 4500, 6000, 4500, 7000, 7000],
    priceSidesRear: [9000, 10000, 11000, 6500, 6500, 8000, 11000, 13000, 14000, 15000],
    variations: {
      "60": { vlt: 60, heatRejection: 82.5, uvRejection: 99, irRejection: 99, glareReduction: 3, color: "#a5b4be" },
      "40": { vlt: 38, heatRejection: 86.8, uvRejection: 99, irRejection: 99, glareReduction: 6, color: "#616d76" },
      "15": { vlt: 18, heatRejection: 92.5, uvRejection: 99, irRejection: 99, glareReduction: 8, color: "#383f45" },
      "05": { vlt: 8, heatRejection: 95.5, uvRejection: 99, irRejection: 99, glareReduction: 10, color: "#22252a" }
    }
  },
  "CERAMIC QUARTZ CQ-95": {
    id: "glassify-prime",
    brand: "GLASSIFY",
    type: "High-IR Nano Ceramic",
    vlt: 8,
    heatRejection: 96,
    uvRejection: 100,
    irRejection: 99,
    glareReduction: 9,
    digitalBoost: 99,
    clarity: 3,
    color: "#1e1e1e",
    priceAllRound: [10500, 12000, 13000, 8000, 8000, 9500, 13000, 13000, 15500, 16500],
    priceFront: [4200, 4500, 5200, 3800, 3800, 3800, 5200, 3800, 6000, 6000],
    priceSidesRear: [7800, 8500, 9200, 5500, 5500, 6800, 9200, 11000, 12500, 13000],
    variations: {
      "50": { vlt: 48, heatRejection: 85, uvRejection: 100, irRejection: 99, glareReduction: 4, color: "#8b8b8b" },
      "35": { vlt: 32, heatRejection: 89, uvRejection: 100, irRejection: 99, glareReduction: 6, color: "#545454" },
      "15": { vlt: 15, heatRejection: 93, uvRejection: 100, irRejection: 99, glareReduction: 8, color: "#2d2d2d" },
      "05": { vlt: 8, heatRejection: 96, uvRejection: 100, irRejection: 99, glareReduction: 9, color: "#1e1e1e" }
    }
  },
  "CERAMIC CM-80": {
    id: "glassify-ceramic",
    brand: "GLASSIFY",
    type: "Premium Nano Ceramic",
    vlt: 5,
    heatRejection: 92,
    uvRejection: 99,
    irRejection: 93,
    glareReduction: 8,
    digitalBoost: 99,
    clarity: 2,
    color: "#181a1b",
    priceAllRound: [8500, 9500, 10500, 6500, 6500, 7500, 10500, 10500, 13000, 14000],
    priceFront: [3500, 3800, 4200, 3000, 3000, 3000, 4200, 3000, 5000, 5000],
    priceSidesRear: [6000, 7000, 7500, 4200, 4200, 5200, 7500, 9000, 10000, 10500],
    variations: {
      "60": { vlt: 58, heatRejection: 75, uvRejection: 99, irRejection: 93, glareReduction: 3, color: "#a2b0b5" },
      "40": { vlt: 38, heatRejection: 82, uvRejection: 99, irRejection: 93, glareReduction: 5, color: "#5d676b" },
      "20": { vlt: 20, heatRejection: 88, uvRejection: 99, irRejection: 93, glareReduction: 7, color: "#323739" },
      "05": { vlt: 5, heatRejection: 92, uvRejection: 99, irRejection: 93, glareReduction: 8, color: "#181a1b" }
    }
  },
  "CARBON CC-60": {
    id: "glassify-carbon",
    brand: "GLASSIFY",
    type: "2-Ply Ceramic Carbon",
    vlt: 4,
    heatRejection: 59,
    uvRejection: 89,
    irRejection: 43,
    glareReduction: 8,
    digitalBoost: 80,
    clarity: 1,
    color: "#202020",
    priceAllRound: [4800, 5500, 6000, 3200, 3200, 4000, 6000, 6000, 8000, 8500],
    priceFront: [1800, 2000, 2200, 1500, 1500, 1500, 2200, 1500, 3000, 3000],
    priceSidesRear: [3500, 4000, 4500, 2200, 2200, 3000, 4500, 5000, 6000, 6500],
    variations: {
      "40": { vlt: 35, heatRejection: 45, uvRejection: 80, irRejection: 38, glareReduction: 5, color: "#6a6a6a" },
      "20": { vlt: 18, heatRejection: 52, uvRejection: 85, irRejection: 41, glareReduction: 6, color: "#424242" },
      "05": { vlt: 4, heatRejection: 59, uvRejection: 89, irRejection: 43, glareReduction: 8, color: "#202020" }
    }
  }
};

const FRONT_FILMS = ["ไม่ติดฟิล์ม", "CERAMIC CRYSTAL CX-95", "CERAMIC QUARTZ CQ-95", "CERAMIC CM-80", "CARBON CC-60"];
const SURROUND_FILMS = ["ไม่ติดฟิล์ม", "CERAMIC CRYSTAL CX-95", "CERAMIC QUARTZ CQ-95", "CERAMIC CM-80", "CARBON CC-60"];

function getFilmPrice(filmName, vehicleType, priceType = 'allRound') {
  const film = FILMS[filmName];
  if (!film) return 0;
  const sizeIndex = VEHICLE_SIZE_MAP[vehicleType] || 0;
  switch (priceType) {
    case 'front': return film.priceFront[sizeIndex] || 0;
    case 'sidesRear': return film.priceSidesRear[sizeIndex] || 0;
    case 'allRound':
    default: return film.priceAllRound[sizeIndex] || 0;
  }
}

function formatPrice(price) {
  return price.toLocaleString('th-TH');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FILMS, FRONT_FILMS, SURROUND_FILMS, CLARITY_LABELS, VEHICLE_SIZE_MAP, getFilmPrice, formatPrice };
}
