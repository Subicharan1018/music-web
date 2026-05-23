import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"
import { motion } from "motion/react"
import { cn } from "./cn"

export interface GenreRadarChartProps {
  data: Array<{ genre: string; value: number }>
  className?: string
}

export function GenreRadarChart({ data, className }: GenreRadarChartProps) {
  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center", className)}>
      <div className="w-full h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="genre" tick={{ fill: "rgba(240,240,245,0.45)", fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Genres"
              dataKey="value"
              stroke="var(--color-primary)"
              fill="var(--color-primary)"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {data.map((item, i) => (
          <motion.div
            key={item.genre}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            {item.genre}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
