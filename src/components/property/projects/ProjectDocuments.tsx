'use client';
import { Download, FileText } from 'lucide-react';
import type { PropertyProject } from '@/types/property.types';
import { downloadChecklist, fileDownloadLink } from '@/lib/sourcing/downloads';

export default function ProjectDocuments({ project }: { project: PropertyProject }) {
  const files = project.attachments ?? [];
  return <section aria-label="Project documents" className="space-y-4">
    <h3 className="font-semibold">Documents & downloads</h3>
    {project.sourcing && <button onClick={() => downloadChecklist(project.sourcing!)} className="inline-flex min-h-11 items-center gap-2 text-sm text-emerald-700"><Download className="h-4 w-4" />Download quote checklist (CSV)</button>}
    <ul className="divide-y divide-gray-200">{files.map((file) => { const url = fileDownloadLink(file.url); return <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="flex min-w-0 items-center gap-2 text-sm"><FileText className="h-4 w-4 shrink-0" /><span className="break-words">{file.name}</span></span>{url ? <a href={url} download={file.fileName || file.name} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm text-emerald-700"><Download className="h-4 w-4" />Download file</a> : <span className="text-xs text-gray-500">Original file not attached</span>}</li>; })}</ul>
    {!files.length && <p className="text-sm text-gray-500">No original files attached to this project.</p>}
    {project.sourcing?.tileDocuments?.map((file) => <a key={file.id} href={fileDownloadLink(file.imageDataUrl)} download={`${file.label.replace(/[^a-z0-9-]/gi, '_')}.jpg`} className="flex min-h-11 items-center gap-2 text-sm text-emerald-700"><Download className="h-4 w-4" />{file.label}</a>)}
  </section>;
}
