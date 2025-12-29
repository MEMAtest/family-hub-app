'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Box,
  FileText,
  FileUp,
  Filter,
  Grid3X3,
  Link2,
  Map as MapIcon,
  Plus,
  Search,
  Shield,
  Wrench,
  X,
} from 'lucide-react';

// Dynamically import 3D viewer to avoid SSR issues with Three.js
const Property3DViewer = dynamic(() => import('./Property3DViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-xl">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Loading 3D viewer...</p>
      </div>
    </div>
  ),
});
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useFamilyStore } from '@/store/familyStore';
import { createId } from '@/utils/id';
import { formatDate, formatDateForInput } from '@/utils/formatDate';
import type { ParsedSurveyTask } from '@/utils/propertySurveyParser';
import {
  PropertyDocument,
  PropertyTask,
  PropertyTaskPriority,
  PropertyTaskStatus,
  PropertyValueEntry,
  PropertyWorkLog,
} from '@/types/property.types';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const formatCurrency = (value?: number) => (
  typeof value === 'number' ? currencyFormatter.format(value) : 'TBD'
);

const statusLabels: Record<PropertyTaskStatus, string> = {
  outstanding: 'Outstanding',
  in_progress: 'In progress',
  blocked: 'Blocked',
  verify: 'Verify',
  completed: 'Completed',
};

const statusStyles: Record<PropertyTaskStatus, string> = {
  outstanding: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  verify: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const priorityLabels: Record<PropertyTaskPriority, string> = {
  urgent: 'Urgent',
  short: 'Short term',
  medium: 'Medium term',
  long: 'Long term',
};

const priorityStyles: Record<PropertyTaskPriority, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  short: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  long: 'bg-slate-50 text-slate-600 border-slate-200',
};

const floorLabels: Record<string, string> = {
  cellar: 'Cellar',
  ground: 'Ground floor',
  first: 'First floor',
  second: 'Second floor',
  roof: 'Roof',
  exterior: 'Exterior',
};

const toIsoDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushCell = () => {
    row.push(current.trim());
    current = '';
  };

  const pushRow = () => {
    if (row.length > 0 || current.trim()) {
      pushCell();
      rows.push(row);
      row = [];
    }
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      pushCell();
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      pushRow();
      continue;
    }
    current += char;
  }
  if (current.trim() || row.length > 0) {
    pushRow();
  }
  return rows;
};

const parseMoney = (value?: string) => {
  if (!value) return undefined;
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : undefined;
};

const mapPriorityValue = (value: string): PropertyTaskPriority => {
  const normalized = value.toLowerCase().trim();
  if (!normalized) return 'short';
  if (normalized.startsWith('p0') || normalized.includes('urgent')) return 'urgent';
  if (normalized.startsWith('p1') || normalized.includes('short')) return 'short';
  if (normalized.startsWith('p2') || normalized.includes('medium')) return 'medium';
  if (normalized.startsWith('p3') || normalized.includes('long')) return 'long';
  return 'short';
};

const mapStatusValue = (value: string): PropertyTaskStatus => {
  const normalized = value.toLowerCase().trim();
  if (!normalized) return 'outstanding';
  if (normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('block')) return 'blocked';
  if (normalized.includes('verify')) return 'verify';
  if (normalized.includes('complete')) return 'completed';
  return 'outstanding';
};

const parseConditionRating = (value: string) => {
  const numeric = Number(value);
  if ([1, 2, 3].includes(numeric)) return numeric as 1 | 2 | 3;
  const match = value.match(/cr\s*([123])/i);
  if (match) return Number(match[1]) as 1 | 2 | 3;
  return undefined;
};

const toSurveyPageReference = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase().includes('survey')) return trimmed;
  return `Survey p.${trimmed}`;
};

const inferCategory = (text: string) => {
  const normalized = text.toLowerCase();
  if (normalized.includes('damp') && (normalized.includes('survey') || normalized.includes('diagnosis'))) return 'Damp';
  if (normalized.includes('gutter') && (normalized.includes('clean') || normalized.includes('clear'))) return 'Maintenance';
  if (/(roof|parapet|ridge|rooflight|flashing|tile)/.test(normalized)) return 'Roof';
  if (/(drain|drainage|gully|cctv)/.test(normalized)) return 'Drainage';
  if (/(electric|eicr|consumer unit)/.test(normalized)) return 'Electrics';
  if (/\bgas\b/.test(normalized)) return 'Gas';
  if (/(fire|smoke alarm|heat alarm|fd30)/.test(normalized)) return 'Fire safety';
  if (/(asbestos|textured coating|artex)/.test(normalized)) return 'Asbestos';
  if (/(window|glazing|glass)/.test(normalized)) return 'Windows';
  if (/(door|lock)/.test(normalized)) return 'Doors';
  if (/(structural|sleeper wall|movement)/.test(normalized)) return 'Structure';
  if (/(pest|rodent|vermin)/.test(normalized)) return 'Pests';
  if (/(ventilation|extractor)/.test(normalized)) return 'Ventilation';
  if (/air brick/.test(normalized)) return 'External walls';
  if (/(pipework|plumbing|water supply)/.test(normalized)) return 'Plumbing';
  return '';
};

const contractorByCategory: Record<string, string> = {
  Roof: 'Roofing contractor',
  Chimney: 'Roofing contractor',
  Damp: 'PCA damp and timber specialist',
  Windows: 'Glazing contractor',
  Doors: 'Locksmith',
  'Fire safety': 'Joiner / electrician',
  Electrics: 'Qualified electrician',
  Gas: 'Gas Safe engineer',
  Drainage: 'Drainage specialist',
  Structure: 'Structural engineer',
  Asbestos: 'Asbestos surveyor',
  Pests: 'Pest control',
  Ventilation: 'Qualified electrician',
  'External walls': 'Builder',
  Plumbing: 'Plumber',
  Maintenance: 'Gutter cleaning service',
};

