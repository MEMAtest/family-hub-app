import { matchGrandirPreviewToPost, type GrandirCorrelationIntake } from '../grandirPreviewCorrelation';

const body = 'Today the children explored the garden and collected colourful leaves together before making a wonderful autumn display.';
const preview: GrandirCorrelationIntake = { id: 'email', familyId: 'family', receivedAt: '2026-10-21T12:00:00Z',
  text: `Nursery staff posted on your Grandir UK wall: "${body.slice(0, 95)}..."` };
const post: GrandirCorrelationIntake = { id: 'full', familyId: 'family', receivedAt: '2026-10-22T12:00:00Z',
  text: `Grandir nursery: Test nursery\n${body}`, metadata: { sourceDate: '2026-10-21T09:00:00Z',
    grandirPortal: { postId: 'post-1', bodyHash: 'hash', childMemberId: 'askia' } } };
describe('conservative Grandir preview correlation', () => {
  it('matches an exact long normalized prefix using source date, not full-post import date', () => {
    expect(matchGrandirPreviewToPost({ ...preview, text: preview.text?.toUpperCase().replace(/ /g, '  ') }, [post]))
      .toEqual({ intakeId: 'full', postId: 'post-1' });
  });
  it('uses the original Gmail date for backfilled email and London day boundaries', () => {
    expect(matchGrandirPreviewToPost({ ...preview, receivedAt: '2026-10-25',
      metadata: { gmailInternalDate: String(Date.parse('2026-10-20T23:30:00Z')) } }, [post])).not.toBeNull();
  });
  it('does not match short, absent, multiple or non-prefix quotes or fuzzy text', () => {
    for (const text of ['posted on your Grandir UK wall: "Short preview..."', body,
      `${preview.text} ${preview.text}`, preview.text!.replace('children', 'child'),
      `posted on your Grandir UK wall: "${body.slice(10)}"`]) {
      expect(matchGrandirPreviewToPost({ ...preview, text }, [post])).toBeNull();
    }
  });
  it('requires the same family, valid source date and verified full content', () => {
    for (const candidate of [{ ...post, familyId: 'other' }, { ...post, metadata: {} },
      { ...post, metadata: { ...post.metadata as object, sourceDate: '2026-10-20' } },
      { ...post, metadata: { ...post.metadata as object, sourceDate: 'invalid' } }]) {
      expect(matchGrandirPreviewToPost(preview, [candidate])).toBeNull();
    }
  });
  it('returns no match for ambiguous posts but tolerates repeated copies of the same intake', () => {
    expect(matchGrandirPreviewToPost(preview, [post, { ...post, id: 'another' }])).toBeNull();
    expect(matchGrandirPreviewToPost(preview, [post, post])).not.toBeNull();
  });
});
