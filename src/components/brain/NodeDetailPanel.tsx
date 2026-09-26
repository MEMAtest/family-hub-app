'use client'

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trash2, Calendar, Tag, Link2, CheckCircle2, Circle } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  NODE_STATUS_CONFIG,
  NODE_PRIORITY_CONFIG,
  type BrainNodeStatus,
  type BrainNodePriority,
  type BrainNodeType,
} from '@/types/brain.types';
import AIEnhancedField from '@/components/common/AIEnhancedField';
import { buildBrainLinkMarkup, extractBrainChecklistItems, replaceBrainChecklistItem } from '@/utils/brainText';

const NODE_TYPES: { value: BrainNodeType; label: string }[] = [
  { value: 'thought', label: 'Thought' },
  { value: 'task', label: 'Task' },
  { value: 'idea', label: 'Idea' },
  { value: 'note', label: 'Note' },
  { value: 'milestone', label: 'Milestone' },
];

const NodeDetailPanel = () => {
  const {
    nodes,
    selectedNodeId,
    isNodeDetailOpen,
    setIsNodeDetailOpen,
    updateNode,
    deleteNode,
    selectNode,
    linksByNodeId,
    backlinksByNodeId,
    mentionSuggestionsByNodeId,
  } = useBrainContext();

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedNodeIdRef = useRef(selectedNodeId);

  // Keep ref in sync so debounced callback always targets the correct node
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Clean up save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const node = nodes.find((n) => n.id === selectedNodeId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setContent(node.content || '');
      setLinkTargetId('');
    }
  }, [node]);

  const debouncedSave = useCallback(
    (field: string, value: string | string[] | boolean | null) => {
      const nodeId = selectedNodeIdRef.current;
      if (!nodeId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void updateNode(nodeId, { [field]: value });
      }, 500);
    },
    [updateNode]
  );

  const handleTitleChange = (val: string) => {
    setTitle(val);
    debouncedSave('title', val);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    debouncedSave('content', val);
  };

  const handleFieldChange = (field: string, value: string | boolean | null) => {
    if (!selectedNodeId) return;
    void updateNode(selectedNodeId, { [field]: value });
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || !node) return;
    const newTags = [...node.tags, tagInput.trim()];
    void updateNode(node.id, { tags: newTags });
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!node) return;
    void updateNode(node.id, { tags: node.tags.filter((t) => t !== tag) });
  };

  const handleDelete = () => {
    if (!selectedNodeId) return;
    void deleteNode(selectedNodeId);
    setIsNodeDetailOpen(false);
  };

  const handleInsertLink = () => {
    if (!node || !linkTargetId) return;
    const target = nodes.find((n) => n.id === linkTargetId);
    if (!target) return;
    handleContentChange(`${content}${content ? '\n' : ''}${buildBrainLinkMarkup(target)}`);
  };

  const handleChecklistToggle = (lineIndex: number, checked: boolean) => {
    if (!node) return;
    handleContentChange(replaceBrainChecklistItem(content, lineIndex, checked));
  };

  if (!isNodeDetailOpen || !node) return null;

  const linkedItems = linksByNodeId[node.id] || [];
  const backlinks = backlinksByNodeId[node.id] || [];
  const mentionSuggestions = mentionSuggestionsByNodeId[node.id] || [];
  const checklistItems = extractBrainChecklistItems(content);

  const panelContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
          Node Details
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsNodeDetailOpen(false)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="Node title"
        />

        {/* Status / Priority / Type row */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Status</label>
            <select
              value={node.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {(Object.entries(NODE_STATUS_CONFIG) as [BrainNodeStatus, typeof NODE_STATUS_CONFIG[BrainNodeStatus]][]).map(
                ([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Priority</label>
            <select
              value={node.priority}
              onChange={(e) => handleFieldChange('priority', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {(Object.entries(NODE_PRIORITY_CONFIG) as [BrainNodePriority, typeof NODE_PRIORITY_CONFIG[BrainNodePriority]][]).map(
                ([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Type</label>
            <select
              value={node.nodeType}
              onChange={(e) => handleFieldChange('nodeType', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {NODE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-slate-400">
            <Calendar className="h-3 w-3" /> Due date
          </label>
          <input
            type="date"
            value={node.dueDate ? new Date(node.dueDate).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFieldChange('dueDate', e.target.value || null)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Show on calendar */}
        <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={node.showOnCalendar}
            onChange={(e) => handleFieldChange('showOnCalendar', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show on calendar
        </label>

        {/* Tags */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-slate-400">
            <Tag className="h-3 w-3" /> Tags
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-slate-700 dark:text-slate-300"
              >
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add tag..."
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              onClick={handleAddTag}
              className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300"
            >
              Add
            </button>
          </div>
        </div>

        {/* Content (markdown) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Notes</label>
          <AIEnhancedField
            value={content}
            onChange={handleContentChange}
            rows={6}
            context="Project Brain node notes"
            placeholder="Add notes (markdown supported)..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-slate-400">
            <Link2 className="h-3 w-3" /> Link item
          </label>
          <div className="flex gap-1">
            <select
              value={linkTargetId}
              onChange={(event) => setLinkTargetId(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Choose item...</option>
              {nodes
                .filter((candidate) => candidate.id !== node.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleInsertLink}
              disabled={!linkTargetId}
              className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300"
            >
              Insert
            </button>
          </div>
        </div>

        {checklistItems.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-slate-400">Checklist</label>
            <div className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-slate-700 dark:bg-slate-950">
              {checklistItems.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(event) => handleChecklistToggle(item.lineIndex, event.target.checked)}
                    className="sr-only"
                  />
                  {item.checked ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  <span className={item.checked ? 'line-through opacity-60' : ''}>{item.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(linkedItems.length > 0 || backlinks.length > 0 || mentionSuggestions.length > 0) && (
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-slate-400">Related</label>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
              {linkedItems.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Links from this note</p>
                  <div className="flex flex-wrap gap-1">
                    {linkedItems.map((link) => (
                      <button
                        key={link.raw}
                        type="button"
                        onClick={() => link.target && selectNode(link.target.id)}
                        disabled={!link.target}
                        className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 disabled:opacity-60 dark:bg-teal-900/30 dark:text-teal-200"
                      >
                        {link.target?.title || `${link.title} (${link.ambiguous ? 'ambiguous' : 'missing'})`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {backlinks.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Linked here</p>
                  <div className="flex flex-wrap gap-1">
                    {backlinks.map((linkedNode) => (
                      <button
                        key={linkedNode.id}
                        type="button"
                        onClick={() => selectNode(linkedNode.id)}
                        className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                      >
                        {linkedNode.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mentionSuggestions.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Mentioned but not linked</p>
                  <div className="flex flex-wrap gap-1">
                    {mentionSuggestions.map((mentionedNode) => (
                      <button
                        key={mentionedNode.id}
                        type="button"
                        onClick={() => selectNode(mentionedNode.id)}
                        className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
                      >
                        {mentionedNode.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Desktop: right slide-in panel
  if (isDesktop) {
    return (
      <div className="h-full w-80 flex-shrink-0 border-l border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {panelContent}
      </div>
    );
  }

  // Mobile: bottom sheet
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={() => setIsNodeDetailOpen(false)} />
      <div className="relative max-h-[80vh] rounded-t-xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-600" />
        {panelContent}
      </div>
    </div>
  );
};

export default NodeDetailPanel;
