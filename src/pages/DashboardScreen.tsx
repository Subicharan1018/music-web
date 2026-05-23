"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { motion } from "motion/react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import { MetricCard } from "../components/ui/metric-card"
import { PeriodSelector, Period } from "../components/ui/period-selector"
import { HourlyHeatmap } from "../components/ui/hourly-heatmap"
import { ContributionGraph } from "../components/ui/contribution-graph"
import { GenreRadarChart } from "../components/ui/genre-radar-chart"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/ui/line-chart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { TrendingUp, Music, Mic2, AlertCircle, Loader2 } from "lucide-react"
import { getShuffleService } from "../store/v2ShuffleStore"

export function DashboardScreen() {
  const [period, setPeriod] = useState<Period>("Weekly")
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [stats, setStats] = useState<any>(null)
  const [graphData, setGraphData] = useState<any[]>([])

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      const service = getShuffleService();
      if (!service) {
        if (isMounted) {
          setError("Shuffle service not initialized. Please ensure the backend is connected.");
          setIsLoading(false);
        }
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const pStr = period.toLowerCase() === "all time" ? "all" : period.toLowerCase();
        const [statsData, graphRes] = await Promise.all([
          service.getListeningStats({ period: pStr }),
          service.getContributionGraph()
        ]);
        
        if (isMounted) {
          setStats(statsData);
          setGraphData(graphRes?.data || graphRes?.days || []);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load dashboard data");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchData();
    
    return () => { isMounted = false };
  }, [period]);

  const chartData = useMemo(() => {
    if (!graphData || graphData.length === 0) return [];
    // Take the last 7 to 14 days for the volume chart
    const recentDays = graphData.slice(-14);
    return recentDays.map((d: any) => {
      let timeLabel = d.date_str || d.date;
      if (timeLabel && timeLabel.includes('-')) {
        const parts = timeLabel.split('-');
        if (parts.length === 3) {
          const dt = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
          timeLabel = dt.toLocaleDateString('en-US', { weekday: 'short' });
        }
      }
      return {
        time: timeLabel,
        count: d.count || 0
      };
    });
  }, [graphData]);

  const heatmapArray = useMemo(() => {
    if (!stats?.hourly_heatmap && !stats?.hourlyHeatmap) return Array(24).fill(0);
    const hm = stats.hourly_heatmap || stats.hourlyHeatmap;
    return Array.from({ length: 24 }).map((_, i) => hm[i.toString()] || hm[i] || 0);
  }, [stats]);

  const radarData = useMemo(() => {
    if (!stats?.genre_breakdown && !stats?.genreBreakdown) return [];
    const gb = stats.genre_breakdown || stats.genreBreakdown || [];
    return gb.slice(0, 6).map((g: any) => ({
      genre: g.genre || 'Unknown',
      value: g.play_count || g.count || g.plays || 0
    }));
  }, [stats]);

  const mappedGraphData = useMemo(() => {
    let maxCount = 0;
    graphData.forEach(d => {
      if (d.count > maxCount) maxCount = d.count;
    });
    
    // Minimum threshold so low-activity days still register as level 1 or 2 instead of level 4
    const threshold = Math.max(maxCount, 4);

    return graphData.map(d => {
      const count = d.count || 0;
      let level = 0;
      if (count > 0) {
        if (count <= threshold * 0.25) level = 1;
        else if (count <= threshold * 0.5) level = 2;
        else if (count <= threshold * 0.75) level = 3;
        else level = 4;
      }
      return {
        date: d.date_str || d.date,
        count,
        level
      };
    });
  }, [graphData]);

  const topArtists = stats?.top_artists || stats?.topArtists || [];
  const topTracks = stats?.top_tracks || stats?.topTracks || [];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 overflow-y-auto no-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-1"
          >
            <h1 className="text-3xl font-bold tracking-tight text-primary-foreground">Pulse Dashboard</h1>
            <p className="text-sm text-muted-foreground">Your listening patterns and analytics.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <PeriodSelector selected={period} onChange={setPeriod} />
          </motion.div>
        </header>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-500">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {isLoading && !stats ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <motion.div 
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
            >
              {[
                { title: "Plays", value: (stats?.total_plays || stats?.totalPlays || 0).toLocaleString(), trend: "up", trendValue: "" },
                { title: "Minutes", value: (stats?.total_minutes || stats?.totalMinutes || 0).toLocaleString(), trend: "up", trendValue: "" },
                { title: "Skip Rate", value: `${Math.round((stats?.skip_rate || stats?.skipRate || 0) * 100)}%`, trend: "down", trendValue: "" },
                { title: "Streak", value: `${stats?.streak_days || stats?.streakDays || 0} Days`, trend: "up", trendValue: "" },
              ].map((metric) => (
                <motion.div 
                  key={metric.title}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <MetricCard
                    title={metric.title}
                    value={metric.value}
                    trend={metric.trend as "up" | "down"}
                    trendValue={metric.trendValue}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Hourly Heatmap */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Daily Rhythm</CardTitle>
                  <CardDescription>When you listen the most</CardDescription>
                </CardHeader>
                <CardContent>
                  <HourlyHeatmap data={heatmapArray} className="h-32" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      Listening Volume
                      <Badge
                        variant="outline"
                        className="text-green-500 bg-green-500/10 border-none ml-2"
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span>5.2%</span>
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <ChartContainer config={{ count: { label: "Plays", color: "var(--color-primary)" } }}>
                        <LineChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                          <Line
                            dataKey="count"
                            type="bump"
                            stroke="var(--color-primary)"
                            strokeWidth={2}
                            dot={false}
                            filter="url(#rainbow-line-glow)"
                          />
                          <defs>
                            <filter
                              id="rainbow-line-glow"
                              x="-20%"
                              y="-20%"
                              width="140%"
                              height="140%"
                            >
                              <feGaussianBlur stdDeviation="10" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Genre Footprint</CardTitle>
                    <CardDescription>Your current musical taste</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {radarData.length > 0 ? (
                      <GenreRadarChart data={radarData} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Not enough data</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Contribution Graph */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-center">
                    <span>Activity History</span>
                    {mappedGraphData.length > 0 && (
                      <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                        {mappedGraphData.length} Days
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mappedGraphData.length > 0 ? (
                    <ContributionGraph data={mappedGraphData} />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No activity recorded</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Artists & Tracks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mic2 className="size-4 text-primary" /> Top Artists
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {topArtists.length > 0 ? topArtists.slice(0, 5).map((artist: any, i: number) => (
                      <div key={artist.artist || i} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-6 text-center text-sm text-muted-foreground font-mono">{i + 1}</div>
                          <div className="font-medium text-primary-foreground group-hover:text-primary transition-colors">{artist.artist}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{artist.play_count || artist.count || artist.plays || 0} plays</div>
                      </div>
                    )) : <div className="text-muted-foreground text-sm">No top artists yet</div>}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Music className="size-4 text-primary" /> Top Tracks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {topTracks.length > 0 ? topTracks.slice(0, 5).map((track: any, i: number) => (
                      <div key={track.title || i} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-6 text-center text-sm text-muted-foreground font-mono">{i + 1}</div>
                          <div className="font-medium text-primary-foreground group-hover:text-primary transition-colors">{track.title}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{track.play_count || track.count || track.plays || 0} plays</div>
                      </div>
                    )) : <div className="text-muted-foreground text-sm">No top tracks yet</div>}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
