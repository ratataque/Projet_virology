"use client";

import { useSocket } from "@/hooks/useSocket";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, AlertTriangle, CheckCircle, Info } from "lucide-react";

export function ActivityFeed() {
  const { logs } = useSocket();

  const getIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card className="h-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Feed
        </CardTitle>
        <CardDescription>Live system events and alerts</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="px-6 pb-4 h-[calc(100vh-280px)]">
          <div className="space-y-4 h-full">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex gap-3 text-sm items-start animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <div className="mt-0.5 shrink-0 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                  {getIcon(log.level)}
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{log.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{log.source}</span>
                    <span>•</span>
                    <time suppressHydrationWarning>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </time>
                  </div>
                </div>
              </div>
            ))}

            {logs.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm">
                No activity recorded yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
