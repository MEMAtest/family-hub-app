import { ExternalLink } from "lucide-react";
import type { MerchantEvidence } from "@/lib/budget/merchants";

export function MerchantSource({ evidence }: { evidence?: MerchantEvidence }) {
  if (!evidence) return null;
  return (
    <a
      href={evidence.url}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      title={`${evidence.note} Checked ${evidence.checkedAt}.`}
      className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-teal-800 dark:text-teal-300"
    >
      Business source
      <ExternalLink aria-hidden="true" className="h-3 w-3" />
    </a>
  );
}
