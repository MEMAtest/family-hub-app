export type MerchantEvidence = { url: string; checkedAt: string; note: string };
export type MerchantMatch = {
  name: string;
  category: string;
  reason: string;
  evidence?: MerchantEvidence;
};
type MerchantRule = {
  name: string;
  category: string;
  pattern: RegExp;
  mixed?: boolean;
  directDebitOnly?: boolean;
  evidence?: MerchantEvidence;
  reason?: string;
};

// Match the payee, not arbitrary words in a personal transfer or bank reference.
const merchantText = (description: string) =>
  description
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^\s*card\s+(?:wlt|cls|card)\s+\d+\s*,\s*/i, "")
    .replace(
      /^\s*(?:direct debit|card payment|contactless payment|visa purchase|debit card purchase)\s+/i,
      "",
    )
    .replace(/^\s*(?:(?:paypal|sumup|zettle|sq|sp|clr)[\s_*:.-]+)+/i, "")
    .replace(/['\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const rules: MerchantRule[] = [
  {
    name: "MM Fresh",
    category: "Groceries",
    pattern: /^mm\s+fresh$/,
    evidence: {
      url: "https://ratings.food.gov.uk/business/1250695",
      checkedAt: "2026-10-23",
      note: "Official FSA record identifies MM Fresh as a grocer and green grocer in Penge.",
    },
  },
  {
    name: "Suya Academy",
    category: "Dining",
    pattern: /^suya\s+academy(?:\s+ltd)?$/,
    evidence: {
      url: "https://ratings.food.gov.uk/business/1319113",
      checkedAt: "2026-10-23",
      note: "Official FSA API identifies Suya Academy Ltd as a takeaway/sandwich shop; no inference that this is tuition.",
    },
  },
  {
    name: "Akimalans",
    category: "Shopping",
    pattern: /^akimalans\s+(?:ltd|limited)\b/,
    mixed: true,
    evidence: {
      url: "https://ratings.food.gov.uk/business/1604215",
      checkedAt: "2026-10-23",
      note: "Official FSA API confirms the exact legal name and general retail classification in Woolwich.",
    },
  },
  {
    name: "Galeta Bakery",
    category: "Groceries",
    pattern: /^galeta\s+(?:ltd|limited)\b/,
    evidence: {
      url: "https://galeta.co.uk/",
      checkedAt: "2026-10-23",
      note: "Official bakery site identifies Galeta Limited and bakery products; Companies House 07527266 corroborates the legal name and bread/cake manufacturing.",
    },
  },
  {
    name: "TFC Woolwich",
    category: "Groceries",
    pattern: /^idil\s+retail\s+(?:limited|ltd)\b/,
    evidence: {
      url: "https://anjomanfood.com/store-locator",
      checkedAt: "2026-10-23",
      note: "Supplier stockist list explicitly links TFC Woolwich with Idil Retail Ltd; Companies House lists food retail.",
    },
  },
  {
    name: "ROOT2TIP",
    category: "Personal care",
    pattern: /^(?:www\s+)?root2tip(?:\s+(?:com|co\s+uk))?\b/,
    evidence: {
      url: "https://root2tip.co.uk/policies/contact-information",
      checkedAt: "2026-10-23",
      note: "Official hair-care business contact page identifies the root2tip.com domain.",
    },
  },
  {
    name: "ZYBER",
    category: "Home improvements",
    pattern: /^zyber\s+(?:ltd|limited)\b/,
    evidence: {
      url: "https://www.zyberltd.co.uk/pages/terms-and-conditions",
      checkedAt: "2026-10-23",
      note: "Official tools and decorating retailer identifies company 13278872; registration confirms hardware retail.",
    },
  },
  {
    name: "Woolwich Express Dry Cleaners",
    category: "Personal care",
    pattern: /^woolwich\s+express\s+dry\s+c(?:lean(?:ers|ing)?)?\b/,
    evidence: {
      url: "https://expresscleaners.uk/",
      checkedAt: "2026-10-23",
      note: "Official Woolwich dry-cleaning and garment-care service.",
    },
  },
  {
    name: "Boots Photo (CEWE)",
    category: "Shopping",
    pattern: /^cewe\s+boots\b/,
    mixed: true,
    evidence: {
      url: "https://www.bootsphoto.com/photo-printing/instant-photo-prints.html",
      checkedAt: "2026-10-23",
      note: "Official Boots Photo page confirms CEWE photo kiosks and photo products; not a pharmacy classification.",
    },
  },
  {
    name: "Woolwich Library",
    category: "Education",
    pattern: /^woolwich\s+(?:centre\s+)?library\b/,
    mixed: true,
    evidence: {
      url: "https://www.royalgreenwich.gov.uk/directory_record/1613/woolwich_library",
      checkedAt: "2026-10-23",
      note: "Council listing identifies the library and educational/reference services; exact service or fee is unknown.",
    },
  },
  {
    name: "The Black Farmer",
    category: "Groceries",
    pattern: /^the\s+black\s+farmer\b/,
    mixed: true,
    evidence: {
      url: "https://theblackfarmer.com/shop/",
      checkedAt: "2026-10-23",
      note: "Official food retailer and specialist meats shop. Merchant category only; not an itemised receipt.",
    },
  },
  {
    name: "HERE at Outernet",
    category: "Entertainment",
    pattern: /^here\s+at\s+outernet\b/,
    mixed: true,
    evidence: {
      url: "https://www.outernet.com/",
      checkedAt: "2026-10-23",
      note: "Official entertainment district links the HERE at Outernet live venue; exact ticket/bar purchase is unknown.",
    },
  },
  {
    name: "Indigo Rich Mix",
    category: "Dining",
    pattern: /^indigo\s+rich\s*mix\b/,
    evidence: {
      url: "https://www.indigostreetfood.com/",
      checkedAt: "2026-10-23",
      note: "Official food-service site corroborates the venue catering list; ICO ZB314297 lists Indigo Rich Mix as a trading name.",
    },
  },
  {
    name: "Little Mouse",
    category: "Needs review",
    pattern: /^little\s+mouse$/,
    reason:
      "A cheese shop and wine bar share this name. Groceries or Dining needs confirmation for this payment.",
    evidence: {
      url: "https://littlemousecheese.com/",
      checkedAt: "2026-10-23",
      note: "Candidate business runs both a cheese shop and wine bar. Name alone does not establish the payment purpose.",
    },
  },
  {
    name: "Home Insurance LBIS",
    category: "Insurance",
    pattern: /^home\s+insurance\s*lbis\b/,
  },
  {
    name: "Mytime Active",
    category: "Subscriptions",
    pattern: /^mytime\s+active\b/,
    directDebitOnly: true,
  },
  {
    name: "Mytime Active",
    category: "Entertainment",
    pattern: /^mytime\s+active\b/,
    mixed: true,
  },
  { name: "Uber Eats", category: "Dining", pattern: /^uber\s*eats\b/ },
  { name: "Deliveroo", category: "Dining", pattern: /^deliveroo\b/ },
  { name: "Just Eat", category: "Dining", pattern: /^just\s*eat\b/ },
  {
    name: "Tesco",
    category: "Groceries",
    pattern: /^tesco\b(?!\s+(?:bank|mobile|insurance)\b)/,
  },
  {
    name: "Sainsbury's",
    category: "Groceries",
    pattern: /^sainsburys?\b(?!\s+(?:bank|insurance)\b)/,
  },
  {
    name: "Asda",
    category: "Groceries",
    pattern: /^asda\b(?!\s+(?:money|insurance)\b)/,
  },
  { name: "Aldi", category: "Groceries", pattern: /^aldi\b/ },
  { name: "Lidl", category: "Groceries", pattern: /^(?:\d+\s+)?lidl\b/ },
  { name: "Waitrose", category: "Groceries", pattern: /^waitrose\b/ },
  {
    name: "Morrisons",
    category: "Groceries",
    pattern: /^(?:wm\s+)?morrisons?\b/,
  },
  {
    name: "Co-op food",
    category: "Groceries",
    pattern: /^co\s*op\b(?!\s+(?:bank|insurance|funeral)\b)/,
  },
  { name: "Ocado", category: "Groceries", pattern: /^ocado\b/ },
  {
    name: "Iceland",
    category: "Groceries",
    pattern: /^iceland(?:\s+(?:foods?|stores?|ltd|london)\b|$)/,
  },
  { name: "Budgens", category: "Groceries", pattern: /^budgens\b/ },
  {
    name: "M&S food",
    category: "Groceries",
    pattern: /^(?:m and s|marks and spencer)\s+(?:simply\s+)?food\b/,
  },
  {
    name: "Bethel food shops",
    category: "Groceries",
    pattern: /^bethel\s+(?:mini\s+mart|cash\s+(?:and\s+)?carry)\b/,
  },
  {
    name: "Tazaki Cash & Carry",
    category: "Groceries",
    pattern: /^tazaki\s+cash\s+(?:and\s+)?carry\b/,
  },
  { name: "United Veg", category: "Groceries", pattern: /^united\s+veg\b/ },
  {
    name: "Ades food shops",
    category: "Groceries",
    pattern:
      /^ades\s+(?:cash\s+(?:and\s+)?carr\w*|ltd\s+(?:thamesmead|charlton))\b/,
  },
  {
    name: "Tian Tian Market",
    category: "Groceries",
    pattern: /^tian\s+tian\s+market\b/,
  },
  {
    name: "Wing Yip",
    category: "Groceries",
    pattern: /^(?:w\s+)?wing\s+yip\b/,
  },
  {
    name: "Panzers Delicatessen",
    category: "Groceries",
    pattern: /^panzers\s+delicatessen\b/,
  },
  {
    name: "Ksn Vegetable",
    category: "Groceries",
    pattern: /^ksn\s+vegetable\b/,
  },
  {
    name: "Penge General Store",
    category: "Groceries",
    pattern: /^penge\s+general\s+store\b/,
  },
  {
    name: "Anerley Food Centre",
    category: "Groceries",
    pattern: /^anerley\s+food\s+centre\b/,
  },
  {
    name: "Crystal Supermarket",
    category: "Groceries",
    pattern: /^crystal\s+supermarket\b/,
  },
  {
    name: "Hasans Fruit & Veg",
    category: "Groceries",
    pattern: /^hasans?\s+fruit\s+and\s+veg\b/,
  },
  {
    name: "Aziz Cash & Carry",
    category: "Groceries",
    pattern: /^aziz\s+cash\s+(?:and\s+)?carry\b/,
  },
  {
    name: "United Butchers",
    category: "Groceries",
    pattern: /^united\s+butchers\b/,
  },
  {
    name: "Murray Bros Butchers",
    category: "Groceries",
    pattern: /^murray\s+bros\s+butchers\b/,
  },
  {
    name: "Hasan Halal Meat",
    category: "Groceries",
    pattern: /^hasan\s+halal\s+meat\b/,
  },
  { name: "Ginger Pig", category: "Groceries", pattern: /^ginger\s+pig\b/ },
  {
    name: "Best Quality Meat",
    category: "Groceries",
    pattern: /^best\s+qu[ae]?lity\s+meat\b/,
  },
  {
    name: "My Butcher and Fish",
    category: "Groceries",
    pattern: /^my\s+butcher\s+and\s+fish\b/,
  },
  {
    name: "Woolwich Meat Fish",
    category: "Groceries",
    pattern: /^woolwich\s+meat\s+fish\b/,
  },
  { name: "M S Butcher", category: "Groceries", pattern: /^m\s+s\s+butcher\b/ },
  {
    name: "Villagers Fine Sausages",
    category: "Groceries",
    pattern: /^villagers\s+fine\s+sausag\w*\b/,
  },
  {
    name: "Fishmongers Plaice",
    category: "Groceries",
    pattern: /^fishmongers\s+plaice\b/,
  },
  { name: "Costa Coffee", category: "Dining", pattern: /^costa\s+coffee\b/ },
  { name: "Starbucks", category: "Dining", pattern: /^starbucks\b/ },
  {
    name: "Pret A Manger",
    category: "Dining",
    pattern: /^pret(?:\s+a\s+manger)?\b/,
  },
  { name: "McDonald's", category: "Dining", pattern: /^mcdonalds?\b/ },
  { name: "KFC", category: "Dining", pattern: /^kfc\b/ },
  { name: "Nandos", category: "Dining", pattern: /^nandos\b/ },
  { name: "Greggs", category: "Dining", pattern: /^greggs\b/ },
  { name: "Gail's Bakery", category: "Dining", pattern: /^gails\b/ },
  {
    name: "Boulangerie Jade",
    category: "Dining",
    pattern: /^boulangerie\s+jade\b/,
  },
  {
    name: "Blackbird Bakery",
    category: "Dining",
    pattern: /^blackbird\s+bakery\b/,
  },
  {
    name: "Oliviers Bakery",
    category: "Dining",
    pattern: /^oliviers\s+bakery\b/,
  },
  {
    name: "Brown & Green Cafe",
    category: "Dining",
    pattern: /^brown\s+(?:and\s+)?green\s+cafe\b/,
  },
  { name: "Loki Coffee", category: "Dining", pattern: /^loki\s+coffee\b/ },
  { name: "Roti Joupa", category: "Dining", pattern: /^roti\s+joupa\b/ },
  {
    name: "Bagels and Jerk",
    category: "Dining",
    pattern: /^bagels\s+and\s+jerk\b/,
  },
  { name: "Farmer J", category: "Dining", pattern: /^farmer\s+j\b/ },
  { name: "Grandir", category: "Childcare", pattern: /^grandir\b/ },
  {
    name: "Mini Athletics",
    category: "Children's activities",
    pattern: /^(?:www\s+)?miniathletics(?:\s+com)?\b/,
  },
  {
    name: "Octopus Energy",
    category: "Household bills",
    pattern: /^octopus(?:\s+energy\b|$)/,
  },
  {
    name: "British Gas",
    category: "Household bills",
    pattern: /^british\s+gas\b/,
  },
  {
    name: "EDF Energy",
    category: "Household bills",
    pattern: /^edf(?:\s+energy)?\b/,
  },
  {
    name: "E.ON",
    category: "Household bills",
    pattern: /^e\s*on(?:\s+next)?\b/,
  },
  {
    name: "Scottish Power",
    category: "Household bills",
    pattern: /^scottish\s*power\b/,
  },
  {
    name: "Thames Water",
    category: "Household bills",
    pattern: /^thames\s+water\b/,
  },
  {
    name: "Council tax",
    category: "Household bills",
    pattern: /^(?:council\s+tax|bromley\s+council\s+tax)\b/,
  },
  { name: "Hyperoptic", category: "Household bills", pattern: /^hyperoptic\b/ },
  {
    name: "Virgin Media",
    category: "Household bills",
    pattern: /^virgin\s+media\b/,
  },
  {
    name: "BT",
    category: "Household bills",
    pattern: /^bt\s+(?:group|broadband|consumer)\b/,
  },
  {
    name: "Sky",
    category: "Household bills",
    pattern: /^sky\s+(?:digital|subscription|broadband|mobile)\b/,
  },
  {
    name: "O2",
    category: "Household bills",
    pattern: /^o2(?:\s+(?:uk|mobile|telefonica|bill|payment)\b|$)/,
  },
  { name: "Vodafone", category: "Household bills", pattern: /^vodafone\b/ },
  {
    name: "EE",
    category: "Household bills",
    pattern: /^ee(?:\s+(?:limited|ltd|mobile|bill)\b|$)/,
  },
  {
    name: "Three mobile",
    category: "Household bills",
    pattern: /^(?:three\s+mobile|hutchison\s+3g)\b/,
  },
  { name: "giffgaff", category: "Household bills", pattern: /^giffgaff\b/ },
  { name: "Netflix", category: "Subscriptions", pattern: /^netflix\b/ },
  { name: "Spotify", category: "Subscriptions", pattern: /^spotify\b/ },
  {
    name: "Disney+",
    category: "Subscriptions",
    pattern: /^disney(?:\s+(?:plus|subscription|dd)\b|$)/,
  },
  {
    name: "Amazon Prime",
    category: "Subscriptions",
    pattern: /^(?:amazon|amzn)\s+prime\b/,
  },
  {
    name: "YouTube Premium",
    category: "Subscriptions",
    pattern: /^youtube\s+premium\b/,
  },
  {
    name: "David Lloyd",
    category: "Subscriptions",
    pattern: /^david\s+lloyd\b/,
  },
  { name: "PureGym", category: "Subscriptions", pattern: /^pure\s*gym\b/ },
  {
    name: "The Gym Group",
    category: "Subscriptions",
    pattern: /^(?:the\s+)?gym\s+group\b/,
  },
  {
    name: "Transport for London",
    category: "Transport",
    pattern: /^(?:tfl|transport\s+for\s+london)\b/,
  },
  { name: "Trainline", category: "Transport", pattern: /^trainline\b/ },
  {
    name: "National Rail",
    category: "Transport",
    pattern: /^national\s+rail\b/,
  },
  { name: "Uber", category: "Transport", pattern: /^uber\b/ },
  {
    name: "Bolt",
    category: "Transport",
    pattern: /^bolt\s+(?:ride|trip|eu)\b/,
  },
  {
    name: "Bromley parking",
    category: "Transport",
    pattern: /^bromley\s+(?:cc|council)\s+parking\b/,
  },
  { name: "RingGo", category: "Transport", pattern: /^ringgo\b/ },
  { name: "PayByPhone", category: "Transport", pattern: /^paybyphone\b/ },
  {
    name: "BP",
    category: "Transport",
    pattern: /^bp\s+(?:\w+\s+)?(?:connect|petrol|fuel|garage)\b/,
    mixed: true,
  },
  { name: "Boots", category: "Health", pattern: /^boots\b/, mixed: true },
  {
    name: "Superdrug",
    category: "Health",
    pattern: /^superdrug\b/,
    mixed: true,
  },
  {
    name: "Macks Pharmacy",
    category: "Health",
    pattern: /^macks\s+pharmacy\b/,
  },
  {
    name: "Royal Arsenal Pharmacy",
    category: "Health",
    pattern: /^royal\s+arsenal\s+pharmacy\b/,
  },
  { name: "Specsavers", category: "Health", pattern: /^specsavers\b/ },
  {
    name: "Savers Health & Beauty",
    category: "Personal care",
    pattern: /^savers\s+health\s+and\s+beauty\b/,
    mixed: true,
  },
  {
    name: "Sassy Hair & Cosmetics",
    category: "Personal care",
    pattern: /^sassy\s+hair\s+and\s+cosmeti\w*\b/,
  },
  {
    name: "Woolwich Hair & Cosmetics",
    category: "Personal care",
    pattern: /^woolwich\s+hair\s+and\s+cosmet\w*\b/,
  },
  {
    name: "Shaba Hair & Cosmetics",
    category: "Personal care",
    pattern: /^shaba\s+hair\s+and\s+cosmetics\b/,
  },
  { name: "B&Q", category: "Home improvements", pattern: /^b\s+and\s+q\b/ },
  { name: "Screwfix", category: "Home improvements", pattern: /^screwfix\b/ },
  { name: "Homebase", category: "Home improvements", pattern: /^homebase\b/ },
  { name: "Wickes", category: "Home improvements", pattern: /^wickes\b/ },
  {
    name: "Toolstation",
    category: "Home improvements",
    pattern: /^toolstation\b/,
  },
  {
    name: "Penge DIY",
    category: "Home improvements",
    pattern: /^penge\s+diy\b/,
  },
  {
    name: "Stonewater Bathrooms",
    category: "Home improvements",
    pattern: /^stonewater\s+bathrooms\b/,
  },
  { name: "IKEA", category: "Shopping", pattern: /^ikea\b/, mixed: true },
  { name: "Argos", category: "Shopping", pattern: /^argos\b/, mixed: true },
  { name: "Dunelm", category: "Shopping", pattern: /^dunelm\b/, mixed: true },
  {
    name: "The Range",
    category: "Shopping",
    pattern: /^the\s+range\b/,
    mixed: true,
  },
  {
    name: "TK Maxx",
    category: "Shopping",
    pattern: /^t\s*k\s+maxx\b/,
    mixed: true,
  },
  {
    name: "Homesense",
    category: "Shopping",
    pattern: /^homesense\b/,
    mixed: true,
  },
  {
    name: "Marks & Spencer",
    category: "Shopping",
    pattern:
      /^(?:marks\s+and\s+spencer|m\s+and\s+s)\b(?!\s+(?:bank|insurance)\b)/,
    mixed: true,
  },
  { name: "Costco", category: "Shopping", pattern: /^costco\b/, mixed: true },
  {
    name: "Amazon",
    category: "Shopping",
    pattern: /^(?:amazon|amzn)\b(?!\s+(?:web|aws)\b)/,
    mixed: true,
  },
  { name: "eBay", category: "Shopping", pattern: /^ebay\b/, mixed: true },
  { name: "B&M", category: "Shopping", pattern: /^b\s+and\s+m\b/, mixed: true },
  { name: "Wilko", category: "Shopping", pattern: /^wilko\b/, mixed: true },
  {
    name: "Hobbycraft",
    category: "Shopping",
    pattern: /^hobbycraft\b/,
    mixed: true,
  },
  { name: "Card Factory", category: "Shopping", pattern: /^card\s+factory\b/ },
  { name: "ProCook", category: "Shopping", pattern: /^procook\b/ },
  { name: "Le Creuset", category: "Shopping", pattern: /^le\s+creuset\b/ },
  { name: "H&M", category: "Clothing", pattern: /^h\s+and\s+m\b/ },
  { name: "Uniqlo", category: "Clothing", pattern: /^uniqlo\b/ },
  { name: "Primark", category: "Clothing", pattern: /^primark\b/ },
  { name: "Zara", category: "Clothing", pattern: /^zara\b/ },
  { name: "New Balance", category: "Clothing", pattern: /^new\s+balance\b/ },
  { name: "My Clothing", category: "Clothing", pattern: /^my\s+clothing\b/ },
  {
    name: "Oxygen trampoline park",
    category: "Entertainment",
    pattern: /^oxygen\s+(?:the\s+)?o2\b/,
  },
  { name: "Odeon", category: "Entertainment", pattern: /^odeon\b/ },
  { name: "Cineworld", category: "Entertainment", pattern: /^cineworld\b/ },
  {
    name: "Vue Cinemas",
    category: "Entertainment",
    pattern: /^vue\s+(?:cinema|entertainment)\b/,
  },
  { name: "Premier Inn", category: "Holidays", pattern: /^premier\s+inn\b/ },
  { name: "Travelodge", category: "Holidays", pattern: /^travelodge\b/ },
  { name: "Airbnb", category: "Holidays", pattern: /^airbnb\b/ },
];

export function recogniseMerchant(description: string): MerchantMatch | null {
  const mobilePayee = /^\s*transfer mob,\s*([^,]+),/i.exec(description)?.[1].trim();
  if (mobilePayee && /^sunnyfields day nu(?:rsery)?$/i.test(mobilePayee)) {
    return {
      name: 'Sunnyfields Day Nursery', category: 'Childcare',
      reason: 'Sunnyfields Day Nursery identified from the named payee, not a child name in the reference.',
      evidence: { url: 'https://www.sunnyfields.net/', checkedAt: '2026-10-24', note: 'The official nursery website describes its childcare provision. The statement abbreviates the payee to Sunnyfields Day Nu.' },
    };
  }
  if (mobilePayee && /^(?:hmrc|hm revenue (?:and|&) customs|london borough of(?: [a-z -]+)?)$/i.test(mobilePayee)) {
    const name = /^hm/i.test(mobilePayee) ? 'HMRC' : 'Local council';
    if (name === 'HMRC') {
      const childcareReference = /^\s*transfer mob,\s*[^,]+,\s*1100\d{9}\s*$/i.test(description);
      return childcareReference ? {
        name: 'HMRC childcare account', category: 'Childcare',
        reason: 'Named HMRC payee with the documented Tax-Free Childcare account-reference format. Childcare account funding, not a provider bill; no child identity inferred.',
        evidence: { url: 'https://www.gov.uk/guidance/sign-in-to-your-childcare-provider-account-for-tax-free-childcare', checkedAt: '2026-10-24', note: 'HMRC documents a unique 13-digit childcare account number beginning 1100. A contribution is not the later provider payment.' },
      } : { name: 'HMRC', category: 'Needs review', reason: 'HMRC administers tax and childcare accounts. The named payee alone does not establish this payment purpose.' };
    }
    return { name, category: 'Tax & government', reason: `${name} identified from the named bank payee. Government payment; the specific tax or fee is not stated.` };
  }
  const text = merchantText(description);
  // A bank/product name or card repayment does not identify the purchases behind it.
  if (
    /\b(?:repayment|balance transfer|credit card payment|loan payment)\b/.test(
      text,
    )
  )
    return null;
  const rule = rules.find(
    (item) =>
      item.pattern.test(text) &&
      (!item.directDebitOnly || /^\s*direct debit\s+/i.test(description)),
  );
  if (!rule) return null;
  return {
    name: rule.name,
    category: rule.category,
    ...(rule.evidence ? { evidence: rule.evidence } : {}),
    reason:
      rule.reason ??
      (rule.mixed
        ? `${rule.name} recognised. Suggested ${rule.category.toLowerCase()}; the purchased items are not shown by the bank.`
        : `${rule.name} recognised. Suggested ${rule.category.toLowerCase()} from the merchant, not an itemised receipt.`),
  };
}