const mapCsvTasks = (rows: string[][]): Array<Partial<PropertyTask>> => {
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, '')
  );
  const getIndex = (names: string[]) => headers.findIndex((header) => names.includes(header));
  const getValue = (row: string[], names: string[]) => {
    const index = getIndex(names);
    return index >= 0 ? row[index]?.trim() : '';
  };

  return rows.slice(1).map((row) => {
    const titleValue = getValue(row, ['title', 'item', 'task', 'workneededscope', 'workneeded', 'scope']);
    const evidenceValue = getValue(row, ['surveyevidencesectionnote', 'surveyevidence', 'evidence', 'survey']);
    const elementValue = getValue(row, ['elementlocation', 'element', 'location']);
    const categoryValue = getValue(row, ['category', 'area', 'section']);
    const inferredCategory = categoryValue || inferCategory(`${elementValue} ${titleValue} ${evidenceValue}`) || elementValue;

    const costMin = parseMoney(getValue(row, ['unitcostlowedit', 'unitcostlow', 'costmin', 'mincost', 'min']));
    const costMax = parseMoney(getValue(row, ['unitcosthighedit', 'unitcosthigh', 'costmax', 'maxcost', 'max']));
    const componentsRaw = getValue(row, ['components', 'areas', 'elements']);
    const recurrenceRaw = getValue(row, ['recurrence', 'repeat']);
    const recurrenceInterval = Number(getValue(row, ['recurrenceinterval', 'repeatinterval']));
    const recurrenceUnit = getValue(row, ['recurrenceunit', 'repeatunit']);
    const pageValue = getValue(row, ['surveypageref', 'pagereference', 'page', 'reference']);
    const impactValue = getValue(row, ['impact', 'risk', 'impactifdelayed']);
    const priorityValue = mapPriorityValue(getValue(row, ['priority', 'urgency']));
    const statusValue = mapStatusValue(getValue(row, ['status']));
    const conditionValue = getValue(row, ['conditionrating', 'rating']);
    const conditionRating = parseConditionRating(conditionValue || evidenceValue);
    const contractorValue = getValue(row, ['contractor', 'trade', 'contractortype'])
      || contractorByCategory[inferredCategory || ''];

    const parsedComponents = componentsRaw
      ? componentsRaw.split(/[,;|]/).map((item) => item.trim()).filter(Boolean)
      : [];

    const parsedRecurrence = recurrenceInterval && recurrenceUnit
      ? {
        interval: recurrenceInterval,
        unit: (recurrenceUnit.toLowerCase().includes('year') ? 'year' : 'month') as 'year' | 'month',
      }
      : recurrenceRaw
        ? {
          interval: Number(recurrenceRaw.split(' ')[0]) || 1,
          unit: (recurrenceRaw.toLowerCase().includes('year') ? 'year' : 'month') as 'year' | 'month',
        }
        : undefined;

    return {
      title: titleValue,
      category: inferredCategory || 'General',
      conditionRating,
      priority: priorityValue,
      impact: impactValue,
      timeframe: getValue(row, ['timeframe', 'timing']),
      pageReference: toSurveyPageReference(pageValue),
      surveyEvidence: evidenceValue,
      recommendedContractor: contractorValue,
      defaultCostRange: costMin !== undefined && costMax !== undefined
        ? { min: costMin, max: costMax, currency: 'GBP' }
        : undefined,
      status: statusValue,
      nextDueDate: getValue(row, ['nextdue', 'duedate']),
      recurrence: parsedRecurrence,
      components: parsedComponents.length ? parsedComponents : undefined,
      source: (getValue(row, ['source']).toLowerCase() as PropertyTask['source']) || 'survey',
    };
  });
};

const buildCsv = (tasks: PropertyTask[]) => {
  const header = [
    'title',
    'category',
    'conditionRating',
    'priority',
    'impact',
    'timeframe',
    'pageReference',
    'surveyEvidence',
    'recommendedContractor',
    'costMin',
    'costMax',
    'status',
    'nextDueDate',
    'recurrence',
    'components',
    'source',
  ];

  const rows = tasks.map((task) => [
    task.title,
    task.category,
    task.conditionRating ?? '',
    task.priority,
    task.impact,
    task.timeframe,
    task.pageReference ?? '',
    task.surveyEvidence ?? '',
    task.recommendedContractor ?? '',
    task.defaultCostRange?.min ?? '',
    task.defaultCostRange?.max ?? '',
    task.status,
    task.nextDueDate ?? '',
    task.recurrence ? `${task.recurrence.interval} ${task.recurrence.unit}` : '',
    (task.components ?? []).join('|'),
    task.source,
  ]);

  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
};

