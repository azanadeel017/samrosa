"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const WEEKLY_DATA = [
  { day: "Mon", lbs: 42 },
  { day: "Tue", lbs: 78 },
  { day: "Wed", lbs: 55 },
  { day: "Thu", lbs: 91 },
  { day: "Fri", lbs: 134 },
  { day: "Sat", lbs: 67 },
  { day: "Sun", lbs: 28 },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink/10 bg-white/95 px-3 py-2 shadow-soft backdrop-blur text-sm">
      <p className="font-semibold text-ink">{label}</p>
      <p className="text-burnt">{payload[0].value} lbs rescued</p>
    </div>
  );
}

export default function WasteChart() {
  return (
    <motion.section
      className="mt-10 rounded-2xl border border-ink/8 bg-white/80 p-6 shadow-soft backdrop-blur"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
    >
      <div className="mb-5 flex items-center gap-2">
        <TrendingUp size={18} className="text-burnt" />
        <h2 className="font-display text-lg font-semibold text-ink">
          Last 7 Days of Waste Diverted
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={WEEKLY_DATA}
          barSize={32}
          margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(58,36,23,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "rgba(58,36,23,0.5)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "rgba(58,36,23,0.5)" }}
            axisLine={false}
            tickLine={false}
            unit=" lbs"
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(199,91,18,0.06)" }}
          />
          <Bar dataKey="lbs" fill="#C75B12" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-ink/35">
        Sample data · Connect to live database for real trend
      </p>
    </motion.section>
  );
}
