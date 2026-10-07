import { fireEvent, render, screen } from '@testing-library/react';
import IncludedPartsEditor from '../IncludedPartsEditor';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';
import { evaluateSelection } from '@/lib/sourcing/selection';
import { quoteLineSelection } from '@/lib/sourcing/quoteInventory';

test('saved bundle quantities change the single-source demand and quote coverage', () => {
  const sourcing = createBathroomSourcingSeed();
  const req = sourcing.requirements.find((item) => item.id === 'main-downlights')!;
  const product = { ...sourcing.products[0], id: 'manual-pack', name: 'Downlight pack', components: ['downlight'], componentEvidence: {}, requirementIds: [req.id] };
  sourcing.products.push(product);
  sourcing.basket.push({ id: 'pack', productId: product.id, requirementId: req.id, quantity: 2, status: 'review' });
  const onSave = jest.fn();
  render(<IncludedPartsEditor product={product} requirement={req} disabled={false} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText('Included quantity downlight'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Contents led bulb'), { target: { value: 'included' } });
  fireEvent.change(screen.getByLabelText('Included quantity led bulb'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save included parts' }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ componentEvidence: expect.objectContaining({ downlight: { quantity: 3, state: 'included', source: 'user', text: 'Confirmed in included-parts editor' } }) }));
  Object.assign(product, onSave.mock.calls[0][0]);
  expect(evaluateSelection(sourcing, req).complete).toBe(true);
  expect(quoteLineSelection(sourcing, sourcing.quoteLines!.find((line) => line.requirementId === req.id)!).complete).toBe(true);
});

test('explicit excluded contents override inferred WITH basin and read-only cannot save', () => {
  const sourcing = createBathroomSourcingSeed();
  const req = sourcing.requirements.find((item) => item.id === 'main-vanity')!;
  const product = { ...sourcing.products[0], name: 'Vanity WITH basin', components: [] };
  const onSave = jest.fn();
  const view = render(<IncludedPartsEditor product={product} requirement={req} disabled={false} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText('Contents basin'), { target: { value: 'excluded' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save included parts' }));
  expect(onSave.mock.calls[0][0].componentEvidence.basin).toMatchObject({ state: 'excluded', quantity: 0, source: 'user' });
  view.rerender(<IncludedPartsEditor product={product} requirement={req} disabled onSave={onSave} />);
  expect(screen.getByLabelText('Contents basin')).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Save included parts' })).not.toBeInTheDocument();
});
