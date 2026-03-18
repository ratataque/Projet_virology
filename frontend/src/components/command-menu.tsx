"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Network,
  Terminal,
  Moon,
  Sun,
  Laptop,
  Trash,
  LogOut,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSocket } from "@/hooks/useSocket";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const { clearLogs, disconnectAllBots } = useSocket();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    const openListener = () => setOpen(true);

    document.addEventListener("keydown", down);
    window.addEventListener("open-command-menu", openListener);

    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-menu", openListener);
    };
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/network"))}
          >
            <Network className="mr-2 h-4 w-4" />
            <span>Network Topology</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/control"))}
          >
            <Terminal className="mr-2 h-4 w-4" />
            <span>Control Center</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => disconnectAllBots())}
            className="text-red-500 aria-selected:text-red-500"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect All Agents</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => clearLogs())}>
            <Trash className="mr-2 h-4 w-4" />
            <span>Clear Activity Logs</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <Laptop className="mr-2 h-4 w-4" />
            <span>System</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
