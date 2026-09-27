import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { KitchenDashboard } from '../KitchenDashboard';
import { useFamilyStore } from '@/store/familyStore';
import { createStarterStaples, recordPurchase } from '@/utils/staples';
import { localDateKey, mondayOfLocal } from '@/hooks/useMealLog';

jest.mock('react-hot-toast', () => {
  const toast = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() });
  return { __esModule: true, default: toast };
});

const mockDb = {
  createShoppingList: jest.fn(async () => ({ id: 'list-topups' })),
  getShoppingLists: jest.fn(async () => [] as any[]),
  addShoppingItem: jest.fn(async (_listId: string, item: any) => ({ id: `db-${item.itemName}` })),
  deleteShoppingItem: jest.fn(async () => true),
  getMeals: jest.fn(async () => [] as any[]),
  createMeal: jest.fn(async () => ({ id: 'meal-new' })),
  markMealAsEaten: jest.fn(async () => true),
};
jest.mock('@/services/databaseService', () => ({ __esModule: true, get default() { return mockDb; } }));

const staple = (name: string) => useFamilyStore.getState().kitchenStaples.find((s) => s.name === name)!;
const topUps = () => useFamilyStore.getState().shoppingLists.find((l: any) => l.name === 'Top-ups');

const jsonResponse = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response;

beforeEach(() => {
  jest.clearAllMocks();
  useFamilyStore.setState({
    kitchenStaples: [],
    fridgeChecks: [],
    shoppingLists: [],
    databaseStatus: { connected: true, familyId: 'fam-1', mode: 'database' },
  });
  window.confirm = jest.fn(() => true);
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
  (global as any).fetch = jest.fn();
});

