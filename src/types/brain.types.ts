import type { Node, Edge } from '@xyflow/react';

// ─── Status / Priority / Type unions ───────────────────────────────────
export type BrainNodeStatus = 'todo' | 'in_progress' | 'done' | 'blocked' | 'idea';
export type BrainNodePriority = 'low' | 'medium' | 'high' | 'urgent';
export type BrainNodeType = 'thought' | 'task' | 'idea' | 'note' | 'milestone';
export type BrainProjectStatus = 'active' | 'archived' | 'completed';
export type BrainEdgeType = 'default' | 'dependency' | 'related' | 'sequence';

// ─── Core data interfaces ──────────────────────────────────────────────
export interface BrainProject {
  id: string;
  familyId: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  status: BrainProjectStatus;
  sortOrder: number;
  goalId?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { nodes: number };
}

export interface BrainNode {
  id: string;
  projectId: string;
  title: string;
  content?: string | null;
  status: BrainNodeStatus;
  priority: BrainNodePriority;
  dueDate?: string | null;
  nodeType: BrainNodeType;
  positionX: number;
  positionY: number;
  tags: string[];
  showOnCalendar: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrainEdge {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string | null;
  edgeType: BrainEdgeType;
  animated: boolean;
  createdAt: string;
}

// ─── React Flow typed wrappers ─────────────────────────────────────────
export type BrainFlowNodeData = {
  label: string;
  status: BrainNodeStatus;
  priority: BrainNodePriority;
  nodeType: BrainNodeType;
  dueDate?: string | null;
  tags: string[];
  content?: string | null;
  showOnCalendar: boolean;
};

export type BrainFlowNode = Node<BrainFlowNodeData, 'brainNode'>;

export type BrainFlowEdgeData = {
  edgeType: BrainEdgeType;
  label?: string | null;
};

export type BrainFlowEdge = Edge<BrainFlowEdgeData>;

// ─── Form data ─────────────────────────────────────────────────────────
export interface CreateProjectFormData {
  name: string;
  description?: string;
  color: string;
  icon: string;
  goalId?: string;
}

export interface CreateNodeFormData {
  title: string;
  nodeType: BrainNodeType;
  status: BrainNodeStatus;
  priority: BrainNodePriority;
  dueDate?: string;
  positionX?: number;
  positionY?: number;
}

// ─── Display configs ───────────────────────────────────────────────────
export const NODE_STATUS_CONFIG: Record<BrainNodeStatus, { label: string; color: string; bg: string; border: string }> = {
  todo:        { label: 'To Do',       color: 'text-gray-700',   bg: 'bg-gray-100',    border: 'border-gray-300' },
  in_progress: { label: 'In Progress', color: 'text-blue-700',   bg: 'bg-blue-100',    border: 'border-blue-400' },
  done:        { label: 'Done',        color: 'text-green-700',  bg: 'bg-green-100',   border: 'border-green-400' },
  blocked:     { label: 'Blocked',     color: 'text-red-700',    bg: 'bg-red-100',     border: 'border-red-400' },
  idea:        { label: 'Idea',        color: 'text-purple-700', bg: 'bg-purple-100',  border: 'border-purple-400' },
};

export const NODE_PRIORITY_CONFIG: Record<BrainNodePriority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-yellow-600' },
  high:   { label: 'High',   color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
};

export const NODE_TYPE_ICONS: Record<BrainNodeType, string> = {
  thought:   'Brain',
  task:      'CheckSquare',
  idea:      'Lightbulb',
  note:      'FileText',
  milestone: 'Flag',
};

export const PROJECT_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6B7280', // Gray
  '#92400E', // Brown
];

export const PROJECT_ICONS = [
  'brain', 'lightbulb', 'rocket', 'star', 'heart', 'home',
  'briefcase', 'graduation-cap', 'music', 'palette', 'camera', 'globe',
  'trophy', 'zap', 'book', 'compass',
];

export const EDGE_TYPE_CONFIG: Record<BrainEdgeType, { label: string; style: string; animated: boolean }> = {
  default:    { label: 'Default',    style: 'stroke-gray-400',  animated: false },
  dependency: { label: 'Dependency', style: 'stroke-red-400',   animated: true },
  related:    { label: 'Related',    style: 'stroke-blue-400',  animated: false },
  sequence:   { label: 'Sequence',   style: 'stroke-green-400', animated: true },
};
