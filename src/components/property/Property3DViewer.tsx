'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Html, PerspectiveCamera } from '@react-three/drei';
import { useMemo, useState, Suspense } from 'react';
import * as THREE from 'three';
import { PropertyComponent, PropertyTask } from '@/types/property.types';

interface Property3DViewerProps {
  components: PropertyComponent[];
  tasks: PropertyTask[];
  selectedComponent: string | null;
  onSelectComponent: (componentId: string | null) => void;
}

// Floor configuration for the Victorian terraced house
const FLOOR_CONFIG = {
  cellar: { y: -2, height: 2, color: '#6B7280', label: 'Cellar' },
  ground: { y: 0, height: 2.8, color: '#D97706', label: 'Ground Floor' },
  first: { y: 2.8, height: 2.8, color: '#2563EB', label: 'First Floor' },
  second: { y: 5.6, height: 2.8, color: '#7C3AED', label: 'Second Floor' },
  roof: { y: 8.4, height: 2, color: '#DC2626', label: 'Roof' },
  exterior: { y: 3, height: 0, color: '#059669', label: 'Exterior' },
};

// Get task counts and priority for a component
function getComponentStats(componentId: string, tasks: PropertyTask[]) {
  const componentTasks = tasks.filter(t => t.components?.includes(componentId));
  const outstanding = componentTasks.filter(t => t.status !== 'completed').length;
  const urgent = componentTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;
  return { total: componentTasks.length, outstanding, urgent };
}

// Get color based on task status
function getStatusColor(stats: { outstanding: number; urgent: number }) {
  if (stats.urgent > 0) return '#EF4444'; // Red for urgent
  if (stats.outstanding > 0) return '#F59E0B'; // Orange for outstanding
  return '#22C55E'; // Green for all complete
}