describe('usuals', () => {
  test('starts from the suggested list', async () => {
    render(<KitchenDashboard />);
    fireEvent.click(await screen.findByRole('button', { name: /Start with \d+ suggestions/ }));
    expect(useFamilyStore.getState().kitchenStaples.length).toBeGreaterThan(20);
    expect(staple('Toilet roll')).toBeDefined();
  });

  test('one tap marks it low and puts it on the Top-ups list', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    render(<KitchenDashboard />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Low on Tissues' })); });

    expect(staple('Tissues').flag).toBe('low');
    expect(mockDb.createShoppingList).toHaveBeenCalledWith({ listName: 'Top-ups', category: 'Household' });
    expect(mockDb.addShoppingItem).toHaveBeenCalledWith('list-topups', expect.objectContaining({ itemName: 'Tissues', category: 'Household' }));
    expect(topUps()!.items.map((i: any) => i.name)).toEqual(['Tissues']);

    // A second tap doesn't add it twice
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Low on Tissues' })); });
    expect(mockDb.addShoppingItem).toHaveBeenCalledTimes(1);
  });

  test('uses the existing list on the server if lists have not loaded yet', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    mockDb.getShoppingLists.mockResolvedValueOnce([
      { id: 'server-topups', listName: 'Top-ups', items: [{ id: 'x', itemName: 'Bread', isCompleted: false }] },
    ]);
    render(<KitchenDashboard />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Low on Tissues' })); });

    expect(mockDb.createShoppingList).not.toHaveBeenCalled();
    expect(mockDb.addShoppingItem).toHaveBeenCalledWith('server-topups', expect.objectContaining({ itemName: 'Tissues' }));
    expect(topUps()!.items.map((i: any) => i.name)).toEqual(['Bread', 'Tissues']);
  });

  test('picks the same list on every device if there are duplicates', async () => {
    useFamilyStore.setState({
      kitchenStaples: createStarterStaples(),
      shoppingLists: [
        { id: 'newer-empty', name: 'Top-ups', items: [] },
        { id: 'older-full', name: 'Top-ups', items: [{ id: 'a', name: 'Eggs', completed: false }] },
      ] as any,
    });
    render(<KitchenDashboard />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Low on Tissues' })); });
    expect(mockDb.addShoppingItem).toHaveBeenCalledWith('older-full', expect.anything());
  });

  test('a typed note flags several things, and learns new ones', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    render(<KitchenDashboard />);
    fireEvent.change(screen.getByLabelText(/What have you got/), { target: { value: 'out of eggs, low on nappies' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add' })); });

    expect(staple('Eggs').flag).toBe('out');
    expect(staple('Nappies')).toMatchObject({ flag: 'low', category: 'kids' });
    expect(topUps()!.items.map((i: any) => i.name)).toEqual(['Eggs', 'Nappies']);
  });

  test('a stock note is read by the AI, checked, edited, then saved as counts', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse(200, { items: [
      { name: 'Toilet roll', usual: 'Toilet roll', status: 'count', quantity: 20, unit: 'roll', unitContents: null, daysPerUnit: 2, rateSource: 'stated', assumption: 'You said 2 days a roll.', question: null, category: 'household' },
      { name: 'Baby wipes', usual: 'Baby wipes', status: 'count', quantity: 12, unit: 'pack', unitContents: 'about 80 wipes', daysPerUnit: 3, rateSource: 'estimated', assumption: 'Read as 12 packs.', question: 'How many wipes per pack?', category: 'kids' },
      { name: 'Nappies', usual: null, status: 'count', quantity: 2, unit: 'pack', unitContents: 'about 50 nappies', daysPerUnit: 9, rateSource: 'estimated', assumption: 'About 50 a pack.', question: null, category: 'kids' },
      { name: 'Milk', usual: 'Milk', status: 'low', quantity: null, unit: 'bottle', unitContents: null, daysPerUnit: null, rateSource: 'estimated', assumption: null, question: null, category: 'food' },
    ] }));
    render(<KitchenDashboard />);
    fireEvent.change(screen.getByLabelText(/What have you got/), { target: { value: 'we have 20 toilet tissue, one lasts 2 days, a box of 12 wipes, 2 diaper sets, low on milk' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add' })); });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/families/fam-1/kitchen/stock-note');
    expect(JSON.parse(init.body)).toMatchObject({ text: expect.stringContaining('20 toilet tissue'), usuals: expect.arrayContaining(['Toilet roll']) });

    const review = await screen.findByRole('region', { name: 'Check the stock note' });
    expect(within(review).getAllByTestId('stock-note-item')).toHaveLength(4);
    expect(within(review).getByText(/Lasts about 40 days/)).toBeInTheDocument();
    expect(within(review).getByText('How many wipes per pack? Change the numbers above if you know.')).toBeInTheDocument();
    // Nothing is saved until they confirm
    expect(staple('Toilet roll').stock).toBeUndefined();

    // They know better: 60-wipe packs go every 2 days
    fireEvent.change(within(review).getByLabelText('Days one pack of Baby wipes lasts'), { target: { value: '2' } });
    expect(within(review).getByText(/Lasts about 24 days/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(within(review).getByRole('button', { name: 'Save' })); });

    expect(screen.queryByRole('region', { name: 'Check the stock note' })).not.toBeInTheDocument();
    expect(staple('Toilet roll').stock).toMatchObject({ countedQuantity: 20, daysPerUnit: 2, unit: 'roll', rateSource: 'stated' });
    expect(staple('Baby wipes').stock).toMatchObject({ countedQuantity: 12, daysPerUnit: 2, rateSource: 'stated' });
    expect(staple('Nappies')).toMatchObject({ category: 'kids', stock: expect.objectContaining({ countedQuantity: 2, daysPerUnit: 9 }) });
    expect(staple('Milk').flag).toBe('low');
    expect(topUps()!.items.map((i: any) => i.name)).toEqual(['Milk']);
  });

  test('if the AI is down, a note that says "low" still marks things low', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse(503, { error: 'Working out stock needs an AI key.', unavailable: true }));
    render(<KitchenDashboard />);
    fireEvent.change(screen.getByLabelText(/What have you got/), { target: { value: 'only 2 eggs left, low on bread' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add' })); });
    await waitFor(() => expect(staple('Bread').flag).toBe('low'));
    expect(screen.queryByRole('region', { name: 'Check the stock note' })).not.toBeInTheDocument();
  });

  test('a plain "low on" note never waits for the AI', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    render(<KitchenDashboard />);
    fireEvent.change(screen.getByLabelText(/What have you got/), { target: { value: 'low on bread' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add' })); });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(staple('Bread').flag).toBe('low');
  });

  test('"Bought" on counted stock asks how many and adds them', async () => {
    const counted = createStarterStaples().map((s) => (s.name === 'Toilet roll'
      ? { ...s, stock: { unit: 'roll', daysPerUnit: 2, rateSource: 'stated' as const, countedQuantity: 4, countedAt: new Date().toISOString(), addedSince: 0, lastBoughtUnits: 9 } }
      : s));
    useFamilyStore.setState({ kitchenStaples: counted });
    render(<KitchenDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /All \d+ usuals/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Bought Toilet roll' })[0]);
    const input = screen.getByLabelText('How many rolls of Toilet roll did you buy') as HTMLInputElement;
    expect(input.value).toBe('9');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add bought Toilet roll' }));
    expect(staple('Toilet roll').stock).toMatchObject({ addedSince: 12, lastBoughtUnits: 12 });
    expect(screen.getAllByText(/About 16 rolls left/).length).toBeGreaterThan(0);
  });

  test('ticking it off the shopping list counts as buying it', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    render(<KitchenDashboard />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Low on Milk' })); });

    act(() => {
      useFamilyStore.setState((s: any) => ({
        shoppingLists: s.shoppingLists.map((l: any) => ({ ...l, items: l.items.map((i: any) => ({ ...i, completed: true })) })),
      }));
    });
    await waitFor(() => expect(staple('Milk').flag).toBe('ok'));
    expect(staple('Milk').purchases).toHaveLength(1);
    expect(staple('Milk').onListAt).toBeUndefined();
  });

  test('marking low again clears last time’s ticked-off entry first', async () => {
    const milk = { ...recordPurchase(createStarterStaples().find((s) => s.name === 'Milk')!), flag: 'ok' as const };
    useFamilyStore.setState({
      kitchenStaples: [milk],
      shoppingLists: [{ id: 'list-topups', name: 'Top-ups', items: [{ id: 'old', name: 'Milk', completed: true }] } as any],
    });
    render(<KitchenDashboard />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Low on Milk' })); });

    expect(mockDb.deleteShoppingItem).toHaveBeenCalledWith('old');
    expect(topUps()!.items.map((i: any) => i.id)).toEqual(['db-Milk']);
    expect(staple('Milk').flag).toBe('low'); // not instantly "bought" again
  });

  test('Bought restarts the countdown', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    render(<KitchenDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /^All \d+ usuals$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Bought Bread' }));
    expect(staple('Bread').purchases).toHaveLength(1);
    expect(screen.getAllByText('About 4 days left').length).toBeGreaterThan(0);
  });
});

describe('fridge check', () => {
  const file = new File([new Uint8Array(20)], 'fridge.jpg', { type: 'image/jpeg' });

  test('shows what to use first and which usuals are already there', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, {
      summary: 'Lots of meat and leftovers.',
      items: [{ name: 'Yakult', category: 'drinks', useSoon: false }, { name: 'Leftover stew', category: 'leftovers', useSoon: true }],
      useFirst: ['Leftover stew in the glass dish'],
      mealIdeas: ['Stew with rice'],
    }));
    render(<KitchenDashboard />);
    await act(async () => { fireEvent.change(screen.getByLabelText('Take fridge photo'), { target: { files: [file] } }); });

    expect(await screen.findByText('Leftover stew in the glass dish')).toBeInTheDocument();
    expect(screen.getByText(/no need to buy/).parentElement).toHaveTextContent('Yakult');
    expect(staple('Yakult').seenAt).toBeDefined();
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/families/fam-1/kitchen/fridge-check');

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Have it tonight' })); });
    expect(mockDb.createMeal).toHaveBeenCalledWith(expect.objectContaining({ mealName: 'Stew with rice' }));
    expect(mockDb.markMealAsEaten).not.toHaveBeenCalled();
  });

  test('says so plainly when photo reading is not available', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(503, { error: 'Reading photos needs an AI key', unavailable: true }));
    render(<KitchenDashboard />);
    await act(async () => { fireEvent.change(screen.getByLabelText('Upload fridge photo'), { target: { files: [file] } }); });
    expect(await screen.findByRole('alert')).toHaveTextContent('needs an AI key');
    expect(useFamilyStore.getState().fridgeChecks).toHaveLength(0);
  });
});

describe('receipt restock', () => {
  test('restocks matched usuals on confirmation', async () => {
    useFamilyStore.setState({ kitchenStaples: createStarterStaples() });
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, {
      store: 'Tesco',
      date: '2026-09-25',
      total: 23.5,
      lines: [
        { name: 'Andrex 9 pack', quantity: 1, usual: 'Toilet roll' },
        { name: 'Semi skimmed milk', quantity: 2, usual: null },
        { name: 'Birthday candles', quantity: 1, usual: null },
      ],
    }));
    render(<KitchenDashboard />);
    const file = new File([new Uint8Array(20)], 'receipt.jpg', { type: 'image/jpeg' });
    await act(async () => { fireEvent.change(screen.getByLabelText('Receipt photo'), { target: { files: [file] } }); });

    expect(await screen.findByText('Restock these usuals')).toBeInTheDocument();
    const form = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
    expect(JSON.parse(String(form.get('usuals')))).toContain('Toilet roll');

    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(201, {}));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Restock' })); });

    expect(staple('Toilet roll').purchases[0].slice(0, 10)).toBe('2026-09-25');
    expect(staple('Milk').purchases).toHaveLength(1);
    expect(useFamilyStore.getState().kitchenStaples.some((s) => /candles/i.test(s.name))).toBe(false);
    const budgetCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('budget/expenses'));
    expect(JSON.parse(budgetCall[1].body)).toMatchObject({ expenseName: 'Tesco', amount: 23.5, category: 'Food & Dining' });
  });

  test('counted stock goes up by what the receipt says: a 9-pack is 9 rolls, not a whole usual shop', async () => {
    const counted = createStarterStaples().map((s) => (s.name === 'Toilet roll'
      ? { ...s, stock: { unit: 'roll', daysPerUnit: 2, rateSource: 'stated' as const, countedQuantity: 4, countedAt: new Date().toISOString(), addedSince: 0, lastBoughtUnits: 20 } }
      : s));
    useFamilyStore.setState({ kitchenStaples: counted });
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, {
      store: 'Corner Superstore', date: null, total: null,
      lines: [{ name: 'Andrex toilet tissue 9 pack', quantity: 1, usual: 'Toilet roll', units: 9 }],
    }));
    render(<KitchenDashboard />);
    const file = new File([new Uint8Array(20)], 'receipt.jpg', { type: 'image/jpeg' });
    await act(async () => { fireEvent.change(screen.getByLabelText('Receipt photo'), { target: { files: [file] } }); });

    const form = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
    expect(JSON.parse(String(form.get('counted')))).toEqual({ 'Toilet roll': 'roll' });
    expect(await screen.findByText('+9 rolls')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Restock' })); });
    expect(staple('Toilet roll').stock).toMatchObject({ addedSince: 9, lastBoughtUnits: 9 });
  });

  test('an older receipt than the count says it is already counted, and adds nothing', async () => {
    const countedAt = new Date().toISOString();
    const counted = createStarterStaples().map((s) => (s.name === 'Toilet roll'
      ? { ...s, stock: { unit: 'roll', daysPerUnit: 2, rateSource: 'stated' as const, countedQuantity: 20, countedAt, addedSince: 0, lastBoughtUnits: 20 } }
      : s));
    useFamilyStore.setState({ kitchenStaples: counted });
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, {
      store: 'Corner Superstore', date: '2026-01-02', total: null,
      lines: [{ name: 'Andrex 9 pack', quantity: 1, usual: 'Toilet roll', units: 9 }],
    }));
    render(<KitchenDashboard />);
    const file = new File([new Uint8Array(20)], 'receipt.jpg', { type: 'image/jpeg' });
    await act(async () => { fireEvent.change(screen.getByLabelText('Receipt photo'), { target: { files: [file] } }); });
    expect(await screen.findByText('already in your count')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Restock' })); });
    expect(staple('Toilet roll').stock).toMatchObject({ countedQuantity: 20, addedSince: 0 });
  });
});

