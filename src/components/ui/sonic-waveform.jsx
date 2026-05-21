import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// Routes on which the waveform should not render.
const DISABLED_ROUTES = ['/playlist/', '/settings', '/login']

const SonicWaveformCanvas = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    const mouse = { x: canvas.width / 2, y: canvas.height / 2 }
    let time = 0

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const draw = () => {
      // Pure black fade — no warm tone
      ctx.fillStyle = 'rgba(5, 5, 5, 0.10)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const lineCount = 52
      const segmentCount = 80
      const height = canvas.height / 2

      for (let i = 0; i < lineCount; i++) {
        ctx.beginPath()
        const progress = i / lineCount
        const colorIntensity = Math.sin(progress * Math.PI)

        // Alternate between crimson and orange for depth
        const isCrimson = i % 3 !== 2
        const baseR = isCrimson ? 220 : 255
        const baseG = isCrimson ? 20  : 107
        const baseB = isCrimson ? 60  : 0
        const alpha = colorIntensity * 0.10

        ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha})`
        ctx.lineWidth = 1.2

        for (let j = 0; j < segmentCount + 1; j++) {
          const x = (j / segmentCount) * canvas.width
          const distToMouse = Math.hypot(x - mouse.x, height - mouse.y)
          const mouseEffect = Math.max(0, 1 - distToMouse / 380)
          const noise = Math.sin(j * 0.09 + time + i * 0.18) * 16
          const spike = Math.cos(j * 0.16 + time + i * 0.09) * Math.sin(j * 0.05 + time) * 42
          const y = height + noise + spike * (1 + mouseEffect * 2.0)
          if (j === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      time += 0.016
      animationFrameId = requestAnimationFrame(draw)
    }

    const handleMouseMove = (event) => {
      mouse.x = event.clientX
      mouse.y = event.clientY
    }

    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('mousemove', handleMouseMove)

    resizeCanvas()
    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

const SonicWaveformBackground = ({ className = '' }) => {
  const location = useLocation()

  const isDisabled = DISABLED_ROUTES.some(route =>
    location.pathname.startsWith(route)
  )

  if (isDisabled) return null

  return (
    <div className={`pointer-events-none fixed inset-0 z-0 ${className}`} aria-hidden="true">
      <SonicWaveformCanvas />
      {/* Vignette: heavy black edges, lighter centre so waveform breathes */}
      <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-transparent via-paper/20 to-paper/80" />
      <div className="absolute inset-0 bg-gradient-to-b from-paper/50 via-transparent to-paper/70" />
    </div>
  )
}

export default SonicWaveformBackground
