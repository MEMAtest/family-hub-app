import type { BrainChecklistItem, BrainNode, BrainResolvedLink } from '@/types/brain.types';

const WIKI_LINK_PATTERN = /\[\[([^\]\n]+)\]\]/g;
const CHECKLIST_PATTERN = /^(\s*)-\s+\[( |x|X)\]\s+(.+)$/;
const TAG_PATTERN = /(?:^|\s)#([A-Za-z0-9_-]+)/g;
const ID_LINK_PREFIX = 'brain:';

export const normalizeBrainTitle = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const deriveBrainNoteTitle = (content: string, fallback = 'Untitled note') => {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim().replace(/^#+\s*/, ''))
    .find(Boolean);

  if (!firstLine) return fallback;
  return firstLine.slice(0, 90);
};

export const extractBrainLinks = (content = '') => {
  const links: string[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(WIKI_LINK_PATTERN)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    const title = raw.split('|')[0].split('#')[0].trim();
    const key = normalizeBrainTitle(title);
    if (!title || seen.has(key)) continue;
    seen.add(key);
    links.push(title);
  }

  return links;
};

export const buildBrainLinkMarkup = (node: Pick<BrainNode, 'id' | 'title'>) =>
  `[[${node.title}|${ID_LINK_PREFIX}${node.id}]]`;

export const displayBrainContent = (content = '') =>
  content.replace(/\[\[([^\]\n]+)\]\]/g, (_match, raw: string) => raw.split('|')[0].trim());

const extractBrainLinkRefs = (content = '') => {
  const refs: Array<{ raw: string; title: string; targetId?: string }> = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(WIKI_LINK_PATTERN)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    const [titlePart, metaPart] = raw.split('|');
    const title = titlePart.split('#')[0].trim();
    const targetId = metaPart?.trim().startsWith(ID_LINK_PREFIX)
      ? metaPart.trim().slice(ID_LINK_PREFIX.length)
      : undefined;
    const key = targetId ? `id:${targetId}` : `title:${normalizeBrainTitle(title)}`;
    if (!title || seen.has(key)) continue;
    seen.add(key);
    refs.push({ raw: title, title, targetId });
  }

  return refs;
};

export const extractBrainChecklistItems = (content = ''): BrainChecklistItem[] =>
  content
    .split('\n')
    .map((line, lineIndex) => {
      const match = line.match(CHECKLIST_PATTERN);
      if (!match) return null;
      return {
        id: `line-${lineIndex}`,
        lineIndex,
        text: match[3].trim(),
        checked: match[2].toLowerCase() === 'x',
      };
    })
    .filter((item): item is BrainChecklistItem => Boolean(item));

export const replaceBrainChecklistItem = (content: string, lineIndex: number, checked: boolean) => {
  const lines = content.split('\n');
  const line = lines[lineIndex];
  const match = line?.match(CHECKLIST_PATTERN);
  if (!line || !match) return content;
  lines[lineIndex] = `${match[1]}- [${checked ? 'x' : ' '}] ${match[3]}`;
  return lines.join('\n');
};

export const extractBrainTags = (content = '') => {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(TAG_PATTERN)) {
    const tag = match[1].trim();
    const key = normalizeBrainTitle(tag);
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags;
};

export const resolveBrainLinks = (nodes: BrainNode[], links: string[]): BrainResolvedLink[] => {
  const refs = links.map((title) => ({ raw: title, title }));
  return resolveBrainLinkRefs(nodes, refs);
};

const resolveBrainLinkRefs = (
  nodes: BrainNode[],
  refs: Array<{ raw: string; title: string; targetId?: string }>
): BrainResolvedLink[] => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const byTitle = new Map<string, BrainNode[]>();
  nodes.forEach((node) => {
    const key = normalizeBrainTitle(node.title);
    byTitle.set(key, [...(byTitle.get(key) || []), node]);
  });

  return refs.map((ref) => {
    if (ref.targetId) {
      return {
        ...ref,
        target: byId.get(ref.targetId),
      };
    }

    const titleMatches = byTitle.get(normalizeBrainTitle(ref.title)) || [];
    return {
      ...ref,
      ambiguous: titleMatches.length > 1,
      target: titleMatches.length === 1 ? titleMatches[0] : undefined,
    };
  });
};

export const buildBrainRelationships = (nodes: BrainNode[]) => {
  const linksByNodeId: Record<string, BrainResolvedLink[]> = {};
  const backlinksByNodeId: Record<string, BrainNode[]> = {};
  const mentionSuggestionsByNodeId: Record<string, BrainNode[]> = {};

  nodes.forEach((node) => {
    linksByNodeId[node.id] = resolveBrainLinkRefs(nodes, extractBrainLinkRefs(node.content || ''));
  });

  nodes.forEach((source) => {
    linksByNodeId[source.id]?.forEach((link) => {
      if (!link.target || link.target.id === source.id) return;
      backlinksByNodeId[link.target.id] = backlinksByNodeId[link.target.id] || [];
      if (!backlinksByNodeId[link.target.id].some((node) => node.id === source.id)) {
        backlinksByNodeId[link.target.id].push(source);
      }
    });
  });

  nodes.forEach((target) => {
    const title = normalizeBrainTitle(target.title);
    if (title.length < 3) {
      mentionSuggestionsByNodeId[target.id] = [];
      return;
    }

    mentionSuggestionsByNodeId[target.id] = nodes.filter((source) => {
      if (source.id === target.id) return false;
      const content = normalizeBrainTitle(source.content || '');
      if (!content.includes(title)) return false;
      const explicitLink = linksByNodeId[source.id]?.some((link) => link.target?.id === target.id);
      return !explicitLink;
    });
  });

  return { linksByNodeId, backlinksByNodeId, mentionSuggestionsByNodeId };
};
