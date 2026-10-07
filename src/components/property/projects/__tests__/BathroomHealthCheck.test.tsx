import { render, screen, within } from '@testing-library/react';
import BathroomHealthCheck from '../BathroomHealthCheck';
import QuoteSizeStatus from '../QuoteSizeStatus';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';
import { requiredDemands } from '@/lib/sourcing/selection';

test('health progress ignores search alternatives and shows every spend category with separate dated labour reference', () => {
  const sourcing = createBathroomSourcingSeed();
  const required = requiredDemands(sourcing);
  render(<BathroomHealthCheck sourcing={sourcing} onOpenRequirement={jest.fn()} />);
  expect(screen.getByText(`0/${required.length} required items covered`)).toBeInTheDocument();
  const spend = screen.getByRole('region', { name: 'Category spending' });
  for (const name of ['Lighting', 'Ventilation', 'Accessories', 'Other']) expect(within(spend).getByRole('row', { name: new RegExp(name) })).toBeInTheDocument();
  const costs = screen.getByLabelText('Cost commitments and quote reference');
  expect(costs).toHaveTextContent('£13,920.00');
  expect(costs).toHaveTextContent('£21,650.00');
  expect(costs).toHaveTextContent('Unknown - confirm separately');
  expect(costs).toHaveTextContent('not project total');
  expect(costs).toHaveTextContent('not a current invoice');
});

test('structured within-quote status has a positive teal treatment, not orange room-fit warning', () => {
  const sourcing = createBathroomSourcingSeed();
  const req = sourcing.requirements.find((item) => item.id === 'main-vanity')!;
  const product = { ...sourcing.products[0], name: 'Vanity WITH basin', components: ['vanity', 'basin'], dimensions: { widthMm: 600 } };
  render(<QuoteSizeStatus requirement={req} product={product} />);
  const label = screen.getByText(/Within checked quote sizes/);
  expect(label).toHaveAttribute('data-quote-size', 'within');
  expect(label).toHaveClass('text-teal-700');
  expect(label).not.toHaveClass('text-amber-700');
});
