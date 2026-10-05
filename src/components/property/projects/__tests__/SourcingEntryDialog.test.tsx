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

test('unsupported URLs do not auto-fetch and editing link clears old product details', async () => {
  open();
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: 'https://example.com/other' } });
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: draft.url } });
  await act(async () => { jest.advanceTimersByTime(600); });
  await waitFor(() => expect(screen.getByLabelText('Price (£)')).toHaveValue(536));
  fireEvent.change(screen.getByLabelText('Product link'), { target: { value: '' } });
  expect(screen.getByLabelText('Product name')).toHaveValue('');
  expect(screen.getByLabelText('Price (£)')).toHaveValue(null);
  expect(screen.queryByRole('img', { name: 'Imported bath' })).not.toBeInTheDocument();
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
  expect(screen.getByRole('button', { name: 'Read Stonewater product' })).toBeEnabled();
});
