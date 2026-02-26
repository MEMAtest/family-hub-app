'use client'

import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type OnConnect,
  type NodeMouseHandler,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import BrainNodeComponent from './BrainNodeComponent';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { BrainFlowNode, BrainFlowEdge, BrainFlowNodeData } from '@/types/brain.types';

const nodeTypes = { brainNode: BrainNodeComponent } as const;

const MindMapCanvas = () => {
  const {
    flowNodes: contextFlowNodes,
    flowEdges: contextFlowEdges,
    selectNode,
    createEdge,
    saveNodePositions,
    setIsCreateNodeOpen,
  } = useBrainContext();

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [nodes, setNodes, onNodesChange] = useNodesState(contextFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(contextFlowEdges);

  // Sync from context when data changes
  useEffect(() => {
    setNodes(contextFlowNodes);
  }, [contextFlowNodes, setNodes]);

  useEffect(() => {
    setEdges(contextFlowEdges);
  }, [contextFlowEdges, setEdges]);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (connection.source && connection.target) {
        void createEdge(connection.source, connection.target);
      }
    },
    [createEdge]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
      const positions = draggedNodes.map((n) => ({
        id: n.id,
        positionX: n.position.x,
        positionY: n.position.y,
      }));
      if (positions.length > 0) {
        saveNodePositions(positions);
      }
    },
    [saveNodePositions]
  );

  const onPaneDoubleClick = useCallback(
    () => {
      setIsCreateNodeOpen(true);
    },
    [setIsCreateNodeOpen]
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      style: { stroke: '#94A3B8', strokeWidth: 2 },
    }),
    []
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={() => selectNode(null)}
        onDoubleClick={onPaneDoubleClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-gray-50 dark:bg-slate-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#D1D5DB" />
        {isDesktop && (
          <MiniMap
            nodeStrokeWidth={3}
            className="!bg-white/80 dark:!bg-slate-800/80 !border-gray-200 dark:!border-slate-700 !rounded-lg !shadow-sm"
          />
        )}
        <Controls
          showInteractive={false}
          className="!bg-white !border-gray-200 !shadow-sm dark:!bg-slate-800 dark:!border-slate-700 [&>button]:!border-gray-200 dark:[&>button]:!border-slate-700 dark:[&>button]:!bg-slate-800"
        />
      </ReactFlow>
    </div>
  );
};

export default MindMapCanvas;
