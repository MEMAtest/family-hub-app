import { recogniseMerchant } from "./merchants";
import {
  classifyMoneyTransaction,
  emptyMoneyPreferences,
  moneyMerchantKey,
  type MoneyRow,
} from "./moneyPlanner";

test.each([
  ["Card WLT 1234, Tesco-Stores 123", "Tesco", "Groceries"],
  ["Card CLS 1234, Sainsburys S/Mkts", "Sainsbury's", "Groceries"],
  ["Sainsbury’s Woolwich", "Sainsbury's", "Groceries"],
  ["123 Lidl Gb Bromley Town", "Lidl", "Groceries"],
  ["Wm Morrisons Store", "Morrisons", "Groceries"],
  ["Co-Op Group 123", "Co-op food", "Groceries"],
  ["Card Card 1234, Asda Groceries Online", "Asda", "Groceries"],
  ["M&S Simply Food - SSP", "M&S food", "Groceries"],
  ["Marks&Spencer Plc Saca", "Marks & Spencer", "Shopping"],
  ["M&S Greenwich", "Marks & Spencer", "Shopping"],
  ["Costco Wholesale 12", "Costco", "Shopping"],
  ["Iceland", "Iceland", "Groceries"],
  ["Bethel Mini Mart", "Bethel food shops", "Groceries"],
  ["Bethel Cash Carry", "Bethel food shops", "Groceries"],
  ["Ades Cash & Carr", "Ades food shops", "Groceries"],
  ["Tazaki Cash & Carry Lt", "Tazaki Cash & Carry", "Groceries"],
  ["Tian Tian Market", "Tian Tian Market", "Groceries"],
  ["Best Qulity Meat", "Best Quality Meat", "Groceries"],
  ["Villagers Fine Sausag", "Villagers Fine Sausages", "Groceries"],
  ["W Wing Yip (London", "Wing Yip", "Groceries"],
  ["United Veg", "United Veg", "Groceries"],
  ["United Butchers", "United Butchers", "Groceries"],
  ["Penge General Store Lt", "Penge General Store", "Groceries"],
  ["Hasans Fruit & Veg 12", "Hasans Fruit & Veg", "Groceries"],
  ["Zettle_*Loki Coffee Li", "Loki Coffee", "Dining"],
  ["Sumup *Roti Joupa Ltd", "Roti Joupa", "Dining"],
  ["Gail'S Woolwich", "Gail's Bakery", "Dining"],
  ["Oliviers Bakery Ltd", "Oliviers Bakery", "Dining"],
  ["Blackbird Bakery - Pen", "Blackbird Bakery", "Dining"],
  ["Boulangerie Jade", "Boulangerie Jade", "Dining"],
  ["Brown Green Cafe", "Brown & Green Cafe", "Dining"],
  ["Uber Eats", "Uber Eats", "Dining"],
  ["UBEREATS", "Uber Eats", "Dining"],
  ["Uber Trip", "Uber", "Transport"],
  ["Tfl Travel Ch", "Transport for London", "Transport"],
  ["Bromley Cc Parking - C", "Bromley parking", "Transport"],
  ["BP Stanstead Connect", "BP", "Transport"],
  ["Direct Debit Hyperoptic Dd, HYP123", "Hyperoptic", "Household bills"],
  ["Octopus Energy Ltd", "Octopus Energy", "Household bills"],
  ["Thames Water", "Thames Water", "Household bills"],
  ["Direct Debit O2", "O2", "Household bills"],
  ["Direct Debit EE Limited", "EE", "Household bills"],
  ["Disney+", "Disney+", "Subscriptions"],
  ["Amazon Prime*abc", "Amazon Prime", "Subscriptions"],
  ["Paypal *Netflix", "Netflix", "Subscriptions"],
  ["David Lloyd Leisure Li", "David Lloyd", "Subscriptions"],
  ["www.Miniathletics.Com", "Mini Athletics", "Children's activities"],
  ["Grandir Nursery", "Grandir", "Childcare"],
  ["B & Q 123", "B&Q", "Home improvements"],
  ["Homebase 123", "Homebase", "Home improvements"],
  ["Penge Diy", "Penge DIY", "Home improvements"],
  ["Ikea Ltd 12 Greenwich", "IKEA", "Shopping"],
  ["Tk Maxx", "TK Maxx", "Shopping"],
  ["H & M", "H&M", "Clothing"],
  ["SP My Clothing", "My Clothing", "Clothing"],
  ["New Balance *123", "New Balance", "Clothing"],
  ["Savers Health & Beauty", "Savers Health & Beauty", "Personal care"],
  ["Shaba Hair & Cosmetics", "Shaba Hair & Cosmetics", "Personal care"],
  ["Macks Pharmacy", "Macks Pharmacy", "Health"],
  ["Boots,Croydon", "Boots", "Health"],
  ["Le Creuset O2", "Le Creuset", "Shopping"],
  ["Oxygen The O2", "Oxygen trampoline park", "Entertainment"],
  ["Amazon marketplace", "Amazon", "Shopping"],
  ["Premier Inn London", "Premier Inn", "Holidays"],
])(
  "recognises %s without relying on branch/card identifiers",
  (description, name, category) => {
    expect(recogniseMerchant(description)).toMatchObject({ name, category });
  },
);

