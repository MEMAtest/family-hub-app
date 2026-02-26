'use client'

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import {
  Brain,
  CheckSquare,
  Lightbulb,
  FileText,
  Flag,
  Calendar,
} from 'lucide-react';
import type { BrainFlowNodeData } from '@/types/brain.types';
import { NODE_STATUS_CONFIG, NODE_PRIORITY_CONFIG } from '@/types/brain.types';

type BrainFlowNodeType = Node<BrainFlowNodeData, 'brainNode'>;

const TYPE_ICON_MAP = {
  thought: Brain,
  task: CheckSquare,
  idea: Lightbulb,
  note: FileText,
  milestone: Flag,
} as const;

const BrainNodeComponent = (props: NodeProps<BrainFlowNodeType>) => {
  const data = props.data as BrainFlowNodeData;
  const selected = props.selected;

  const statusCfg = NODE_STATUS_CONFIG[data.status];
  const priorityCfg = NODE_PRIORITY_CONFIG[data.priority];
  const TypeIcon = TYPE_ICON_MAP[data.nodeType] || Brain;

  const isOverdue =
    data.dueDate && new Date(data.dueDate) < new Date() && data.status !== 'done';

  return (
    <div
      className={`group relative min-w-[160px] max-w-[220px] rounded-lg border-2 bg-white px-3 py-2.5 shadow-sm transition-shadow dark:bg-slate-800
        ${statusCfg.border} ${selected ? 'ring-2 ring-blue-400 shadow-md' : 'hover:shadow-md'}
      `}
      style={{ touchAction: 'none' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-gray-400 dark:!border-slate-800"
      />

      <div className="flex items-start gap-2">
        <div className={`mt-0.5 rounded p-1 ${statusCfg.bg}`}>
          <TypeIcon className={`h-3.5 w-3.5 ${statusCfg.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
            {data.label}
          </p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusCfg.bg} ${statusCfg.color}`}
            >
              {statusCfg.label}
            </span>
            {data.priority !== 'medium' && (
              <span className={`text-[10px] font-medium ${priorityCfg.color}`}>
                {priorityCfg.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {data.dueDate && (
        <div
          className={`mt-1.5 flex items-center gap-1 text-[10px] ${
            isOverdue
              ? 'font-semibold text-red-600'
              : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <Calendar className="h-3 w-3" />
          {new Date(data.dueDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
          {isOverdue && ' (overdue)'}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-gray-400 dark:!border-slate-800"
      />
    </div>
  );
};

export default memo(BrainNodeComponent);
