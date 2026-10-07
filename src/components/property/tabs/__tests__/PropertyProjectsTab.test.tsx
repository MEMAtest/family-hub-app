import { act, fireEvent, render, screen } from '@testing-library/react';
import { PropertyProjectsTab } from '../PropertyProjectsTab';

let mockState: Record<string, unknown>;
jest.mock('@/store/familyStore', () => ({ useFamilyStore: (selector: (state: typeof mockState) => unknown) => selector(mockState) }));
jest.mock('../../projects/ProjectDetailView', () => ({ ProjectDetailView: ({ project, onBack }: { project: { title: string }; onBack: () => void }) => <div><h2>{project.title}</h2><button onClick={onBack}>Back to Projects</button></div> }));
jest.mock('../../projects/ProjectsList', () => ({ ProjectsList: () => <div>Project list</div> }));
jest.mock('../../projects/CreateProjectModal', () => ({ CreateProjectModal: () => null }));

const project = { id: 'bathroom-test', title: 'Restored bathroom' };
beforeEach(() => {
  window.history.replaceState({}, '', '/?view=property&tab=projects');
  mockState = { propertyProjects: [], activeProjectId: null, setActiveProject: jest.fn() };
});

test('URL restores a project after household projects load even without persisted active selection', () => {
  window.history.replaceState({}, '', '/?view=property&tab=projects&bathroomProject=bathroom-test&bathroomView=main-bathroom&bathroomItem=main-bath-filler');
  const { rerender } = render(<PropertyProjectsTab />);
  expect(screen.getByText('Project list')).toBeInTheDocument();
  mockState.propertyProjects = [project];
  rerender(<PropertyProjectsTab />);
  expect(screen.getByRole('heading', { name: project.title })).toBeInTheDocument();
  expect(mockState.setActiveProject).toHaveBeenCalledWith(project.id);
});

test('Back clears bathroom URL and saved navigation rather than reopening on reload', () => {
  window.history.replaceState({ bathroomNavigation: { projectId: project.id } }, '', '/?view=property&tab=projects&bathroomProject=bathroom-test&bathroomView=main-bathroom&bathroomItem=main-bath-filler&bathroomPart=valves');
  mockState.propertyProjects = [project];
  render(<PropertyProjectsTab />);
  fireEvent.click(screen.getByRole('button', { name: 'Back to Projects' }));
  expect(window.location.search).toBe('?view=property&tab=projects');
  expect(window.history.state.bathroomNavigation).toBeUndefined();
  expect(mockState.setActiveProject).toHaveBeenLastCalledWith(null);
  expect(screen.getByText('Project list')).toBeInTheDocument();
});

test('unknown household project URL does not fall back to a different active project', () => {
  window.history.replaceState({}, '', '/?view=property&tab=projects&bathroomProject=another-household');
  mockState.propertyProjects = [project];
  mockState.activeProjectId = project.id;
  render(<PropertyProjectsTab />);
  expect(screen.getByText('Project list')).toBeInTheDocument();
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  act(() => {
    window.history.replaceState({}, '', `/?view=property&tab=projects&bathroomProject=${project.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(screen.getByRole('heading', { name: project.title })).toBeInTheDocument();
});
