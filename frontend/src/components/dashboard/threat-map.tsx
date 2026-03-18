"use client";

import React, { memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { useTheme } from "next-themes";
import { Bot } from "@/types/types";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface ThreatMapProps {
  bots: Bot[];
}

const ThreatMap = ({ bots }: ThreatMapProps) => {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "system"; // simplistic check

  return (
    <div className="w-full h-[400px] bg-muted/20 rounded-lg overflow-hidden border relative">
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 100 }}>
        <ZoomableGroup center={[0, 20]} zoom={1}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isDark ? "#2d2d30" : "#e5e7eb"}
                  stroke={isDark ? "#3f3f46" : "#d1d5db"}
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      fill: isDark ? "#3f3f46" : "#d1d5db",
                      outline: "none",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {bots.map((bot) =>
            bot.coordinates ? (
              <Marker
                key={bot.id}
                coordinates={[bot.coordinates[1], bot.coordinates[0]]}
              >
                <circle
                  r={4}
                  fill={bot.status === "online" ? "#10b981" : "#ef4444"}
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer"
                >
                  <title>{`${bot.hostname} (${bot.ip})\n${bot.location}`}</title>
                </circle>
              </Marker>
            ) : null,
          )}
        </ZoomableGroup>
      </ComposableMap>
      <div className="absolute top-2 left-2 bg-background/80 backdrop-blur p-2 rounded text-xs border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Offline/Compromised</span>
        </div>
      </div>
    </div>
  );
};

export default memo(ThreatMap);
