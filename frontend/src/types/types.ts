export type BotStatus = "online" | "offline" | "busy" | "compromised";
export type OSType = "windows" | "linux" | "macos" | "android" | "ios";

export type SystemStats = {
  cpuUsage: number; // Percentage 0-100
  memoryUsage: number; // Percentage 0-100
  uptime: number; // Seconds
  activeConnections: number;
};

export type Bot = {
  id: string;
  ip: string;
  hostname: string;
  os: OSType;
  status: BotStatus;
  lastSeen: string; // ISO Date string
  location?: string; // e.g., "Paris, FR"
  coordinates?: [number, number]; // [lat, long]
  stats?: SystemStats;
  tags: string[];
  user: string;
};

export type Credential = {
  id: string;
  service: string;
  url: string;
  username: string;
  passwordValue: string;
  capturedAt: string;
  botId: string;
};

export type LogEntry = {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  source: string; // Bot ID or System module
};

// WebSocket Payload Types
export type ServerToClientEvents = {
  "bot:connect": (bot: Bot) => void;
  "bot:disconnect": (botId: string) => void;
  "bot:update": (botId: string, updates: Partial<Bot>) => void;
  "stats:update": (stats: GlobalDashboardStats) => void;
  "terminal:output": (botId: string, data: string) => void;
  "system:log": (log: LogEntry) => void;
};

export type ClientToServerEvents = {
  "terminal:input": (botId: string, data: string) => void;
  "bot:command": (botId: string, command: string) => void;
};

export type GlobalDashboardStats = {
  totalBots: number;
  onlineBots: number;
  offlineBots: number;
  compromisedBots: number;
  activeSessions: number;
  networkTrafficIn: number; // MB/s
  networkTrafficOut: number; // MB/s
};

export type TaskResult = {
  task_id: string;
  agent_id: string;
  success: boolean;
  output: string;
  completed_at: string;
};
