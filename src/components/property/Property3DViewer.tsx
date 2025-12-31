'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { PropertyComponent, PropertyTask } from '@/types/property.types';

interface Property3DViewerProps {
  components: PropertyComponent[];
  tasks: PropertyTask[];
  selectedComponent: string | null;
  onSelectComponent: (componentId: string | null) => void;
}

const HOUSE = {
  width: 6.6,
  depth: 6.2,
  height: 8.4,
  roofHeight: 2.3,
};

const COLORS = {
  render: '#F5F2EA',
  brick: '#A87853',
  trim: '#F9F9F9',
  roof: '#7F3B2A',
  door: '#6B7D82',
  canopy: '#8A2F2A',
  windowFrame: '#EDEDED',
  glass: '#CFE3F6',
  gutter: '#2F3A3E',
  chimney: '#7B5238',
  ground: '#1F2937',
  hedge: '#2F6B3D',
};

const STATUS_COLORS = {
  selected: '#3B82F6',
  urgent: '#EF4444',
  outstanding: '#F59E0B',
  ok: '#22C55E',
};

const FACADE_TEXTURE = {
  url: '/assets/property/tremaine/front.jpg',
  repeat: [1, 1] as const,
  offset: [0, 0] as const,
  rotation: 0,
  center: [0.5, 0.5] as const,
};

const useFacadeTexture = () => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;
    const loader = new THREE.TextureLoader();

    loader.load(
      FACADE_TEXTURE.url,
      (loaded) => {
        if (!isMounted) return;
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.wrapS = THREE.ClampToEdgeWrapping;
        loaded.wrapT = THREE.ClampToEdgeWrapping;
        loaded.repeat.set(...FACADE_TEXTURE.repeat);
        loaded.offset.set(...FACADE_TEXTURE.offset);
        loaded.rotation = FACADE_TEXTURE.rotation;
        loaded.center.set(...FACADE_TEXTURE.center);
        loaded.anisotropy = 4;
        setTexture(loaded);
      },
      undefined,
      () => {
        if (isMounted) setTexture(null);
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  return texture;
};

function getComponentStats(componentId: string, tasks: PropertyTask[]) {
  const componentTasks = tasks.filter((t) => t.components?.includes(componentId));
  const outstanding = componentTasks.filter((t) => t.status !== 'completed').length;
  const urgent = componentTasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;
  return { total: componentTasks.length, outstanding, urgent };
}

function getStatusColor(stats: { outstanding: number; urgent: number }) {
  if (stats.urgent > 0) return STATUS_COLORS.urgent;
  if (stats.outstanding > 0) return STATUS_COLORS.outstanding;
  return STATUS_COLORS.ok;
}

function StatusBadge({ stats, offset = 0.4 }: { stats: { outstanding: number; urgent: number }; offset?: number }) {
  if (stats.outstanding <= 0) return null;
  return (
    <Html position={[0, offset, 0]} center>
      <div
        className={`h-5 w-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg ${
          stats.urgent > 0 ? 'bg-red-500' : 'bg-orange-500'
        }`}
      >
        {stats.outstanding}
      </div>
    </Html>
  );
}

function Tooltip({ label, stats }: { label: string; stats: { total: number; outstanding: number; urgent: number } }) {
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-xl">
      <div className="font-semibold">{label}</div>
      <div className="text-slate-300 mt-1">
        {stats.total} task{stats.total !== 1 ? 's' : ''}
        {stats.outstanding > 0 && ` (${stats.outstanding} pending)`}
      </div>
      {stats.urgent > 0 && (
        <div className="text-red-400 mt-0.5">{stats.urgent} urgent</div>
      )}
    </div>
  );
}

