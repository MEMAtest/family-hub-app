'use client'

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFamilyStore } from '@/store/familyStore';
import { useNotifications } from '@/contexts/NotificationContext';
import { createId } from '@/utils/id';
import type {
  BrainProject,
  BrainNode,
  BrainEdge,
  BrainFlowNode,
  BrainFlowEdge,
  BrainNodeStatus,
  BrainResolvedLink,
  CreateProjectFormData,
  CreateNodeFormData,
} from '@/types/brain.types';
import {
  buildBrainRelationships,
  extractBrainChecklistItems,
  extractBrainTags,
} from '@/utils/brainText';

interface TodayData {
  total: number;
  groups: Array<{
    project: { id: string; name: string; color: string; icon: string };
    nodes: BrainNode[];
  }>;
}

interface BrainContextValue {
  // Data
  projects: BrainProject[];
  nodes: BrainNode[];
  edges: BrainEdge[];
  activeProjectId: string | null;
  activeProject: BrainProject | null;
  flowNodes: BrainFlowNode[];
  flowEdges: BrainFlowEdge[];
  todayData: TodayData | null;
  linksByNodeId: Record<string, BrainResolvedLink[]>;
  backlinksByNodeId: Record<string, BrainNode[]>;
  mentionSuggestionsByNodeId: Record<string, BrainNode[]>;

  // Loading
  isLoading: boolean;

  // UI state
  selectedNodeId: string | null;
  isNodeDetailOpen: boolean;
  isCreateNodeOpen: boolean;
  isCreateProjectOpen: boolean;
  statusFilter: BrainNodeStatus | null;
  quickFilter: 'all' | 'notes' | 'tasks' | 'due' | 'open' | 'done' | 'tagged';
  searchQuery: string;

