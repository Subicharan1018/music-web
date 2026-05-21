import React, { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/line-chart';
import { usePlayerStore } from '@/store/playerStore';
import dayjs from 'dayjs';

const chartConfig = {
  plays: {
    label: 'Queue Position',
    color: 'var(--color-coral)',
  },
};

export function PingingDotChart() {
  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);

  // Generate synthetic activity data based on the queue
  const data = useMemo(() => {
    if (!queue || queue.length === 0) {
      return Array.from({ length: 7 }).map((_, i) => ({
        time: dayjs().subtract(6 - i, 'day').format('ddd'),
        plays: 0,
        isCurrent: false,
      }));
    }

    // Map queue items to a pseudo-timeline for the line chart visualization
    // It plots the length of the songs in the queue as a proxy for "activity"
    const windowStart = Math.max(0, currentIndex - 3);
    const windowEnd = Math.min(queue.length, currentIndex + 4);
    const slice = queue.slice(windowStart, windowEnd);

    return slice.map((song, i) => {
      const actualIndex = windowStart + i;
      return {
        time: `Q${actualIndex + 1}`,
        plays: song.duration || Math.floor(Math.random() * 200 + 100),
        isCurrent: actualIndex === currentIndex,
      };
    });
  }, [queue, currentIndex]);

  return (
    <Card className="bg-transparent border-white/5 shadow-2xl backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-xl font-serif text-white/90">Session Activity</CardTitle>
        <CardDescription className="text-white/50">Queue engagement over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-[250px]">
          <LineChart
            data={data}
            margin={{ top: 20, left: -20, right: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}
              domain={['dataMin - 10', 'auto']}
            />
            <ChartTooltip
              cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              type="monotone"
              dataKey="plays"
              stroke="var(--color-coral)"
              strokeWidth={3}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload.isCurrent) {
                  return (
                    <circle
                      key={`dot-${payload.time}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="var(--color-paper)"
                      stroke="var(--color-coral)"
                      strokeWidth={2}
                    />
                  );
                }
                return (
                  <g key={`dot-${payload.time}`}>
                    <circle cx={cx} cy={cy} r={8} fill="var(--color-coral)" opacity={0.3}>
                      <animate
                        attributeName="r"
                        values="8; 20; 8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.3; 0; 0.3"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle cx={cx} cy={cy} r={6} fill="var(--color-coral)" />
                  </g>
                );
              }}
              activeDot={{ r: 6, fill: "var(--color-coral)", stroke: "var(--color-paper)", strokeWidth: 2 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
