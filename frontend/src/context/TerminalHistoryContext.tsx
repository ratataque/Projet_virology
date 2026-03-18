"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useSocket } from "@/hooks/useSocket";
import { TaskResult } from "@/types/types";

interface TerminalHistoryContextType {
  // Map of agentId -> terminal output history
  termHistory: Record<string, string>;
  // Append text to a specific agent's history
  appendToHistory: (agentId: string, text: string) => void;
  // Clear history for a specific agent
  clearHistory: (agentId: string) => void;
  // Get history for a specific agent
  getHistory: (agentId: string) => string;
}

const TerminalHistoryContext = createContext<
  TerminalHistoryContextType | undefined
>(undefined);

const INITIAL_HISTORY =
  "Connecting to secure shell... Connected.\r\n\r\n\x1B[1;32madmin@c2\x1B[0m:~$ ";

export function TerminalHistoryProvider({ children }: { children: ReactNode }) {
  // Store terminal history per agent
  // Initialize lazily from localStorage to avoid cascading renders
  const [termHistory, setTermHistory] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("c2_term_history");
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error("Failed to load terminal history", e);
      }
    }
    return {};
  });

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("c2_term_history", JSON.stringify(termHistory));
    }
  }, [termHistory]);

  // Track last seen result ID per agent to avoid duplicates
  const lastResultIdByBot = useRef<Record<string, string>>({});

  const { taskResults } = useSocket();

  // Listen to socket taskResults and append to history
  useEffect(() => {
    let hasUpdates = false;
    const updates: Record<string, string> = {};

    // Optimization: Group results by agent
    const latestResultsByAgent: Record<string, TaskResult> = {};
    taskResults.forEach((r) => {
      latestResultsByAgent[r.agent_id] = r;
    });

    Object.entries(latestResultsByAgent).forEach(([agentId, latest]) => {
      if (latest.task_id !== lastResultIdByBot.current[agentId]) {
        lastResultIdByBot.current[agentId] = latest.task_id;

        // Append prompt to simulate blocking shell
        const PROMPT = "\r\n\x1B[1;32madmin@c2\x1B[0m:~$ ";
        const formatted =
          latest.output.split("\n").join("\r\n") + "\r\n" + PROMPT;

        updates[agentId] = formatted;
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid: syncing external data
      setTermHistory((prev) => {
        const next = { ...prev };
        Object.entries(updates).forEach(([agentId, text]) => {
          // If history is empty, start with INITIAL_HISTORY
          const current = next[agentId] || INITIAL_HISTORY;
          next[agentId] = current + text;
        });
        return next;
      });
    }
  }, [taskResults]);

  const appendToHistory = useCallback((agentId: string, text: string) => {
    setTermHistory((prev) => {
      // If history is empty, start with INITIAL_HISTORY
      const current = prev[agentId] || INITIAL_HISTORY;
      return {
        ...prev,
        [agentId]: current + text,
      };
    });
  }, []);

  const clearHistory = useCallback((agentId: string) => {
    setTermHistory((prev) => ({
      ...prev,
      [agentId]: INITIAL_HISTORY, // Reset to initial state instead of empty
    }));
  }, []);

  const getHistory = useCallback(
    (agentId: string) => {
      return termHistory[agentId] || INITIAL_HISTORY;
    },
    [termHistory],
  );

  return (
    <TerminalHistoryContext.Provider
      value={{
        termHistory,
        appendToHistory,
        clearHistory,
        getHistory,
      }}
    >
      {children}
    </TerminalHistoryContext.Provider>
  );
}

export function useTerminalHistory() {
  const context = useContext(TerminalHistoryContext);
  if (context === undefined) {
    throw new Error(
      "useTerminalHistory must be used within a TerminalHistoryProvider",
    );
  }
  return context;
}
