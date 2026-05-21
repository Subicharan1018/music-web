import React, { useEffect, useState } from 'react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/radar-chart';
import { useSubsonic } from '@/hooks/useSubsonic';

const chartConfig = {
  count: {
    label: 'Songs',
    color: 'var(--color-coral)',
  },
};

export function GlowingRadarChart() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const subsonic = useSubsonic();

  useEffect(() => {
    async function fetchGenres() {
      if (!subsonic) return;
      try {
        setIsLoading(true);
        // Using the new getGenres() method
        const resp = await subsonic.getGenres();
        const genres = resp?.genres?.genre || [];
        
        // Take top 6 genres to keep radar chart clean
        const topGenres = genres
          .sort((a, b) => (b.songCount || 0) - (a.songCount || 0))
          .slice(0, 6)
          .map(g => ({
            genre: g.value || g.name,
            count: g.songCount || 0,
          }));
          
        setData(topGenres);
      } catch (err) {
        console.error('Failed to fetch genres for radar chart:', err);
        // fallback mock
        setData([
          { genre: 'Pop', count: 120 },
          { genre: 'Rock', count: 98 },
          { genre: 'Hip Hop', count: 86 },
          { genre: 'Electronic', count: 99 },
          { genre: 'Jazz', count: 85 },
          { genre: 'Classical', count: 65 },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGenres();
  }, [subsonic]);

  return (
    <Card className="bg-transparent border-white/5 shadow-2xl backdrop-blur-xl">
      <CardHeader className="items-center pb-4">
        <CardTitle className="text-xl font-serif text-white/90">Sonic Footprint</CardTitle>
        <CardDescription className="text-white/50">Top genres across your entire library</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[350px]"
        >
          <RadarChart
            data={data.length > 0 ? data : [{ genre: 'Loading', count: 0 }]}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
            <PolarAngleAxis 
              dataKey="genre" 
              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }} 
            />
            <Radar
              dataKey="count"
              fill="var(--color-coral)"
              fillOpacity={0.3}
              stroke="var(--color-coral)"
              strokeWidth={3}
              style={{
                filter: 'drop-shadow(0 0 10px rgba(220, 20, 60, 0.6))',
              }}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
