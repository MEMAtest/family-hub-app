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
import { createId } from '@/utils/id';
import type {
  BrainProject,
  BrainNode,
  BrainEdge,
  BrainFlowNode,
  BrainFlowEdge,
  BrainNodeStatus,
  CreateProjectFormData,
  CreateNodeFormData,
} from '@/types/brain.types';

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

  // Loading
  isLoading: boolean;

  // UI state
  selectedNodeId: string | null;
  isNodeDetailOpen: boolean;
  isCreateNodeOpen: boolean;
  isCreateProjectOpen: boolean;
  statusFilter: BrainNodeStatus | null;
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
  setSearchQuery: (query: string) => void;

  // Refresh
  refreshProjects: () => Promise<void>;
  refreshTodayData: () => Promise<void>;
}

const BrainContext = createContext<BrainContextValue | undefined>(undefined);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [todayData, setTodayData] = useState<TodayData | null>(null);

  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedProjects = useRef(false);
  const isMountedRef = useRef(true);

  // Clean up position save timer on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (positionSaveTimer.current) {
        clearTimeout(positionSaveTimer.current);
      }
    };
  }, []);

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
    if (hasFetchedProjects.current) return;
    hasFetchedProjects.current = true;
    void refreshProjects();
  }, [refreshProjects]);

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
          if (Array.isArray(data)) setBrainNodes(data);
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
  }, [familyId, activeProjectId, setBrainNodes, setBrainEdges]);

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
  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (statusFilter) result = result.filter((n) => n.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [nodes, statusFilter, searchQuery]);

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
    return edges
      .filter((e) => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId))
      .map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        label: e.label || undefined,
        animated: e.animated || e.edgeType === 'dependency' || e.edgeType === 'sequence',
        data: { edgeType: e.edgeType, label: e.label },
      }));
  }, [edges, filteredNodes]);

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
        content: null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate || null,
        nodeType: data.nodeType,
        positionX: data.positionX ?? Math.random() * 400 + 100,
        positionY: data.positionY ?? Math.random() * 400 + 100,
        tags: [],
        showOnCalendar: false,
        createdAt: now,
        updatedAt: now,
      };
      addBrainNode(optimistic);

      if (familyId) {
        try {
          const res = await fetch(`/api/families/${familyId}/brain/nodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(optimistic),
          });
          if (res.ok) {
            const saved = await res.json();
            updateBrainNodeStore(optimistic.id, saved);
            return { ...optimistic, ...saved };
          }
          // Non-OK response - rollback
          deleteBrainNodeStore(optimistic.id);
        } catch (err) {
          // Network error - rollback
          deleteBrainNodeStore(optimistic.id);
          console.warn('Failed to persist brain node:', err);
        }
      }
      return optimistic;
    },
    [activeProjectId, addBrainNode, deleteBrainNodeStore, familyId, updateBrainNodeStore]
  );

  const updateNode = useCallback(
    async (id: string, updates: Partial<BrainNode>) => {
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
      isLoading,
      selectedNodeId,
      isNodeDetailOpen,
      isCreateNodeOpen,
      isCreateProjectOpen,
      statusFilter,
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
      setSearchQuery,
      refreshProjects,
      refreshTodayData,
    }),
    [
      projects, nodes, edges, activeProjectId, activeProject,
      flowNodes, flowEdges, todayData, isLoading,
      selectedNodeId, isNodeDetailOpen, isCreateNodeOpen, isCreateProjectOpen,
      statusFilter, searchQuery,
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
