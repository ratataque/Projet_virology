"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardToolbarProps {
  filterName: string;
  setFilterName: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
}

export function DashboardToolbar({
  filterName,
  setFilterName,
  filterStatus,
  setFilterStatus,
}: DashboardToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter interactively by hostname..."
          value={filterName}
          onChange={(event) => setFilterName(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="compromised">Compromised</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