function InteractiveMesh({
  id,
  label,
  stats,
  geometry,
  position,
  rotation,
  baseColor,
  opacity = 1,
  transparent = false,
  selectedComponent,
  hoveredId,
  setHoveredId,
  onSelect,
  badgeOffset,
}: {
  id: string;
  label: string;
  stats: { total: number; outstanding: number; urgent: number };
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
  rotation?: [number, number, number];
  baseColor: string;
  opacity?: number;
  transparent?: boolean;
  selectedComponent: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onSelect: (id: string) => void;
  badgeOffset?: number;
}) {
  const isSelected = selectedComponent === id;
  const isHovered = hoveredId === id;
  const statusColor = getStatusColor(stats);

  return (
    <group position={position} rotation={rotation}>
      <mesh
        geometry={geometry}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHoveredId(id);
        }}
        onPointerOut={() => setHoveredId(null)}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={baseColor}
          transparent={transparent}
          opacity={opacity}
          emissive={isSelected ? STATUS_COLORS.selected : statusColor}
          emissiveIntensity={isSelected ? 0.35 : stats.outstanding > 0 ? 0.12 : 0.05}
        />
      </mesh>

      <StatusBadge stats={stats} offset={badgeOffset ?? 0.5} />

      {isHovered && (
        <Html position={[0, (badgeOffset ?? 0.5) + 0.4, 0]} center>
          <Tooltip label={label} stats={stats} />
        </Html>
      )}
    </group>
  );
}

