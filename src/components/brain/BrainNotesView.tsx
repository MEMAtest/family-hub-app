'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, FileText, Link2, Plus, Search, Tag } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import AIEnhancedField from '@/components/common/AIEnhancedField';
import {
  deriveBrainNoteTitle,
  buildBrainLinkMarkup,
  displayBrainContent,
  extractBrainChecklistItems,
  extractBrainTags,
  replaceBrainChecklistItem,
} from '@/utils/brainText';
import type { BrainNode } from '@/types/brain.types';

const isKnowledgeNode = (node: BrainNode) => node.nodeType !== 'task';

const BrainNotesView = () => {
  const {
    nodes,
    createNode,
    updateNode,
    selectNode,
    searchQuery,
    setSearchQuery,
    quickFilter,
    linksByNodeId,
    backlinksByNodeId,
    mentionSuggestionsByNodeId,
  } = useBrainContext();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const noteNodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return nodes
      .filter(isKnowledgeNode)
      .filter((node) => {
        if (quickFilter === 'all' || quickFilter === 'notes') return true;
        if (quickFilter === 'due') return Boolean(node.dueDate);
        if (quickFilter === 'open') return node.status !== 'done';
        if (quickFilter === 'done') return node.status === 'done';
        if (quickFilter === 'tagged') return node.tags.length > 0 || extractBrainTags(node.content || '').length > 0;
        return false;
      })
      .filter((node) => {
        if (!query) return true;
        const linkedTitles = (linksByNodeId[node.id] || [])
          .map((link) => link.target?.title || link.title)
          .join(' ');
        return [
          node.title,
          node.content || '',
          node.tags.join(' '),
          linkedTitles,
          extractBrainChecklistItems(node.content || '').map((item) => item.text).join(' '),
          extractBrainTags(node.content || '').join(' '),
        ].join(' ').toLowerCase().includes(query);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [linksByNodeId, nodes, quickFilter, searchQuery]);

  const insertLink = (targetId: string) => {
    const target = nodes.find((node) => node.id === targetId);
    if (!target) return;

    const linkText = buildBrainLinkMarkup(target);
    setContent((current) => `${current}${current ? '\n' : ''}${linkText}`);
  };

  const saveNote = async () => {
    const trimmedContent = content.trim();
    const trimmedTitle = title.trim() || deriveBrainNoteTitle(trimmedContent);
    if (!trimmedContent && !trimmedTitle) return;

    setSaving(true);
    setSaveError(null);
    try {
      await createNode({
        title: trimmedTitle,
        content: trimmedContent || undefined,
        nodeType: 'note',
        status: 'todo',
        priority: 'medium',
        tags: extractBrainTags(trimmedContent),
      });
      setTitle('');
      setContent('');
      setLinkTargetId('');
    } catch (error) {
      console.warn('Failed to save brain note:', error);
      setSaveError('Could not save this note. Your draft is still here.');
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklistItem = (node: BrainNode, lineIndex: number, checked: boolean) => {
    const nextContent = replaceBrainChecklistItem(node.content || '', lineIndex, checked);
    void updateNode(node.id, { content: nextContent });
  };

  return (
    <div className="bg-gray-50 pb-6 dark:bg-slate-950">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional note title"
              spellCheck
              lang="en-GB"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <AIEnhancedField
              value={content}
              onChange={setContent}
              context="Project Brain household note"
              rows={5}
              placeholder="Capture a note, checklist, or linked thought..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search notes..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={linkTargetId}
                onChange={(event) => {
                  const targetId = event.target.value;
                  setLinkTargetId(targetId);
                  insertLink(targetId);
                }}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                aria-label="Link item"
              >
                <option value="">Link item...</option>
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => linkTargetId && insertLink(linkTargetId)}
                disabled={!linkTargetId}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Link2 className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => void saveNote()}
              disabled={saving || !(title.trim() || content.trim())}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {saving ? 'Saving...' : 'Add note'}
            </button>
            {saveError && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-300">{saveError}</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {noteNodes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No notes found.
          </div>
        ) : (
          <div className="grid items-start gap-3 xl:grid-cols-2">
            {noteNodes.map((node) => {
              const checklist = extractBrainChecklistItems(node.content || '');
              const openChecklistCount = checklist.filter((item) => !item.checked).length;
              const linkedItems = linksByNodeId[node.id] || [];
              const backlinks = backlinksByNodeId[node.id] || [];
              const mentions = mentionSuggestionsByNodeId[node.id] || [];

              return (
                <article
                  key={node.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <button type="button" onClick={() => selectNode(node.id)} className="block w-full text-left">
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{node.title}</h3>
                        {node.content && (
                          <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-5 text-gray-600 dark:text-slate-300">
                            {displayBrainContent(node.content)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>

                  {checklist.length > 0 && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-2 dark:bg-slate-950">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Checklist · {openChecklistCount} open
                      </div>
                      <div className="space-y-1">
                        {checklist.slice(0, 4).map((item) => (
                          <label key={item.id} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(event) => toggleChecklistItem(node, item.lineIndex, event.target.checked)}
                              className="sr-only"
                            />
                            {item.checked ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-gray-400" />
                            )}
                            <span className={`min-w-0 break-words ${item.checked ? 'line-through opacity-60' : ''}`}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {(linkedItems.length > 0 || backlinks.length > 0 || mentions.length > 0 || node.tags.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {linkedItems.slice(0, 3).map((link) => (
                        <button
                          key={`${node.id}-${link.raw}`}
                          type="button"
                          onClick={() => link.target && selectNode(link.target.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-200"
                        >
                          <Link2 className="h-3 w-3" />
                          {link.target?.title || (link.ambiguous ? `${link.title} (ambiguous)` : link.title)}
                        </button>
                      ))}
                      {backlinks.length > 0 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                          {backlinks.length} linked here
                        </span>
                      )}
                      {mentions.length > 0 && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                          {mentions.length} mention{mentions.length === 1 ? '' : 's'}
                        </span>
                      )}
                      {node.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrainNotesView;
