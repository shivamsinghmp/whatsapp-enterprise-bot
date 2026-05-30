"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HourlyPoint {
  hour: string;
  sent: number;
}

interface MessageVolumeChartProps {
  hourlyData: HourlyPoint[];
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-[#25D366]">
        {payload[0].value?.toLocaleString()} sent
      </p>
    </div>
  );
}

export function MessageVolumeChart({ hourlyData }: MessageVolumeChartProps) {
  const total = hourlyData.reduce((s, d) => s + d.sent, 0);
  const peak = Math.max(...hourlyData.map((d) => d.sent));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Message Volume</CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
            <p className="text-sm font-semibold text-[#25D366]">
              {total.toLocaleString()} sent
            </p>
          </div>
        </div>
        {peak > 0 && (
          <p className="text-xs text-muted-foreground">
            Peak: {peak.toLocaleString()} msg/hr
          </p>
        )}
      </CardHeader>
      <CardContent className="pl-0">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart
            data={hourlyData}
            margin={{ top: 4, right: 12, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="waGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="sent"
              stroke="#25D366"
              strokeWidth={2}
              fill="url(#waGreen)"
              dot={false}
              activeDot={{ r: 4, fill: "#25D366" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
