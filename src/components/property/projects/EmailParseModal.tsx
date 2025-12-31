'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Check, Mail, Users, FileText, Calendar, Bell, Tag, Sparkles, Brain, Search, Zap } from 'lucide-react';
import type { ProjectEmail, TaskContact, TaskQuote, TaskScheduledVisit, TaskFollowUp } from '@/types/property.types';
import { createId } from '@/utils/id';

interface ExtractedData {
  contacts: Array<{
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    role?: string;
  }>;
  prices: Array<{
    description: string;
    amount: number;
    currency: 'GBP';
    type: 'quote' | 'estimate' | 'mention';
  }>;
  dates: Array<{
    description: string;
    date: string;
    type: 'proposed_visit' | 'start_date' | 'completion' | 'deadline' | 'other';
  }>;
  followUps: Array<{
    action: string;
    dueDate?: string;
  }>;
  topics: string[];
  summary: string;
}

interface EmailParseModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onEmailParsed: (
    email: ProjectEmail,
    selectedContacts: TaskContact[],
    selectedQuotes: TaskQuote[],
    selectedVisits: TaskScheduledVisit[],
    selectedFollowUps: TaskFollowUp[]
  ) => void;
}

export const EmailParseModal = ({
  open,
  onClose,
  projectId,
  onEmailParsed,
}: EmailParseModalProps) => {
  const [step, setStep] = useState<'input' | 'parsing' | 'review'>('input');
  const [emailContent, setEmailContent] = useState('');
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parseMethod, setParseMethod] = useState<'ai' | 'regex' | null>(null);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingStage, setParsingStage] = useState<'connecting' | 'analyzing' | 'extracting' | 'complete'>('connecting');

  // Selection state for review step
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [selectedPrices, setSelectedPrices] = useState<Set<number>>(new Set());
  const [selectedDates, setSelectedDates] = useState<Set<number>>(new Set());
  const [selectedFollowUps, setSelectedFollowUps] = useState<Set<number>>(new Set());

  if (!open) return null;

  const handleParse = async () => {
    if (!emailContent.trim()) return;

    setStep('parsing');
    setError(null);
    setParsingProgress(0);
    setParsingStage('connecting');

    // Simulate progress stages
    const progressInterval = setInterval(() => {
      setParsingProgress((prev) => {
        if (prev < 30) {
          setParsingStage('connecting');
          return prev + 5;
        } else if (prev < 70) {
          setParsingStage('analyzing');
          return prev + 3;
        } else if (prev < 90) {
          setParsingStage('extracting');
          return prev + 2;
        }
        return prev;
      });
    }, 150);

    try {
      const response = await fetch('/api/property/email-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContent, subject, sender }),
      });

      const data = await response.json();

      clearInterval(progressInterval);
      setParsingProgress(100);
      setParsingStage('complete');

      if (!data.success) {
        const errorMessage = data.details || data.error || 'Failed to parse email';
        throw new Error(errorMessage);
      }

      setExtractedData(data.extractedData);
      setParseMethod(data.method || 'regex');

      // Auto-update subject if empty and we have summary/topics
      if (!subject.trim() && data.extractedData) {
        if (data.extractedData.summary) {
          // Use a shortened version of summary (first 50 chars)
          const shortSummary = data.extractedData.summary.length > 50
            ? data.extractedData.summary.substring(0, 50) + '...'
            : data.extractedData.summary;
          setSubject(shortSummary);
        } else if (data.extractedData.topics && data.extractedData.topics.length > 0) {
          // Use first 2-3 topics
          setSubject(data.extractedData.topics.slice(0, 3).join(', '));
        }
      }

      // Pre-select all items
      setSelectedContacts(new Set(data.extractedData.contacts.map((_: any, i: number) => i)));
      setSelectedPrices(new Set(data.extractedData.prices.map((_: any, i: number) => i)));
      setSelectedDates(new Set(data.extractedData.dates.map((_: any, i: number) => i)));
      setSelectedFollowUps(new Set(data.extractedData.followUps.map((_: any, i: number) => i)));

      // Small delay before showing review
      await new Promise((resolve) => setTimeout(resolve, 300));
      setStep('review');
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Failed to parse email');
      setStep('input');
    }
  };

  const handleCreateSelected = () => {
    if (!extractedData) return;

    const now = new Date().toISOString();

    // Create the email record
    const email: ProjectEmail = {
      id: createId('email'),
      projectId,
      rawContent: emailContent,
      subject: subject || undefined,
      sender: sender || undefined,
      receivedDate: now.split('T')[0],
      parsedAt: now,
      extractedData,
      contactsCreated: [],
      quotesCreated: [],
      visitsCreated: [],
      followUpsCreated: [],
      createdAt: now,
    };

    // Create selected contacts
    const contacts: TaskContact[] = Array.from(selectedContacts).map((idx) => {
      const contact = extractedData.contacts[idx];
      const id = createId('contact');
      email.contactsCreated.push(id);
      return {
        id,
        name: contact.name,
        company: contact.company,
        phone: contact.phone,
        email: contact.email,
        contactDate: now.split('T')[0],
        notes: contact.role ? `Role: ${contact.role}` : undefined,
      };
    });

    // Create selected quotes from prices
    const quotes: TaskQuote[] = Array.from(selectedPrices)
      .filter((idx) => extractedData.prices[idx].type === 'quote' || extractedData.prices[idx].type === 'estimate')
      .map((idx) => {
        const price = extractedData.prices[idx];
        const id = createId('quote');
        email.quotesCreated.push(id);
        return {
          id,
          contractorName: sender || 'Unknown',
          amount: price.amount,
          currency: 'GBP' as const,
          notes: price.description,
          status: 'pending' as const,
          createdAt: now,
        };
      });

    // Create selected visits from dates
    const visits: TaskScheduledVisit[] = Array.from(selectedDates)
      .filter((idx) => extractedData.dates[idx].type === 'proposed_visit')
      .map((idx) => {
        const date = extractedData.dates[idx];
        const id = createId('visit');
        email.visitsCreated.push(id);
        return {
          id,
          date: date.date,
          contractorName: sender || 'Unknown',
          purpose: date.description,
          completed: false,
        };
      });

    // Create selected follow-ups
    const followUps: TaskFollowUp[] = Array.from(selectedFollowUps).map((idx) => {
      const followUp = extractedData.followUps[idx];
      const id = createId('followup');
      email.followUpsCreated.push(id);
      return {
        id,
        dueDate: followUp.dueDate || now.split('T')[0],
        description: followUp.action,
        completed: false,
        createdAt: now,
      };
    });

    onEmailParsed(email, contacts, quotes, visits, followUps);
    handleClose();
  };

  const handleClose = () => {
    setStep('input');
    setEmailContent('');
    setSubject('');
    setSender('');
    setExtractedData(null);
    setError(null);
    setParseMethod(null);
    setParsingProgress(0);
    setParsingStage('connecting');
    setSelectedContacts(new Set());
    setSelectedPrices(new Set());
    setSelectedDates(new Set());
    setSelectedFollowUps(new Set());
    onClose();
  };

  const toggleSelection = (
    set: Set<number>,
    setter: React.Dispatch<React.SetStateAction<Set<number>>>,
    index: number
  ) => {
    const newSet = new Set(set);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setter(newSet);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {step === 'input' ? 'Add Email' : step === 'parsing' ? 'Parsing...' : 'Review Extracted Data'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          {step === 'input' && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/20 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    From (optional)
                  </label>
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="Sender name or email"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Email Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Paste the email content here..."
                  rows={12}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
                  required
                />
              </div>
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-8">
              {/* Animated Icon */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
                  {parsingStage === 'connecting' && <Brain className="h-10 w-10 text-white animate-pulse" />}
                  {parsingStage === 'analyzing' && <Search className="h-10 w-10 text-white animate-bounce" />}
                  {parsingStage === 'extracting' && <Sparkles className="h-10 w-10 text-white animate-pulse" />}
                  {parsingStage === 'complete' && <Zap className="h-10 w-10 text-white" />}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 w-full max-w-xs">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                  <span>
                    {parsingStage === 'connecting' && 'Connecting to AI...'}
                    {parsingStage === 'analyzing' && 'Analyzing content...'}
                    {parsingStage === 'extracting' && 'Extracting data...'}
                    {parsingStage === 'complete' && 'Complete!'}
                  </span>
                  <span>{parsingProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                    style={{ width: `${parsingProgress}%` }}
                  />
                </div>
              </div>

              {/* Stage Indicators */}
              <div className="mt-6 flex items-center gap-4">
                <div className={`flex items-center gap-1.5 text-xs ${parsingProgress >= 30 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                  <div className={`h-2 w-2 rounded-full ${parsingProgress >= 30 ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                  Connect
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${parsingProgress >= 70 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                  <div className={`h-2 w-2 rounded-full ${parsingProgress >= 70 ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                  Analyze
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${parsingProgress >= 100 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
                  <div className={`h-2 w-2 rounded-full ${parsingProgress >= 100 ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                  Extract
                </div>
              </div>

              <p className="mt-6 text-sm text-gray-500 dark:text-slate-400">
                Using AI to understand your email...
              </p>
            </div>
          )}

          {step === 'review' && extractedData && (
            <div className="space-y-6">
              {/* Parsing Method Badge */}
              <div className="flex items-center gap-2">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  parseMethod === 'ai'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {parseMethod === 'ai' ? <Sparkles className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {parseMethod === 'ai' ? 'AI Parsed' : 'Pattern Matched'}
                </div>
                {subject && !sender && (
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    Subject auto-generated from content
                  </div>
                )}
              </div>

              {/* Summary */}
              {extractedData.summary && (
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-500/10">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Summary:</strong> {extractedData.summary}
                  </p>
                </div>
              )}

              {/* Topics */}
              {extractedData.topics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    <Tag className="h-4 w-4" />
                    Topics
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {extractedData.topics.map((topic, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts */}
              {extractedData.contacts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    <Users className="h-4 w-4" />
                    Contacts ({selectedContacts.size}/{extractedData.contacts.length})
                  </div>
                  <div className="mt-2 space-y-2">
                    {extractedData.contacts.map((contact, idx) => (
                      <label
                        key={idx}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                          selectedContacts.has(idx)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                            : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(idx)}
                          onChange={() => toggleSelection(selectedContacts, setSelectedContacts, idx)}
                          className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-slate-100">{contact.name}</p>
                          {contact.company && <p className="text-sm text-gray-500 dark:text-slate-400">{contact.company}</p>}
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-slate-400">
                            {contact.phone && <span>📞 {contact.phone}</span>}
                            {contact.email && <span>📧 {contact.email}</span>}
                            {contact.role && <span>👤 {contact.role}</span>}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Prices/Quotes */}
              {extractedData.prices.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    <FileText className="h-4 w-4" />
                    Prices ({selectedPrices.size}/{extractedData.prices.length})
                  </div>
                  <div className="mt-2 space-y-2">
                    {extractedData.prices.map((price, idx) => (
                      <label
                        key={idx}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                          selectedPrices.has(idx)
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                            : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPrices.has(idx)}
                          onChange={() => toggleSelection(selectedPrices, setSelectedPrices, idx)}
                          className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 dark:text-slate-100">
                              £{price.amount.toLocaleString()}
                            </p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              price.type === 'quote' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : price.type === 'estimate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {price.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-slate-400">{price.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              {extractedData.dates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    <Calendar className="h-4 w-4" />
                    Dates ({selectedDates.size}/{extractedData.dates.length})
                  </div>
                  <div className="mt-2 space-y-2">
                    {extractedData.dates.map((date, idx) => (
                      <label
                        key={idx}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                          selectedDates.has(idx)
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                            : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDates.has(idx)}
                          onChange={() => toggleSelection(selectedDates, setSelectedDates, idx)}
                          className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 dark:text-slate-100">{date.date}</p>
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                              {date.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-slate-400">{date.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-ups */}
              {extractedData.followUps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    <Bell className="h-4 w-4" />
                    Follow-ups ({selectedFollowUps.size}/{extractedData.followUps.length})
                  </div>
                  <div className="mt-2 space-y-2">
                    {extractedData.followUps.map((followUp, idx) => (
                      <label
                        key={idx}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                          selectedFollowUps.has(idx)
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
                            : 'border-gray-200 hover:border-gray-300 dark:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFollowUps.has(idx)}
                          onChange={() => toggleSelection(selectedFollowUps, setSelectedFollowUps, idx)}
                          className="mt-0.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-slate-100">{followUp.action}</p>
                          {followUp.dueDate && (
                            <p className="text-sm text-gray-500 dark:text-slate-400">Due: {followUp.dueDate}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {extractedData.contacts.length === 0 &&
                extractedData.prices.length === 0 &&
                extractedData.dates.length === 0 &&
                extractedData.followUps.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    No structured data could be extracted from this email.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-slate-700">
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            {step === 'input' && (
              <button
                onClick={handleParse}
                disabled={!emailContent.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Parse Email
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleCreateSelected}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Check className="h-4 w-4" />
                Create Selected
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
