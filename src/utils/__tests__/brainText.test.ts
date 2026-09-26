import {
  buildBrainRelationships,
  deriveBrainNoteTitle,
  buildBrainLinkMarkup,
  displayBrainContent,
  extractBrainChecklistItems,
  extractBrainLinks,
  extractBrainTags,
  replaceBrainChecklistItem,
  resolveBrainLinks,
} from '@/utils/brainText';
import type { BrainNode } from '@/types/brain.types';

const makeNode = (id: string, title: string, content = ''): BrainNode => ({
  id,
  projectId: 'project-1',
  title,
  content,
  status: 'todo',
  priority: 'medium',
  dueDate: null,
  nodeType: 'note',
  positionX: 0,
  positionY: 0,
  tags: [],
  showOnCalendar: false,
  createdAt: '2026-06-24T00:00:00.000Z',
  updatedAt: '2026-06-24T00:00:00.000Z',
});

describe('brainText utilities', () => {
  it('extracts unique wikilinks and ignores aliases/fragments', () => {
    expect(extractBrainLinks('See [[Portugal trip]] and [[Portugal trip|holiday]] plus [[Passport#Renewal]].')).toEqual([
      'Portugal trip',
      'Passport',
    ]);
  });

  it('extracts and toggles markdown checklist items', () => {
    const content = '- [ ] Book hotel\n- [x] Check passports\nNot a task';
    expect(extractBrainChecklistItems(content)).toEqual([
      { id: 'line-0', lineIndex: 0, text: 'Book hotel', checked: false },
      { id: 'line-1', lineIndex: 1, text: 'Check passports', checked: true },
    ]);
    expect(replaceBrainChecklistItem(content, 0, true)).toContain('- [x] Book hotel');
  });

  it('extracts tags from free text', () => {
    expect(extractBrainTags('Pack #travel items for #School and #travel')).toEqual(['travel', 'School']);
  });

  it('derives a note title from the first meaningful content line', () => {
    expect(deriveBrainNoteTitle('\n## Passport renewal\nBook appointment')).toBe('Passport renewal');
  });

  it('resolves links and builds backlinks plus plain mention suggestions', () => {
    const passport = makeNode('n1', 'Passport');
    const booking = makeNode('n2', 'Booking', 'Review [[Passport]] before booking.');
    const plain = makeNode('n3', 'Loose note', 'Remember passport photos.');
    const nodes = [passport, booking, plain];

    expect(resolveBrainLinks(nodes, ['passport'])[0].target?.id).toBe('n1');

    const relationships = buildBrainRelationships(nodes);
    expect(relationships.backlinksByNodeId.n1.map((node) => node.id)).toEqual(['n2']);
    expect(relationships.mentionSuggestionsByNodeId.n1.map((node) => node.id)).toEqual(['n3']);
  });

  it('uses id-backed links for duplicate titles and leaves typed duplicates ambiguous', () => {
    const first = makeNode('n1', 'Passport');
    const second = makeNode('n2', 'Passport');
    const idLinked = makeNode('n3', 'ID linked', `Review ${buildBrainLinkMarkup(second)}.`);
    const titleLinked = makeNode('n4', 'Title linked', 'Review [[Passport]].');

    expect(displayBrainContent(idLinked.content || '')).toBe('Review Passport.');

    const relationships = buildBrainRelationships([first, second, idLinked, titleLinked]);
    expect(relationships.linksByNodeId.n3[0].target?.id).toBe('n2');
    expect(relationships.linksByNodeId.n4[0].ambiguous).toBe(true);
    expect(relationships.linksByNodeId.n4[0].target).toBeUndefined();
  });
});
