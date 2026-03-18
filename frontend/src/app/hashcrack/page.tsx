"use client";

import { useState, useRef, useCallback } from "react";
import { Hash, Upload, Play, Square, RotateCcw, Copy, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createMD5, createSHA1, createSHA256, createSHA512 } from "hash-wasm";

type Algorithm = "md5" | "sha1" | "sha256" | "sha512";
type Status = "idle" | "running" | "found" | "exhausted" | "stopped";

const ALGO_LABELS: Record<Algorithm, string> = {
  md5: "MD5",
  sha1: "SHA-1",
  sha256: "SHA-256",
  sha512: "SHA-512",
};

const BATCH_SIZE = 500;

async function hashWord(word: string, algorithm: Algorithm): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(word);

  if (algorithm === "md5") {
    const hasher = await createMD5();
    hasher.init();
    hasher.update(data);
    return hasher.digest("hex");
  }
  if (algorithm === "sha1") {
    const hasher = await createSHA1();
    hasher.init();
    hasher.update(data);
    return hasher.digest("hex");
  }
  if (algorithm === "sha256") {
    const hasher = await createSHA256();
    hasher.init();
    hasher.update(data);
    return hasher.digest("hex");
  }
  const hasher = await createSHA512();
  hasher.init();
  hasher.update(data);
  return hasher.digest("hex");
}