describe('meal log', () => {
  const monday = mondayOfLocal(new Date());
  const on = (offset: number) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + offset);
    return new Date(`${localDateKey(d)}T12:00:00`).toISOString();
  };

  test('shows this week and last week, and logs new meals', async () => {
    mockDb.getMeals.mockResolvedValue([
      { id: 'a', mealName: 'Jollof rice', mealDate: on(-6), isEaten: true },
      { id: 'b', mealName: 'Fish fingers', mealDate: on(0), isEaten: true },
      { id: 'c', mealName: 'Lasagne', mealDate: on(0), isEaten: false },
    ]);
    render(<KitchenDashboard />);

    expect(await screen.findByText('Jollof rice')).toBeInTheDocument();
    // Loads once, not on every render
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockDb.getMeals).toHaveBeenCalledTimes(1);
    const lastWeek = screen.getByText('Last week').closest('div')!;
    expect(within(lastWeek).getByText('Jollof rice')).toBeInTheDocument();
    expect(screen.getByText('Fish fingers')).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'We made Lasagne' })); });
    expect(mockDb.markMealAsEaten).toHaveBeenCalledWith('c', true);

    fireEvent.change(screen.getByLabelText('Meal you made'), { target: { value: 'Pepper soup' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Log it' })); });
    expect(mockDb.createMeal).toHaveBeenCalledWith(expect.objectContaining({ mealName: 'Pepper soup' }));
    expect(mockDb.markMealAsEaten).toHaveBeenCalledWith('meal-new', true);
  });
});