function HouseWindows({ baseZ }: { baseZ: number }) {
  return (
    <group>
      {/* Upper floor windows */}
      {[-1.2, 1.2].map((x) => (
        <group key={`top-window-${x}`} position={[x, 6.6, baseZ]}>
          <mesh>
            <boxGeometry args={[1.1, 1.4, 0.08]} />
            <meshStandardMaterial color={COLORS.windowFrame} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[0.9, 1.2]} />
            <meshStandardMaterial color={COLORS.glass} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      {/* First floor windows */}
      {[-1.5, 1.5].map((x) => (
        <group key={`mid-window-${x}`} position={[x, 4.2, baseZ]}>
          <mesh>
            <boxGeometry args={[1.2, 1.6, 0.08]} />
            <meshStandardMaterial color={COLORS.windowFrame} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[1, 1.4]} />
            <meshStandardMaterial color={COLORS.glass} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BayWindow({ baseZ }: { baseZ: number }) {
  const bayGeometry = useMemo(
    () => new THREE.CylinderGeometry(1.2, 1.2, 1.25, 24, 1, false, Math.PI / 2, Math.PI),
    []
  );

  return (
    <group position={[-1.1, 1.2, baseZ + 0.6]} rotation={[0, Math.PI, 0]}>
      <mesh geometry={bayGeometry} castShadow receiveShadow>
        <meshStandardMaterial color={COLORS.render} />
      </mesh>
      <mesh position={[0, 0.9, 0.05]}>
        <boxGeometry args={[2, 0.35, 0.7]} />
        <meshStandardMaterial color={COLORS.canopy} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.8, 0.9]} />
        <meshStandardMaterial color={COLORS.glass} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function Doorway({ baseZ }: { baseZ: number }) {
  return (
    <group position={[1.6, 1.1, baseZ + 0.02]}>
      <mesh>
        <boxGeometry args={[0.9, 2.2, 0.12]} />
        <meshStandardMaterial color={COLORS.door} />
      </mesh>
      <mesh position={[0, 1.2, 0.02]}>
        <boxGeometry args={[1.2, 0.5, 0.08]} />
        <meshStandardMaterial color={COLORS.trim} />
      </mesh>
    </group>
  );
}

function Roof({ stats, selectedComponent, hoveredId, setHoveredId, onSelect }: {
  stats: { total: number; outstanding: number; urgent: number };
  selectedComponent: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const roofShape = useMemo(() => {
    const shape = new THREE.Shape();
    const halfWidth = HOUSE.width / 2 + 0.2;
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(0, HOUSE.roofHeight);
    shape.lineTo(halfWidth, 0);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: HOUSE.depth + 0.4,
      bevelEnabled: false,
    });
    geometry.translate(0, 0, -(HOUSE.depth + 0.4) / 2);
    return geometry;
  }, []);

  return (
    <group position={[0, HOUSE.height, 0]}>
      <InteractiveMesh
        id="roof-main"
        label="Main roof"
        stats={stats}
        geometry={roofShape}
        baseColor={COLORS.roof}
        selectedComponent={selectedComponent}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
        onSelect={onSelect}
        badgeOffset={HOUSE.roofHeight + 0.2}
      />
    </group>
  );
}

function UtilityHotspot({
  id,
  label,
  position,
  stats,
  selectedComponent,
  hoveredId,
  setHoveredId,
  onSelect,
}: {
  id: string;
  label: string;
  position: [number, number, number];
  stats: { total: number; outstanding: number; urgent: number };
  selectedComponent: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const geometry = useMemo(() => new THREE.SphereGeometry(0.25, 16, 16), []);
  return (
    <InteractiveMesh
      id={id}
      label={label}
      stats={stats}
      geometry={geometry}
      baseColor="#F8FAFC"
      transparent
      opacity={0.9}
      selectedComponent={selectedComponent}
      hoveredId={hoveredId}
      setHoveredId={setHoveredId}
      onSelect={onSelect}
      badgeOffset={0.45}
      position={position}
    />
  );
}

function GroundScene() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={COLORS.ground} opacity={0.7} transparent />
      </mesh>
      <mesh position={[-6, 0.4, 2]}>
        <boxGeometry args={[4, 0.8, 3]} />
        <meshStandardMaterial color={COLORS.hedge} />
      </mesh>
    </group>
  );
}

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
  onSelectComponent,
}: Property3DViewerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const facadeTexture = useFacadeTexture();

  const componentStats = useMemo(() => {
    const stats = new Map<string, { total: number; outstanding: number; urgent: number }>();
    components.forEach((component) => {
      stats.set(component.id, getComponentStats(component.id, tasks));
    });
    return stats;
  }, [components, tasks]);

  const componentLabels = useMemo(() => {
    const map = new Map<string, string>();
    components.forEach((component) => map.set(component.id, component.label));
    return map;
  }, [components]);

  const getStats = (id: string) => componentStats.get(id) ?? { total: 0, outstanding: 0, urgent: 0 };
  const getLabel = (id: string) => componentLabels.get(id) ?? id;

  const handleSelect = (id: string) => {
    onSelectComponent(selectedComponent === id ? null : id);
  };

  const baseZ = HOUSE.depth / 2 + 0.02;
  const chimneyGeometry = useMemo(() => new THREE.BoxGeometry(0.7, 1.8, 0.7), []);
  const gutterGeometry = useMemo(() => new THREE.BoxGeometry(HOUSE.width + 0.3, 0.15, 0.2), []);
  const parapetGeometry = useMemo(() => new THREE.BoxGeometry(HOUSE.width + 0.4, 0.25, 0.2), []);
  const windowsHitboxGeometry = useMemo(() => new THREE.BoxGeometry(4.8, 4.8, 0.2), []);
  const doorHitboxGeometry = useMemo(() => new THREE.BoxGeometry(1.2, 2.4, 0.2), []);

  const facadeMaterial = facadeTexture
    ? {
        map: facadeTexture,
        color: '#ffffff',
        roughness: 0.88,
        metalness: 0.05,
      }
    : {
        color: COLORS.render,
        roughness: 0.9,
        metalness: 0.05,
      };

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      <Suspense fallback={<LoadingFallback />}> 
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[12, 8, 12]} fov={45} />
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[12, 16, 8]}
            intensity={1.1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-8, 10, -8]} intensity={0.35} />

          <GroundScene />

          {/* Main house body */}
          <mesh position={[0, HOUSE.height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[HOUSE.width, HOUSE.height, HOUSE.depth]} />
            <meshStandardMaterial color={COLORS.brick} />
          </mesh>
          <mesh position={[0, HOUSE.height / 2, HOUSE.depth / 2 + 0.01]}>
            <planeGeometry args={[HOUSE.width - 0.3, HOUSE.height - 0.4]} />
            <meshStandardMaterial {...facadeMaterial} />
          </mesh>

          {/* Roof + gutters + chimney */}
          <Roof
            stats={getStats('roof-main')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />

          <InteractiveMesh
            id="chimney"
            label={getLabel('chimney')}
            stats={getStats('chimney')}
            geometry={chimneyGeometry}
            baseColor={COLORS.chimney}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
            position={[1.6, HOUSE.height + 1.3, -1]}
          />

          <InteractiveMesh
            id="gutters"
            label={getLabel('gutters')}
            stats={getStats('gutters')}
            geometry={gutterGeometry}
            baseColor={COLORS.gutter}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
            position={[0, HOUSE.height - 0.1, HOUSE.depth / 2 + 0.15]}
            badgeOffset={0.3}
          />

          <InteractiveMesh
            id="roof-parapet"
            label={getLabel('roof-parapet')}
            stats={getStats('roof-parapet')}
            geometry={parapetGeometry}
            baseColor={COLORS.trim}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
            position={[0, HOUSE.height - 0.45, HOUSE.depth / 2 - 0.05]}
            badgeOffset={0.3}
          />

          {/* Facade details */}
          <BayWindow baseZ={baseZ} />
          <Doorway baseZ={baseZ} />
          <HouseWindows baseZ={baseZ} />

          {/* Window hitbox for tasks */}
          <InteractiveMesh
            id="windows"
            label={getLabel('windows')}
            stats={getStats('windows')}
            geometry={windowsHitboxGeometry}
            baseColor={COLORS.render}
            transparent
            opacity={0.05}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
            position={[0, 5.2, HOUSE.depth / 2 + 0.12]}
            badgeOffset={2.4}
          />

          <InteractiveMesh
            id="doors"
            label={getLabel('doors')}
            stats={getStats('doors')}
            geometry={doorHitboxGeometry}
            baseColor={COLORS.render}
            transparent
            opacity={0.05}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
            position={[1.6, 1.2, HOUSE.depth / 2 + 0.12]}
            badgeOffset={1.4}
          />

          {/* Interior hotspots */}
          <UtilityHotspot
            id="cellar"
            label={getLabel('cellar')}
            position={[-1.5, -1.2, 0]}
            stats={getStats('cellar')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />
          <UtilityHotspot
            id="kitchen"
            label={getLabel('kitchen')}
            position={[-1.2, 1.2, -1.6]}
            stats={getStats('kitchen')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />
          <UtilityHotspot
            id="bathroom"
            label={getLabel('bathroom')}
            position={[1.2, 4.1, -1.4]}
            stats={getStats('bathroom')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />
          <UtilityHotspot
            id="bedroom-front-2"
            label={getLabel('bedroom-front-2')}
            position={[-1.2, 6.4, 1.4]}
            stats={getStats('bedroom-front-2')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />
          <UtilityHotspot
            id="bedroom-rear-2"
            label={getLabel('bedroom-rear-2')}
            position={[1.2, 6.4, -1.6]}
            stats={getStats('bedroom-rear-2')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />
          <UtilityHotspot
            id="electrics"
            label={getLabel('electrics')}
            position={[-2.2, 1.2, -0.2]}
            stats={getStats('electrics')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />
          <UtilityHotspot
            id="heating"
            label={getLabel('heating')}
            position={[2.2, 1.2, -0.2]}
            stats={getStats('heating')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />
          <UtilityHotspot
            id="plumbing"
            label={getLabel('plumbing')}
            position={[0, 1.2, -2.2]}
            stats={getStats('plumbing')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />
          <UtilityHotspot
            id="fire-safety"
            label={getLabel('fire-safety')}
            position={[0, 4.1, 0]}
            stats={getStats('fire-safety')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />
          <UtilityHotspot
            id="drainage"
            label={getLabel('drainage')}
            position={[2.6, 0.6, HOUSE.depth / 2 + 0.8]}
            stats={getStats('drainage')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={8}
            maxDistance={28}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </Suspense>

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
            Click a highlighted element to filter tasks
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span>Drag to rotate</span>
          <span className="text-slate-400">|</span>
          <span>Scroll to zoom</span>
        </div>
      </div>

      {!facadeTexture && (
        <div className="absolute top-4 left-4 max-w-[220px] rounded-lg bg-amber-50/90 px-3 py-2 text-xs text-amber-800 shadow-sm">
          Add `public/assets/property/tremaine/front.jpg` to texture the facade.
        </div>
      )}
    </div>
  );
}
