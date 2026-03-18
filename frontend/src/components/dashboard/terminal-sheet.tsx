"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Terminal from "@/components/terminal/Terminal";
import { Bot } from "@/types/types";
import { useSocket } from "@/hooks/useSocket";
import { useTerminalHistory } from "@/context/TerminalHistoryContext";

interface TerminalSheetProps {
  bot: Bot | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalSheet({ bot, isOpen, onClose }: TerminalSheetProps) {
  const { sendCommand } = useSocket();
  const { getHistory, appendToHistory } = useTerminalHistory();

  // Get the persisted history for this bot
  const output = bot ? getHistory(bot.id) : "";

  const handleData = (command: string) => {
    if (!bot) return;
    appendToHistory(bot.id, command + "\r\n");
    sendCommand(bot.id, command);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent className="min-w-[50vw] sm:w-[600px] w-full bg-black border-l-stone-800 p-0 flex flex-col">
        <SheetHeader className="p-4 bg-zinc-900 text-foreground border-b border-zinc-800">
          <SheetTitle className="text-zinc-100 font-mono">
            {bot ? `root@${bot.hostname}:~` : "Terminal"}
          </SheetTitle>
          <SheetDescription className="text-zinc-400 text-xs">
            {bot ? `Connected to ${bot.ip} (${bot.os})` : "No connection"}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 bg-black p-4 overflow-hidden relative">
          {bot && isOpen ? (
            <Terminal key={bot.id} onData={handleData} output={output} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
