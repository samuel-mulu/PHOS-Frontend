"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { setNativeFormValue } from "@/lib/field-memory/set-native-value";
import type { FieldMemoryKey } from "@/lib/field-memory/keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useFieldMemoryStore } from "@/stores/field-memory-store";

const MIN_QUERY = 2;

function useSuggestions(fieldKey: FieldMemoryKey, query: string) {
  const userId = useAuthStore((s) => s.user?.id);
  const search = useFieldMemoryStore((s) => s.search);
  return useMemo(
    () => search(userId, fieldKey, query),
    [search, userId, fieldKey, query],
  );
}

function previewLabel(text: string, max = 56) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

type SuggestingProps = {
  fieldKey: FieldMemoryKey;
  className?: string;
};

function useSuggestingField(
  fieldKey: FieldMemoryKey,
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>,
) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = useSuggestions(fieldKey, query);
  const listId = useId();

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions.length, query]);

  const showList = open && suggestions.length > 0 && query.trim().length >= MIN_QUERY;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setQuery(e.target.value);
      setOpen(true);
      onChange?.(e);
    },
    [onChange],
  );

  const applySuggestion = useCallback(
    (
      el: HTMLInputElement | HTMLTextAreaElement | null,
      text: string,
      onChangeHandler?: React.ChangeEventHandler<
        HTMLInputElement | HTMLTextAreaElement
      >,
    ) => {
      if (!el) return;
      setNativeFormValue(el, text);
      setQuery(text);
      setOpen(false);
      if (onChangeHandler) {
        onChangeHandler({
          target: el,
          currentTarget: el,
        } as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [],
  );

  const onKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      el: HTMLInputElement | HTMLTextAreaElement | null,
      onChangeHandler?: React.ChangeEventHandler<
        HTMLInputElement | HTMLTextAreaElement
      >,
    ) => {
      if (!showList) {
        if (e.key === "Escape") setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && showList) {
        e.preventDefault();
        const pick = suggestions[activeIndex];
        if (pick) applySuggestion(el, pick.text, onChangeHandler);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [activeIndex, applySuggestion, showList, suggestions],
  );

  return {
    query,
    setQuery,
    open,
    setOpen,
    showList,
    suggestions,
    activeIndex,
    listId,
    handleChange,
    applySuggestion,
    onKeyDown,
  };
}

function SuggestionList({
  listId,
  suggestions,
  activeIndex,
  onPick,
}: {
  listId: string;
  suggestions: Array<{ text: string }>;
  activeIndex: number;
  onPick: (text: string) => void;
}) {
  return (
    <ul
      id={listId}
      role="listbox"
      className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
    >
      <li className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        Your recent phrases
      </li>
      {suggestions.map((item, index) => (
        <li key={`${item.text.slice(0, 32)}-${index}`} role="option">
          <button
            type="button"
            aria-selected={index === activeIndex}
            className={cn(
              "w-full px-3 py-2 text-left text-slate-800 hover:bg-teal-50",
              index === activeIndex && "bg-teal-50",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(item.text);
            }}
          >
            <span className="line-clamp-2">{previewLabel(item.text, 120)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export const SuggestingTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & SuggestingProps
>(function SuggestingTextarea(
  { fieldKey, className, onChange, onBlur, onFocus, onKeyDown, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const {
    setOpen,
    showList,
    suggestions,
    activeIndex,
    listId,
    handleChange,
    applySuggestion,
    onKeyDown: suggestKeyDown,
    setQuery,
  } = useSuggestingField(fieldKey, onChange);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <div className="relative">
      <Textarea
        {...rest}
        ref={setRefs}
        className={className}
        aria-autocomplete="list"
        aria-controls={showList ? listId : undefined}
        aria-expanded={showList}
        onFocus={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          window.setTimeout(() => setOpen(false), 120);
          onBlur?.(e);
        }}
        onChange={handleChange}
        onKeyDown={(e) => {
          suggestKeyDown(e, innerRef.current, onChange);
          onKeyDown?.(e);
        }}
      />
      {showList ? (
        <SuggestionList
          listId={listId}
          suggestions={suggestions}
          activeIndex={activeIndex}
          onPick={(text) =>
            applySuggestion(innerRef.current, text, onChange)
          }
        />
      ) : null}
    </div>
  );
});

export const SuggestingInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & SuggestingProps
>(function SuggestingInput(
  { fieldKey, className, onChange, onBlur, onFocus, onKeyDown, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLInputElement>(null);
  const {
    setOpen,
    showList,
    suggestions,
    activeIndex,
    listId,
    handleChange,
    applySuggestion,
    onKeyDown: suggestKeyDown,
    setQuery,
  } = useSuggestingField(fieldKey, onChange);

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <div className="relative">
      <Input
        {...rest}
        ref={setRefs}
        className={className}
        aria-autocomplete="list"
        aria-controls={showList ? listId : undefined}
        aria-expanded={showList}
        onFocus={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          window.setTimeout(() => setOpen(false), 120);
          onBlur?.(e);
        }}
        onChange={handleChange}
        onKeyDown={(e) => {
          suggestKeyDown(e, innerRef.current, onChange);
          onKeyDown?.(e);
        }}
      />
      {showList ? (
        <SuggestionList
          listId={listId}
          suggestions={suggestions}
          activeIndex={activeIndex}
          onPick={(text) =>
            applySuggestion(innerRef.current, text, onChange)
          }
        />
      ) : null}
    </div>
  );
});
