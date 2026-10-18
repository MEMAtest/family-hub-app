'use client';

import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, Html, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PropertyComponent, PropertyTask } from '@/types/property.types';

interface Property3DViewerProps {
  components: PropertyComponent[];
  tasks: PropertyTask[];
  selectedComponent: string | null;
  onSelectComponent: (componentId: string | null) => void;
  focusFloor?: string;
}

const HOUSE = {
  width: 4.8,
  depth: 8.8,
  height: 8.4,
  roofHeight: 2.3,
};

const COLORS = {
  render: '#F5F2EA',
  brick: '#D8D2C8',
  trim: '#F9F9F9',
  roof: '#7F3B2A',
  door: '#6B7D82',
  canopy: '#8A2F2A',
  windowFrame: '#EDEDED',
  glass: '#CFE3F6',
  gutter: '#2F3A3E',
  chimney: '#7B5238',
  hedge: '#2F6B3D',
};

const STATUS_COLORS = {
  selected: '#3B82F6',
  urgent: '#EF4444',
  outstanding: '#F59E0B',
  ok: '#22C55E',
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
      {/* Second-floor windows */}
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

      {/* First-floor windows */}
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
  return (
    <group position={[-1.05, 1.35, baseZ + 0.34]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.15, 2.55, 0.72]} />
        <meshStandardMaterial color={COLORS.render} />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[2.4, 0.22, 0.96]} />
        <meshStandardMaterial color={COLORS.canopy} />
      </mesh>
      {[-0.66, 0, 0.66].map((x) => (
        <mesh key={x} position={[x, 0.1, 0.38]}>
          <boxGeometry args={[0.54, 1.72, 0.05]} />
          <meshStandardMaterial color={COLORS.glass} roughness={0.25} />
        </mesh>
      ))}
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
        <meshStandardMaterial color="#CBD5E1" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -8]} receiveShadow>
        <planeGeometry args={[HOUSE.width - 0.8, 6.5]} />
        <meshStandardMaterial color="#68865F" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.25, 0.02, 7]} receiveShadow>
        <planeGeometry args={[0.9, 5]} />
        <meshStandardMaterial color="#4B5563" />
      </mesh>
      <mesh position={[-2.1, 0.55, 6.4]}>
        <boxGeometry args={[0.45, 1.1, 3.6]} />
        <meshStandardMaterial color={COLORS.hedge} />
      </mesh>
    </group>
  );
}

const floorHeight: Record<string, number> = {
  cellar: -0.9,
  ground: 1.15,
  first: 4.05,
  second: 6.35,
  roof: 8.8,
  exterior: 3.8,
};

function FocusedFloor({ floor }: { floor: string }) {
  const height = floorHeight[floor];
  if (height === undefined || floor === 'roof' || floor === 'exterior') return null;
  return (
    <group position={[0, height, 0]}>
      <mesh receiveShadow castShadow>
        <boxGeometry args={[HOUSE.width - 0.35, 0.08, HOUSE.depth - 0.35]} />
        <meshStandardMaterial color="#D8E5E2" roughness={0.9} />
      </mesh>
      {/* Perimeter and party walls make this read as a floor-plan cutaway. */}
      <mesh position={[-2.2, 0.9, 0]} castShadow>
        <boxGeometry args={[0.14, 1.8, HOUSE.depth - 0.35]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.9} />
      </mesh>
      <mesh position={[2.2, 0.9, 0]} castShadow>
        <boxGeometry args={[0.14, 1.8, HOUSE.depth - 0.35]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.15, -4.2]} castShadow>
        <boxGeometry args={[4.5, 2.3, 0.14]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.25, 4.2]} castShadow>
        <boxGeometry args={[4.5, 0.5, 0.14]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.1, 1.55, HOUSE.depth - 0.6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-1.15, 0.78, 0.2]}>
        <boxGeometry args={[2.1, 1.55, 0.1]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-1.15, 0.1, 2.1]}>
        <boxGeometry args={[2.1, 0.06, 3.7]} />
        <meshStandardMaterial color="#C7E4DD" />
      </mesh>
      <mesh position={[1.15, 0.1, 2.1]}>
        <boxGeometry args={[2.1, 0.06, 3.7]} />
        <meshStandardMaterial color="#D6E3F4" />
      </mesh>
      <mesh position={[0, 0.1, -2.1]}>
        <boxGeometry args={[4.25, 0.06, 3.7]} />
        <meshStandardMaterial color="#E8E0F2" />
      </mesh>
    </group>
  );
}