  // Actions - projects
  setActiveProject: (id: string | null) => void;
  createProject: (data: CreateProjectFormData) => Promise<BrainProject>;
  updateProject: (id: string, updates: Partial<BrainProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Actions - nodes
  createNode: (data: CreateNodeFormData) => Promise<BrainNode>;
  updateNode: (id: string, updates: Partial<BrainNode>) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  saveNodePositions: (positions: Array<{ id: string; positionX: number; positionY: number }>) => void;

  // Actions - edges
  createEdge: (sourceNodeId: string, targetNodeId: string) => Promise<BrainEdge | null>;
  deleteEdge: (id: string) => Promise<void>;

  // UI actions
  selectNode: (id: string | null) => void;
  setIsNodeDetailOpen: (open: boolean) => void;
  setIsCreateNodeOpen: (open: boolean) => void;
  setIsCreateProjectOpen: (open: boolean) => void;
  setStatusFilter: (status: BrainNodeStatus | null) => void;
  setQuickFilter: (filter: BrainContextValue['quickFilter']) => void;
  setSearchQuery: (query: string) => void;

  // Refresh
  refreshProjects: () => Promise<void>;
  refreshTodayData: () => Promise<void>;
}

const BrainContext = createContext<BrainContextValue | undefined>(undefined);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const BrainProvider = ({ children }: PropsWithChildren) => {
  const familyId = useFamilyStore((s) => s.databaseStatus.familyId);
  const projects = useFamilyStore((s) => s.brainProjects);
  const activeProjectId = useFamilyStore((s) => s.activeBrainProjectId);
  const nodes = useFamilyStore((s) => s.brainNodes);
  const edges = useFamilyStore((s) => s.brainEdges);

  const setBrainProjects = useFamilyStore((s) => s.setBrainProjects);
  const addBrainProject = useFamilyStore((s) => s.addBrainProject);
  const updateBrainProjectStore = useFamilyStore((s) => s.updateBrainProject);
  const deleteBrainProjectStore = useFamilyStore((s) => s.deleteBrainProject);
  const setActiveBrainProject = useFamilyStore((s) => s.setActiveBrainProject);
  const setBrainNodes = useFamilyStore((s) => s.setBrainNodes);
  const addBrainNode = useFamilyStore((s) => s.addBrainNode);
  const updateBrainNodeStore = useFamilyStore((s) => s.updateBrainNode);
  const deleteBrainNodeStore = useFamilyStore((s) => s.deleteBrainNode);
  const updateBrainNodePositions = useFamilyStore((s) => s.updateBrainNodePositions);
  const setBrainEdges = useFamilyStore((s) => s.setBrainEdges);
  const addBrainEdge = useFamilyStore((s) => s.addBrainEdge);
  const deleteBrainEdgeStore = useFamilyStore((s) => s.deleteBrainEdge);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeDetailOpen, setIsNodeDetailOpen] = useState(false);
  const [isCreateNodeOpen, setIsCreateNodeOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BrainNodeStatus | null>(null);
  const [quickFilter, setQuickFilter] = useState<BrainContextValue['quickFilter']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [todayData, setTodayData] = useState<TodayData | null>(null);

  const { showNotification } = useNotifications();

  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedProjects = useRef(false);
  const isMountedRef = useRef(true);
  const notifiedNodeIds = useRef<Set<string>>(new Set());
  const pendingOptimisticNodes = useRef<Map<string, BrainNode>>(new Map());

  // Clean up position save timer on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (positionSaveTimer.current) {
        clearTimeout(positionSaveTimer.current);
      }
    };
  }, []);

  // ─── Overdue node notifications ─────────────────────────────────
  const checkOverdueNotifications = useCallback(async (loadedNodes: BrainNode[]) => {
    const today = new Date().toISOString().split('T')[0];
    const overdueNodes = loadedNodes.filter(
      (n) => n.dueDate && n.dueDate.split('T')[0] < today && n.status !== 'done'
    );

    for (const node of overdueNodes) {
      if (notifiedNodeIds.current.has(node.id)) continue;
      notifiedNodeIds.current.add(node.id);

      await showNotification({
        type: 'reminder',
        title: 'Brain task overdue',
        message: `"${node.title}" is past its due date`,
        icon: '🧠',
        priority: node.priority === 'urgent' ? 'urgent' : 'high',
        category: 'event',
        read: false,
        actionRequired: true,
        actions: [
          { id: 'view', label: 'View', type: 'primary', action: 'view_brain_node', data: { nodeId: node.id, projectId: node.projectId } },
          { id: 'dismiss', label: 'Dismiss', type: 'secondary', action: 'dismiss' },
        ],
        metadata: {
          type: 'brain_overdue',
          nodeId: node.id,
          projectId: node.projectId,
          dedupeKey: `brain-overdue-${node.id}`,
        },
      });
    }
  }, [showNotification]);

  // ─── Fetch projects on mount ─────────────────────────────────────
  const refreshProjects = useCallback(async () => {
    if (!familyId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/families/${familyId}/brain/projects`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setBrainProjects(data);
      }
    } catch (err) {
      console.warn('Failed to fetch brain projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [familyId, setBrainProjects]);

  useEffect(() => {
    if (!familyId || hasFetchedProjects.current) return;
    hasFetchedProjects.current = true;
    void refreshProjects();
  }, [familyId, refreshProjects]);

  // ─── Fetch nodes + edges when active project changes ──────────────
  useEffect(() => {
    if (!familyId || !activeProjectId) {
      setBrainNodes([]);
      setBrainEdges([]);
      return;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const [nodesRes, edgesRes] = await Promise.all([
          fetch(`/api/families/${familyId}/brain/nodes?projectId=${activeProjectId}`),
          fetch(`/api/families/${familyId}/brain/edges?projectId=${activeProjectId}`),
        ]);

        if (nodesRes.ok) {
          const data = await nodesRes.json();
          if (Array.isArray(data)) {
            const loadedIds = new Set(data.map((node: BrainNode) => node.id));
            const pendingNodes = Array.from(pendingOptimisticNodes.current.values())
              .filter((node) => node.projectId === activeProjectId && !loadedIds.has(node.id));
            const pendingIds = new Set(pendingNodes.map((node) => node.id));
            const recentOptimisticNodes = useFamilyStore
              .getState()
              .brainNodes
              .filter((node) => {
                if (node.projectId !== activeProjectId || loadedIds.has(node.id) || pendingIds.has(node.id)) return false;
                const createdAt = new Date(node.createdAt).getTime();
                return node.id.startsWith('bn-') && Date.now() - createdAt < 2 * 60 * 1000;
              });
            const mergedNodes = [...data, ...pendingNodes, ...recentOptimisticNodes];
            setBrainNodes(mergedNodes);
            checkOverdueNotifications(mergedNodes);
          }
        }
        if (edgesRes.ok) {
          const data = await edgesRes.json();
          if (Array.isArray(data)) setBrainEdges(data);
        }
      } catch (err) {
        console.warn('Failed to fetch brain nodes/edges:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [familyId, activeProjectId, setBrainNodes, setBrainEdges, checkOverdueNotifications]);

  // ─── Today data ───────────────────────────────────────────────────
  const refreshTodayData = useCallback(async () => {
    if (!familyId) return;
    try {
      const res = await fetch(`/api/families/${familyId}/brain/today`);
      if (res.ok) {
        setTodayData(await res.json());
      }
    } catch (err) {
      console.warn('Failed to fetch today data:', err);
    }
  }, [familyId]);

  useEffect(() => {
    void refreshTodayData();
  }, [refreshTodayData]);

  // ─── React Flow data transforms ──────────────────────────────────
  const {
    linksByNodeId,
    backlinksByNodeId,
    mentionSuggestionsByNodeId,
  } = useMemo(() => buildBrainRelationships(nodes), [nodes]);

  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (statusFilter) result = result.filter((n) => n.status === statusFilter);
    if (quickFilter === 'notes') result = result.filter((n) => n.nodeType !== 'task');
    if (quickFilter === 'tasks') result = result.filter((n) => n.nodeType === 'task');
    if (quickFilter === 'due') result = result.filter((n) => Boolean(n.dueDate));
    if (quickFilter === 'open') result = result.filter((n) => n.status !== 'done');
    if (quickFilter === 'done') result = result.filter((n) => n.status === 'done');
    if (quickFilter === 'tagged') {
      result = result.filter((n) => n.tags.length > 0 || extractBrainTags(n.content || '').length > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) => {
          const linkedTitles = linksByNodeId[n.id]
            ?.map((link) => link.target?.title || link.title)
            .join(' ') || '';
          const checklistText = extractBrainChecklistItems(n.content || '')
            .map((item) => item.text)
            .join(' ');
          const inlineTags = extractBrainTags(n.content || '').join(' ');
          return [
            n.title,
            n.content || '',
            n.tags.join(' '),
            linkedTitles,
            checklistText,
            inlineTags,
            n.nodeType,
          ].join(' ').toLowerCase().includes(q);
        }
      );
    }
    return result;
  }, [linksByNodeId, nodes, quickFilter, statusFilter, searchQuery]);

  const flowNodes = useMemo<BrainFlowNode[]>(
    () =>
      filteredNodes.map((n) => ({
        id: n.id,
        type: 'brainNode',
        position: { x: n.positionX, y: n.positionY },
        data: {
          label: n.title,
          status: n.status,
          priority: n.priority,
          nodeType: n.nodeType,
          dueDate: n.dueDate,
          tags: n.tags,
          content: n.content,
          showOnCalendar: n.showOnCalendar,
        },
      })),
    [filteredNodes]
  );

  const flowEdges = useMemo<BrainFlowEdge[]>(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const manualEdgeKeys = new Set(edges.map((e) => `${e.sourceNodeId}:${e.targetNodeId}`));
    const manualEdges = edges
      .filter((e) => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId))
      .map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        label: e.label || undefined,
        animated: e.animated || e.edgeType === 'dependency' || e.edgeType === 'sequence',
        data: { edgeType: e.edgeType, label: e.label, source: 'manual' as const },
      }));

    const derivedEdges = filteredNodes.flatMap((node) =>
      (linksByNodeId[node.id] || [])
        .filter((link) => link.target && nodeIds.has(link.target.id) && link.target.id !== node.id)
        .filter((link) => !manualEdgeKeys.has(`${node.id}:${link.target?.id}`))
        .map((link) => ({
          id: `derived-link-${node.id}-${link.target?.id}`,
          source: node.id,
          target: link.target?.id as string,
          label: undefined,
          animated: false,
          style: { stroke: '#14B8A6', strokeWidth: 2, strokeDasharray: '6 4' },
          data: { edgeType: 'related' as const, label: null, source: 'derived-link' as const },
        }))
    );

    return [...manualEdges, ...derivedEdges];
  }, [edges, filteredNodes, linksByNodeId]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  // ─── CRUD: Projects ──────────────────────────────────────────────
  const createProject = useCallback(
    async (data: CreateProjectFormData): Promise<BrainProject> => {
      const now = new Date().toISOString();
      const optimistic: BrainProject = {
        id: createId('bp'),
        familyId: familyId || '',
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        status: 'active',
        sortOrder: projects.length,
        goalId: data.goalId,
        createdAt: now,
        updatedAt: now,
        _count: { nodes: 0 },
      };
      addBrainProject(optimistic);

      if (familyId) {
        try {
          const res = await fetch(`/api/families/${familyId}/brain/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(optimistic),
          });
          if (res.ok) {
            const saved = await res.json();
            updateBrainProjectStore(optimistic.id, saved);
            return { ...optimistic, ...saved };
          }
          // Non-OK response - rollback optimistic add
          deleteBrainProjectStore(optimistic.id);
        } catch (err) {
          // Network error - rollback optimistic add
          deleteBrainProjectStore(optimistic.id);
          console.warn('Failed to persist brain project:', err);
        }
      }
      return optimistic;
    },
    [addBrainProject, deleteBrainProjectStore, familyId, projects.length, updateBrainProjectStore]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<BrainProject>) => {
      updateBrainProjectStore(id, updates);
      if (!familyId) return;
      try {
        const res = await fetch(`/api/families/${familyId}/brain/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const saved = await res.json();
          updateBrainProjectStore(id, saved);
        }
      } catch (err) {
        console.warn('Failed to update brain project:', err);
      }
    },
    [familyId, updateBrainProjectStore]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      deleteBrainProjectStore(id);
      if (!familyId) return;
      try {
        await fetch(`/api/families/${familyId}/brain/projects/${id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Failed to delete brain project:', err);
      }
    },
    [deleteBrainProjectStore, familyId]
  );

  // ─── CRUD: Nodes ─────────────────────────────────────────────────
  const createNode = useCallback(
    async (data: CreateNodeFormData): Promise<BrainNode> => {
      if (!activeProjectId) throw new Error('No active project');

      const now = new Date().toISOString();
      const optimistic: BrainNode = {
        id: createId('bn'),
        projectId: activeProjectId,
        title: data.title,
        content: data.content || null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate || null,
        nodeType: data.nodeType,
        positionX: data.positionX ?? Math.random() * 400 + 100,
        positionY: data.positionY ?? Math.random() * 400 + 100,
        tags: data.tags ?? extractBrainTags(data.content || ''),
        showOnCalendar: data.showOnCalendar ?? false,
        createdAt: now,
        updatedAt: now,
      };
      pendingOptimisticNodes.current.set(optimistic.id, optimistic);
      addBrainNode(optimistic);

      if (familyId) {
        const payload = JSON.stringify(optimistic);
        let lastError: unknown = null;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const res = await fetch(`/api/families/${familyId}/brain/nodes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
            });
            if (res.ok) {
              const saved = await res.json();
              pendingOptimisticNodes.current.delete(optimistic.id);
              updateBrainNodeStore(optimistic.id, saved);
              return { ...optimistic, ...saved };
            }

            if (res.status === 400 || res.status === 404) {
              pendingOptimisticNodes.current.delete(optimistic.id);
              deleteBrainNodeStore(optimistic.id);
              throw new Error(`Failed to persist brain node (${res.status})`);
            }

            lastError = new Error(`Failed to persist brain node (${res.status})`);
          } catch (err) {
            lastError = err;
          }

          await wait(350 * (attempt + 1));
        }

        console.warn('Failed to persist brain node after retries; keeping local optimistic note:', lastError);
      }
      return optimistic;
    },
    [activeProjectId, addBrainNode, deleteBrainNodeStore, familyId, updateBrainNodeStore]
  );

  const updateNode = useCallback(
    async (id: string, updates: Partial<BrainNode>) => {
      const pendingNode = pendingOptimisticNodes.current.get(id);
      if (pendingNode) {
        pendingOptimisticNodes.current.set(id, { ...pendingNode, ...updates });
      }
      updateBrainNodeStore(id, updates);
      if (!familyId) return;
      try {
        const res = await fetch(`/api/families/${familyId}/brain/nodes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const saved = await res.json();
          updateBrainNodeStore(id, saved);
        }
      } catch (err) {
        console.warn('Failed to update brain node:', err);
      }
    },
    [familyId, updateBrainNodeStore]
  );

  const deleteNode = useCallback(
    async (id: string) => {
      pendingOptimisticNodes.current.delete(id);
      deleteBrainNodeStore(id);
      if (selectedNodeId === id) {
        setSelectedNodeId(null);
        setIsNodeDetailOpen(false);
      }
      if (!familyId) return;
      try {
        await fetch(`/api/families/${familyId}/brain/nodes/${id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Failed to delete brain node:', err);
      }
    },
    [deleteBrainNodeStore, familyId, selectedNodeId]
  );

  // ─── Debounced position save ──────────────────────────────────────
  const saveNodePositions = useCallback(
    (positions: Array<{ id: string; positionX: number; positionY: number }>) => {
      updateBrainNodePositions(positions);

      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
      positionSaveTimer.current = setTimeout(async () => {
        if (!familyId || !isMountedRef.current) return;
        try {
          await fetch(`/api/families/${familyId}/brain/nodes/positions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ positions }),
          });
        } catch (err) {
          console.warn('Failed to save node positions:', err);
        }
      }, 300);
    },
    [familyId, updateBrainNodePositions]
  );

  // ─── CRUD: Edges ──────────────────────────────────────────────────
  const createEdge = useCallback(
    async (sourceNodeId: string, targetNodeId: string): Promise<BrainEdge | null> => {
      if (!activeProjectId) return null;
      // Prevent duplicate
      if (edges.some((e) => e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId)) {
        return null;
      }

      const now = new Date().toISOString();
      const optimistic: BrainEdge = {
        id: createId('be'),
        projectId: activeProjectId,
        sourceNodeId,
        targetNodeId,
        label: null,
        edgeType: 'default',
        animated: false,
        createdAt: now,
      };
      addBrainEdge(optimistic);

      if (familyId) {
        try {
          const res = await fetch(`/api/families/${familyId}/brain/edges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(optimistic),
          });
          if (res.ok) {
            const saved = await res.json();
            // Replace optimistic with saved (update id)
            deleteBrainEdgeStore(optimistic.id);
            addBrainEdge(saved);
            return saved;
          }
          // 409 = duplicate edge already exists, or other error - rollback
          deleteBrainEdgeStore(optimistic.id);
          return null;
        } catch (err) {
          // Network error - rollback
          deleteBrainEdgeStore(optimistic.id);
          console.warn('Failed to persist brain edge:', err);
          return null;
        }
      }
      return optimistic;
    },
    [activeProjectId, addBrainEdge, deleteBrainEdgeStore, edges, familyId]
  );

  const deleteEdge = useCallback(
    async (id: string) => {
      deleteBrainEdgeStore(id);
      if (!familyId) return;
      try {
        await fetch(`/api/families/${familyId}/brain/edges/${id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Failed to delete brain edge:', err);
      }
    },
    [deleteBrainEdgeStore, familyId]
  );

  // ─── UI actions ───────────────────────────────────────────────────
  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    if (id) setIsNodeDetailOpen(true);
  }, []);

  const setActiveProject = useCallback(
    (id: string | null) => {
      setActiveBrainProject(id);
      setSelectedNodeId(null);
      setIsNodeDetailOpen(false);
      setStatusFilter(null);
      setQuickFilter('all');
      setSearchQuery('');
    },
    [setActiveBrainProject]
  );

  // ─── Context value ────────────────────────────────────────────────
  const value = useMemo<BrainContextValue>(
    () => ({
      projects,
      nodes,
      edges,
      activeProjectId,
      activeProject,
      flowNodes,
      flowEdges,
      todayData,
      linksByNodeId,
      backlinksByNodeId,
      mentionSuggestionsByNodeId,
      isLoading,
      selectedNodeId,
      isNodeDetailOpen,
      isCreateNodeOpen,
      isCreateProjectOpen,
      statusFilter,
      quickFilter,
      searchQuery,
      setActiveProject,
      createProject,
      updateProject,
      deleteProject,
      createNode,
      updateNode,
      deleteNode,
      saveNodePositions,
      createEdge,
      deleteEdge,
      selectNode,
      setIsNodeDetailOpen,
      setIsCreateNodeOpen,
      setIsCreateProjectOpen,
      setStatusFilter,
      setQuickFilter,
      setSearchQuery,
      refreshProjects,
      refreshTodayData,
    }),
    [
      projects, nodes, edges, activeProjectId, activeProject,
      flowNodes, flowEdges, todayData, linksByNodeId, backlinksByNodeId, mentionSuggestionsByNodeId, isLoading,
      selectedNodeId, isNodeDetailOpen, isCreateNodeOpen, isCreateProjectOpen,
      statusFilter, quickFilter, searchQuery,
      setActiveProject, createProject, updateProject, deleteProject,
      createNode, updateNode, deleteNode, saveNodePositions,
      createEdge, deleteEdge, selectNode,
      refreshProjects, refreshTodayData,
    ]
  );

  return (
    <BrainContext.Provider value={value}>{children}</BrainContext.Provider>
  );
};

export const useBrainContext = () => {
  const context = useContext(BrainContext);
  if (!context) {
    throw new Error('useBrainContext must be used within a BrainProvider');
  }
  return context;
};
