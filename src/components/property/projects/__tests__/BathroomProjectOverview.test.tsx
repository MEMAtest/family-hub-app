import { fireEvent, render, screen } from '@testing-library/react';
import BathroomProjectOverview from '../BathroomProjectOverview';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';
import { addHouseholdItem } from '@/lib/sourcing/householdItems';

test('filtered checklist sits directly after search and ahead of health summaries, with no duplicate choices', () => {
  render(<BathroomProjectOverview sourcing={createBathroomSourcingSeed()} roomId="main-bathroom" isReadOnly
    onOpenRoom={jest.fn()} onOpenRequirement={jest.fn()} onOpenProduct={jest.fn()}
    onSaveRoom={jest.fn()} onAddItem={jest.fn()} onAddOption={jest.fn()} />);
  const input = screen.getByLabelText('Search project items');
  fireEvent.change(input, { target: { value: 'cistern' } });
  const results = screen.getByRole('region', { name: 'Project search results' });
  const health = screen.getByRole('region', { name: 'Bathroom health check' });
  expect(input.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(results.compareDocumentPosition(health) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(input.closest('label')!.parentElement!.nextElementSibling).toBe(results);
  expect(results).toHaveTextContent('cistern');
  expect(screen.queryByRole('region', { name: 'Main Bathroom choices' })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: '' } });
  expect(screen.queryByRole('region', { name: 'Project search results' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Main Bathroom choices' })).toBeInTheDocument();
});

test('search still finds added household items outside the original quotation', () => {
  const sourcing = addHouseholdItem(createBathroomSourcingSeed(), { roomId: 'main-bathroom', name: 'Round LED mirror', category: 'Accessories', quantity: 1, size: '600mm', specification: 'Round mirror', unit: 'each' }, 'req-mirror').sourcing;
  render(<BathroomProjectOverview sourcing={sourcing} roomId="main-bathroom" isReadOnly
    onOpenRoom={jest.fn()} onOpenRequirement={jest.fn()} onOpenProduct={jest.fn()}
    onSaveRoom={jest.fn()} onAddItem={jest.fn()} onAddOption={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Search project items'), { target: { value: 'mirror' } });
  expect(screen.getByRole('region', { name: 'Project search results' })).toHaveTextContent('Round LED mirror');
});
