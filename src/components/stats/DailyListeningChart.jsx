/**
 * DailyListeningChart.jsx
 * Recharts BarChart for daily listening minutes.
 * Recharts is imported ONLY in this file, not in StatsPage.
 */

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-paper border border-ink/16 rounded-md font-sans text-sm p-3 shadow-lg">
      <p className="text-ink-mute font-mono text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-ink font-medium">{payload[0].value} min</p>
    </div>
  );
};

export const DailyListeningChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="font-sans text-sm text-ink-faint italic">No listening data yet.</p>
      </div>
    );
  }

  // Show every 5th label to avoid crowding
  const tickFormatter = (value, index) => (index % 5 === 0 ? value.slice(5) : '');

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'var(--color-ink-faint, #9e9d98)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'var(--color-ink-faint, #9e9d98)' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(21,20,15,0.04)' }} />
        <Bar
          dataKey="minutes"
          fill="var(--color-coral, #ed6f5c)"
          fillOpacity={0.8}
          radius={[2, 2, 0, 0]}
          maxBarSize={16}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