// Individual floor component
function Floor({
  floor,
  config,
  components,
  tasks,
  selectedComponent,
  onSelectComponent,
  isExterior = false
}: {
  floor: string;
  config: { y: number; height: number; color: string; label: string };
  components: PropertyComponent[];
  tasks: PropertyTask[];
  selectedComponent: string | null;
  onSelectComponent: (id: string | null) => void;
  isExterior?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const floorComponents = components.filter(c => c.floor === floor);

  if (isExterior) {
    // Render exterior elements around the building
    return (
      <group>
        {floorComponents.map((comp, i) => {
          const stats = getComponentStats(comp.id, tasks);
          const isSelected = selectedComponent === comp.id;
          const angle = (i / floorComponents.length) * Math.PI * 2;
          const radius = 5;

          return (
            <group key={comp.id} position={[Math.cos(angle) * radius, 3, Math.sin(angle) * radius]}>
              <mesh
                onClick={(e) => { e.stopPropagation(); onSelectComponent(isSelected ? null : comp.id); }}
                onPointerOver={() => setHovered(comp.id)}
                onPointerOut={() => setHovered(null)}
              >
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial
                  color={isSelected ? '#3B82F6' : getStatusColor(stats)}
                  emissive={hovered === comp.id ? '#ffffff' : '#000000'}
                  emissiveIntensity={hovered === comp.id ? 0.3 : 0}
                />
              </mesh>
              {hovered === comp.id && (
                <Html center distanceFactor={10}>
                  <div className="bg-slate-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg">
                    <div className="font-medium">{comp.label}</div>
                    <div className="text-slate-300">{stats.outstanding} tasks</div>
                  </div>
                </Html>
              )}
            </group>
          );
        })}
      </group>
    );
  }

  // Calculate positions for rooms on this floor
  const roomWidth = 3;
  const roomDepth = 4;
  const gap = 0.2;

  return (
    <group position={[0, config.y, 0]}>
      {/* Floor plate */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[8, 0.2, 6]} />
        <meshStandardMaterial color={config.color} opacity={0.3} transparent />
      </mesh>

      {/* Floor label */}
      <Html position={[-4.5, config.height / 2, 0]} center>
        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 -rotate-90 whitespace-nowrap">
          {config.label}
        </div>
      </Html>

      {/* Rooms/Components */}
      {floorComponents.map((comp, i) => {
        const stats = getComponentStats(comp.id, tasks);
        const isSelected = selectedComponent === comp.id;
        const isHovered = hovered === comp.id;

        // Position rooms in a grid
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = (col - 0.5) * (roomWidth + gap);
        const z = (row - 0.5) * (roomDepth + gap);

        const roomHeight = comp.type === 'system' ? 1 : config.height * 0.8;
        const roomY = comp.type === 'system' ? 0.5 : roomHeight / 2;

        return (
          <group key={comp.id} position={[x, roomY, z]}>
            <mesh
              castShadow
              receiveShadow
              onClick={(e) => { e.stopPropagation(); onSelectComponent(isSelected ? null : comp.id); }}
              onPointerOver={() => setHovered(comp.id)}
              onPointerOut={() => setHovered(null)}
            >
              <boxGeometry args={[
                comp.type === 'system' ? 1.5 : roomWidth - 0.1,
                roomHeight,
                comp.type === 'system' ? 1.5 : roomDepth - 0.1
              ]} />
              <meshStandardMaterial
                color={isSelected ? '#3B82F6' : getStatusColor(stats)}
                opacity={isHovered ? 0.9 : 0.7}
                transparent
                emissive={isHovered ? '#ffffff' : '#000000'}
                emissiveIntensity={isHovered ? 0.2 : 0}
              />
            </mesh>

            {/* Wireframe outline */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(
                comp.type === 'system' ? 1.5 : roomWidth - 0.1,
                roomHeight,
                comp.type === 'system' ? 1.5 : roomDepth - 0.1
              )]} />
              <lineBasicMaterial color={isSelected ? '#1D4ED8' : '#374151'} />
            </lineSegments>

            {/* Task indicator badge */}
            {stats.outstanding > 0 && (
              <Html position={[0, roomHeight / 2 + 0.3, 0]} center>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  stats.urgent > 0 ? 'bg-red-500' : 'bg-orange-500'
                }`}>
                  {stats.outstanding}
                </div>
              </Html>
            )}

            {/* Hover tooltip */}
            {isHovered && (
              <Html position={[0, roomHeight / 2 + 0.8, 0]} center>
                <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-xl">
                  <div className="font-semibold">{comp.label}</div>
                  <div className="text-slate-300 mt-1">
                    {stats.total} task{stats.total !== 1 ? 's' : ''}
                    {stats.outstanding > 0 && ` (${stats.outstanding} pending)`}
                  </div>
                  {stats.urgent > 0 && (
                    <div className="text-red-400 mt-0.5">{stats.urgent} urgent</div>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

// Roof structure
function RoofStructure({ tasks, selectedComponent, onSelectComponent }: {
  tasks: PropertyTask[];
  selectedComponent: string | null;
  onSelectComponent: (id: string | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const roofComponents = ['roof-main', 'roof-parapet', 'gutters', 'chimney'];

  const stats = roofComponents.reduce((acc, id) => {
    const s = getComponentStats(id, tasks);
    return { total: acc.total + s.total, outstanding: acc.outstanding + s.outstanding, urgent: acc.urgent + s.urgent };
  }, { total: 0, outstanding: 0, urgent: 0 });

  const isSelected = roofComponents.includes(selectedComponent || '');

  return (
    <group position={[0, 8.4, 0]}>
      {/* Main roof - pitched */}
      <mesh
        castShadow
        onClick={(e) => { e.stopPropagation(); onSelectComponent(isSelected ? null : 'roof-main'); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <coneGeometry args={[5, 3, 4]} />
        <meshStandardMaterial
          color={isSelected ? '#3B82F6' : getStatusColor(stats)}
          opacity={hovered ? 0.9 : 0.7}
          transparent
        />
      </mesh>

      {/* Chimney stacks */}
      <mesh position={[2, 2, 1]} castShadow>
        <boxGeometry args={[0.8, 2, 0.8]} />
        <meshStandardMaterial color="#78350F" />
      </mesh>
      <mesh position={[-2, 2, -1]} castShadow>
        <boxGeometry args={[0.8, 2, 0.8]} />
        <meshStandardMaterial color="#78350F" />
      </mesh>

      {/* Task badge */}
      {stats.outstanding > 0 && (
        <Html position={[0, 3, 0]} center>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white ${
            stats.urgent > 0 ? 'bg-red-500' : 'bg-orange-500'
          }`}>
            {stats.outstanding}
          </div>
        </Html>
      )}

      {hovered && (
        <Html position={[0, 4, 0]} center>
          <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-xl">
            <div className="font-semibold">Roof & Chimneys</div>
            <div className="text-slate-300 mt-1">
              {stats.total} task{stats.total !== 1 ? 's' : ''}
              {stats.outstanding > 0 && ` (${stats.outstanding} pending)`}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Building walls (wireframe)
function BuildingWalls() {
  return (
    <group>
      {/* Front wall outline */}
      <lineSegments position={[0, 4.2, 3]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(8, 8.4)]} />
        <lineBasicMaterial color="#94A3B8" />
      </lineSegments>

      {/* Back wall outline */}
      <lineSegments position={[0, 4.2, -3]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(8, 8.4)]} />
        <lineBasicMaterial color="#94A3B8" />
      </lineSegments>

      {/* Side walls */}
      <lineSegments position={[4, 4.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(6, 8.4)]} />
        <lineBasicMaterial color="#94A3B8" />
      </lineSegments>
      <lineSegments position={[-4, 4.2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(6, 8.4)]} />
        <lineBasicMaterial color="#94A3B8" />
      </lineSegments>
    </group>
  );
}

// Ground plane
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#1E293B" opacity={0.5} transparent />
    </mesh>
  );
}

// Legend component
function Legend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Task Status</div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-slate-600 dark:text-slate-300">Urgent tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-xs text-slate-600 dark:text-slate-300">Outstanding tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-slate-600 dark:text-slate-300">All complete</span>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Click a room to filter tasks
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Loading 3D model...</p>
      </div>
    </div>
  );
}

