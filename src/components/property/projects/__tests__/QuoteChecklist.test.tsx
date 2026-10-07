import { fireEvent, render, screen, within } from '@testing-library/react';
import QuoteChecklist from '../QuoteChecklist';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';

function fixture() {
  const sourcing = createBathroomSourcingSeed();
  sourcing.products.push({ id: 'test-light', name: 'Test chrome downlight', supplier: 'Test supplier', price: 20, imageUrl: 'https://example.com/light.jpg', url: '', stock: 'UNKNOWN', stockEvidence: '', lastChecked: '', dimensions: {}, components: ['downlight', 'led-bulb'] });
  sourcing.basket.push({ id: 'selected-light', productId: 'test-light', requirementId: 'main-downlights', quantity: 1, status: 'ask_fitter' });
  return sourcing;
}

test('visual checklist shows partial quantities, photo and actual selection rather than a false tick', () => {
  render(<QuoteChecklist sourcing={fixture()} roomId="main-bathroom" onOpenRequirement={jest.fn()} onOpenProduct={jest.fn()} />);
  expect(screen.getByText('0 of 14 supply lines selected')).toBeInTheDocument();
  const line = screen.getByRole('listitem', { name: 'Chrome downlights with LED bulbs: Part selected' });
  expect(within(line).getByText('downlight: 1/6 · led bulb: 1/6')).toBeInTheDocument();
  expect(within(line).getByRole('img', { name: 'Test chrome downlight' })).toBeInTheDocument();
  expect(within(line).getByText(/Ask fitter/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Chosen (1)' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'All (14)' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(14);
  fireEvent.error(within(line).getByRole('img', { name: 'Test chrome downlight' }));
  expect(within(line).getByRole('img', { name: 'Photo unavailable for Test chrome downlight' })).toBeInTheDocument();
});

test('full quoted quantity ticks the line and opening or changing uses the correct selection', () => {
  const sourcing = fixture(); sourcing.basket[0].quantity = 6;
  const onOpenRequirement = jest.fn(); const onOpenProduct = jest.fn();
  render(<QuoteChecklist sourcing={sourcing} roomId="main-bathroom" onOpenRequirement={onOpenRequirement} onOpenProduct={onOpenProduct} />);
  expect(screen.getByText('1 of 14 supply lines selected')).toBeInTheDocument();
  const line = screen.getByRole('listitem', { name: 'Chrome downlights with LED bulbs: Selected' });
  fireEvent.click(within(line).getByRole('button', { name: /Inspect selected/ }));
  expect(onOpenProduct).toHaveBeenCalledWith(sourcing.products.find((p) => p.id === 'test-light'), sourcing.requirements.find((r) => r.id === 'main-downlights'));
  fireEvent.click(within(line).getByRole('button', { name: /Change product/ }));
  expect(onOpenRequirement).toHaveBeenCalledWith(sourcing.requirements.find((r) => r.id === 'main-downlights'));
});

test('bath alone does not show as selected for waste or screen lines or the other room', () => {
  const sourcing = createBathroomSourcingSeed();
  const bath = sourcing.products.find((p) => p.components.includes('bath') && !p.components.includes('screen'))!;
  sourcing.basket.push({ id: 'bath-selection', productId: bath.id, requirementId: 'main-bath', quantity: 1, status: 'review' });
  const { rerender } = render(<QuoteChecklist sourcing={sourcing} roomId="main-bathroom" onOpenRequirement={jest.fn()} onOpenProduct={jest.fn()} />);
  expect(screen.getByRole('listitem', { name: 'B-shaped shower bath: Selected' })).toBeInTheDocument();
  const waste = screen.getByRole('listitem', { name: 'Bath pop-up waste: To choose' });
  expect(within(waste).getByText('No product selected')).toBeInTheDocument();
  expect(within(waste).queryByText(bath.name)).not.toBeInTheDocument();
  rerender(<QuoteChecklist sourcing={sourcing} roomId="shower-room" onOpenRequirement={jest.fn()} onOpenProduct={jest.fn()} />);
  expect(screen.getByText('0 of 14 supply lines selected')).toBeInTheDocument();
});

test('linked wrong-tag filler stays Selected with its picture and missing coverage, not silently unselected', () => {
  const sourcing = createBathroomSourcingSeed();
  const product = { ...sourcing.products[0], id: 'manual-wrong', name: 'Chosen supplier option', components: ['cistern'], componentEvidence: {}, description: '', size: '', specs: {} };
  sourcing.products.push(product);
  sourcing.basket.push({ id: 'wrong-linked', requirementId: 'main-bath-filler', productId: product.id, quantity: 1, status: 'review' });
  render(<QuoteChecklist sourcing={sourcing} roomId="main-bathroom" onOpenRequirement={jest.fn()} onOpenProduct={jest.fn()} />);
  const line = screen.getByRole('listitem', { name: 'Element Five two-hole wall-mounted bath filler: Selected - contents unconfirmed' });
  expect(within(line).getByRole('button', { name: /Inspect selected Chosen supplier option/ })).toBeInTheDocument();
  expect(within(line).getByText('bath filler: 0/1')).toBeInTheDocument();
  expect(within(line).queryByText('No product selected')).not.toBeInTheDocument();
});
