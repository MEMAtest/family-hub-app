import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductRefresh from '../ProductRefresh';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';

const base = createBathroomSourcingSeed().products[0];
const product = { ...base, sku: undefined, url: 'https://www.stonewaterbathrooms.com/products/example', price: 140, imageUrl: '' };
const draft = { name: 'Imported option', url: product.url, selectedVariant: '10', description: 'Width: 500mm', images: ['https://cdn.shopify.com/a.jpg'], variants: [{ id: '10', name: 'Default Title', sku: 'A10', price: 160, available: true, imageUrl: 'https://cdn.shopify.com/a.jpg' }] };
beforeEach(() => { global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ draft }) }); });
afterEach(() => jest.restoreAllMocks());

test('preview is non-destructive and applies only after the user confirms', async () => {
  const update = jest.fn();
  render(<ProductRefresh product={product} disabled={false} onUpdate={update} />);
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh photo & dimensions' }));
  await waitFor(() => expect(screen.getByRole('img', { name: 'Supplier refresh preview' })).toBeVisible());
  expect(screen.getByText('Supplier price: £160.00 · Saved price stays £140.00.')).toBeVisible();
  expect(update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Use photo & dimensions' }));
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: draft.images[0], dimensions: expect.objectContaining({ widthMm: 500 }) }));
  expect(update.mock.calls[0][0]).not.toHaveProperty('price');
});
test('an unmatched saved SKU cannot silently change the selected product', async () => {
  render(<ProductRefresh product={{ ...product, sku: 'DifferentSKU' }} disabled={false} onUpdate={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh photo & dimensions' }));
  await waitFor(() => expect(screen.getByLabelText('Refresh supplier variant')).toBeVisible());
  expect(screen.getByRole('button', { name: 'Use photo & dimensions' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Refresh supplier variant'), { target: { value: '10' } });
  expect(screen.getByRole('button', { name: 'Use photo & dimensions' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Different supplier code');
});
test('read-only product cannot fetch or change saved details', () => {
  render(<ProductRefresh product={product} disabled onUpdate={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Refresh photo & dimensions' })).toBeDisabled();
  expect(global.fetch).not.toHaveBeenCalled();
});
