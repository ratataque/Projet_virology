"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Activity, Users, Wifi } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bot, BotStatus } from "@/types/types";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { BotRowActions } from "@/components/dashboard/bot-row-actions";
import { TerminalSheet } from "@/components/dashboard/terminal-sheet";
import { NetworkSparkline } from "@/components/dashboard/network-sparkline";
import ThreatMap from "@/components/dashboard/threat-map";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export default function DashboardPage() {
  const { bots, globalStats } = useSocket();
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTerminalBot, setActiveTerminalBot] = useState<Bot | null>(null);

  const filteredBots = useMemo(() => {
    return bots.filter((bot) => {
      const matchesName = bot.hostname
        .toLowerCase()
        .includes(filterName.toLowerCase());
      const matchesStatus =
        filterStatus === "all" || bot.status === filterStatus;
      return matchesName && matchesStatus;
    });
  }, [bots, filterName, filterStatus]);

  const getStatusColor = (status: BotStatus) => {
    switch (status) {
      case "online":
        return "text-green-500";
      case "offline":
        return "text-gray-500";
      case "busy":
        return "text-yellow-500";
      case "compromised":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-muted/20">
        {/* Top Section: Stats + Map + Activity */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
          {/* Left Column: Stats Cards (2x2) and Map */}
          <div className="lg:col-span-5 space-y-4">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Bots
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {globalStats.totalBots}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {globalStats.onlineBots} online
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Sessions
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {globalStats.activeSessions}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current active sessions
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Network In
                  </CardTitle>
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {globalStats.networkTrafficIn.toFixed(1)} MB/s
                  </div>
                  <div className="h-[40px] w-full mt-2">
                    <NetworkSparkline color="#10b981" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Network Out
                  </CardTitle>
                  <Wifi className="h-4 w-4 text-muted-foreground rotate-180" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {globalStats.networkTrafficOut.toFixed(1)} MB/s
                  </div>
                  <div className="h-[40px] w-full mt-2">
                    <NetworkSparkline color="#3b82f6" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle>Global Threat Map</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ThreatMap bots={bots} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Activity Feed */}
          <div className="lg:col-span-2">
            <ActivityFeed />
          </div>
        </div>

        {/* Bottom Section: Bot Table */}
        <div className="grid gap-4 md:gap-8 lg:grid-cols-1">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardTitle>Recent Connections</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Latest activity from the botnet.
                </div>
              </div>
              <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/control">
                  Manage Bots
                  <Activity className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <DashboardToolbar
                  filterName={filterName}
                  setFilterName={setFilterName}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bot ID</TableHead>
                    <TableHead>Hostname</TableHead>
                    <TableHead className="hidden xl:table-cell">Type</TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Location
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      Status
                    </TableHead>
                    <TableHead className="text-right">Last Seen</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBots
                    .slice(0, 10) // Show top 10 filtered
                    .map((bot) => (
                      <TableRow key={bot.id}>
                        <TableCell>
                          <div className="font-medium">{bot.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{bot.hostname}</div>
                          <div className="hidden text-xs text-muted-foreground md:inline">
                            {bot.ip}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {bot.os}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {bot.location}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div
                            className={`flex items-center gap-2 capitalize ${getStatusColor(
                              bot.status,
                            )}`}
                          >
                            {bot.status}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {new Date(bot.lastSeen).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <BotRowActions
                            bot={bot}
                            onOpenTerminal={setActiveTerminalBot}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      <TerminalSheet
        bot={activeTerminalBot}
        isOpen={!!activeTerminalBot}
        onClose={() => setActiveTerminalBot(null)}
      />
    </div>
  );
}
