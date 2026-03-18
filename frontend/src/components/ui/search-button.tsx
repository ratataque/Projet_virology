"use client";

import { Search } from "lucide-react";

export const SearchButton = () => {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-command-menu"))}
      className="relative flex h-9 w-full items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:w-40 lg:w-64"
    >
      <Search className="mr-2 h-4 w-4 shrink-0" />
      <span className="inline-flex">Search...</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
};