export default function HashCrackPage() {
  const [targetHash, setTargetHash] = useState("");
  const [algorithm, setAlgorithm] = useState<Algorithm>("md5");
  const [pasteText, setPasteText] = useState("");
  const [wordlistMeta, setWordlistMeta] = useState<{ name: string; count: number } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [tried, setTried] = useState(0);
  const [total, setTotal] = useState(0);
  const [foundWord, setFoundWord] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState("");
  const stopRef = useRef(false);
  const wordsRef = useRef<string[]>([]);

  const hasWordlist = wordlistMeta !== null || pasteText.trim().length > 0;

  const wordCount = wordlistMeta
    ? wordlistMeta.count
    : pasteText.split(/\r?\n/).map((w) => w.trim()).filter(Boolean).length;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      const words = text.split(/\r?\n/).map((w) => w.trim()).filter(Boolean);
      wordsRef.current = words;
      setPasteText("");
      setWordlistMeta({ name: file.name, count: words.length });
      toast.success(`Loaded ${file.name} — ${words.length.toLocaleString()} words`);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const clearFile = useCallback(() => {
    wordsRef.current = [];
    setWordlistMeta(null);
  }, []);

  const handleStart = useCallback(async () => {
    const hash = targetHash.trim().toLowerCase();
    if (!hash) { toast.error("Please enter a target hash."); return; }

    const words = wordsRef.current.length > 0
      ? wordsRef.current
      : pasteText.split(/\r?\n/).map((w) => w.trim()).filter(Boolean);

    if (words.length === 0) { toast.error("Please provide a wordlist."); return; }

    stopRef.current = false;
    setStatus("running");
    setFoundWord(null);
    setTried(0);
    setProgress(0);
    setTotal(words.length);
    setCurrentWord("");

    let i = 0;
    const processBatch = async () => {
      const end = Math.min(i + BATCH_SIZE, words.length);
      for (; i < end; i++) {
        if (stopRef.current) { setStatus("stopped"); return; }
        const word = words[i];
        setCurrentWord(word);
        const digest = await hashWord(word, algorithm);
        if (digest === hash) {
          setFoundWord(word);
          setTried(i + 1);
          setProgress(Math.round(((i + 1) / words.length) * 100));
          setStatus("found");
          toast.success(`Hash cracked! → "${word}"`);
          return;
        }
      }
      setTried(i);
      setProgress(Math.round((i / words.length) * 100));
      if (i >= words.length) {
        setStatus("exhausted");
        toast.info("Wordlist exhausted. Hash not found.");
        return;
      }
      setTimeout(processBatch, 0);
    };
    setTimeout(processBatch, 0);
  }, [targetHash, algorithm, pasteText]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const copyResult = useCallback(() => {
    if (foundWord) {
      navigator.clipboard.writeText(foundWord);
      toast.success("Copied to clipboard");
    }
  }, [foundWord]);

  const reset = useCallback(() => {
    stopRef.current = true;
    wordsRef.current = [];
    setStatus("idle");
    setProgress(0);
    setTried(0);
    setTotal(0);
    setFoundWord(null);
    setCurrentWord("");
    setPasteText("");
    setWordlistMeta(null);
  }, []);

  const statusBadge = () => {
    switch (status) {
      case "running":
        return <Badge variant="secondary" className="gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Running</Badge>;
      case "found":
        return <Badge className="gap-1.5 bg-green-600 hover:bg-green-600"><CheckCircle className="h-3 w-3" />Found</Badge>;
      case "exhausted":
        return <Badge variant="destructive" className="gap-1.5"><XCircle className="h-3 w-3" />Not Found</Badge>;
      case "stopped":
        return <Badge variant="outline" className="gap-1.5">Stopped</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-muted/20">
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Hash Cracker
              </CardTitle>
              <CardDescription>
                Bruteforce a hash against a wordlist — runs entirely in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="target-hash">Target Hash</Label>
                <Input
                  id="target-hash"
                  placeholder="e.g. 5f4dcc3b5aa765d61d8327deb882cf99"
                  value={targetHash}
                  onChange={(e) => setTargetHash(e.target.value)}
                  className="font-mono text-sm"
                  disabled={status === "running"}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Algorithm</Label>
                <Select
                  value={algorithm}
                  onValueChange={(v) => setAlgorithm(v as Algorithm)}
                  disabled={status === "running"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ALGO_LABELS) as Algorithm[]).map((algo) => (
                      <SelectItem key={algo} value={algo}>
                        {ALGO_LABELS[algo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wordlist">Wordlist</Label>
                  {wordCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {wordCount.toLocaleString()} words
                    </span>
                  )}
                </div>
                <label htmlFor="wordlist-file" className="flex items-center gap-2 cursor-pointer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="pointer-events-none"
                    disabled={status === "running"}
                    asChild
                  >
                    <span>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Upload .txt
                    </span>
                  </Button>
                  <input
                    id="wordlist-file"
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={status === "running"}
                  />
                  {!wordlistMeta && (
                    <span className="text-xs text-muted-foreground">or paste below</span>
                  )}
                </label>

                {wordlistMeta ? (
                  <div className="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                    <span className="flex-1 font-mono truncate">{wordlistMeta.name}</span>
                    <span className="text-muted-foreground">{wordlistMeta.count.toLocaleString()} words</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={clearFile}
                      disabled={status === "running"}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <textarea
                    id="wordlist"
                    placeholder={"password\n123456\nletmein\n..."}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    disabled={status === "running"}
                    className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  />
                )}
              </div>

              <div className="flex gap-2">
                {status !== "running" ? (
                  <Button
                    onClick={handleStart}
                    disabled={!targetHash.trim() || !hasWordlist}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleStop}
                    className="flex-1"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                )}
                <Button variant="outline" onClick={reset} disabled={status === "running"}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>Live progress and output</CardDescription>
              </div>
              {statusBadge()}
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {tried.toLocaleString()} / {total.toLocaleString()} words
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {status === "running" && currentWord && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Trying
                  </span>
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm truncate">
                    {currentWord}
                  </code>
                </div>
              )}

              {status === "found" && foundWord && (
                <div className="flex flex-col gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Hash cracked!
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm font-semibold break-all">
                      {foundWord}
                    </code>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={copyResult}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Found after {tried.toLocaleString()} attempt{tried !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {status === "exhausted" && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    Hash not found in wordlist
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Tried all {total.toLocaleString()} words with no match. Consider using a larger wordlist.
                  </span>
                </div>
              )}

              {status === "stopped" && (
                <div className="rounded-lg border border-muted p-4 text-sm text-muted-foreground">
                  Stopped after {tried.toLocaleString()} word{tried !== 1 ? "s" : ""}.
                </div>
              )}

              {status === "idle" && (
                <div className="rounded-lg border border-dashed border-muted p-6 text-center text-sm text-muted-foreground">
                  Configure a hash and wordlist, then press <strong>Start</strong>.
                </div>
              )}

              {(status === "found" || status === "exhausted" || status === "stopped") && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3 text-center">
                    <span className="text-lg font-semibold">{ALGO_LABELS[algorithm]}</span>
                    <span className="text-xs text-muted-foreground">Algorithm</span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3 text-center">
                    <span className="text-lg font-semibold">{tried.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">Tried</span>
                  </div>
                  <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3 text-center">
                    <span className="text-lg font-semibold">{progress}%</span>
                    <span className="text-xs text-muted-foreground">Coverage</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
