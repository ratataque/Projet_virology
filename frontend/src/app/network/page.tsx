import { TopologyMap } from "@/components/dashboard/topology-map";
import { Share2 } from "lucide-react";

export default function NetworkPage() {
  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
          <Share2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Network Topology
          </h1>
          <p className="text-muted-foreground text-sm">
            Visualizing C2 infrastructure and connected nodes.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TopologyMap />
      </div>
    </div>
  );
}