export default function Property3DViewer({
  components,
  tasks,
  selectedComponent,
  onSelectComponent
}: Property3DViewerProps) {
  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={50} />

          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 15, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-10, 10, -10]} intensity={0.3} />

          {/* Ground */}
          <Ground />

          {/* Building structure */}
          <BuildingWalls />

          {/* Floors */}
          <Floor
            floor="cellar"
            config={FLOOR_CONFIG.cellar}
            components={components}
            tasks={tasks}
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
          />
          <Floor
            floor="ground"
            config={FLOOR_CONFIG.ground}
            components={components}
            tasks={tasks}
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
          />
          <Floor
            floor="first"
            config={FLOOR_CONFIG.first}
            components={components}
            tasks={tasks}
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
          />
          <Floor
            floor="second"
            config={FLOOR_CONFIG.second}
            components={components}
            tasks={tasks}
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
          />

          {/* Roof */}
          <RoofStructure
            tasks={tasks}
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
          />

          {/* Exterior elements */}
          <Floor
            floor="exterior"
            config={FLOOR_CONFIG.exterior}
            components={components}
            tasks={tasks}
            selectedComponent={selectedComponent}
            onSelectComponent={onSelectComponent}
            isExterior
          />

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={8}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </Suspense>

      {/* Legend overlay */}
      <Legend />

      {/* Controls hint */}
      <div className="absolute top-4 right-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span>🖱️ Drag to rotate</span>
          <span className="text-slate-400">|</span>
          <span>🔍 Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}
