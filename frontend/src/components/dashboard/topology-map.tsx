"use client";

import React, { useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { useSocket } from "@/hooks/useSocket";
import { Bot } from "@/types/types";
import { useTheme } from "next-themes";
import { toast } from "sonner";

// Custom styles for React Flow
const nodeStyles = {
  c2: {
    background: "#ef4444", // Red-500
    color: "white",
    border: "2px solid #b91c1c",
    width: 60,
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    fontWeight: "bold",
    boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)",
  },
  botOnline: {
    background: "#22c55e", // Green-500
    color: "white",
    border: "1px solid #15803d",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    fontSize: "10px",
  },
  botOffline: {
    background: "#64748b", // Slate-500
    color: "white",
    border: "1px solid #475569",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    fontSize: "10px",
  },
};

export function TopologyMap() {
  const { bots } = useSocket();
  const { theme } = useTheme();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Calculate layout
  useEffect(() => {
    if (!bots.length) return;

    // Center Node (C2)
    const centerX = 0;
    const centerY = 0;
    const c2Node: Node = {
      id: "c2-server",
      position: { x: centerX, y: centerY },
      data: { label: "C2" },
      style: nodeStyles.c2,
      type: "default",
    };

    // Satellite Nodes (Bots)
    const radius = 300; // Distance from center
    const botNodes: Node[] = bots.map((bot, index) => {
      const angle = (index / bots.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return {
        id: bot.id,
        position: { x, y },
        data: { label: bot.hostname, bot }, // specific data
        style:
          bot.status === "online"
            ? nodeStyles.botOnline
            : nodeStyles.botOffline,
        type: "default", // or custom if we want icons inside
      };
    });

    const botEdges: Edge[] = bots.map((bot) => ({
      id: `e-c2-${bot.id}`,
      source: "c2-server",
      target: bot.id,
      animated: bot.status === "online",
      style: {
        stroke: bot.status === "online" ? "#22c55e" : "#64748b",
        strokeWidth: 2,
      },
    }));

    setNodes([c2Node, ...botNodes]);
    setEdges(botEdges);
  }, [bots, setNodes, setEdges]); // Only re-calc if bots change

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.id === "c2-server") {
      toast.info("C2 Server Node", {
        description: "Main Command & Control Infrastructure",
      });
      return;
    }
    const bot = node.data.bot as Bot;
    if (bot) {
      toast.message(bot.hostname, {
        description: `IP: ${bot.ip} | OS: ${bot.os} | Status: ${bot.status}`,
        action: {
          label: "View Details",
          onClick: () => (window.location.href = `/bots/${bot.id}`), // Simple nav for now
        },
      });
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] w-full border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950 transition-colors duration-300">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-right"
      >
        <Background
          color={theme === "dark" ? "#3f3f46" : "#e4e4e7"}
          gap={20}
          variant={BackgroundVariant.Dots}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}
