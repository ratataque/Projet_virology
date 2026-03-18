"use client";

import { PanicButton } from "@/components/panic-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col gap-8 p-4 md:p-8 bg-muted/20">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your C2 instance configuration.
          </p>
        </div>
        <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
              <ShieldAlert className="h-5 w-5" />
              <CardTitle>Danger Zone</CardTitle>
            </div>
            <CardDescription className="text-red-600/80 dark:text-red-400/80">
              Irreversible actions related to the server lifecycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border border-red-200 dark:border-red-900/50 rounded-lg bg-white dark:bg-zinc-950/50">
              <div className="space-y-1">
                <h4 className="font-medium text-foreground">
                  Emergency Self-Destruct
                </h4>
                <p className="text-sm text-muted-foreground">
                  Immediately wipe all data and disconnect the server. This
                  cannot be undone.
                </p>
              </div>
              <PanicButton />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