const downloadText = (filename: string, content: string, type = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const advanceDate = (baseDate: string, interval: number, unit: 'month' | 'year') => {
  const date = new Date(baseDate);
  if (Number.isNaN(date.getTime())) return undefined;
  if (unit === 'year') {
    date.setFullYear(date.getFullYear() + interval);
  } else {
    date.setMonth(date.getMonth() + interval);
  }
  return formatDateForInput(date);
};

const StatusBadge = ({ status }: { status: PropertyTaskStatus }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>
    {statusLabels[status]}
  </span>
);

const PriorityBadge = ({ priority }: { priority: PropertyTaskPriority }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityStyles[priority]}`}>
    {priorityLabels[priority]}
  </span>
);

const SectionHeader = ({ title, subtitle, icon: Icon, actions }: {
  title: string;
  subtitle?: string;
  icon?: typeof ClipboardList;
  actions?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const ModalShell = ({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

export const PropertyDashboard = () => {
  const searchParams = useSearchParams();
  const shareMode = searchParams.get('mode') === 'share';
  const shareTaskId = searchParams.get('task') || '';

  const propertyProfile = useFamilyStore((state) => state.propertyProfile);
  const propertyTasks = useFamilyStore((state) => state.propertyTasks);
  const propertyValues = useFamilyStore((state) => state.propertyValues);
  const areaWatchItems = useFamilyStore((state) => state.areaWatchItems);
  const propertyComponents = useFamilyStore((state) => state.propertyComponents);
  const propertyRole = useFamilyStore((state) => state.propertyRole);

  const updatePropertyProfile = useFamilyStore((state) => state.updatePropertyProfile);
  const addPropertyDocument = useFamilyStore((state) => state.addPropertyDocument);
  const removePropertyDocument = useFamilyStore((state) => state.removePropertyDocument);
  const addPropertyTask = useFamilyStore((state) => state.addPropertyTask);
  const updatePropertyTask = useFamilyStore((state) => state.updatePropertyTask);
  const addPropertyWorkLog = useFamilyStore((state) => state.addPropertyWorkLog);
  const addPropertyValue = useFamilyStore((state) => state.addPropertyValue);
  const updateAreaWatchItem = useFamilyStore((state) => state.updateAreaWatchItem);
  const setPropertyRole = useFamilyStore((state) => state.setPropertyRole);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PropertyTaskStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | PropertyTask['source']>('all');
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d'); // Default to 3D view
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showLogWorkModal, setShowLogWorkModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTask, setActiveTask] = useState<PropertyTask | null>(null);
  const [copiedTask, setCopiedTask] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [attachmentTaskId, setAttachmentTaskId] = useState('');
  const [isEditingBaseline, setIsEditingBaseline] = useState(false);
  const [pdfImportTasks, setPdfImportTasks] = useState<ParsedSurveyTask[]>([]);
  const [pdfWarnings, setPdfWarnings] = useState<string[]>([]);
  const [pdfIsProcessing, setPdfIsProcessing] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [selectedPdfTasks, setSelectedPdfTasks] = useState<Set<number>>(new Set());
  const [baselineDraft, setBaselineDraft] = useState({
    propertyName: propertyProfile.propertyName,
    address: propertyProfile.address,
    purchaseDate: propertyProfile.purchaseDate ?? '',
    purchasePrice: propertyProfile.purchasePrice ? String(propertyProfile.purchasePrice) : '',
  });

  const [newTask, setNewTask] = useState({
    title: '',
    category: '',
    conditionRating: '2',
    priority: 'short',
    impact: '',
    timeframe: '',
    pageReference: '',
    recommendedContractor: '',
    costMin: '',
    costMax: '',
    status: 'outstanding',
    nextDueDate: '',
    recurrenceInterval: '',
    recurrenceUnit: 'month',
    source: 'survey',
    components: [] as string[],
  });

  const [workLogForm, setWorkLogForm] = useState({
    completedDate: formatDateForInput(new Date()),
    completedBy: '',
    cost: '',
    costIncludesVat: true,
    warrantyEndDate: '',
    notes: '',
    attachments: [] as PropertyDocument[],
    markCompleted: true,
  });

  const [valuationForm, setValuationForm] = useState({
    date: formatDateForInput(new Date()),
    value: '',
    source: 'manual',
    notes: '',
  });

  const documentInputRef = useRef<HTMLInputElement>(null);
  const logAttachmentRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const isOwnerView = propertyRole === 'owner' && !shareMode;
  const isReadOnly = !isOwnerView;

  const categories = useMemo(() => {
    const unique = new Set(propertyTasks.map((task) => task.category));
    return Array.from(unique).sort();
  }, [propertyTasks]);

  const now = useMemo(() => new Date(), []);

  const filteredTasks = useMemo(() => {
    let tasks = [...propertyTasks];
    if (shareMode && shareTaskId) {
      tasks = tasks.filter((task) => task.id === shareTaskId);
    }
    if (selectedComponent) {
      tasks = tasks.filter((task) => task.components?.includes(selectedComponent));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      tasks = tasks.filter((task) =>
        task.title.toLowerCase().includes(term) ||
        task.category.toLowerCase().includes(term) ||
        (task.impact || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      tasks = tasks.filter((task) => task.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      tasks = tasks.filter((task) => task.category === categoryFilter);
    }
    if (sourceFilter !== 'all') {
      tasks = tasks.filter((task) => task.source === sourceFilter);
    }
    return tasks;
  }, [propertyTasks, shareMode, shareTaskId, selectedComponent, searchTerm, statusFilter, categoryFilter, sourceFilter]);

  const taskScope = shareMode ? filteredTasks : propertyTasks;

  const dueSoonTasks = useMemo(() => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 14);
    return taskScope.filter((task) => {
      if (!task.nextDueDate || task.status === 'completed') return false;
      const due = new Date(task.nextDueDate);
      return due >= now && due <= soon;
    });
  }, [taskScope, now]);

  const overdueTasks = useMemo(() => (
    taskScope.filter((task) => {
      if (!task.nextDueDate || task.status === 'completed') return false;
      return new Date(task.nextDueDate) < now;
    })
  ), [taskScope, now]);

  const outstandingCount = useMemo(() => (
    taskScope.filter((task) => task.status === 'outstanding').length
  ), [taskScope]);

  const totalSpent = useMemo(() => (
    taskScope.reduce((sum, task) => sum + task.workLogs.reduce((total, log) => total + (log.cost || 0), 0), 0)
  ), [taskScope]);

  const evidenceCount = useMemo(() => {
    const taskAttachments = taskScope.reduce((count, task) => count + (task.attachments?.length ?? 0), 0);
    const logAttachments = taskScope.reduce((count, task) => count + task.workLogs.reduce((total, log) => total + (log.attachments?.length ?? 0), 0), 0);
    const baselineDocs = shareMode ? 0 : propertyProfile.documents.length;
    return taskAttachments + logAttachments + baselineDocs;
  }, [propertyProfile.documents.length, shareMode, taskScope]);

  const nextDueTasks = useMemo(() => (
    taskScope
      .filter((task) => task.nextDueDate && task.status !== 'completed')
      .sort((a, b) => new Date(a.nextDueDate || '').getTime() - new Date(b.nextDueDate || '').getTime())
      .slice(0, 4)
  ), [taskScope]);

  const componentStats = useMemo(() => {
    const stats = new Map<string, { taskCount: number; lastRepair?: string; nextDue?: string; evidenceCount: number }>();
    propertyComponents.forEach((component) => {
      const relatedTasks = propertyTasks.filter((task) => task.components?.includes(component.id));
      const workLogs = relatedTasks.flatMap((task) => task.workLogs);
      const lastRepair = workLogs
        .map((log) => log.completedDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      const nextDue = relatedTasks
        .filter((task) => task.nextDueDate)
        .map((task) => task.nextDueDate as string)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
      const evidence = relatedTasks.reduce((count, task) => count + (task.attachments?.length ?? 0), 0)
        + workLogs.reduce((count, log) => count + (log.attachments?.length ?? 0), 0);

      stats.set(component.id, {
        taskCount: relatedTasks.length,
        lastRepair,
        nextDue,
        evidenceCount: evidence,
      });
    });
    return stats;
  }, [propertyComponents, propertyTasks]);

  const valuationSeries = useMemo(() => {
    if (propertyValues.length > 0) return propertyValues;
    if (propertyProfile.purchasePrice && propertyProfile.purchaseDate) {
      return [{
        id: 'value-purchase',
        date: propertyProfile.purchaseDate,
        value: propertyProfile.purchasePrice,
        source: 'manual',
        notes: 'Purchase baseline',
      } satisfies PropertyValueEntry];
    }
    return [] as PropertyValueEntry[];
  }, [propertyValues, propertyProfile.purchasePrice, propertyProfile.purchaseDate]);

  const floors = useMemo(() => {
    const grouped = new Map<string, typeof propertyComponents>();
    propertyComponents.forEach((component) => {
      const list = grouped.get(component.floor) ?? [];
      grouped.set(component.floor, [...list, component]);
    });
    return Array.from(grouped.entries());
  }, [propertyComponents]);

  const handleBaselineSave = () => {
    updatePropertyProfile({
      propertyName: baselineDraft.propertyName.trim() || propertyProfile.propertyName,
      address: baselineDraft.address.trim() || propertyProfile.address,
      purchaseDate: baselineDraft.purchaseDate || undefined,
      purchasePrice: baselineDraft.purchasePrice ? Number(baselineDraft.purchasePrice) : undefined,
    });
    setIsEditingBaseline(false);
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    files.forEach((file) => {
      const nameLower = file.name.toLowerCase();
      const type: PropertyDocument['type'] = nameLower.includes('survey')
        ? 'survey'
        : nameLower.includes('invoice')
          ? 'invoice'
          : nameLower.includes('warranty')
            ? 'warranty'
            : nameLower.includes('solicitor')
              ? 'legal'
              : nameLower.endsWith('.jpg') || nameLower.endsWith('.png')
                ? 'photo'
                : 'other';
      addPropertyDocument({
        id: createId('doc'),
        name: file.name.replace(/\.[^/.]+$/, ''),
        type,
        fileName: file.name,
        uploadedAt: formatDateForInput(new Date()),
      });
    });
    event.target.value = '';
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    const costMin = Number(newTask.costMin);
    const costMax = Number(newTask.costMax);
    const task: PropertyTask = {
      id: createId('task'),
      title: newTask.title.trim(),
      category: newTask.category.trim() || 'General',
      conditionRating: Number(newTask.conditionRating) as 1 | 2 | 3,
      priority: newTask.priority as PropertyTaskPriority,
      impact: newTask.impact.trim() || 'Not specified',
      timeframe: newTask.timeframe.trim() || 'Short term',
      pageReference: newTask.pageReference.trim() || undefined,
      recommendedContractor: newTask.recommendedContractor.trim() || undefined,
      defaultCostRange: costMin && costMax ? { min: costMin, max: costMax, currency: 'GBP' } : undefined,
      status: newTask.status as PropertyTaskStatus,
      nextDueDate: newTask.nextDueDate || undefined,
      recurrence: newTask.recurrenceInterval
        ? { interval: Number(newTask.recurrenceInterval), unit: newTask.recurrenceUnit as 'month' | 'year' }
        : undefined,
      components: newTask.components.length ? newTask.components : undefined,
      attachments: [],
      workLogs: [],
      source: newTask.source as PropertyTask['source'],
      createdAt: toIsoDate(new Date().toISOString()),
      updatedAt: toIsoDate(new Date().toISOString()),
    };

    addPropertyTask(task);
    setShowAddTaskModal(false);
    setNewTask({
      title: '',
      category: '',
      conditionRating: '2',
      priority: 'short',
      impact: '',
      timeframe: '',
      pageReference: '',
      recommendedContractor: '',
      costMin: '',
      costMax: '',
      status: 'outstanding',
      nextDueDate: '',
      recurrenceInterval: '',
      recurrenceUnit: 'month',
      source: 'survey',
      components: [],
    });
  };

  const handleLogWork = () => {
    if (!activeTask) return;
    const cost = Number(workLogForm.cost) || 0;
    const workLog: PropertyWorkLog = {
      id: createId('work'),
      taskId: activeTask.id,
      completedDate: workLogForm.completedDate || formatDateForInput(new Date()),
      completedBy: workLogForm.completedBy.trim() || 'Contractor',
      cost,
      costIncludesVat: workLogForm.costIncludesVat,
      warrantyEndDate: workLogForm.warrantyEndDate || undefined,
      notes: workLogForm.notes.trim() || undefined,
      attachments: workLogForm.attachments.length ? workLogForm.attachments : undefined,
    };
    addPropertyWorkLog(activeTask.id, workLog);

    const nextDue = activeTask.recurrence
      ? advanceDate(workLog.completedDate, activeTask.recurrence.interval, activeTask.recurrence.unit)
      : activeTask.nextDueDate;

    if (workLogForm.markCompleted) {
      const nextStatus = activeTask.recurrence ? 'outstanding' : 'completed';
      updatePropertyTask(activeTask.id, {
        status: nextStatus,
        nextDueDate: nextDue,
      });
    }

    setShowLogWorkModal(false);
    setWorkLogForm({
      completedDate: formatDateForInput(new Date()),
      completedBy: '',
      cost: '',
      costIncludesVat: true,
      warrantyEndDate: '',
      notes: '',
      attachments: [],
      markCompleted: true,
    });
    setActiveTask(null);
  };

  const handleLogAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const attachments = files.map((file) => ({
      id: createId('doc'),
      name: file.name.replace(/\.[^/.]+$/, ''),
      type: file.type.includes('pdf') ? 'invoice' : 'photo',
      fileName: file.name,
      uploadedAt: formatDateForInput(new Date()),
    } satisfies PropertyDocument));
    setWorkLogForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...attachments],
    }));
    event.target.value = '';
  };

  const handleTaskEvidenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !attachmentTaskId) return;
    const attachments = files.map((file) => ({
      id: createId('doc'),
      name: file.name.replace(/\.[^/.]+$/, ''),
      type: file.type.includes('pdf') ? 'survey' : 'photo',
      fileName: file.name,
      uploadedAt: formatDateForInput(new Date()),
    } satisfies PropertyDocument));

    const task = propertyTasks.find((item) => item.id === attachmentTaskId);
    updatePropertyTask(attachmentTaskId, {
      attachments: [...(task?.attachments ?? []), ...attachments],
    });
    setAttachmentTaskId('');
    event.target.value = '';
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    const parsed = mapCsvTasks(rows)
      .filter((task) => task.title)
      .map((task) => ({
        id: createId('task'),
        title: task.title || 'Imported task',
        category: task.category || 'General',
        conditionRating: task.conditionRating as 1 | 2 | 3 | undefined,
        priority: (task.priority || 'short') as PropertyTaskPriority,
        impact: task.impact || 'Not specified',
        timeframe: task.timeframe || 'Short term',
        pageReference: task.pageReference || undefined,
        surveyEvidence: task.surveyEvidence || undefined,
        recommendedContractor: task.recommendedContractor || undefined,
        defaultCostRange: task.defaultCostRange,
        status: (task.status || 'outstanding') as PropertyTaskStatus,
        nextDueDate: task.nextDueDate || undefined,
        recurrence: task.recurrence,
        components: task.components?.length ? task.components : undefined,
        attachments: [],
        workLogs: [],
        source: (task.source || 'survey') as PropertyTask['source'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    parsed.forEach((task) => addPropertyTask(task));
    setImportStatus(`Imported ${parsed.length} task${parsed.length === 1 ? '' : 's'} from ${file.name}.`);
    event.target.value = '';
  };

  const handleImportPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('pdf')) {
      setPdfWarnings(['Please upload a PDF file.']);
      event.target.value = '';
      return;
    }
    setPdfIsProcessing(true);
    setPdfFileName(file.name);
    setPdfWarnings([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/property/survey-parse', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to parse PDF.');
      }
      const tasks = (payload.tasks || []) as ParsedSurveyTask[];
      setPdfImportTasks(tasks);
      setSelectedPdfTasks(new Set(tasks.map((_, index) => index)));
      setPdfWarnings(payload.warnings || []);
    } catch (error) {
      setPdfWarnings([error instanceof Error ? error.message : 'Failed to parse PDF.']);
      setPdfImportTasks([]);
      setSelectedPdfTasks(new Set());
    } finally {
      setPdfIsProcessing(false);
      event.target.value = '';
    }
  };

  const togglePdfTaskSelection = (index: number) => {
    setSelectedPdfTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleSelectAllPdfTasks = () => {
    setSelectedPdfTasks((prev) => {
      if (prev.size === pdfImportTasks.length) {
        return new Set();
      }
      return new Set(pdfImportTasks.map((_, index) => index));
    });
  };

  const handleImportParsedTasks = () => {
    if (!pdfImportTasks.length || selectedPdfTasks.size === 0) return;
    const nowIso = new Date().toISOString();
    pdfImportTasks.forEach((task, index) => {
      if (!selectedPdfTasks.has(index)) return;
      addPropertyTask({
        id: createId('task'),
        title: task.title,
        category: task.category,
        conditionRating: task.conditionRating,
        priority: task.priority,
        impact: task.impact,
        timeframe: task.timeframe,
        pageReference: task.pageReference,
        surveyEvidence: task.sourceSnippet,
        recommendedContractor: task.recommendedContractor,
        status: 'outstanding',
        nextDueDate: undefined,
        recurrence: undefined,
        components: undefined,
        attachments: [],
        workLogs: [],
        source: 'survey',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });
    setPdfImportTasks([]);
    setSelectedPdfTasks(new Set());
    setPdfWarnings([]);
    setPdfFileName('');
  };

  const resetPdfImport = () => {
    setPdfImportTasks([]);
    setSelectedPdfTasks(new Set());
    setPdfWarnings([]);
    setPdfFileName('');
  };

  const handleShareTask = async (taskId: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'property');
    url.searchParams.set('task', taskId);
    url.searchParams.set('mode', 'share');
    const shareUrl = url.toString();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedTask(taskId);
      setTimeout(() => setCopiedTask(''), 2000);
    } catch {
      window.prompt('Copy link to share this task:', shareUrl);
    }
  };

  const handleExportCsv = () => {
    downloadText('tremaine-road-action-register.csv', buildCsv(propertyTasks), 'text/csv');
  };

  const handleExportJson = () => {
    downloadText('tremaine-road-action-register.json', JSON.stringify(propertyTasks, null, 2), 'application/json');
  };

  const handleExportSummary = () => {
    const html = `
      <html>
        <head>
          <title>21 Tremaine Road - Action Register Summary</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>21 Tremaine Road - Action Register Summary</h1>
          <p>Generated ${formatDate(new Date())}</p>
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Category</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              ${propertyTasks.map((task) => `
                <tr>
                  <td>${task.title}</td>
                  <td>${task.category}</td>
                  <td>${statusLabels[task.status]}</td>
                  <td>${priorityLabels[task.priority]}</td>
                  <td>${task.nextDueDate || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleAddValuation = () => {
    if (!valuationForm.value) return;
    addPropertyValue({
      id: createId('value'),
      date: valuationForm.date,
      value: Number(valuationForm.value),
      source: valuationForm.source as PropertyValueEntry['source'],
      notes: valuationForm.notes.trim() || undefined,
    });
    setValuationForm({
      date: formatDateForInput(new Date()),
      value: '',
      source: 'manual',
      notes: '',
    });
  };

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              <Shield className="h-4 w-4" />
              <span>Private property dashboard - owners only</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{propertyProfile.propertyName}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">{propertyProfile.address}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span>Access</span>
              <select
                value={propertyRole}
                onChange={(event) => setPropertyRole(event.target.value as 'owner' | 'contractor' | 'viewer')}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none dark:text-slate-200"
                disabled={shareMode}
              >
                <option value="owner">Owner</option>
                <option value="contractor">Contractor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={!isOwnerView}
            >
              <Plus className="h-4 w-4" /> Add task
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              disabled={!isOwnerView}
            >
              <FileUp className="h-4 w-4" /> Import survey
            </button>
            <button
              onClick={handleExportSummary}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              disabled={!isOwnerView}
            >
              <FileText className="h-4 w-4" /> Export summary
            </button>
          </div>
        </div>

        {shareMode ? (
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-100">
            Shared task view - read only. All changes require owner access.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Outstanding</p>
                <ClipboardList className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">{outstandingCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Tasks still open</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Due soon</p>
                <Clock className="h-4 w-4 text-orange-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">{dueSoonTasks.length}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Next 14 days</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Overdue</p>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">{overdueTasks.length}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Needs attention</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Total spent</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Logged work costs</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Evidence</p>
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">{evidenceCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Docs and photos</p>
            </div>
          </div>
        )}
      </section>

      {!shareMode && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <SectionHeader
            title="Purchase baseline"
            subtitle="Store the purchase baseline and key documents"
            icon={FileText}
            actions={isOwnerView ? (
              <button
                onClick={() => {
                  setBaselineDraft({
                    propertyName: propertyProfile.propertyName,
                    address: propertyProfile.address,
                    purchaseDate: propertyProfile.purchaseDate ?? '',
                    purchasePrice: propertyProfile.purchasePrice ? String(propertyProfile.purchasePrice) : '',
                  });
                  setIsEditingBaseline(true);
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Edit baseline
              </button>
            ) : null}
          />

          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              {isEditingBaseline ? (
                <div className="grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Property name</label>
                    <input
                      value={baselineDraft.propertyName}
                      onChange={(event) => setBaselineDraft((prev) => ({ ...prev, propertyName: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Address</label>
                    <input
                      value={baselineDraft.address}
                      onChange={(event) => setBaselineDraft((prev) => ({ ...prev, address: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Purchase date</label>
                      <input
                        type="date"
                        value={baselineDraft.purchaseDate}
                        onChange={(event) => setBaselineDraft((prev) => ({ ...prev, purchaseDate: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Purchase price (GBP)</label>
                      <input
                        type="number"
                        value={baselineDraft.purchasePrice}
                        onChange={(event) => setBaselineDraft((prev) => ({ ...prev, purchasePrice: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBaselineSave}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Save baseline
                    </button>
                    <button
                      onClick={() => setIsEditingBaseline(false)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 text-sm text-gray-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-500 dark:text-slate-400">Purchase date</span>
                    <span>{propertyProfile.purchaseDate ? formatDate(propertyProfile.purchaseDate) : 'Not set'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-500 dark:text-slate-400">Purchase price</span>
                    <span>{propertyProfile.purchasePrice ? formatCurrency(propertyProfile.purchasePrice) : 'Not set'}</span>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-xs text-gray-500 dark:border-slate-800 dark:text-slate-400">
                Upload key documents (survey, legal, warranties). Files are stored locally in this browser for now.
              </div>
              <input
                ref={documentInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleDocumentUpload}
              />
              <button
                onClick={() => documentInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={!isOwnerView}
              >
                <FileUp className="h-4 w-4" /> Add document
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Documents</p>
              {propertyProfile.documents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {propertyProfile.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm dark:border-slate-800">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-slate-100">{doc.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{doc.fileName || doc.type}</p>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => removePropertyDocument(doc.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <SectionHeader
          title="Survey to action register"
          subtitle="Track every issue, cost, evidence, and next due date"
          icon={ClipboardList}
          actions={(
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search tasks"
                  className="w-44 rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:text-slate-300">
                <Filter className="h-4 w-4" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none dark:text-slate-100"
                >
                  <option value="all">All status</option>
                  <option value="outstanding">Outstanding</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="verify">Verify</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}
                className="rounded-lg border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All sources</option>
                <option value="survey">Survey</option>
                <option value="maintenance">Maintenance</option>
                <option value="owner">Owner</option>
              </select>
            </>
          )}
        />

        {selectedComponent && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-100">
            <span>Filtered by component: {propertyComponents.find((component) => component.id === selectedComponent)?.label}</span>
            <button onClick={() => setSelectedComponent('')} className="text-xs font-semibold">Clear</button>
          </div>
        )}

        <input
          ref={evidenceInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleTaskEvidenceUpload}
        />

        <div className="mt-4 hidden overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 md:block">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-slate-800">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">Cost</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{task.category} - {task.pageReference || 'No page ref'}</p>
                    {task.surveyEvidence && (
                      <p className="text-xs text-gray-500 dark:text-slate-400">Survey evidence: {task.surveyEvidence}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-slate-400">Impact: {task.impact}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Timeframe: {task.timeframe}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Contractor: {task.recommendedContractor || 'TBD'}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Evidence: {task.attachments?.length ?? 0}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <PriorityBadge priority={task.priority} />
                      {task.conditionRating && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">Rating {task.conditionRating}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isReadOnly ? (
                      <StatusBadge status={task.status} />
                    ) : (
                      <select
                        value={task.status}
                        onChange={(event) => updatePropertyTask(task.id, { status: event.target.value as PropertyTaskStatus })}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                    {task.nextDueDate ? formatDate(task.nextDueDate) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                    {task.defaultCostRange ? `${formatCurrency(task.defaultCostRange.min)} - ${formatCurrency(task.defaultCostRange.max)}` : 'TBD'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setAttachmentTaskId(task.id);
                          evidenceInputRef.current?.click();
                        }}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        disabled={isReadOnly}
                      >
                        Attach
                      </button>
                      <button
                        onClick={() => {
                          setActiveTask(task);
                          setShowLogWorkModal(true);
                        }}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        disabled={isReadOnly}
                      >
                        Log work
                      </button>
                      <button
                        onClick={() => handleShareTask(task.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        {copiedTask === task.id ? 'Copied' : 'Share'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    No tasks match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 md:hidden">
          {filteredTasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">{task.title}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{task.category} - {task.pageReference || 'No page ref'}</p>
                  {task.surveyEvidence && (
                    <p className="text-xs text-gray-500 dark:text-slate-400">Survey evidence: {task.surveyEvidence}</p>
                  )}
                </div>
                <PriorityBadge priority={task.priority} />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{task.impact}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Timeframe: {task.timeframe}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Contractor: {task.recommendedContractor || 'TBD'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                {task.conditionRating && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">Rating {task.conditionRating}</span>
                )}
                <span className="text-xs text-gray-500 dark:text-slate-400">Due: {task.nextDueDate ? formatDate(task.nextDueDate) : '-'}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-slate-400">
                <span>Cost: {task.defaultCostRange ? `${formatCurrency(task.defaultCostRange.min)} - ${formatCurrency(task.defaultCostRange.max)}` : 'TBD'}</span>
                <span>Logs: {task.workLogs.length}</span>
                <span>Evidence: {task.attachments?.length ?? 0}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setAttachmentTaskId(task.id);
                    evidenceInputRef.current?.click();
                  }}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={isReadOnly}
                >
                  Attach
                </button>
                <button
                  onClick={() => {
                    setActiveTask(task);
                    setShowLogWorkModal(true);
                  }}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={isReadOnly}
                >
                  Log work
                </button>
                <button
                  onClick={() => handleShareTask(task.id)}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {copiedTask === task.id ? 'Copied' : 'Share'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!shareMode && (
        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeader
              title="Maintenance scheduler"
              subtitle="Keep on top of routine tasks"
              icon={Wrench}
            />
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Overdue</p>
                {overdueTasks.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Nothing overdue.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {overdueTasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                        {task.title} - Due {formatDate(task.nextDueDate)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">Due soon</p>
                {dueSoonTasks.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">No tasks due in the next 14 days.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {dueSoonTasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                        {task.title} - Due {formatDate(task.nextDueDate)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Next up</p>
                <div className="mt-2 space-y-2">
                  {nextDueTasks.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">No scheduled tasks yet.</p>
                  ) : (
                    nextDueTasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-slate-800 dark:text-slate-300">
                        {task.title} - {formatDate(task.nextDueDate)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeader
              title="Property value tracking"
              subtitle="Add manual valuations and connect Land Registry/HPI data"
              icon={Calendar}
            />
            <div className="mt-4 h-64">
              {valuationSeries.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
                  <p>No valuations yet.</p>
                  <p>Add a manual valuation to start tracking.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={valuationSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => currencyFormatter.format(Number(value))} />
                    <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input
                type="date"
                value={valuationForm.date}
                onChange={(event) => setValuationForm((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                disabled={!isOwnerView}
              />
              <input
                type="number"
                placeholder="Value"
                value={valuationForm.value}
                onChange={(event) => setValuationForm((prev) => ({ ...prev, value: event.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                disabled={!isOwnerView}
              />
              <select
                value={valuationForm.source}
                onChange={(event) => setValuationForm((prev) => ({ ...prev, source: event.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                disabled={!isOwnerView}
              >
                <option value="manual">Manual</option>
                <option value="land_registry">Land Registry</option>
                <option value="house_price_index">House price index</option>
              </select>
              <button
                onClick={handleAddValuation}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={!isOwnerView}
              >
                Add value
              </button>
            </div>
          </div>
        </section>
      )}

      {!shareMode && (
        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <SectionHeader
                title={viewMode === '3d' ? "Digital twin (3D model)" : "Digital twin (2D component map)"}
                subtitle="Tap a room or element to filter tasks and surface evidence"
                icon={viewMode === '3d' ? Box : MapIcon}
              />
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('2d')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === '2d'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                  2D
                </button>
                <button
                  onClick={() => setViewMode('3d')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === '3d'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  3D
                </button>
              </div>
            </div>

            {viewMode === '3d' ? (
              <div className="mt-4">
                <Property3DViewer
                  components={propertyComponents}
                  tasks={propertyTasks}
                  selectedComponent={selectedComponent || null}
                  onSelectComponent={(id) => setSelectedComponent(id || '')}
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {floors.map(([floor, components]) => (
                  <div key={floor} className="rounded-xl border border-gray-200 p-3 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      {floorLabels[floor] || floor}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {components.map((component) => {
                        const stats = componentStats.get(component.id);
                        const isActive = selectedComponent === component.id;
                        return (
                          <button
                            key={component.id}
                            onClick={() => setSelectedComponent(component.id)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              isActive
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                          >
                            {component.label} {stats?.taskCount ? `(${stats.taskCount})` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeader
              title="Component snapshot"
              subtitle="Last repair, next due, evidence"
              icon={ClipboardList}
            />
            <div className="mt-4 space-y-4">
              {selectedComponent ? (
                (() => {
                  const component = propertyComponents.find((item) => item.id === selectedComponent);
                  const stats = componentStats.get(selectedComponent);
                  return (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{component?.label}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{floorLabels[component?.floor || '']}</p>
                      </div>
                      <div className="grid gap-3">
                        <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600 dark:border-slate-800 dark:text-slate-300">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Last repair</p>
                          <p>{stats?.lastRepair ? formatDate(stats.lastRepair) : 'No repairs logged'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600 dark:border-slate-800 dark:text-slate-300">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Next due</p>
                          <p>{stats?.nextDue ? formatDate(stats.nextDue) : 'Not scheduled'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600 dark:border-slate-800 dark:text-slate-300">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Evidence</p>
                          <p>{stats?.evidenceCount ? `${stats.evidenceCount} file(s)` : 'No evidence yet'}</p>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Select a room or element to see related tasks and evidence.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {!shareMode && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeader
              title="Area watch"
              subtitle="Monitor only signals that affect value, risk, or liveability"
              icon={MapIcon}
            />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {areaWatchItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 dark:text-slate-100">{item.title}</p>
                  <span className="rounded-full border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:text-slate-300">
                    {item.impact} impact
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{item.description}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <span>Last updated {formatDate(item.lastUpdated)}</span>
                  {item.sourceUrl && (
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline dark:text-blue-300">
                      Source link
                    </a>
                  )}
                </div>
                <button
                  onClick={() => updateAreaWatchItem(item.id, { notify: !item.notify })}
                  className="mt-3 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={!isOwnerView}
                >
                  {item.notify ? 'Notifications on' : 'Notifications off'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!shareMode && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCsv}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportJson}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Export JSON
          </button>
        </div>
      )}

      <ModalShell
        open={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        title="Add new task"
      >
        <div className="grid gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">Title</label>
            <input
              value={newTask.title}
              onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Category</label>
              <input
                value={newTask.category}
                onChange={(event) => setNewTask((prev) => ({ ...prev, category: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Condition rating</label>
              <select
                value={newTask.conditionRating}
                onChange={(event) => setNewTask((prev) => ({ ...prev, conditionRating: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="1">1 - OK</option>
                <option value="2">2 - Repair</option>
                <option value="3">3 - Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Priority</label>
              <select
                value={newTask.priority}
                onChange={(event) => setNewTask((prev) => ({ ...prev, priority: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="urgent">Urgent</option>
                <option value="short">Short term</option>
                <option value="medium">Medium term</option>
                <option value="long">Long term</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Status</label>
              <select
                value={newTask.status}
                onChange={(event) => setNewTask((prev) => ({ ...prev, status: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Impact</label>
            <textarea
              value={newTask.impact}
              onChange={(event) => setNewTask((prev) => ({ ...prev, impact: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Timeframe</label>
              <input
                value={newTask.timeframe}
                onChange={(event) => setNewTask((prev) => ({ ...prev, timeframe: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Survey page ref</label>
              <input
                value={newTask.pageReference}
                onChange={(event) => setNewTask((prev) => ({ ...prev, pageReference: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Recommended contractor type</label>
            <input
              value={newTask.recommendedContractor}
              onChange={(event) => setNewTask((prev) => ({ ...prev, recommendedContractor: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Cost range min (GBP)</label>
              <input
                type="number"
                value={newTask.costMin}
                onChange={(event) => setNewTask((prev) => ({ ...prev, costMin: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Cost range max (GBP)</label>
              <input
                type="number"
                value={newTask.costMax}
                onChange={(event) => setNewTask((prev) => ({ ...prev, costMax: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Next due date</label>
              <input
                type="date"
                value={newTask.nextDueDate}
                onChange={(event) => setNewTask((prev) => ({ ...prev, nextDueDate: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Source</label>
              <select
                value={newTask.source}
                onChange={(event) => setNewTask((prev) => ({ ...prev, source: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="survey">Survey</option>
                <option value="maintenance">Maintenance</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Recurrence interval</label>
              <input
                type="number"
                value={newTask.recurrenceInterval}
                onChange={(event) => setNewTask((prev) => ({ ...prev, recurrenceInterval: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Recurrence unit</label>
              <select
                value={newTask.recurrenceUnit}
                onChange={(event) => setNewTask((prev) => ({ ...prev, recurrenceUnit: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Components</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {propertyComponents.map((component) => {
                const selected = newTask.components.includes(component.id);
                return (
                  <button
                    key={component.id}
                    type="button"
                    onClick={() => setNewTask((prev) => ({
                      ...prev,
                      components: selected
                        ? prev.components.filter((id) => id !== component.id)
                        : [...prev.components, component.id],
                    }))}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {component.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddTaskModal(false)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTask}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add task
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={showLogWorkModal}
        onClose={() => setShowLogWorkModal(false)}
        title={`Log completed work${activeTask ? ` - ${activeTask.title}` : ''}`}
      >
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Completed date</label>
              <input
                type="date"
                value={workLogForm.completedDate}
                onChange={(event) => setWorkLogForm((prev) => ({ ...prev, completedDate: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Contractor / who did it</label>
              <input
                value={workLogForm.completedBy}
                onChange={(event) => setWorkLogForm((prev) => ({ ...prev, completedBy: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Cost</label>
              <input
                type="number"
                value={workLogForm.cost}
                onChange={(event) => setWorkLogForm((prev) => ({ ...prev, cost: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={workLogForm.costIncludesVat}
                onChange={(event) => setWorkLogForm((prev) => ({ ...prev, costIncludesVat: event.target.checked }))}
              />
              <span className="text-xs text-gray-500">Cost includes VAT</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Warranty end date</label>
              <input
                type="date"
                value={workLogForm.warrantyEndDate}
                onChange={(event) => setWorkLogForm((prev) => ({ ...prev, warrantyEndDate: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={workLogForm.markCompleted}
                onChange={(event) => setWorkLogForm((prev) => ({ ...prev, markCompleted: event.target.checked }))}
              />
              <span className="text-xs text-gray-500">Mark task completed</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Notes</label>
            <textarea
              value={workLogForm.notes}
              onChange={(event) => setWorkLogForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div>
            <input
              ref={logAttachmentRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleLogAttachment}
            />
            <button
              onClick={() => logAttachmentRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <FileUp className="h-4 w-4" /> Add attachments
            </button>
            {workLogForm.attachments.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                {workLogForm.attachments.map((attachment) => (
                  <div key={attachment.id}>{attachment.fileName}</div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowLogWorkModal(false)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleLogWork}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save work log
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import survey tasks"
      >
        <div className="space-y-6 text-sm text-gray-600">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">A. CSV import (manual mapping)</p>
            <p>Upload a CSV to populate the action register. Expected columns include:</p>
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
              title, category, conditionRating, priority, impact, timeframe, pageReference, recommendedContractor, costMin, costMax, status, nextDueDate, recurrence, components, source
            </p>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCsv}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <FileUp className="h-4 w-4" /> Choose CSV file
            </button>
            {importStatus && <p className="text-xs text-emerald-600">{importStatus}</p>}
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-5">
            <p className="text-sm font-semibold text-gray-900">B. Survey PDF (auto parse)</p>
            <p>Upload the survey PDF to extract draft tasks. Review before importing.</p>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleImportPdf}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                disabled={pdfIsProcessing}
              >
                <FileUp className="h-4 w-4" /> Choose PDF file
              </button>
              {pdfIsProcessing && <span className="text-xs text-gray-500">Parsing PDF...</span>}
              {pdfFileName && !pdfIsProcessing && (
                <span className="text-xs text-gray-500">Parsed: {pdfFileName}</span>
              )}
            </div>
            {pdfWarnings.length > 0 && (
              <div className="space-y-1 text-xs text-amber-600">
                {pdfWarnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            )}
            {pdfImportTasks.length > 0 && (
              <div className="rounded-lg border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500">
                  <span>Draft tasks ({pdfImportTasks.length})</span>
                  <button onClick={toggleSelectAllPdfTasks} className="text-blue-600">
                    {selectedPdfTasks.size === pdfImportTasks.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-200">
                  {pdfImportTasks.map((task, index) => (
                    <label key={`${task.title}-${index}`} className="flex cursor-pointer gap-3 px-3 py-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedPdfTasks.has(index)}
                        onChange={() => togglePdfTaskSelection(index)}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                        <p>{task.category} | {task.timeframe} | {task.priority}</p>
                        <p>Confidence: {Math.round(task.confidence * 100)}%</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {pdfImportTasks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleImportParsedTasks}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  disabled={selectedPdfTasks.size === 0}
                >
                  Import selected tasks
                </button>
                <button
                  onClick={resetPdfImport}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Clear parsed list
                </button>
              </div>
            )}
          </div>
        </div>
      </ModalShell>
    </div>
  );
};
