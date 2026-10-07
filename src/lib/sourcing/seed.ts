import type { ProjectSourcing } from '@/types/sourcing.types';
import { withQuoteInventory } from './quoteInventory';

export const SOURCING_SEED_VERSION = 7;

/**
 * Bathroom quote for 21 Tremaine Road, matched to real supplier products.
 * Stonewater prices, photos and stock were read from stonewaterbathrooms.com product pages on 1 Oct 2026;
 * use "Check live stock" in the app to refresh a product before ordering.
 */
export const bathroomSourcingSeed: ProjectSourcing = {
  "version": SOURCING_SEED_VERSION,
  "requirements": [
    {
      "id": "main-bath",
      "roomId": "main-bathroom",
      "name": "B-shaped shower bath",
      "category": "Sanitaryware",
      "specification": "Acrylic B-shaped shower bath with 6mm glass bath screen, front panel, end panel and waste",
      "size": "1700mm long × 850–900mm wide",
      "quantity": 1,
      "status": "confirmed",
      "notes": "Left or right hand still to be confirmed by the fitter before ordering.",
      "constraints": {
        "lengthMm": 1700
      },
      "requiredComponents": [
        "bath",
        "screen",
        "front-panel",
        "end-panel",
        "waste"
      ]
    },
    {
      "id": "main-vanity",
      "roomId": "main-bathroom",
      "name": "Wall-hung vanity unit",
      "category": "Furniture",
      "specification": "Wall-hung vanity unit with two drawers and basin (quote names a Coronation unit, which Stonewater does not sell)",
      "size": "600mm wide",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
        "maxWidthMm": 600
      },
      "requiredComponents": [
        "vanity",
        "basin"
      ]
    },
    {
      "id": "main-wc-unit",
      "roomId": "main-bathroom",
      "name": "WC furniture unit",
      "category": "Furniture",
      "specification": "Back-to-wall WC furniture unit with concealed cistern and push-button flush",
      "size": "500mm wide",
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
      "name": "Grove back-to-wall toilet",
      "category": "Sanitaryware",
      "specification": "Fairford Grove back-to-wall toilet pan with soft-close seat and push-button flush",
      "size": "490mm projection",
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
      "specification": "Straight chrome heated towel rail with a pair of chrome valves",
      "size": "1200mm high × 600mm wide",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
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
      "specification": "Light marble-effect wall tiles with a blue feature tile",
      "size": "11m² · waste allowance to confirm",
      "quantity": 11,
      "unit": "m²",
      "status": "confirmed",
      "notes": "Tile size not set in the quote; choose the tile, then work out boxes.",
      "constraints": {},
      "requiredComponents": []
    },
    {
      "id": "main-floor-tiles",
      "roomId": "main-bathroom",
      "name": "Floor tiles",
      "category": "Tiles",
      "specification": "White / light marble-effect floor tiles",
      "size": "5m² · waste allowance to confirm",
      "quantity": 5,
      "unit": "m²",
      "status": "confirmed",
      "constraints": {},
      "requiredComponents": []
    },
    {
      "id": "tile-harlem-caliza-equivalent",
      "roomId": "main-bathroom",
      "name": "Equivalent for Harlem Caliza",
      "category": "Tiles",
      "specification": "Porcelanosa Harlem Caliza · matt beige concrete-effect porcelain",
      "size": "59.6 × 59.6cm",
      "quantity": 1,
      "unit": "m²",
      "status": "fitter_check",
      "referenceProduct": {
        "name": "Harlem Caliza",
        "supplier": "Porcelanosa",
        "url": "https://mpceramics.co.uk/porcelanosa-harlem-caliza-80-x-80cm-100145837/"
      },
      "recommendationNote": "Find the closest Topps Tiles match by colour, concrete effect, finish and near-identical format.",
      "constraints": {
        "lengthMm": 596,
        "widthMm": 596,
        "tileToleranceMm": 1,
        "colour": "Bone",
        "finish": "Matt",
        "effect": "Concrete effect"
      },
      "requiredComponents": []
    },
    {
      "id": "tile-kapital-grey",
      "roomId": "main-bathroom",
      "name": "Kapital Grey",
      "category": "Tiles",
      "specification": "Topps Tiles Kapital Grey matt porcelain tile",
      "size": "59.5 × 59.5cm",
      "quantity": 1,
      "unit": "m²",
      "status": "confirmed",
      "constraints": {
        "lengthMm": 595,
        "widthMm": 595,
        "colour": "Grey",
        "finish": "Matt"
      },
      "requiredComponents": []
    },
    {
      "id": "main-handedness",
      "roomId": "main-bathroom",
      "name": "Bath handedness",
      "category": "Fitter check",
      "specification": "Is the bath left hand or right hand? This decides the bath, screen and waste side.",
      "size": "—",
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
      "category": "Showers",
      "specification": "8mm glass sliding shower door with an 800mm side panel, to fit a 1000 × 800mm tray",
      "size": "1000mm door + 800mm side panel · 8mm glass",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
        "thicknessMm": 8
      },
      "requiredComponents": [
        "shower-door",
        "side-panel"
      ]
    },
    {
      "id": "shower-tray",
      "roomId": "shower-room",
      "name": "Shower tray",
      "category": "Showers",
      "specification": "Rectangular stone-resin shower tray with a 90mm high-flow waste",
      "size": "1000 × 800mm",
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
      "name": "Union vanity unit",
      "category": "Furniture",
      "specification": "Fairford Union white vanity unit with basin",
      "size": "400mm wide",
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
      "name": "Grove back-to-wall toilet",
      "category": "Sanitaryware",
      "specification": "Fairford Grove back-to-wall toilet pan with soft-close seat and push-button flush",
      "size": "490mm projection",
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
      "specification": "Straight chrome towel rail with a pair of chrome valves",
      "size": "1000mm high × 500mm wide",
      "quantity": 1,
      "status": "confirmed",
      "constraints": {
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
      "specification": "Dark grey stone-effect wall tiles",
      "size": "14m² · waste allowance to confirm",
      "quantity": 14,
      "unit": "m²",
      "status": "confirmed",
      "constraints": {},
      "requiredComponents": []
    },
    {
      "id": "tile-cemente-basalt",
      "roomId": "shower-room",
      "name": "Floor tiles · Cemente Basalt 60",
      "category": "Tiles",
      "specification": "Topps Tiles Cemente Basalt dark grey matt porcelain floor tile",
      "size": "60 × 60cm · 2m² · waste allowance to confirm",
      "quantity": 2,
      "unit": "m²",
      "status": "confirmed",
      "constraints": {
        "lengthMm": 600,
        "widthMm": 600,
        "colour": "Basalt",
        "finish": "Matt",
        "material": "Porcelain"
      },
      "requiredComponents": []
    },
    {
      "id": "warmup",
      "roomId": "shower-room",
      "name": "Underfloor heating",
      "category": "Heating",
      "specification": "Warmup electric underfloor heating kit with thermostat",
      "size": "2m² floor area",
      "quantity": 1,
      "status": "confirmed",
      "notes": "Stonewater does not sell underfloor heating; buy from Warmup or a stockist.",
      "constraints": {},
      "requiredComponents": [
        "underfloor-heating",
        "thermostat"
      ]
    }
  ],
  "products": [
    {
      "id": "sw-14140039",
      "supplier": "Stonewater Bathrooms",
      "category": "Sanitaryware",
      "requirementIds": [
        "main-bath"
      ],
      "name": "Fairford 1700 x 900mm B Shaped Left Hand Shower Bath",
      "size": "1700 × 900mm · left hand",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-1700-x-900mm-b-shaped-left-hand-shower-bath",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14140051_-_1_3_1_5f1d5057-4ffa-488b-990e-ebab8583e38f.jpg?v=1757675461",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14140051_-_1_3_1_5f1d5057-4ffa-488b-990e-ebab8583e38f.jpg?v=1757675461",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14140039_drawing_1_da7a7b9b-71e6-4c86-a491-1b9d5bb46fc5.jpg?v=1757511183"
      ],
      "price": 536.0,
      "sku": "14140039",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Length": "1700mm",
        "Width": "900mm",
        "Hand": "Left",
        "Material": "Acrylic"
      },
      "dimensions": {},
      "components": [
        "bath",
        "legset"
      ],
      "note": "Panels, screen and waste are sold separately.",
      "topPick": true,
      "description": "The Fairford 1700 x 900mm B Shaped Left Hand Shower Bath integrates functionality, style, and durability, making it suitable for modern bathrooms. Its B-shaped design provides a luxurious bathing experience alongside a practical showering space, ideal for homes where aesthetics and utility are priorities.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14140040",
      "supplier": "Stonewater Bathrooms",
      "category": "Sanitaryware",
      "requirementIds": [
        "main-bath"
      ],
      "name": "Fairford 1700 x 900mm B Shaped Right Hand Shower Bath",
      "size": "1700 × 900mm · right hand",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-1700-x-900mm-b-shaped-right-hand-shower-bath",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14140052_-_1_2_1_ebbc48ae-a846-4c58-9f52-ad6b9e190f60.jpg?v=1757675440",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14140052_-_1_2_1_ebbc48ae-a846-4c58-9f52-ad6b9e190f60.jpg?v=1757675440",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14140040_-_drawing_1_70a36a6b-5d47-4a02-a5cc-89bbdccf642c.jpg?v=1757511210"
      ],
      "price": 536.0,
      "sku": "14140040",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Length": "1700mm",
        "Width": "900mm",
        "Hand": "Right",
        "Material": "Acrylic"
      },
      "dimensions": {},
      "components": [
        "bath",
        "legset"
      ],
      "note": "Panels, screen and waste are sold separately.",
      "topPick": true,
      "description": "The Fairford 1700 x 900mm B Shaped Right Hand Shower Bath combines style and functionality, making it suitable for various bathroom designs. Made from durable sanitary grade acrylic, it ensures long-lasting use and features a sleek white finish that complements diverse color schemes. The robust 4mm thick acrylic structure adds strength while remaining lightweight.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14141052",
      "supplier": "Stonewater Bathrooms",
      "category": "Sanitaryware",
      "requirementIds": [
        "main-bath"
      ],
      "name": "Fairford 1700 x 850 LH B Shape Bath with Screen and Panel",
      "size": "1700 × 850mm · left hand · bath, 6mm screen, panel & waste",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-1700-x-850-lh-b-shape-bath-with-screen-and-panel",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/lh_lifestyle_6e7f2ec7-95cb-4423-b8b0-b85aec82e4ab.jpg?v=1775919797",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/lh_lifestyle_6e7f2ec7-95cb-4423-b8b0-b85aec82e4ab.jpg?v=1775919797",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/Bath_LH_2_78559b31-589f-4b51-9c81-7e9fff34eb01.jpg?v=1775919798",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/bath_lh_f49a2187-ce2c-4b77-8690-14428d8f4fc2.jpg?v=1775919891",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/WBB101_co1_jpg.webp?v=1775920696",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/WBB101_ld_jpg.webp?v=1775920787"
      ],
      "price": 695.0,
      "sku": "14141052",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Length": "1700mm",
        "Width": "850mm",
        "Hand": "Left",
        "Screen": "6mm easy-clean glass"
      },
      "dimensions": {},
      "components": [
        "bath",
        "screen",
        "front-panel",
        "waste"
      ],
      "note": "Complete pack, but 850mm wide rather than 900mm. End panel not listed.",
      "topPick": false,
      "description": "The Fairford 1700 x 850 LH B Shape Bath with Screen and Panel offers spacious comfort with its generous 1700mm length and 850mm width. Designed as a left-hand shower bath, its B-shape design provides ergonomic support and ease of use, ideal for both bathing and showering. A reinforced base layer ensures durability and stability over time.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14141053",
      "supplier": "Stonewater Bathrooms",
      "category": "Sanitaryware",
      "requirementIds": [
        "main-bath"
      ],
      "name": "Fairford 1700 x 850 RH B Shape Bath with Screen and Panel",
      "size": "1700 × 850mm · right hand · bath, 6mm screen, panel & waste",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-1700-x-850-rh-b-shape-bath-with-screen-and-panel",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/2-13179.jpg?v=1788425292",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/2-13179.jpg?v=1788425292",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/Gemini_Generated_Image_sox885sox885sox8_d9d55b95-b8cf-48a1-b8a8-cb2779c95228.jpg?v=1775919831",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/Gemini_Generated_Image_n1g8ynn1g8ynn1g8_67564fcf-8902-418f-8f19-d57396d7696a.jpg?v=1775919835",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/WBB102_co1_jpg.webp?v=1775920722",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/WBB102_ld_jpg.webp?v=1775920743"
      ],
      "price": 695.0,
      "sku": "14141053",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Length": "1700mm",
        "Width": "850mm",
        "Hand": "Right",
        "Screen": "6mm easy-clean glass"
      },
      "dimensions": {},
      "components": [
        "bath",
        "screen",
        "front-panel",
        "waste"
      ],
      "note": "Complete pack, but 850mm wide rather than 900mm. End panel not listed.",
      "topPick": false,
      "description": "The Fairford 1700 x 850 RH B Shape Bath with Screen and Panel offers a spacious 1700mm by 850mm design with a right hand orientation for flexible bathroom layouts. Featuring a B Shape contour, this bath set enhances comfort and provides easier access compared to traditional styles, ideal for daily use. Constructed with a reinforced base layer, the set ensures long-lasting support and durability, resisting flex and maintaining stability.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14120253",
      "supplier": "Stonewater Bathrooms",
      "category": "Fittings",
      "requirementIds": [
        "main-bath"
      ],
      "name": "Fairford 6mm B Shaped Shower Bath Screen",
      "size": "6mm glass · fits 850–870mm",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-6mm-b-shaped-shower-bath-screen",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14120253_-_1.jpg?v=1757683210",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14120253_-_1.jpg?v=1757683210",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14120253_-_line_drawing.jpg?v=1757683210"
      ],
      "price": 279.0,
      "sku": "14120253",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Glass": "6mm",
        "Fits": "850–870mm bath width"
      },
      "dimensions": {},
      "components": [
        "screen"
      ],
      "note": "Pairs with the 1700 × 900mm B-shaped bath.",
      "topPick": true,
      "description": "The Fairford 6mm B Shaped Shower Bath Screen is designed to enhance both functionality and aesthetics in modern bathrooms. Its curved shape effectively contains water, keeping the bath area dry. Made from 6mm toughened safety glass and standing at 1435mm, this screen complements B-shaped showers and features a polished chrome finish for durability and visual appeal.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14140105",
      "supplier": "Stonewater Bathrooms",
      "category": "Fittings",
      "requirementIds": [
        "main-bath"
      ],
      "name": "Fairford Acrylic B Shape Side Panel, 1700mm",
      "size": "1700mm front panel",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-acrylic-b-shape-side-panel-1700mm",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58503906918666.jpg?v=1774940853",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58503906918666.jpg?v=1774940853",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58503906885898.jpg?v=1774940829"
      ],
      "price": 176.0,
      "sku": "14140105",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Length": "1700mm",
        "Material": "Acrylic"
      },
      "dimensions": {},
      "components": [
        "front-panel"
      ],
      "topPick": true,
      "description": "The Fairford Acrylic B Shape Side Panel, measuring 1700mm, combines aesthetic appeal with practicality for bathrooms featuring B Shape Baths. Its Gloss White finish offers a sleek look that complements both contemporary and traditional styles. Made from high-quality acrylic, this lightweight panel is durable and easy to install, with a thickness of 3mm providing a secure fit.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14140107",
      "supplier": "Stonewater Bathrooms",
      "category": "Fittings",
      "requirementIds": [
        "main-bath"
      ],
      "name": "Fairford Acrylic B Shape End Panel, 750mm",
      "size": "750mm end panel",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-acrylic-b-shape-end-panel-750mm",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58503840530698.jpg?v=1775747740",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58503840530698.jpg?v=1775747740",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58503840563466.jpg?v=1774940690"
      ],
      "price": 133.0,
      "sku": "14140107",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Length": "750mm",
        "Material": "Acrylic"
      },
      "dimensions": {},
      "components": [
        "end-panel"
      ],
      "note": "Fitter to confirm the end-panel size for the chosen bath width.",
      "topPick": true,
      "description": "The Fairford Acrylic B Shape End Panel is designed specifically for B-shape baths with a size of 750mm, ensuring a seamless fit and an elegant bathroom aesthetic. Made from high-quality acrylic, it features a durable 3mm thickness that balances lightweight convenience with long-term use. Its high-gloss white finish complements various bathroom decors, adding a modern touch. Installation is straightforward and efficient, with included fixings that facilitate a secure setup.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-606253160",
      "supplier": "Stonewater Bathrooms",
      "category": "Furniture",
      "requirementIds": [
        "main-vanity"
      ],
      "name": "Fairford Eclipse 600mm 2 Drawer Satin White Wall Hung Vanity Unit",
      "size": "600W × 500H × 445D mm · 2 drawers · basin included",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-eclipse-600mm-2-drawer-satin-white-wall-hung-vanity-unit",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-5482.jpg?v=1786692435",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-5482.jpg?v=1786692435",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/2-5483.jpg?v=1786692438",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-5481.jpg?v=1786692441",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/606253160_Eclipse_Satin-White_54bcf692-6181-430a-8263-59bb23ec95d2.png?v=1774348239",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/lun102a_furniture_v2_lde.jpg?v=1774348239"
      ],
      "price": 836.0,
      "sku": "606253160",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Width": "600mm",
        "Height": "500mm",
        "Depth": "445mm",
        "Drawers": "2 soft-close",
        "Finish": "Satin white"
      },
      "dimensions": {},
      "components": [
        "vanity",
        "basin"
      ],
      "note": "Closest match to the quoted Coronation unit, which Stonewater does not sell.",
      "topPick": true,
      "description": "The Fairford Eclipse 600mm 2 Drawer Satin White Wall Hung Vanity Unit combines modern elegance with practical functionality, making it an ideal choice for contemporary bathrooms. Crafted from high-quality MDF with an MFC carcass, its satin white finish ensures both durability and easy maintenance. With dimensions of 600mm in width, 500mm in height, and 445mm in depth, this compact unit maximizes space while providing ample storage.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-606253260",
      "supplier": "Stonewater Bathrooms",
      "category": "Furniture",
      "requirementIds": [
        "main-vanity"
      ],
      "name": "Fairford Eclipse 600mm 2 Drawer Satin Grey Wall Hung Vanity Unit",
      "size": "600W × 500H × 445D mm · 2 drawers · basin included",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-eclipse-600mm-2-drawer-satin-grey-wall-hung-vanity-unit",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-5623.jpg?v=1786692825",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-5623.jpg?v=1786692825",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/3-5625.jpg?v=1786692829",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-5645.jpg?v=1786692832",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/606253260_Eclipse_Satin-Grey_f0101847-9197-4c6f-b517-992deb10df51.png?v=1774348251",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/lun202a_furniture_v2_lde.jpg?v=1774348251"
      ],
      "price": 851.0,
      "sku": "606253260",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Width": "600mm",
        "Height": "500mm",
        "Depth": "445mm",
        "Drawers": "2 soft-close",
        "Finish": "Satin grey"
      },
      "dimensions": {},
      "components": [
        "vanity",
        "basin"
      ],
      "topPick": false,
      "description": "The Fairford Eclipse 600mm 2 Drawer Satin Grey Wall Hung Vanity Unit combines modern design with functionality, offering a refined addition to any contemporary bathroom. Crafted from durable MDF with an MFC carcass, its satin grey finish complements diverse décors and maintains a timeless look. Measuring 600mm wide, 500mm high, and 445mm deep, this compact unit provides ample storage without compromising space.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-615254960",
      "supplier": "Stonewater Bathrooms",
      "category": "Furniture",
      "requirementIds": [
        "main-vanity"
      ],
      "name": "Fairford Anika 600mm Matt Grey 2 Drawer Wall Hung Vanity Unit",
      "size": "600W × 395D mm · 2 drawers",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-anika-600mm-matt-grey-2-drawer-wall-hung-vanity-unit",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-4327.jpg?v=1786615693",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-4327.jpg?v=1786615693",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/2-4328.jpg?v=1786615697",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-4660.jpg?v=1786615700",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58129969217802.jpg?v=1775807809",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/jnu2324d_furniture_v2_lde.jpg?v=1757517096"
      ],
      "price": 789.6,
      "sku": "615254960",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Width": "600mm",
        "Depth": "395mm",
        "Drawers": "2",
        "Finish": "Matt grey"
      },
      "dimensions": {},
      "components": [
        "vanity",
        "basin"
      ],
      "note": "Slimmer 395mm depth.",
      "topPick": false,
      "description": "The Fairford Anika 600mm Matt Grey 2 Drawer Wall Hung Vanity Unit blends modern design with practicality, making it an ideal choice for contemporary bathrooms. Constructed from durable vinyl-coated MDF and featuring a sturdy MFC carcass, this unit offers a sophisticated finish and lasting quality. Its minimalist matt grey tone complements various bathroom styles. Designed to optimize space, the wall-hung unit creates an open ambiance and provides ample storage.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-614103150",
      "supplier": "Stonewater Bathrooms",
      "category": "Furniture",
      "requirementIds": [
        "main-wc-unit"
      ],
      "name": "Fairford Laurel 500mm Satin White WC Unit",
      "size": "500W × 818H × 253D mm",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-laurel-20-500mm-satin-white-wc-unit",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-6633.jpg?v=1786974906",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-6633.jpg?v=1786974906",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-6613.jpg?v=1786974910",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_61107491635466.jpg?v=1775665694",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cla141_furniture_v1_lde.jpg?v=1774350135"
      ],
      "price": 239.0,
      "sku": "614103150",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Width": "500mm",
        "Height": "818mm",
        "Depth": "253mm",
        "Finish": "Satin white"
      },
      "dimensions": {},
      "components": [
        "wc-unit"
      ],
      "note": "Unit only. Cistern, flush plate and toilet are sold separately.",
      "topPick": true,
      "description": "The Fairford Laurel 2.0 500mm Satin White WC Unit is designed to fit both contemporary and traditional bathrooms with its sleek satin white finish. Made from premium MDF with an MFC carcass, this unit combines durability with a stylish appearance. Measuring 253mm in depth, 818mm in height, and 500mm in width, it is ideal for space-saving in various bathroom sizes.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-615104950",
      "supplier": "Stonewater Bathrooms",
      "category": "Furniture",
      "requirementIds": [
        "main-wc-unit"
      ],
      "name": "Fairford Anika 500mm Matt Grey WC Unit",
      "size": "500W × 820H × 260D mm",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-anika-500mm-matt-grey-wc-unit",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-6702.jpg?v=1786975253",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-6702.jpg?v=1786975253",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-6703.jpg?v=1786975256",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/npf2341_furniture_v1_co.jpg?v=1757516961",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/npf2341_furniture_v1_lde.jpg?v=1757516962"
      ],
      "price": 356.4,
      "sku": "615104950",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Width": "500mm",
        "Height": "820mm",
        "Depth": "260mm",
        "Finish": "Matt grey"
      },
      "dimensions": {},
      "components": [
        "wc-unit"
      ],
      "note": "Unit only. Cistern, flush plate and toilet are sold separately.",
      "topPick": false,
      "description": "The Fairford Anika 500mm Matt Grey WC Unit combines modern design with practical functionality, ideal for contemporary bathrooms. With dimensions of 500mm in width, 820mm in height, and a compact depth of 260mm, it is space-efficient while providing ample storage. Constructed from vinyl-coated MDF and a robust MFC carcass, this unit is designed for durability and ease of maintenance, featuring a smooth matt grey finish that suits various interior styles.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14139859",
      "supplier": "Stonewater Bathrooms",
      "category": "Fittings",
      "requirementIds": [
        "main-wc-unit",
        "main-toilet"
      ],
      "name": "Fairford Filo Concealed Cistern with White Flush Button",
      "size": "364W × 305H × 164D mm · white push button",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-filo-concealed-cistern-with-white-flush-button",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_61106827493642.jpg?v=1775661934",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_61106827493642.jpg?v=1775661934",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/xty011m06_ceramics_v1_co.jpg?v=1774346469",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_59392826900746.jpg?v=1775748456"
      ],
      "price": 225.0,
      "sku": "14139859",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Width": "364mm",
        "Height": "305mm",
        "Depth": "164mm",
        "Flush": "Matt white push button"
      },
      "dimensions": {},
      "components": [
        "cistern",
        "flush-button"
      ],
      "note": "Concealed cistern with the push-button flush the quote asks for.",
      "topPick": true,
      "description": "The Fairford Filo Concealed Cistern with White Flush Button is a functional bathroom fixture designed for modern aesthetics. Manufactured by Hudson Reed, it features a water-saving dual flush system that allows for both full and partial flush options, promoting water conservation and reducing utility costs. This cistern is easy to maintain with front and top access, ensuring longevity and user convenience.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14130062",
      "supplier": "Stonewater Bathrooms",
      "category": "Sanitaryware",
      "requirementIds": [
        "main-toilet",
        "shower-toilet"
      ],
      "name": "Fairford Grove Back To Wall Toilet",
      "size": "490mm projection · rimless · soft-close seat",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-grove-back-to-wall-toilet",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9352.jpg?v=1787650858",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9352.jpg?v=1787650858",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9252.jpg?v=1787650862",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/grove_back_to_wall_toilet_close_up_lifestyle_image_dfdb0bbf-9c0c-493d-81d9-ce70e522abed.jpg?v=1774539307",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_61106801803530.jpg?v=1774539308",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/grove_back_to_wall_toilet_lifestyle_image_1acc1b6e-9eeb-4f96-b6b0-abd202ca9bf8.jpg?v=1774539308"
      ],
      "price": 218.0,
      "sku": "14130062",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Projection": "490mm",
        "Type": "Back to wall, rimless",
        "Seat": "Soft-close, quick release"
      },
      "dimensions": {},
      "components": [
        "toilet",
        "seat"
      ],
      "note": "The quoted Grove toilet. Pan and seat only; the push button comes with the cistern.",
      "topPick": true,
      "description": "The Fairford Grove Back To Wall Toilet combines style and functionality, featuring a minimalist square design that fits seamlessly into modern bathrooms. Made from vitreous china with a smooth, glazed white finish, it is both durable and easy to maintain, resisting scratches and stains. The rimless design enhances hygiene by eliminating hidden spaces where bacteria can thrive, while the back-to-wall configuration keeps plumbing discreetly tucked away for a neat appearance.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14130066",
      "supplier": "Stonewater Bathrooms",
      "category": "Sanitaryware",
      "requirementIds": [
        "main-toilet",
        "shower-toilet"
      ],
      "name": "Fairford Grove Pure Back To Wall Toilet with Soft Close Seat",
      "size": "550D × 370W × 470H mm · soft-close seat",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-grove-pure-back-to-wall-toilet-with-soft-close-seat",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-8300.jpg?v=1787562035",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-8300.jpg?v=1787562035",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14130064__eramics_Close_Coupled_Toilet_with_Soft_Close_Seat_1f643e0c-7b36-4c9f-b75d-ba8adcf395b3.png?v=1775718144",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58504843952394.jpg?v=1775748513"
      ],
      "price": 321.7,
      "sku": "14130066",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Wed 7th Oct.",
      "specs": {
        "Depth": "550mm",
        "Width": "370mm",
        "Height": "470mm",
        "Seat": "Soft-close"
      },
      "dimensions": {},
      "components": [
        "toilet",
        "seat"
      ],
      "note": "Longer 550mm projection.",
      "topPick": false,
      "description": "The Fairford Grove Pure Back To Wall Toilet from Stonewater combines functionality and modern design, crafted from high-quality vitreous china for durability and a pristine white finish. Its compact dimensions - 550mm depth, 470mm height, and 370mm width - make it suitable for any bathroom size, while the back-to-wall design conceals plumbing for a clean, streamlined look.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14130109",
      "supplier": "Stonewater Bathrooms",
      "category": "Sanitaryware",
      "requirementIds": [
        "main-toilet"
      ],
      "name": "Fairford Grove Lip Back To Wall Toilet with Soft Close Seat",
      "size": "550D × 370W × 470H mm · soft-close seat",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-grove-lip-back-to-wall-toilet-with-soft-close-seat",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9368.jpg?v=1787651202",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9368.jpg?v=1787651202",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/1-9257.jpg?v=1787651206",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/Gemini_Generated_Image_sfdln4sfdln4sfdl.jpg?v=1776185321",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_61106809569546.jpg?v=1776185321",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/ncg506_ceramics_v2_lde_5fadc4af-6bdd-4b3b-b75a-2de951aaf3bd.jpg?v=1776185322"
      ],
      "price": 424.0,
      "sku": "14130109",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Depth": "550mm",
        "Width": "370mm",
        "Height": "470mm",
        "Seat": "Soft-close"
      },
      "dimensions": {},
      "components": [
        "toilet",
        "seat"
      ],
      "note": "Longer 550mm projection.",
      "topPick": false,
      "description": "The Fairford Grove Lip Back To Wall Toilet with Soft Close Seat combines modern design and functionality for a refined bathroom experience. Crafted from premium vitreous china, its sleek silhouette features soft square curves, perfect for both contemporary and traditional settings. The durable Alpine White finish ensures longevity and style, resisting wear over time.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14112134",
      "supplier": "Stonewater Bathrooms",
      "category": "Heating",
      "requirementIds": [
        "main-rail"
      ],
      "name": "Fairford 600mm x 1200mm Straight Chrome Towel Rail",
      "size": "1200H × 600W mm · chrome · straight",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-600mm-x-1200mm-straight-chrome-towel-rail",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/straight_chrome_towel_rail_-_image_4_2_ea4de82f-e7f8-4d94-b193-79f119ec9611.jpg?v=1757513538",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/straight_chrome_towel_rail_-_image_4_2_ea4de82f-e7f8-4d94-b193-79f119ec9611.jpg?v=1757513538",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/straight_towel_rail_drawing_4_2_c349172a-5836-478a-8037-0e9096f70077.jpg?v=1757513537"
      ],
      "price": 200.0,
      "sku": "14112134",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Thu 8th Oct.",
      "specs": {
        "Height": "1200mm",
        "Width": "600mm",
        "Finish": "Chrome"
      },
      "dimensions": {},
      "components": [
        "towel-rail"
      ],
      "note": "Valves not included; add the chrome valve pair.",
      "topPick": true,
      "description": "The Fairford 600mm x 1200mm Straight Chrome Towel Rail is a functional addition to any bathroom, designed with modern aesthetics and performance in mind. Its chrome finish complements various decors while ensuring durability against wear and tear. With dimensions of 600mm x 1200mm, it provides ample space to keep towels warm and organized. This towel rail has a heat output of 2182 BTU at 60 degrees Celsius, keeping your bathroom cozy during colder months.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14110292",
      "supplier": "Stonewater Bathrooms",
      "category": "Heating",
      "requirementIds": [
        "main-rail"
      ],
      "name": "Fairford Strive Towel Radiator - 1200mm X 600mm - Chrome",
      "size": "1200H × 600W mm · chrome · 30mm projection",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-strive-towel-radiator-1200mm-x-600mm-chrome",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58135039705354.jpg?v=1775644718",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58135039705354.jpg?v=1775644718",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/st-40120-a-2_32_8ab70c76-880c-4fc6-aaf7-5d29fb40829e.jpg?v=1775644718"
      ],
      "price": 187.32,
      "sku": "14110292",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Wed 7th Oct.",
      "specs": {
        "Height": "1200mm",
        "Width": "600mm",
        "Finish": "Chrome"
      },
      "dimensions": {},
      "components": [
        "towel-rail"
      ],
      "note": "Valves not included.",
      "topPick": false,
      "description": "The Fairford Strive Towel Radiator, measuring 1200mm x 600mm, combines modern design with practicality in a sleek chrome finish. Constructed from durable low carbon steel, it promises long-lasting performance backed by a 5-year guarantee.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14112129",
      "supplier": "Stonewater Bathrooms",
      "category": "Heating",
      "requirementIds": [
        "shower-rail"
      ],
      "name": "Fairford 500mm x 1000mm Straight Chrome Towel Rail",
      "size": "1000H × 500W mm · chrome · straight",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-500mm-x-1000mm-straight-chrome-towel-rail",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/straight_chrome_towel_rail_-_image_3_1_a25ba255-ef77-43f7-a2a8-cb427446993e.jpg?v=1757513078",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/straight_chrome_towel_rail_-_image_3_1_a25ba255-ef77-43f7-a2a8-cb427446993e.jpg?v=1757513078",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/straight_towel_rail_drawing_3_1_869552df-29d7-43e3-ac34-e0d1d09599b4.jpg?v=1757513078"
      ],
      "price": 152.0,
      "sku": "14112129",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Height": "1000mm",
        "Width": "500mm",
        "Finish": "Chrome"
      },
      "dimensions": {},
      "components": [
        "towel-rail"
      ],
      "note": "Valves not included; add the chrome valve pair.",
      "topPick": true,
      "description": "The Fairford 500mm x 1000mm Straight Chrome Towel Rail combines practicality with a modern aesthetic, making it a valuable addition to any bathroom. Its chrome finish ensures durability and resistance to wear, while its wall-mounted design allows for easy installation. With a heat output of 1540 BTUs at 60 degrees Celsius, this towel rail effectively keeps towels warm and the bathroom comfortable.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14110281",
      "supplier": "Stonewater Bathrooms",
      "category": "Heating",
      "requirementIds": [
        "shower-rail"
      ],
      "name": "Fairford Strive Towel Radiator - 1000mm X 500mm - Chrome",
      "size": "1000H × 500W mm · chrome",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-strive-towel-radiator-1000mm-x-500mm-chrome",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58135004709130.jpg?v=1775644633",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58135004709130.jpg?v=1775644633",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/st-40120-a-2_25_0bf50a71-87cf-4948-81e6-2405fc0bc1a9.jpg?v=1757903848"
      ],
      "price": 145.87,
      "sku": "14110281",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Wed 7th Oct.",
      "specs": {
        "Height": "1000mm",
        "Width": "500mm",
        "Finish": "Chrome"
      },
      "dimensions": {},
      "components": [
        "towel-rail"
      ],
      "note": "Valves not included.",
      "topPick": false,
      "description": "The Fairford Strive Towel Radiator, measuring 1000mm x 500mm, features a polished chrome finish that complements modern bathrooms. Made from durable low carbon steel, it offers resistance to wear and corrosion, ensuring longevity. Its vertical design and 70mm tapping centres allow for versatile installation in various spaces, making it suitable for areas where traditional horizontal radiators may not fit.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14110240",
      "supplier": "Stonewater Bathrooms",
      "category": "Fittings",
      "requirementIds": [
        "main-rail",
        "shower-rail"
      ],
      "name": "Fairford Designer Straight Towel Rail Valves Pair - Chrome",
      "size": "Pair · straight · chrome",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-designer-straight-towel-rail-valves-pair-chrome",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/trv001-1_bc234bae-aeec-43df-85f4-642f8ff6f1b7.jpg?v=1757525914",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/trv001-1_bc234bae-aeec-43df-85f4-642f8ff6f1b7.jpg?v=1757525914",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/trv001-2_1_2c608d79-ab02-44c3-87fe-63eec99fe257.jpg?v=1757525913"
      ],
      "price": 24.31,
      "sku": "14110240",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Wed 7th Oct.",
      "specs": {
        "Type": "Straight",
        "Finish": "Chrome",
        "Quantity": "Pair"
      },
      "dimensions": {},
      "components": [
        "valves"
      ],
      "note": "Use angled valves if the pipes come out of the wall.",
      "topPick": true,
      "description": "The Fairford Designer Straight Towel Rail Valves Pair in Chrome is a stylish addition to contemporary bathrooms. Made from high-quality brass, these valves are durable and corrosion-resistant, ensuring they perform well even in humid conditions. Their sleek chrome finish and round design complement various bathroom decors, making them suitable for renovations or upgrades.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14110224",
      "supplier": "Stonewater Bathrooms",
      "category": "Fittings",
      "requirementIds": [
        "main-rail",
        "shower-rail"
      ],
      "name": "Fairford Designer Angled Towel Rail Valves Pair - Chrome",
      "size": "Pair · angled · chrome",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-designer-angled-towel-rail-valves-pair-chrome",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/trv002-1_6ef6431a-9107-447c-a39b-7faf8ea624e2.jpg?v=1757525773",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/trv002-1_6ef6431a-9107-447c-a39b-7faf8ea624e2.jpg?v=1757525773"
      ],
      "price": 24.31,
      "sku": "14110224",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Wed 7th Oct.",
      "specs": {
        "Type": "Angled",
        "Finish": "Chrome",
        "Quantity": "Pair"
      },
      "dimensions": {},
      "components": [
        "valves"
      ],
      "note": "For pipes that come up from the floor.",
      "topPick": false,
      "description": "The Fairford Designer Angled Towel Rail Valves Pair in Chrome offers a modern solution for contemporary bathrooms. These valves feature a sleek, round design with a polished chrome finish that enhances any interior décor. Made from high-quality brass, they are durable and resistant to daily wear, ensuring long-lasting performance. Designed for easy installation, these valves streamline the setup process, saving time and effort during renovations or upgrades.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-32086100",
      "supplier": "Stonewater Bathrooms",
      "category": "Showers",
      "requirementIds": [
        "shower-door"
      ],
      "name": "Fairford 8mm, 1000mm Sliding Shower Door",
      "size": "1000mm door · 8mm glass · 1900mm high · fits 990mm",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-8mm-1000mm-sliding-shower-door",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/F8P_-_Sliding_Doors_Chrome_195e6e13-9abd-4b15-bd69-f4cace03b1ac.png?v=1774347256",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/F8P_-_Sliding_Doors_Chrome_195e6e13-9abd-4b15-bd69-f4cace03b1ac.png?v=1774347256",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/8mm_framed_glass_sliding_shower_door_drawing_3.jpg?v=1774347255"
      ],
      "price": 706.0,
      "sku": "32086100",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Door": "1000mm",
        "Glass": "8mm",
        "Height": "1900mm"
      },
      "dimensions": {},
      "components": [
        "shower-door"
      ],
      "note": "Door only; add the 800mm side panel.",
      "topPick": true,
      "description": "The Fairford 8mm Sliding Shower Door offers a blend of modern design and functionality, perfect for enhancing any bathroom. Crafted with 8mm thick glass, it provides durability alongside a sophisticated appearance. The door measures 1900mm in height and adjusts between 945mm and 990mm in width, fitting 1000mm shower trays seamlessly. Its sliding configuration saves space, making it suitable for various bathroom sizes.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-32087080",
      "supplier": "Stonewater Bathrooms",
      "category": "Showers",
      "requirementIds": [
        "shower-door"
      ],
      "name": "Fairford 8mm, 800mm Side Panel",
      "size": "800mm side panel · 8mm glass · 1900mm high",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-8mm-800mm-side-panel",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/F8P_-_Side_Panels_Chrome_bfb24cf1-969c-4a6e-a512-3abe92c675e4.png?v=1774347285",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/F8P_-_Side_Panels_Chrome_bfb24cf1-969c-4a6e-a512-3abe92c675e4.png?v=1774347285",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/8mm_framed_glass_side_panel_drawing_2_1.jpg?v=1774347285"
      ],
      "price": 439.0,
      "sku": "32087080",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Tue 6th Oct.",
      "specs": {
        "Panel": "800mm",
        "Glass": "8mm",
        "Height": "1900mm"
      },
      "dimensions": {},
      "components": [
        "side-panel"
      ],
      "note": "Makes the 1000 × 800mm corner with the door.",
      "topPick": true,
      "description": "The Fairford 8mm, 800mm Side Panel offers a modern solution for your shower space, featuring durable 8mm thick glass with an easy-clean coating for effortless maintenance. With a height of 1900mm and an adjustable width between 765mm and 790mm, it is designed to fit perfectly with an 800mm shower tray.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-34086100",
      "supplier": "Stonewater Bathrooms",
      "category": "Showers",
      "requirementIds": [
        "shower-door"
      ],
      "name": "Fairford 8mm Frameless 1000mm Chrome Sliding Shower Door",
      "size": "1000mm frameless door · 8mm · 2000mm high",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-8mm-frameless-1000mm-chrome-sliding-shower-door",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/F8FS_-_Sliding_Doors_Chrome_379250b4-12ba-4108-b86e-875ff717c100.png?v=1774347794",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/F8FS_-_Sliding_Doors_Chrome_379250b4-12ba-4108-b86e-875ff717c100.png?v=1774347794",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_60999759626506.jpg?v=1775747594"
      ],
      "price": 576.0,
      "sku": "34086100",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Wed 7th Oct.",
      "specs": {
        "Door": "1000mm (950–990mm)",
        "Glass": "8mm",
        "Height": "2000mm",
        "Finish": "Chrome"
      },
      "dimensions": {},
      "components": [
        "shower-door"
      ],
      "note": "Frameless option; pair with the frameless 800mm panel.",
      "topPick": false,
      "description": "The Fairford 8mm Frameless 1000mm Chrome Sliding Shower Door offers a sleek, minimalist design paired with reliable performance. Made from 8mm toughened safety glass, this frameless wetroom door features discreet chrome profiles that create a clean, modern appearance while reducing visual clutter. Its Aqua-Shield easy-clean coating helps resist water stains and limescale, simplifying maintenance and ensuring long-lasting clarity.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-34087080",
      "supplier": "Stonewater Bathrooms",
      "category": "Showers",
      "requirementIds": [
        "shower-door"
      ],
      "name": "Fairford 8mm Frameless 800mm Chrome Side Panel",
      "size": "800mm frameless side panel · 8mm · 2000mm high",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-8mm-frameless-800mm-chrome-side-panel",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/CHROME-MOMENTUM-DETAIL_INSITU_001-1500x1500_295756e6-6475-46bd-a963-5809357552c2.jpg?v=1775897466",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/CHROME-MOMENTUM-DETAIL_INSITU_001-1500x1500_295756e6-6475-46bd-a963-5809357552c2.jpg?v=1775897466",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_61283971006730_47bffe70-1ada-41bb-aca0-548b314fd003.jpg?v=1775897514"
      ],
      "price": 312.0,
      "sku": "34087080",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Wed 7th Oct.",
      "specs": {
        "Panel": "800mm",
        "Glass": "8mm",
        "Height": "2000mm",
        "Finish": "Chrome"
      },
      "dimensions": {},
      "components": [
        "side-panel"
      ],
      "topPick": false,
      "description": "The Fairford 8 mm Frameless 800 mm Chrome Side Panel features crystal-clear toughened glass with a sleek frameless design, offering a minimalist and modern appearance that enhances any shower enclosure. Installation is wall-mounted with an adjustment range between 775-790 mm for a precise fit on imperfect walls while maintaining structural integrity and water containment.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-22051080",
      "supplier": "Stonewater Bathrooms",
      "category": "Showers",
      "requirementIds": [
        "shower-tray"
      ],
      "name": "Fairford 1000 X 800mm Rectangular Shower Tray",
      "size": "1000 × 800mm · rectangular",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-1000-x-800mm-rectangular-shower-tray",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9801.jpg?v=1787666793",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/0-9801.jpg?v=1787666793",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/rectangular_shower_tray_drawing_9_fd167814-c4a6-42d7-8ac0-25fa47c37a29.jpg?v=1757508760",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/rectangular_shower_tray_side_waste_9_50da2997-a6c9-4f6b-b7c9-ee5560d78c3c.jpg?v=1757508760"
      ],
      "price": 315.0,
      "sku": "22051080",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Wed 7th Oct.",
      "specs": {
        "Length": "1000mm",
        "Width": "800mm",
        "Guarantee": "25 years"
      },
      "dimensions": {},
      "components": [
        "shower-tray"
      ],
      "note": "Waste sold separately; add the 90mm fast-flow waste.",
      "topPick": true,
      "description": "The Fairford 1000 x 800mm Rectangular Shower Tray is a UK-manufactured product combining modern design with functionality, making it a suitable option for bathroom upgrades. Its low-profile design ensures compatibility with various enclosures while adding an elegant touch to any space. It features a 90mm Hi-Flow Waste system that efficiently manages water flow at 32 litres per minute, preventing waterlogging and ensuring proper drainage.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14120053",
      "supplier": "Stonewater Bathrooms",
      "category": "Fittings",
      "requirementIds": [
        "shower-tray"
      ],
      "name": "Fairford 90mm Fast Flow Shower Tray Waste, Chrome",
      "size": "90mm · fast flow · chrome",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-90mm-fast-flow-shower-tray-waste-chrome",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14120053_8b34e9fa-3e3a-44d0-af2e-4da6deabd154.jpg?v=1757516615",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14120053_8b34e9fa-3e3a-44d0-af2e-4da6deabd154.jpg?v=1757516615",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_61276810117386.jpg?v=1775735572"
      ],
      "price": 38.0,
      "sku": "14120053",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Size": "90mm",
        "Flow": "Fast flow",
        "Finish": "Chrome"
      },
      "dimensions": {},
      "components": [
        "waste"
      ],
      "note": "The high-flow waste the quote asks for.",
      "topPick": true,
      "description": "The Fairford 90mm Fast Flow Shower Tray Waste in Chrome enhances shower efficiency and functionality. This modern accessory is designed for quick and effective drainage, ensuring smooth water management in contemporary shower setups. Its innovative vented dome improves water flow rates, allowing for rapid drainage even during peak use. An offset elbow aids in efficient water redirection, contributing to optimal drainage performance.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-22051080-TP",
      "supplier": "Stonewater Bathrooms",
      "category": "Showers",
      "requirementIds": [
        "shower-tray"
      ],
      "name": "Dezine SolidStone 1000 X 800mm Rectangular Shower Tray with Waste",
      "size": "1000 × 800mm · waste included",
      "url": "https://www.stonewaterbathrooms.com/products/dezine-solidstone-1000-x-800mm-rectangular-shower-tray-with-waste",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/rectangular_shower_tray_side_waste_9_50035f05-a83a-4382-bd4f-d5b2641914eb.jpg?v=1774593206",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/rectangular_shower_tray_side_waste_9_50035f05-a83a-4382-bd4f-d5b2641914eb.jpg?v=1774593206",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14120053_a83d4349-dfd5-414c-82cc-b92cebc2512b.jpg?v=1774593207",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/rectangular_shower_tray_drawing_9_c4268469-1785-4cc2-a005-e1865dc1d483.jpg?v=1774593207"
      ],
      "price": 202.27,
      "sku": "22051080-TP",
      "stock": "TO_ORDER",
      "stockEvidence": "Available to order. Delivery from Wed 7th Oct.",
      "specs": {
        "Length": "1000mm",
        "Width": "800mm"
      },
      "dimensions": {},
      "components": [
        "shower-tray",
        "waste"
      ],
      "note": "Cheaper, with a waste included. Check it is a high-flow waste.",
      "topPick": false,
      "description": "Dezine SolidStone 1000 X 800mm Rectangular Shower Tray with Waste Dezine SolidStone 1000 X 800mm Rectangular Shower Tray with Waste Upgrade your shower experience with the Dezine SolidStone 1000 X 800mm Rectangular Shower Tray with Waste. This premium quality shower tray is crafted with meticulous attention to detail, providing a sleek and sturdy foundation for your shower enclosure.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14169103",
      "supplier": "Stonewater Bathrooms",
      "category": "Furniture",
      "requirementIds": [
        "shower-vanity"
      ],
      "name": "Fairford Union 400mm Slimline White Vanity Unit",
      "size": "400W × 864H × 255D mm · white · slimline",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-union-400mm-slimline-white-vanity-unit",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14169103_-_1_0fcafd41-fca6-4ed3-a5c9-7a263c853077.jpg?v=1757927994",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14169103_-_1_0fcafd41-fca6-4ed3-a5c9-7a263c853077.jpg?v=1757927994",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14169103_-_line_drawing_1d03e672-d8ad-4b0e-9edd-30b02a1b81ae.jpg?v=1757927994"
      ],
      "price": 298.0,
      "sku": "14169103",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Width": "400mm",
        "Height": "864mm",
        "Depth": "255mm",
        "Finish": "White"
      },
      "dimensions": {},
      "components": [
        "vanity"
      ],
      "note": "Unit only; add the 400mm slimline basin.",
      "topPick": true,
      "description": "The Fairford Union 400mm Slimline White Vanity Unit combines elegant design with practical storage solutions for your bathroom. Featuring a sleek gloss white finish, it complements various bathroom styles and pairs well with polymarble basins. Its compact dimensions of 864mm in height and 400mm in width make it ideal for smaller spaces, with a slim depth of only 255mm. Despite its size, the unit offers generous storage with soft-close doors that reduce wear and noise.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14169068",
      "supplier": "Stonewater Bathrooms",
      "category": "Sanitaryware",
      "requirementIds": [
        "shower-vanity"
      ],
      "name": "Fairford Union 400mm Slimline Basin",
      "size": "400W × 255D mm",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-union-400mm-slimline-basin",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58136959779082.jpg?v=1775646890",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58136959779082.jpg?v=1775646890",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14169068_-_drawing_7c3dbece-3e01-496e-ad07-ebbe210771d8.jpg?v=1759024258"
      ],
      "price": 242.0,
      "sku": "14169068",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Width": "400mm",
        "Depth": "255mm",
        "Tap holes": "1, side"
      },
      "dimensions": {},
      "components": [
        "basin"
      ],
      "note": "Fits the slimline Union unit.",
      "topPick": true,
      "description": "The Fairford Union 400mm Slimline Basin combines practical design with contemporary elegance, featuring a gloss white finish that suits various bathroom styles. Its compact dimensions of 400mm width, 255mm depth, and only 40mm height make it ideal for space-constrained environments without sacrificing aesthetic appeal. Constructed from durable polymarble, this basin is designed for longevity and includes a single side tap hole for a streamlined look.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14169735",
      "supplier": "Stonewater Bathrooms",
      "category": "Furniture",
      "requirementIds": [
        "shower-vanity"
      ],
      "name": "Fairford Union 400mm Gloss White Vanity Unit",
      "size": "400mm · gloss white · full depth",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-union-400mm-gloss-white-vanity-unit",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/off184_furniture_v1_co1_e90df591-200a-4014-87da-ca96edfc1076.jpg?v=1759024134",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/off184_furniture_v1_co1_e90df591-200a-4014-87da-ca96edfc1076.jpg?v=1759024134",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58530032517386.jpg?v=1775749582"
      ],
      "price": 322.0,
      "sku": "14169735",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Width": "400mm",
        "Finish": "Gloss white"
      },
      "dimensions": {},
      "components": [
        "vanity"
      ],
      "note": "Unit only; pair with the 400mm full-depth basin.",
      "topPick": false,
      "description": "The Fairford Union 400mm Gloss White Vanity Unit by Stonewater is designed to enhance modern bathrooms with its compact size and elegant aesthetic. Its gloss white finish offers a clean look that complements various décors and is easy to maintain, ensuring it remains in excellent condition over time. Constructed for durability, this unit comes with a 5-year guarantee, providing confidence in its resilience against daily use.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "sw-14169065",
      "supplier": "Stonewater Bathrooms",
      "category": "Sanitaryware",
      "requirementIds": [
        "shower-vanity"
      ],
      "name": "Fairford Union 400mm Full Depth Basin",
      "size": "400W × 355D mm",
      "url": "https://www.stonewaterbathrooms.com/products/fairford-union-400mm-full-depth-basin",
      "imageUrl": "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58136922194186.jpg?v=1775765426",
      "gallery": [
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/cropped_58136922194186.jpg?v=1775765426",
        "https://cdn.shopify.com/s/files/1/0742/2895/7450/files/14169065_-_drawing_4cf62d1c-11cd-4a16-b240-93c85ab94ee0.jpg?v=1757546580"
      ],
      "price": 243.6,
      "sku": "14169065",
      "stock": "IN_STOCK",
      "stockEvidence": "In stock. Delivery from Fri 2nd Oct.",
      "specs": {
        "Width": "400mm",
        "Depth": "355mm"
      },
      "dimensions": {},
      "components": [
        "basin"
      ],
      "note": "Fits the full-depth Union unit.",
      "topPick": false,
      "description": "The Fairford Union 400mm Full Depth Basin combines modern design with practical functionality, featuring a gloss white finish that suits both contemporary and traditional bathrooms. Constructed from durable polymarble, it ensures longevity and resilience, making it a reliable choice for daily use. Measuring 400mm wide, 355mm deep, and 40mm high, this basin optimizes space while maintaining a sleek appearance.",
      "lastChecked": "2026-09-30T23:20:18+00:00"
    },
    {
      "id": "topps-716975",
      "supplier": "Topps Tiles",
      "category": "Tiles",
      "requirementIds": [
        "tile-harlem-caliza-equivalent"
      ],
      "name": "Kapital™ Bone Tile (59.5cm x 59.5cm)",
      "size": "59.5 × 59.5cm · matt porcelain",
      "url": "https://www.toppstiles.co.uk/bathroom-tiles/kapitaltm-bone-tile-59-5cm-x-59-5cm",
      "imageUrl": "https://www.toppstiles.co.uk/static/media/catalog/product/7/1/716975.jpg",
      "gallery": [
        "https://www.toppstiles.co.uk/static/media/catalog/product/7/1/716975.jpg"
      ],
      "price": 60,
      "priceUnit": "per m²",
      "stock": "UNKNOWN",
      "stockEvidence": "Topps shows stock by store: check your local store by postcode on the product page",
      "specs": {
        "Size": "59.5 × 59.5cm",
        "Colour": "Bone",
        "Finish": "Matt",
        "Material": "Porcelain",
        "Effect": "Concrete effect"
      },
      "dimensions": {},
      "components": [],
      "note": "1mm smaller each way than Harlem Caliza (within the accepted size tolerance). Fitter to confirm grout lines.",
      "topPick": true,
      "lastChecked": "2026-10-01T00:00:00+00:00",
      "finish": "Matt",
      "colour": "Bone",
      "material": "Porcelain",
      "effect": "Concrete effect"
    },
    {
      "id": "topps-716977",
      "supplier": "Topps Tiles",
      "category": "Tiles",
      "requirementIds": [
        "tile-kapital-grey"
      ],
      "name": "Kapital™ Grey Tile (59.5cm x 59.5cm)",
      "size": "59.5 × 59.5cm · matt porcelain",
      "url": "https://www.toppstiles.co.uk/bathroom-tiles/kapitaltm-grey-tile-59-5cm-x-59-5cm",
      "imageUrl": "https://www.toppstiles.co.uk/static/media/catalog/product/7/1/716977.jpg",
      "gallery": [
        "https://www.toppstiles.co.uk/static/media/catalog/product/7/1/716977.jpg"
      ],
      "price": 60,
      "priceUnit": "per m²",
      "stock": "UNKNOWN",
      "stockEvidence": "Topps shows stock by store: check your local store by postcode on the product page",
      "specs": {
        "Size": "59.5 × 59.5cm",
        "Colour": "Grey",
        "Finish": "Matt",
        "Material": "Porcelain",
        "Effect": "Concrete effect"
      },
      "dimensions": {},
      "components": [],
      "topPick": true,
      "lastChecked": "2026-10-01T00:00:00+00:00",
      "finish": "Matt",
      "colour": "Grey",
      "material": "Porcelain",
      "effect": "Concrete effect"
    },
    {
      "id": "topps-705459",
      "supplier": "Topps Tiles",
      "category": "Tiles",
      "requirementIds": [
        "tile-cemente-basalt",
        "shower-wall-tiles"
      ],
      "name": "Cemente™ Basalt Tile (60cm x 60cm)",
      "size": "60 × 60cm · matt porcelain",
      "url": "https://www.toppstiles.co.uk/cemente/cementetm-basalt-tile-60cm-x-60cm",
      "imageUrl": "https://www.toppstiles.co.uk/static/media/catalog/product/6/3/635354_v1.jpg",
      "gallery": [
        "https://www.toppstiles.co.uk/static/media/catalog/product/6/3/635354_v1.jpg"
      ],
      "price": 66.25,
      "priceUnit": "per m²",
      "stock": "UNKNOWN",
      "stockEvidence": "Topps shows stock by store: check your local store by postcode on the product page",
      "specs": {
        "Size": "60 × 60cm",
        "Colour": "Basalt",
        "Finish": "Matt",
        "Material": "Porcelain",
        "Effect": "Concrete effect"
      },
      "dimensions": {},
      "components": [],
      "note": "Dark grey concrete effect; also suits the dark grey wall tiles.",
      "topPick": true,
      "lastChecked": "2026-10-01T00:00:00+00:00",
      "finish": "Matt",
      "colour": "Basalt",
      "material": "Porcelain",
      "effect": "Concrete effect"
    }
  ],
  "basket": []
};

export function createBathroomSourcingSeed(): ProjectSourcing {
  const seed = withQuoteInventory(JSON.parse(JSON.stringify(bathroomSourcingSeed)) as ProjectSourcing);
  seed.quoteCostReference = {
    supplier: 'R & R', quotedOn: '2026-01-18',
    rooms: {
      'main-bathroom': { labourPence: 775000, goodsPence: 371000, totalPence: 1146000 },
      'shower-room': { labourPence: 617000, goodsPence: 402000, totalPence: 1019000 },
    },
  };
  const alternatives = new Set(['tile-harlem-caliza-equivalent', 'tile-kapital-grey']);
  seed.requirements = seed.requirements.map((item) => ({ ...item, primaryComponent: item.requiredComponents[0], purpose: alternatives.has(item.id) ? 'alternative' : item.category === 'Fitter check' ? 'check' : 'required' }));
  return seed;
}