function CameraRig({ focusFloor }: { focusFloor: string }) {
  const { camera, size } = useThree();

  useEffect(() => {
    const cutaway = !['all', 'exterior', 'roof'].includes(focusFloor);
    const targetY = cutaway ? (floorHeight[focusFloor] ?? 3.8) + 0.4 : 4.2;
    const narrow = size.width / size.height < 0.85;
    const destination = cutaway
      ? new THREE.Vector3(narrow ? 6.4 : 7.4, targetY + 8.8, narrow ? 14 : 10.8)
      : new THREE.Vector3(narrow ? 5.6 : 7.2, 7.2, narrow ? 22.5 : 17.5);
    camera.position.copy(destination);
    camera.lookAt(0, targetY, 0);
    camera.updateProjectionMatrix();
  }, [camera, focusFloor, size.height, size.width]);

  return null;
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
  focusFloor = 'all',
}: Property3DViewerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
  const componentFloor = useMemo(() => new Map(components.map((component) => [component.id, component.floor])), [components]);
  const showComponent = (id: string) => {
    const floor = componentFloor.get(id);
    if (focusFloor === 'all') return floor === 'exterior' || floor === 'roof';
    return floor === focusFloor;
  };
  const isCutaway = !['all', 'exterior', 'roof'].includes(focusFloor);

  const baseZ = HOUSE.depth / 2 + 0.02;
  const chimneyGeometry = useMemo(() => new THREE.BoxGeometry(0.7, 1.8, 0.7), []);
  const gutterGeometry = useMemo(() => new THREE.BoxGeometry(HOUSE.width + 0.3, 0.15, 0.2), []);
  const parapetGeometry = useMemo(() => new THREE.BoxGeometry(HOUSE.width + 0.4, 0.25, 0.2), []);
  const windowsHitboxGeometry = useMemo(() => new THREE.BoxGeometry(4.8, 4.8, 0.2), []);
  const doorHitboxGeometry = useMemo(() => new THREE.BoxGeometry(1.2, 2.4, 0.2), []);

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-950 sm:h-[500px]">
      <Suspense fallback={<LoadingFallback />}> 
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[7.2, 7.2, 17.5]} fov={42} />
          <CameraRig focusFloor={focusFloor} />
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
          <mesh visible={!isCutaway} position={[0, HOUSE.height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[HOUSE.width, HOUSE.height, HOUSE.depth]} />
            <meshStandardMaterial color="#B7A58E" roughness={0.95} />
          </mesh>
          <mesh visible={!isCutaway} position={[0, HOUSE.height / 2, HOUSE.depth / 2 + 0.01]}>
            <planeGeometry args={[HOUSE.width - 0.3, HOUSE.height - 0.4]} />
            <meshStandardMaterial color={COLORS.render} roughness={0.9} />
          </mesh>
          {!isCutaway && [2.75, 5.45].map((y) => (
            <mesh key={y} position={[0, y, HOUSE.depth / 2 + 0.06]}>
              <boxGeometry args={[HOUSE.width - 0.16, 0.11, 0.1]} />
              <meshStandardMaterial color="#D7D1C8" />
            </mesh>
          ))}
          <FocusedFloor floor={focusFloor} />

          {/* Roof + gutters + chimney */}
          {showComponent('roof-main') && <Roof
            stats={getStats('roof-main')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}

          {showComponent('chimney') && <InteractiveMesh
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
          />}

          {showComponent('gutters') && <InteractiveMesh
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
          />}

          {showComponent('roof-parapet') && <InteractiveMesh
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
          />}

          {/* Facade details */}
          {!isCutaway && <BayWindow baseZ={baseZ} />}
          {!isCutaway && <Doorway baseZ={baseZ} />}
          {!isCutaway && <HouseWindows baseZ={baseZ} />}

          {/* Window hitbox for tasks */}
          {showComponent('windows') && <InteractiveMesh
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
          />}

          {showComponent('doors') && <InteractiveMesh
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
          />}

          {/* Interior hotspots */}
          {showComponent('cellar') && <UtilityHotspot
            id="cellar"
            label={getLabel('cellar')}
            position={[-1.5, -1.2, 0]}
            stats={getStats('cellar')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}
          {showComponent('kitchen') && <UtilityHotspot
            id="kitchen"
            label={getLabel('kitchen')}
            position={[-1.2, 1.2, -1.6]}
            stats={getStats('kitchen')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}
          {showComponent('bathroom') && <UtilityHotspot
            id="bathroom"
            label={getLabel('bathroom')}
            position={[1.2, 4.1, -1.4]}
            stats={getStats('bathroom')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}
          {showComponent('bedroom-front-2') && <UtilityHotspot
            id="bedroom-front-2"
            label={getLabel('bedroom-front-2')}
            position={[-1.2, 6.4, 1.4]}
            stats={getStats('bedroom-front-2')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}
          {showComponent('bedroom-rear-2') && <UtilityHotspot
            id="bedroom-rear-2"
            label={getLabel('bedroom-rear-2')}
            position={[1.2, 6.4, -1.6]}
            stats={getStats('bedroom-rear-2')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}
          {showComponent('electrics') && <UtilityHotspot
            id="electrics"
            label={getLabel('electrics')}
            position={[-2.2, 1.2, -0.2]}
            stats={getStats('electrics')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}
          {showComponent('heating') && <UtilityHotspot
            id="heating"
            label={getLabel('heating')}
            position={[2.2, 1.2, -0.2]}
            stats={getStats('heating')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}
          {showComponent('plumbing') && <UtilityHotspot
            id="plumbing"
            label={getLabel('plumbing')}
            position={[0, 1.2, -2.2]}
            stats={getStats('plumbing')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}
          {showComponent('fire-safety') && <UtilityHotspot
            id="fire-safety"
            label={getLabel('fire-safety')}
            position={[0, 4.1, 0]}
            stats={getStats('fire-safety')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}
          {showComponent('drainage') && <UtilityHotspot
            id="drainage"
            label={getLabel('drainage')}
            position={[2.6, 0.6, HOUSE.depth / 2 + 0.8]}
            stats={getStats('drainage')}
            selectedComponent={selectedComponent}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onSelect={handleSelect}
          />}

          <ContactShadows position={[0, 0.02, 0]} opacity={0.28} scale={18} blur={2.4} far={18} />

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={8}
            maxDistance={28}
            maxPolarAngle={Math.PI / 2}
            target={[0, focusFloor === 'all' ? 4.2 : (floorHeight[focusFloor] ?? 4) + 0.4, 0]}
          />
        </Canvas>
      </Suspense>

      <div className="absolute bottom-2 left-2 right-2 rounded-md bg-white/92 p-2 shadow-lg backdrop-blur-sm dark:bg-slate-800/92 sm:bottom-4 sm:left-4 sm:right-auto sm:p-3">
        <div className="mb-2 hidden text-xs font-semibold text-slate-700 dark:text-slate-200 sm:block">Task Status</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 sm:block sm:space-y-1.5">
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
      </div>

    </div>
  );
}
