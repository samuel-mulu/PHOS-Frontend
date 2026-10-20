"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const MAX_ENTRIES_PER_FIELD = 20;
const MIN_TEXT_LENGTH = 4;

export type FieldMemoryEntry = {
  text: string;
  count: number;
  lastUsed: number;
};

type FieldMemoryState = {
  byUser: Record<string, Record<string, FieldMemoryEntry[]>>;
  remember: (userId: string, fieldKey: string, rawText: string) => void;
  search: (
    userId: string | null | undefined,
    fieldKey: string,
    query: string,
    limit?: number,
  ) => FieldMemoryEntry[];
};

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

export const useFieldMemoryStore = create<FieldMemoryState>()(
  persist(
    (set, get) => ({
      byUser: {},
      remember: (userId, fieldKey, rawText) => {
        const text = normalizeText(rawText);
        if (!userId || !fieldKey || text.length < MIN_TEXT_LENGTH) return;

        set((state) => {
          const userFields = { ...state.byUser[userId] };
          const list = [...(userFields[fieldKey] ?? [])];
          const norm = text.toLowerCase();
          const idx = list.findIndex((e) => e.text.toLowerCase() === norm);
          const now = Date.now();
          if (idx >= 0) {
            const prev = list[idx]!;
            list[idx] = {
              text: prev.text,
              count: prev.count + 1,
              lastUsed: now,
            };
          } else {
            list.unshift({ text, count: 1, lastUsed: now });
          }
          list.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
          userFields[fieldKey] = list.slice(0, MAX_ENTRIES_PER_FIELD);
          return {
            byUser: {
              ...state.byUser,
              [userId]: userFields,
            },
          };
        });
      },
      search: (userId, fieldKey, query, limit = 7) => {
        const q = query.trim().toLowerCase();
        if (!userId || !fieldKey || q.length < 2) return [];
        const list = get().byUser[userId]?.[fieldKey] ?? [];
        return list
          .filter((e) => e.text.toLowerCase().includes(q))
          .slice(0, limit);
      },
    }),
    {
      name: "phos-field-memory",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ byUser: state.byUser }),
    },
  ),
);
