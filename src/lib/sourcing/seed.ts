import type { ProjectSourcing } from '@/types/sourcing.types';

/** Starter bathroom workspace copied from the completed Home Reno Sourcing project. */
export const bathroomSourcingSeed: ProjectSourcing = {
  "requirements": [
    {
      "id": "main-bath",
      "roomId": "main-bathroom",
      "name": "B-shaped shower bath",
      "category": "Bathing",
      "specification": "1700mm B-shaped shower bath",
      "quantity": 1,
      "status": "confirmed",
      "notes": "Bath handedness must be confirmed before ordering.",
      "constraints": {
        "lengthMm": 1700
      },
      "requiredComponents": [
        "bath",
        "screen",
        "waste",
        "front-panel",
        "end-panel"
      ]
    },
    {
      "id": "main-vanity",
      "roomId": "main-bathroom",
      "name": "Wall-hung vanity",
      "category": "Furniture",
      "specification": "600mm Coronation wall-hung unit with two drawers",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
        "maxWidthMm": 600
      },
      "requiredComponents": [
        "vanity"
      ]
    },
    {
      "id": "main-wc-unit",
      "roomId": "main-bathroom",
      "name": "WC unit",
      "category": "Toilets",
      "specification": "500mm toilet unit",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
        "maxWidthMm": 500
      },
      "requiredComponents": [
        "wc-unit",
        "cistern"
      ]
    },
    {
      "id": "main-toilet",
      "roomId": "main-bathroom",
      "name": "Back-to-wall toilet",
      "category": "Toilets",
      "specification": "Grove back-to-wall toilet with push button and soft-close seat",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {},
      "requiredComponents": [
        "toilet",
        "seat"
      ]
    },
    {
      "id": "main-rail",
      "roomId": "main-bathroom",
      "name": "Heated towel rail",
      "category": "Heating",
      "specification": "1200 × 600mm chrome heated towel rail with chrome valves",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
        "lengthMm": 1200,
        "widthMm": 600,
        "finish": "chrome"
      },
      "requiredComponents": [
        "towel-rail",
        "valves"
      ]
    },
    {
      "id": "main-wall-tiles",
      "roomId": "main-bathroom",
      "name": "Wall tiles",
      "category": "Tiles",
      "specification": "Light marble / blue feature tile scheme",
      "quantity": 11,
      "status": "confirmed",
      "notes": "11m² quoted; calculate boxes once tile coverage is known.",
      "constraints": {},
      "requiredComponents": []
    },
    {
      "id": "main-floor-tiles",
      "roomId": "main-bathroom",
      "name": "Floor tiles",
      "category": "Tiles",
      "specification": "White/light marble floor tile",
      "quantity": 5,
      "status": "confirmed",
      "constraints": {},
      "requiredComponents": []
    },
    {
      "id": "main-handedness",
      "roomId": "main-bathroom",
      "name": "Bath handedness",
      "category": "Fitter check",
      "specification": "Left or right hand not confirmed",
      "quantity": 1,
      "status": "fitter_check",
      "notes": "Do not order the bath until the fitter confirms the waste and screen side.",
      "constraints": {},
      "requiredComponents": []
    },
    {
      "id": "shower-door",
      "roomId": "shower-room",
      "name": "Sliding shower door",
      "category": "Enclosure",
      "specification": "1000 × 800mm, 8mm sliding shower door",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
        "lengthMm": 1000,
        "widthMm": 800,
        "thicknessMm": 8
      },
      "requiredComponents": [
        "shower-door"
      ]
    },
    {
      "id": "shower-tray",
      "roomId": "shower-room",
      "name": "Shower tray",
      "category": "Shower",
      "specification": "1000 × 800mm tray with high-flow waste",
      "quantity": 1,
      "status": "confirmed",
      "notes": "Waste may need to be purchased separately.",
      "constraints": {
        "lengthMm": 1000,
        "widthMm": 800
      },
      "requiredComponents": [
        "shower-tray",
        "waste"
      ]
    },
    {
      "id": "shower-vanity",
      "roomId": "shower-room",
      "name": "Union vanity",
      "category": "Furniture",
      "specification": "400mm Union white vanity",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
        "maxWidthMm": 400,
        "finish": "white"
      },
      "requiredComponents": [
        "vanity",
        "basin"
      ]
    },
    {
      "id": "shower-toilet",
      "roomId": "shower-room",
      "name": "Back-to-wall toilet",
      "category": "Toilets",
      "specification": "Grove back-to-wall toilet with push button and soft-close seat",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {},
      "requiredComponents": [
        "toilet",
        "seat"
      ]
    },
    {
      "id": "shower-rail",
      "roomId": "shower-room",
      "name": "Towel rail",
      "category": "Heating",
      "specification": "1000 × 500mm chrome towel rail with chrome valves",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
        "lengthMm": 1000,
        "widthMm": 500,
        "finish": "chrome"
      },
      "requiredComponents": [
        "towel-rail",
        "valves"
      ]
    },
    {
      "id": "shower-wall-tiles",
      "roomId": "shower-room",
      "name": "Wall tiles",
      "category": "Tiles",
      "specification": "Dark grey stone-effect tiles",
      "quantity": 14,
      "status": "confirmed",
      "constraints": {},
      "requiredComponents": []
    },
    {
      "id": "shower-floor-tiles",
      "roomId": "shower-room",
      "name": "Floor tiles",
      "category": "Tiles",
      "specification": "Dark grey stone-effect floor tiles",
      "quantity": 2,
      "status": "confirmed",
      "constraints": {},
      "requiredComponents": []
    },
    {
      "id": "warmup",
      "roomId": "shower-room",
      "name": "Underfloor heating",
      "category": "Heating",
      "specification": "Warmup underfloor heating with thermostat",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {},
      "requiredComponents": [
        "underfloor-heating",
        "thermostat"
      ]
    }
  ],
  "products": [
    {
      "id": "stonewater-fairford-tray-1000-800",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford Rectangular Shower Tray 1000 × 800mm",
      "url": "https://www.tradebase.com/collections/shower-trays",
      "imageUrl": "https://placehold.co/640x420/e8eee9/25342a?text=1000%C3%97800+Tray",
      "price": 185,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier catalogue fixture",
      "dimensions": {
        "lengthMm": 1000,
        "widthMm": 800
      },
      "finish": "white",
      "components": [
        "shower-tray"
      ],
      "lastChecked": "2026-09-19T09:00:00.000Z"
    },
    {
      "id": "stonewater-tray-900-800",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford Rectangular Shower Tray 900 × 800mm",
      "url": "https://www.tradebase.com/collections/shower-trays",
      "imageUrl": "https://placehold.co/640x420/f1e9e9/432b2b?text=900%C3%97800+Tray",
      "price": 159,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier catalogue fixture",
      "dimensions": {
        "lengthMm": 900,
        "widthMm": 800
      },
      "finish": "white",
      "components": [
        "shower-tray"
      ],
      "lastChecked": "2026-09-19T09:00:00.000Z"
    },
    {
      "id": "stonewater-high-flow-waste",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "90mm High-Flow Shower Waste",
      "url": "https://www.tradebase.com/collections/shower-trays",
      "imageUrl": "https://placehold.co/640x420/e8eee9/25342a?text=High+Flow+Waste",
      "price": 42,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier catalogue fixture",
      "dimensions": {},
      "components": [
        "waste"
      ],
      "lastChecked": "2026-09-19T09:00:00.000Z"
    },
    {
      "id": "stonewater-door-1000-800-8",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford 8mm Sliding Shower Door 1000 × 800mm",
      "url": "https://www.tradebase.com/collections/shower-enclosures",
      "imageUrl": "https://placehold.co/640x420/e8eee9/25342a?text=Sliding+Door",
      "price": 399,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier catalogue fixture",
      "dimensions": {
        "lengthMm": 1000,
        "widthMm": 800,
        "thicknessMm": 8
      },
      "finish": "chrome",
      "components": [
        "shower-door"
      ],
      "lastChecked": "2026-09-19T09:00:00.000Z"
    },
    {
      "id": "stonewater-carnation-600",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Carnation 600mm Wall-Hung Vanity Unit",
      "url": "https://www.tradebase.com/collections/fitted-furniture",
      "imageUrl": "https://placehold.co/640x420/e8eee9/25342a?text=600mm+Vanity",
      "price": 449,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier catalogue fixture",
      "dimensions": {
        "maxWidthMm": 600
      },
      "finish": "white",
      "components": [
        "vanity",
        "basin"
      ],
      "lastChecked": "2026-09-19T09:00:00.000Z"
    },
    {
      "id": "stonewater-union-400",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Union 400mm White Vanity with Basin",
      "url": "https://www.tradebase.com/collections/fitted-furniture",
      "imageUrl": "https://placehold.co/640x420/e8eee9/25342a?text=400mm+Union",
      "price": 289,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier catalogue fixture",
      "dimensions": {
        "maxWidthMm": 400
      },
      "finish": "white",
      "components": [
        "vanity",
        "basin"
      ],
      "lastChecked": "2026-09-19T09:00:00.000Z"
    },
    {
      "id": "boyden-dark-stone-tile",
      "supplier": "Boyden Tiles",
      "name": "Dark Grey Stone Effect Porcelain Tile",
      "url": "https://boydentiles.co.uk/all-tiles/",
      "imageUrl": "https://placehold.co/640x420/30363a/f7f4ef?text=Dark+Stone+Tile",
      "price": 38.5,
      "stock": "IN_STOCK",
      "stockEvidence": "Available from public tile catalogue fixture",
      "dimensions": {
        "lengthMm": 600,
        "widthMm": 600
      },
      "finish": "dark grey",
      "components": [],
      "lastChecked": "2026-09-19T09:00:00.000Z"
    },
    {
      "id": "boyden-light-marble-tile",
      "supplier": "Boyden Tiles",
      "name": "Light Marble Porcelain Tile",
      "url": "https://boydentiles.co.uk/all-tiles/",
      "imageUrl": "https://placehold.co/640x420/e8e5df/45413d?text=Light+Marble",
      "price": 42,
      "stock": "IN_STOCK",
      "stockEvidence": "Available from public tile catalogue fixture",
      "dimensions": {
        "lengthMm": 600,
        "widthMm": 600
      },
      "finish": "light marble",
      "components": [],
      "lastChecked": "2026-09-19T09:00:00.000Z"
    },
    {
      "id": "stonewater-8518834290954",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford 1000 X 800mm Rectangular Shower Tray, Corner Waste",
      "url": "https://www.tradebase.com/products/fairford-1000-x-800mm-rectangular-shower-tray-corner-waste?_pos=1&_psq=Shower+tray+1000+%C3%97+800mm+tray+with+high-flow+waste&_psid=ccfa89f89&_ss=e",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9753.jpg?v=1787665809",
      "price": 363.22,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier search result marked available",
      "dimensions": {
        "lengthMm": 1000,
        "widthMm": 800
      },
      "components": [
        "shower-tray",
        "waste"
      ],
      "lastChecked": "2026-09-19T09:09:09.854Z"
    },
    {
      "id": "stonewater-8518778683658",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford 1000 X 800mm Rectangular Shower Tray",
      "url": "https://www.tradebase.com/products/fairford-1000-x-800mm-rectangular-shower-tray?_pos=2&_psq=Shower+tray+1000+%C3%97+800mm+tray+with+high-flow+waste&_psid=ccfa89f89&_ss=e",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9801.jpg?v=1787666793",
      "price": 315,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier search result marked available",
      "dimensions": {
        "lengthMm": 1000,
        "widthMm": 800
      },
      "components": [
        "shower-tray",
        "waste"
      ],
      "lastChecked": "2026-09-19T09:09:09.854Z"
    },
    {
      "id": "stonewater-8518778323210",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford 1000 x 800mm Offset Quadrant, RH Shower Tray",
      "url": "https://www.tradebase.com/products/fairford-1000-x-800mm-offset-quadrant-rh-shower-tray?_pos=3&_psq=Shower+tray+1000+%C3%97+800mm+tray+with+high-flow+waste&_psid=ccfa89f89&_ss=e",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/2-9994.jpg?v=1787731279",
      "price": 315,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier search result marked available",
      "dimensions": {
        "lengthMm": 1000,
        "widthMm": 800
      },
      "components": [
        "shower-tray",
        "waste"
      ],
      "lastChecked": "2026-09-19T09:09:09.854Z"
    },
    {
      "id": "stonewater-8518726222090",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford 90mm Fast Flow Shower Tray Waste, Chrome",
      "url": "https://www.tradebase.com/products/fairford-90mm-fast-flow-shower-tray-waste-chrome?_pos=4&_psq=Shower+tray+1000+%C3%97+800mm+tray+with+high-flow+waste&_psid=ccfa89f89&_ss=e",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14120053_8b34e9fa-3e3a-44d0-af2e-4da6deabd154.jpg?v=1757516615",
      "price": 38,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier search result marked available",
      "dimensions": {},
      "components": [
        "shower-tray",
        "waste"
      ],
      "lastChecked": "2026-09-19T09:09:09.854Z"
    },
    {
      "id": "stonewater-8518834323722",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Dezine SolidStone 1000 X 800mm Rectangular Shower Tray with Waste",
      "url": "https://www.tradebase.com/products/dezine-solidstone-1000-x-800mm-rectangular-shower-tray-with-waste?_pos=5&_psq=Shower+tray+1000+%C3%97+800mm+tray+with+high-flow+waste&_psid=ccfa89f89&_ss=e",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/rectangular_shower_tray_side_waste_9_50035f05-a83a-4382-bd4f-d5b2641914eb.jpg?v=1774593206",
      "price": 202.27,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier search result marked available",
      "dimensions": {
        "lengthMm": 1000,
        "widthMm": 800
      },
      "finish": "Gloss White",
      "components": [
        "shower-tray"
      ],
      "lastChecked": "2026-09-19T09:09:09.854Z"
    },
    {
      "id": "stonewater-8518777897226",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford 800 x 800mm Square Shower Tray",
      "url": "https://www.tradebase.com/products/fairford-800-x-800mm-square-shower-tray?_pos=6&_psq=Shower+tray+1000+%C3%97+800mm+tray+with+high-flow+waste&_psid=ccfa89f89&_ss=e",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-9706.jpg?v=1787664643",
      "price": 253,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier search result marked available",
      "dimensions": {
        "lengthMm": 800,
        "widthMm": 800
      },
      "components": [
        "shower-tray",
        "waste"
      ],
      "lastChecked": "2026-09-19T09:09:09.854Z"
    },
    {
      "id": "stonewater-8518834422026",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford 1100 X 700mm Rectangular Shower Tray, Corner Waste",
      "url": "https://www.tradebase.com/products/fairford-1100-x-700mm-rectangular-shower-tray-corner-waste?_pos=7&_psq=Shower+tray+1000+%C3%97+800mm+tray+with+high-flow+waste&_psid=ccfa89f89&_ss=e",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9830.jpg?v=1787667537",
      "price": 404.69,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier search result marked available",
      "dimensions": {
        "lengthMm": 1100,
        "widthMm": 700
      },
      "components": [
        "shower-tray"
      ],
      "lastChecked": "2026-09-19T09:09:09.854Z"
    },
    {
      "id": "stonewater-8518832881930",
      "supplier": "Stonewater Bathrooms (Tradebase)",
      "name": "Fairford 800mm x 800mm Square Shower Tray, Corner Waste",
      "url": "https://www.tradebase.com/products/fairford-800mm-x-800mm-square-shower-tray-corner-waste?_pos=8&_psq=Shower+tray+1000+%C3%97+800mm+tray+with+high-flow+waste&_psid=ccfa89f89&_ss=e",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/2-9688.jpg?v=1787664379",
      "price": 303.17,
      "stock": "IN_STOCK",
      "stockEvidence": "In stock — supplier search result marked available",
      "dimensions": {},
      "components": [
        "shower-tray",
        "waste"
      ],
      "lastChecked": "2026-09-19T09:09:09.854Z"
    }
  ],
  "basket": [
    {
      "id": "basket-1789806319087",
      "requirementId": "shower-tray",
      "productId": "stonewater-fairford-tray-1000-800",
      "quantity": 1,
      "status": "approved"
    }
  ]
};

