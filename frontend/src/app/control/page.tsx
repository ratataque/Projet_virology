"use client";

import { useState, useMemo } from "react";
import {
  Terminal as TerminalIcon,
  Search,
  Monitor,
  Smartphone,
  Server,
  RefreshCcw,
  Eraser,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { useTerminalHistory } from "@/context/TerminalHistoryContext";
import Terminal from "@/components/terminal/Terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ControlPage() {
  const { bots, sendCommand } = useSocket();
  const { termHistory, clearHistory, appendToHistory } = useTerminalHistory();
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "online" | "offline"
  >("all");

  const selectedBot = useMemo(
    () => bots.find((b) => b.id === selectedBotId),
    [bots, selectedBotId],
  );

  const filteredBots = useMemo(() => {
    return bots.filter((bot) => {
      const matchesSearch =
        bot.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.ip.includes(searchQuery);
      const matchesStatus =
        statusFilter === "all" || bot.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bots, searchQuery, statusFilter]);

  const handleTerminalData = (command: string) => {
    if (!selectedBotId) return;

    // Echo command to history (input)
    // Note: Terminal handles local echo, but we want it in history for persistence.
    // We append just the command + newline. The prompt is already there from previous output usually.
    // Or we might want to append prompt + command?
    // Context output logic appends prompt at END of output.
    // So history looks like: "Output\nPrompt".
    // We append "Command\n".
    // Result: "Output\nPromptCommand\n".
    // This is weird.
    // Actually, xterm prompt is just text.
    // If context ended with prompt, appending command makes sense visually.
    appendToHistory(selectedBotId, command + "\r\n");

    sendCommand(selectedBotId, command);
  };

  const clearTerminal = () => {
    if (!selectedBotId) return;

    // Clear history for this specific bot via shared context
    clearHistory(selectedBotId);
    toast.info("Terminal Cleared");
  };

  const restartBot = () => {
    if (!selectedBot) return;
    toast.success(`Reboot command sent to ${selectedBot.hostname}`);
    sendCommand(selectedBot.id, "reboot");
  };

  const getOsIcon = (os: string) => {
    switch (os.toLowerCase()) {
      case "windows":
        return <Monitor className="h-4 w-4" />;
      case "linux":
        return <Server className="h-4 w-4" />;
      case "android":
        return <Smartphone className="h-4 w-4" />;
      case "macos":
        return <Monitor className="h-4 w-4" />; // Or specific apple icon
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  const terminateAgent = () => {
    if (!selectedBot) return;
    // Removed native confirm which blocks in some envs, ideally use a UI modal
    sendCommand(selectedBot.id, "terminate");
    toast.success("Terminate command sent");
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <ResizablePanelGroup direction="horizontal">
        {/* LEFT PANEL: BOTS LIST */}
        <ResizablePanel
          defaultSize={25}
          minSize={20}
          maxSize={40}
          className="min-w-[250px] flex flex-col"
        >
          <div className="flex flex-1 flex-col border-r min-h-0">
            {/* Header */}
            <div className="p-4 space-y-4 border-b flex-none">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">
                  Active Agents
                </h2>
                <Badge variant="secondary" className="font-mono">
                  {filteredBots.length}
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search hostname or IP..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex p-1 bg-muted/50 rounded-lg gap-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all",
                    statusFilter === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("online")}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all",
                    statusFilter === "online"
                      ? "bg-background text-emerald-500 shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Online
                </button>
                <button
                  onClick={() => setStatusFilter("offline")}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all",
                    statusFilter === "offline"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Offline
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-2 space-y-1">
                {filteredBots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => setSelectedBotId(bot.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg text-sm transition-colors border",
                      selectedBotId === bot.id
                        ? "bg-accent text-accent-foreground border-accent-foreground/10"
                        : "bg-transparent hover:bg-muted border-transparent",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          bot.status === "online"
                            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                            : "bg-zinc-300 dark:bg-zinc-700",
                        )}
                      />
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium truncate max-w-[120px]">
                          {bot.hostname}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {bot.ip}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      {getOsIcon(bot.os)}
                    </div>
                  </button>
                ))}
                {filteredBots.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No agents found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* RIGHT PANEL: TERMINAL */}
        <ResizablePanel defaultSize={75}>
          <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-muted/40">
              <div className="flex items-center gap-2">
                {selectedBot ? (
                  <>
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <TerminalIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {selectedBot.hostname}
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1 py-0"
                        >
                          {selectedBot.id.slice(0, 6)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {selectedBot.user}@{selectedBot.ip} •{" "}
                        <span className="uppercase">{selectedBot.os}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TerminalIcon className="h-4 w-4" />
                    <span className="text-sm">No target selected</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!selectedBot}
                  onClick={restartBot}
                  title="Restart Agent"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!selectedBot}
                  onClick={clearTerminal}
                  title="Clear Terminal"
                >
                  <Eraser className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500"
                      onClick={terminateAgent}
                    >
                      Terminate Connection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Terminal Area */}
            <div className="flex-1 bg-black p-0 relative overflow-hidden">
              {selectedBot ? (
                <div className="absolute inset-0">
                  <Terminal
                    key={selectedBotId || "empty"}
                    onData={handleTerminalData}
                    output={
                      selectedBotId ? termHistory[selectedBotId] || "" : ""
                    }
                  />
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-zinc-500 gap-4">
                  <Monitor className="h-12 w-12 opacity-20" />
                  <p className="text-sm">
                    Select an agent from the sidebar to establish a terminal
                    session.
                  </p>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
