import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SourcingEntryDialog from '../SourcingEntryDialog';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';

const draft = { name: 'Imported bath', url: 'https://www.stonewaterbathrooms.com/products/bath', description: 'Bath only', selectedVariant: '10', images: ['https://example.com/bath.jpg'], variants: [{ id: '10', name: 'Default Title', sku: 'B10', price: 536, available: true, imageUrl: 'https://example.com/bath.jpg' }] };
beforeEach(() => { jest.useFakeTimers(); global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ draft }) }); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
function open() { return render(<SourcingEntryDialog mode="product" sourcing={createBathroomSourcingSeed()} roomId="main-bathroom" requirementId="main-bath" onClose={jest.fn()} onItem={jest.fn()} onProduct={jest.fn()} />); }
test('Add item imports the photo and price from a pasted Stonewater link', async () => {
  render(<SourcingEntryDialog mode="item" sourcing={createBathroomSourcingSeed()} roomId="main-bathroom" onClose={jest.fn()} onItem={jest.fn()} onProduct={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: draft.url } });
  await act(async () => { jest.advanceTimersByTime(600); });
  await waitFor(() => expect(screen.getByLabelText('Price (£)')).toHaveValue(536));
  expect(screen.getByLabelText('Item name')).toHaveValue(draft.name);
  expect(screen.getByRole('img', { name: draft.name })).toHaveAttribute('src', draft.images[0]);
});

test('paste alone imports name, picture, price and SKU variant without a second canonical-url request', async () => {
  open();
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: draft.url } });
  await act(async () => { jest.advanceTimersByTime(600); });
  await waitFor(() => expect(screen.getByLabelText('Price (£)')).toHaveValue(536));
  expect(screen.getByLabelText('Product name')).toHaveValue('Imported bath');
  expect(screen.getByRole('img', { name: 'Imported bath' })).toHaveAttribute('src', draft.images[0]);
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('a supplier listing for a cistern marks that included part on the linked quote option', async () => {
  const publicDraft = { ...draft, name: 'Fluid Master concealed cistern', url: 'https://shop.example.com/fluid-master-cistern', description: 'Concealed cistern with flush button', selectedVariant: 'public-page', variants: [{ ...draft.variants[0], id: 'public-page', name: 'Listed product', sku: 'FM1', price: 120 }] };
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ draft: publicDraft }) });
  const onProduct = jest.fn();
  render(<SourcingEntryDialog mode="product" sourcing={createBathroomSourcingSeed()} roomId="main-bathroom" requirementId="main-wc-unit" onClose={jest.fn()} onItem={jest.fn()} onProduct={onProduct} />);
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: publicDraft.url } });
  await act(async () => { jest.advanceTimersByTime(600); });
  await waitFor(() => expect(screen.getByLabelText('Price (£)')).toHaveValue(120));
  expect(screen.getByLabelText('cistern')).toBeChecked();
  expect(screen.getByLabelText('wc unit')).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Save option' }));
  expect(onProduct).toHaveBeenCalledWith(expect.objectContaining({ requirementId: 'main-wc-unit', name: publicDraft.name, components: ['cistern'], sku: 'FM1' }));
});

test('public supplier URLs auto-read product details and changing the link clears stale details', async () => {
  open();
  const publicDraft = { ...draft, name: 'Quiet Extractor Fan', url: 'https://shop.example.com/quiet-extractor-fan', description: 'Quiet bathroom extractor fan with timer', variants: [{ ...draft.variants[0], name: 'Listed product', id: 'public-page', price: 69.99, sku: 'FAN-69' }], selectedVariant: 'public-page' };
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ draft: publicDraft }) });
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: publicDraft.url } });
  await act(async () => { jest.advanceTimersByTime(600); });
  await waitFor(() => expect(screen.getByLabelText('Price (£)')).toHaveValue(69.99));
  expect(screen.getByLabelText('Supplier')).toHaveValue('shop.example.com');
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: '' } });
  expect(screen.getByLabelText('Product name')).toHaveValue('');
  expect(screen.getByLabelText('Price (£)')).toHaveValue(null);
  expect(screen.queryByRole('img', { name: 'Quiet Extractor Fan' })).not.toBeInTheDocument();
});

test('older in-flight import cannot overwrite a changed link', async () => {
  let resolveOld!: (value: unknown) => void;
  (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  open();
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: draft.url } });
  await act(async () => { jest.advanceTimersByTime(600); });
  expect(screen.getByRole('button', { name: 'Save option' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: 'https://example.com/new' } });
  await act(async () => { resolveOld({ ok: true, json: async () => ({ draft }) }); });
  expect(screen.getByLabelText('Product link')).toHaveValue('https://example.com/new');
  expect(screen.getByLabelText('Product name')).toHaveValue('');
});

test('import failure is visible and manual fields remain available', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Supplier unavailable. Enter the option manually.' }) });
  open();
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: draft.url } });
  await act(async () => { jest.advanceTimersByTime(600); });
  expect(screen.getByRole('alert')).toHaveTextContent('Supplier unavailable');
  expect(screen.getByLabelText('Product name')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Read product page' })).toBeEnabled();
});