export function createBathroomSourcingSeed(): ProjectSourcing {
  const seed = JSON.parse(JSON.stringify(bathroomSourcingSeed)) as ProjectSourcing;
  seed.requirements.push(
    {
      id: 'tile-harlem-caliza-equivalent', roomId: 'main-bathroom', name: 'Equivalent for Harlem Caliza',
      category: 'Tiles', specification: 'Porcelanosa Harlem Caliza · matt beige concrete-effect porcelain · 59.6 × 59.6cm',
      quantity: 1, status: 'fitter_check', referenceProduct: {
        name: 'Harlem Caliza', supplier: 'Porcelanosa', url: 'https://mpceramics.co.uk/porcelanosa-harlem-caliza-80-x-80cm-100145837/',
      }, recommendationNote: 'Find the closest Topps Tiles match by colour, concrete effect, finish and near-identical format.',
      constraints: { lengthMm: 596, widthMm: 596, tileToleranceMm: 1, colour: 'Bone', finish: 'Matt', effect: 'Concrete effect' }, requiredComponents: [],
    },
    {
      id: 'tile-cemente-basalt-small', roomId: 'small-bathroom', name: 'Cemente Basalt 60',
      category: 'Tiles', specification: 'Cemente Basalt matt porcelain floor tile · 60 × 60cm',
      quantity: 1, status: 'confirmed', constraints: { lengthMm: 600, widthMm: 600, colour: 'Basalt', finish: 'Matt', material: 'Porcelain' }, requiredComponents: [],
    },
    {
      id: 'tile-kapital-grey', roomId: 'main-bathroom', name: 'Kapital Grey',
      category: 'Tiles', specification: 'Kapital Grey matt tile · 59.5 × 59.5cm',
      quantity: 1, status: 'confirmed', constraints: { lengthMm: 595, widthMm: 595, colour: 'Grey', finish: 'Matt' }, requiredComponents: [],
    },
  );
  return seed;
}
