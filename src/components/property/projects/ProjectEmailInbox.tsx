'use client';

import { useState } from 'react';
import { Plus, Mail, Users, FileText, Calendar, Bell, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { EmailParseModal } from './EmailParseModal';
import type { PropertyProject, ProjectEmail, TaskContact, TaskQuote, TaskScheduledVisit, TaskFollowUp } from '@/types/property.types';
import { formatDate } from '@/utils/formatDate';

interface ProjectEmailInboxProps {
  project: PropertyProject;
  onAddEmail: (email: ProjectEmail) => void;
  onRemoveEmail: (emailId: string) => void;
  onAddContact: (contact: TaskContact) => void;
  onAddQuote: (quote: TaskQuote) => void;
  onAddVisit: (visit: TaskScheduledVisit) => void;
  onAddFollowUp: (followUp: TaskFollowUp) => void;
  isReadOnly?: boolean;
}

export const ProjectEmailInbox = ({
  project,
  onAddEmail,
  onRemoveEmail,
  onAddContact,
  onAddQuote,
  onAddVisit,
  onAddFollowUp,
  isReadOnly = false,
}: ProjectEmailInboxProps) => {
  const [showParseModal, setShowParseModal] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  const handleEmailParsed = (
    email: ProjectEmail,
    contacts: TaskContact[],
    quotes: TaskQuote[],
    visits: TaskScheduledVisit[],
    followUps: TaskFollowUp[]
  ) => {
    // Add the email
    onAddEmail(email);

    // Add all the extracted items
    contacts.forEach(onAddContact);
    quotes.forEach(onAddQuote);
    visits.forEach(onAddVisit);
    followUps.forEach(onAddFollowUp);
  };

  const emails = project.emails || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-500" />
          <h3 className="font-medium text-gray-900 dark:text-slate-100">
            Emails ({emails.length})
          </h3>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowParseModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            <Plus className="h-4 w-4" />
            Add Email
          </button>
        )}
      </div>

      {/* Email List */}
      {emails.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <Mail className="mx-auto h-10 w-10 text-gray-400 dark:text-slate-500" />
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            No emails added yet
          </p>
          {!isReadOnly && (
            <button
              onClick={() => setShowParseModal(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Email
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => {
            const isExpanded = expandedEmail === email.id;
            const contactCount = email.extractedData?.contacts?.length || 0;
            const priceCount = email.extractedData?.prices?.length || 0;
            const dateCount = email.extractedData?.dates?.length || 0;
            const followUpCount = email.extractedData?.followUps?.length || 0;

            return (
              <div
                key={email.id}
                className="rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Email Header */}
                <div
                  className="flex cursor-pointer items-start justify-between p-4"
                  onClick={() => setExpandedEmail(isExpanded ? null : email.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
                        {email.subject || 'No subject'}
                      </p>
                    </div>
                    {email.sender && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        From: {email.sender}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-gray-400 dark:text-slate-500">
                        {formatDate(email.createdAt)}
                      </span>
                      {contactCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                          <Users className="h-3 w-3" />
                          {contactCount}
                        </span>
                      )}
                      {priceCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <FileText className="h-3 w-3" />
                          {priceCount}
                        </span>
                      )}
                      {dateCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                          <Calendar className="h-3 w-3" />
                          {dateCount}
                        </span>
                      )}
                      {followUpCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                          <Bell className="h-3 w-3" />
                          {followUpCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveEmail(email.id);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-slate-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 dark:border-slate-700">
                    {/* Summary */}
                    {email.extractedData?.summary && (
                      <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Summary:</strong> {email.extractedData.summary}
                        </p>
                      </div>
                    )}

                    {/* Topics */}
                    {email.extractedData?.topics && email.extractedData.topics.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Topics</p>
                        <div className="flex flex-wrap gap-1">
                          {email.extractedData.topics.map((topic, idx) => (
                            <span
                              key={idx}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Original Email */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Original Email</p>
                      <pre className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto dark:bg-slate-900 dark:text-slate-300">
                        {email.rawContent}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Parse Modal */}
      <EmailParseModal
        open={showParseModal}
        onClose={() => setShowParseModal(false)}
        projectId={project.id}
        onEmailParsed={handleEmailParsed}
      />
    </div>
  );
};