test.each([
  "Penge",
  "Alex Smith Tesco reimbursement",
  "Faster payment Tesco",
  "Paypal *Private payee",
  "Sumup *Unknown seller",
  "Square",
  "Post Office Counter",
  "Virgin Money",
  "Nationwide",
  "Halifax",
  "Tesco Bank",
  "Sainsburys Bank",
  "Asda Money",
  "Co-op Funeral",
  "Co-op Bank",
  "Marks & Spencer Bank",
  "Iceland Holiday",
  "Green Energy Investment",
  "BTL mortgage",
  "Someone O2",
  "Sky Walker",
  "EE Smith",
  "Bootstrapping Ltd",
  "Netflix credit card payment",
  "Amazon repayment",
  "Direct Debit Monthly payment",
  "Loan payment Tesco",
  "Interest family support",
  "Disney Store",
  "Octopus Publishing",
])("does not invent a shopping purpose for %s", (description) => {
  expect(recogniseMerchant(description)).toBeNull();
});

const row = (overrides: Partial<MoneyRow> = {}): MoneyRow => ({
  id: "one",
  accountId: "a",
  transactionDate: "2026-10-05",
  description: "Card WLT 1234, Ikea Greenwich",
  amount: 25,
  direction: "debit",
  transactionType: "normal",
  ...overrides,
});

test("keeps mixed retailers broad and original bank narratives unchanged", () => {
  const result = classifyMoneyTransaction(row(), emptyMoneyPreferences());
  expect(result).toMatchObject({
    merchantName: "IKEA",
    category: "Shopping",
    kind: "spend",
    assignmentSource: "suggested",
    description: row().description,
    amount: 25,
  });
  expect(result.reason).toContain("purchased items are not shown");
});

test("keeps confirmed choices and old exact rules ahead of the expanded registry", () => {
  const preferences = emptyMoneyPreferences();
  const key = moneyMerchantKey("a", row().description);
  preferences.rules[key] = { category: "Home improvements", kind: "spend" };
  expect(classifyMoneyTransaction(row(), preferences)).toMatchObject({
    category: "Home improvements",
    assignmentSource: "confirmed",
    merchantKey: key,
  });
  preferences.overrides.one = { category: "Transfers", kind: "transfer" };
  expect(classifyMoneyTransaction(row(), preferences)).toMatchObject({
    kind: "transfer",
    assignmentSource: "confirmed",
  });
  expect(
    classifyMoneyTransaction(
      row({ transactionType: "transfer" }),
      emptyMoneyPreferences(),
    ),
  ).toMatchObject({
    category: "Transfers",
    kind: "transfer",
    merchantName: null,
  });
});

test("merchant credits stay unknown without refund evidence; bank-recorded types still win", () => {
  expect(
    classifyMoneyTransaction(
      row({ direction: "credit" }),
      emptyMoneyPreferences(),
    ),
  ).toMatchObject({ kind: "review" });
  expect(
    classifyMoneyTransaction(
      row({ direction: "credit", description: "IKEA refund" }),
      emptyMoneyPreferences(),
    ),
  ).toMatchObject({ kind: "refund", category: "Refunds" });
  expect(
    classifyMoneyTransaction(
      row({ direction: "debit", description: "IKEA refund" }),
      emptyMoneyPreferences(),
    ),
  ).toMatchObject({ kind: "review" });
  expect(
    classifyMoneyTransaction(
      row({ direction: "credit", transactionType: "payroll" }),
      emptyMoneyPreferences(),
    ),
  ).toMatchObject({ kind: "income", assignmentSource: "recorded" });
  expect(
    classifyMoneyTransaction(
      row({ direction: "credit", description: "Other GROSS INTEREST" }),
      emptyMoneyPreferences(),
    ),
  ).toMatchObject({ kind: "income" });
  expect(
    classifyMoneyTransaction(
      row({ direction: "credit", description: "Interest family support" }),
      emptyMoneyPreferences(),
    ),
  ).toMatchObject({ kind: "review" });
});
