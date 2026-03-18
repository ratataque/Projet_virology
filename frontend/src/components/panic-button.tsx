"use client";

import { useState } from "react";
import { Skull, AlertTriangle, Siren } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSocket } from "@/hooks/useSocket";

export function PanicButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDestructing, setIsDestructing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();
  const { disconnectAllBots, bots } = useSocket();

  const handleDestruct = async () => {
    setIsOpen(false);
    setIsDestructing(true);

    const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Initial Trigger
    await delay(500);
    addLog("> INITIATING SELF-DESTRUCT SEQUENCE...");

    await delay(800);
    addLog(`> TARGETS IDENTIFIED: ${bots.length} ACTIVE AGENTS`);

    // Log for each bot
    for (const bot of bots) {
      await delay(300);
      addLog(
        `> TARGETING ${bot.hostname.toUpperCase()} (${bot.ip})... [LOCKED]`,
      );
    }

    await delay(1000);
    addLog("> SEVERING ALL ENCRYPTED CONNECTIONS...");

    // Actual Kill Switch Call
    await disconnectAllBots();

    await delay(500);
    addLog("> CONNECTION TERMINATED [OK]");

    await delay(800);
    addLog("> WIPING LOCAL STORAGE AND CACHE... [OK]");
    localStorage.clear();
    sessionStorage.clear();

    await delay(800);
    addLog("> OVERWRITING MEMORY BLOCKS 0x0000 - 0xFFFF... [OK]");

    await delay(800);
    addLog("> DROPPING DATABASE SCHEMA... [OK]");

    await delay(1000);
    addLog("> SYSTEM PURGED. GOODBYE.");

    // Final Redirect
    await delay(2000);
    router.push("/");
  };

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            className="w-full sm:w-auto gap-2 font-bold animate-pulse cursor-pointer"
          >
            <Siren className="h-4 w-4" />
            EMERGENCY SHUTDOWN
            <Skull className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="border-red-600 bg-red-950 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl font-bold text-red-500">
              <AlertTriangle className="h-6 w-6" />
              INITIATE SELF-DESTRUCT?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-red-200">
              This action will{" "}
              <strong>immediately sever multiple bot connections</strong>, wipe
              server logs, and factory reset the instance.
              <br />
              <br />
              This action cannot be undone. All data will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <Label htmlFor="confirm" className="text-red-100">
              Type{" "}
              <span className="font-mono font-bold bg-red-900 px-1 rounded">
                DELETE
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="bg-red-900 border-red-700 text-white placeholder:text-red-400 focus-visible:ring-red-500"
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-red-800 text-red-200 hover:bg-red-900 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={handleDestruct}
              disabled={confirmText !== "DELETE"}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 font-bold tracking-wider"
            >
              CONFIRM DESTRUCTION
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full Screen Overlay */}
      <AnimatePresence>
        {isDestructing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black font-mono text-red-500 p-8 cursor-none"
          >
            <div className="max-w-2xl w-full">
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-lg md:text-xl"
                  >
                    {log}
                  </motion.div>
                ))}
              </div>
              <div className="h-8 mt-4 w-4 bg-red-500 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
