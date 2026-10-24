"use client";

import { useEffect, useRef, useState } from "react";
import { deriveBrainNoteTitle } from "@/utils/brainText";
import type { BrainWriting } from "@/lib/brain/writing";

type Options = {
  identity: string;
  enabled: boolean;
  protectTitle?: boolean;
  title: string;
  content: string;
  nodeType: string;
  onTitle: (title: string) => void;
  onContent: (content: string) => void;
};
type Prepared = { source: string; titleBefore: string; draft: BrainWriting };

export function useBrainWritingAssist(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const manualTitle = useRef(Boolean(options.protectTitle || options.title));
  const focused = useRef(false);
  const composing = useRef(false);
  const dirty = useRef(false);
  const attempted = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const request = useRef<AbortController | null>(null);
  const prepared = useRef<Prepared | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [original, setOriginal] = useState<{
    before: string;
    after: string;
    titleBefore: string;
    titleAfter: string;
  } | null>(null);
  const cancel = () => {
    clearTimeout(timer.current);
    request.current?.abort();
    request.current = null;
  };
  useEffect(() => {
    cancel();
    dirty.current = false;
    attempted.current = "";
    prepared.current = null;
    manualTitle.current = Boolean(
      latest.current.protectTitle ||
      (latest.current.title &&
        latest.current.title !==
          deriveBrainNoteTitle(latest.current.content, "")),
    );
    focused.current = false;
    composing.current = false;
    setLoading(false);
    setNotice("");
    setError("");
    setSuggestion("");
    setOriginal(null);
    return cancel;
  }, [options.identity]);
  useEffect(() => {
    if (!options.enabled) {
      cancel();
      prepared.current = null;
      setLoading(false);
    }
    return cancel;
  }, [options.enabled]);

  const apply = ({ source, titleBefore, draft }: Prepared) => {
    const current = latest.current;
    if (!current.enabled || current.content !== source) {
      prepared.current = null;
      setNotice('');
      return;
    }
    let titleAfter = current.title;
    if (!manualTitle.current) {
      titleAfter = draft.title;
      current.onTitle(titleAfter);
    } else setSuggestion(draft.title !== current.title ? draft.title : "");
    if (draft.content !== source) {
      setOriginal({
        before: source,
        after: draft.content,
        titleBefore,
        titleAfter,
      });
      current.onContent(draft.content);
      latest.current = {
        ...latest.current,
        title: titleAfter,
        content: draft.content,
      };
      setNotice("Notes refined. Original wording kept for undo.");
    } else setNotice("Wording checked. No changes needed.");
    prepared.current = null;
    dirty.current = false;
  };
  const run = async () => {
    clearTimeout(timer.current);
    const current = latest.current;
    const source = current.content;
    if (
      !current.enabled ||
      composing.current ||
      !dirty.current ||
      source.trim().length < 4 ||
      attempted.current === source
    )
      return;
    if (source.length > 4000) {
      setError(
        "Automatic refinement supports up to 4,000 characters. Your full note is kept.",
      );
      return;
    }
    cancel();
    const controller = new AbortController();
    request.current = controller;
    attempted.current = source;
    setLoading(true);
    setError("");
    setNotice("");
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch("/api/ai/brain-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ text: source, nodeType: current.nodeType }),
      });
      const body = await response.json();
      if (
        controller.signal.aborted ||
        latest.current.identity !== current.identity ||
        latest.current.nodeType !== current.nodeType ||
        !latest.current.enabled ||
        latest.current.content !== source
      )
        return;
      if (
        !response.ok ||
        body.source !== "ai" ||
        typeof body.draft?.title !== "string" ||
        !body.draft.title.trim() ||
        typeof body.draft?.content !== "string" ||
        !body.draft.content.trim()
      )
        throw new Error(
          body.error ||
            "Automatic refinement unavailable. Your text is unchanged.",
        );
      const next = {
        source,
        titleBefore: current.title,
        draft: body.draft as BrainWriting,
      };
      if (!manualTitle.current) latest.current.onTitle(next.draft.title);
      else
        setSuggestion(
          next.draft.title !== latest.current.title ? next.draft.title : "",
        );
      if (focused.current) {
        prepared.current = next;
        setNotice("Refinement ready.");
      } else apply(next);
    } catch (reason) {
      if (
        request.current === controller &&
        latest.current.enabled &&
        latest.current.identity === current.identity
      ) {
        setError(
          controller.signal.aborted
            ? "Refinement took too long. Your original text is kept."
            : reason instanceof Error
              ? reason.message
              : "Automatic refinement unavailable. Your text is unchanged.",
        );
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  };
  useEffect(() => {
    cancel();
    prepared.current = null;
    attempted.current = '';
    setLoading(false);
    if (dirty.current && latest.current.enabled) timer.current = setTimeout(() => void run(), 1800);
    return cancel;
  }, [options.nodeType]);

  return {
    title: options.title,
    content: options.content,
    loading,
    notice,
    error,
    suggestion,
    canUndo: Boolean(original && options.content === original.after),
    changeTitle(value: string) {
      manualTitle.current = Boolean(value.trim());
      latest.current = { ...latest.current, title: value };
      options.onTitle(value);
      setSuggestion("");
    },
    changeContent(value: string) {
      if (value === latest.current.content) return;
      const previousContent = latest.current.content;
      cancel();
      prepared.current = null;
      dirty.current = true;
      attempted.current = "";
      setLoading(false);
      setNotice("");
      setError("");
      setSuggestion("");
      setOriginal(null);
      latest.current = { ...latest.current, content: value };
      options.onContent(value);
      if (
        !manualTitle.current &&
        (!value.trim() ||
          !latest.current.title ||
          latest.current.title === deriveBrainNoteTitle(previousContent, ""))
      ) {
        const title = deriveBrainNoteTitle(value, "");
        latest.current = { ...latest.current, title };
        options.onTitle(title);
      }
      if (!composing.current)
        timer.current = setTimeout(() => void run(), 1800);
    },
    focus() {
      focused.current = true;
    },
    blur() {
      focused.current = false;
      if (prepared.current) apply(prepared.current);
      else void run();
    },
    compositionStart() {
      composing.current = true;
      cancel();
    },
    compositionEnd() {
      composing.current = false;
      timer.current = setTimeout(() => void run(), 1800);
    },
    useTitle() {
      if (!suggestion) return;
      manualTitle.current = false;
      options.onTitle(suggestion);
      latest.current = { ...latest.current, title: suggestion };
      setSuggestion("");
    },
    dismissTitle() {
      setSuggestion("");
    },
    retry() {
      attempted.current = "";
      dirty.current = true;
      void run();
    },
    undo() {
      if (!original || latest.current.content !== original.after) return;
      options.onContent(original.before);
      let title = latest.current.title;
      if (!manualTitle.current && title === original.titleAfter) {
        title = original.titleBefore;
        options.onTitle(title);
      }
      latest.current = { ...latest.current, content: original.before, title };
      prepared.current = null;
      dirty.current = false;
      setOriginal(null);
      setNotice("Original wording restored.");
    },
  };
}
export type BrainWritingAssist = ReturnType<typeof useBrainWritingAssist>;
