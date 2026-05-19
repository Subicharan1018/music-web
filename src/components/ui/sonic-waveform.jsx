import React, { useEffect, useRef } from 'react'

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
      ctx.fillStyle = 'rgba(239, 231, 210, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const lineCount = 48
      const segmentCount = 72
      const height = canvas.height / 2
      const accent = 'rgba(237, 111, 92, '

      for (let i = 0; i < lineCount; i++) {
        ctx.beginPath()
        const progress = i / lineCount
        const colorIntensity = Math.sin(progress * Math.PI)
        ctx.strokeStyle = `${accent}${colorIntensity * 0.28})`
        ctx.lineWidth = 1.2

        for (let j = 0; j < segmentCount + 1; j++) {
          const x = (j / segmentCount) * canvas.width
          const distToMouse = Math.hypot(x - mouse.x, height - mouse.y)
          const mouseEffect = Math.max(0, 1 - distToMouse / 420)
          const noise = Math.sin(j * 0.1 + time + i * 0.2) * 14
          const spike = Math.cos(j * 0.18 + time + i * 0.1) * Math.sin(j * 0.05 + time) * 36
          const y = height + noise + spike * (1 + mouseEffect * 1.7)
          if (j === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      time += 0.018
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
  return (
    <div className={`pointer-events-none fixed inset-0 z-0 ${className}`} aria-hidden="true">
      <SonicWaveformCanvas />
      <div className="absolute inset-0 bg-gradient-to-b from-paper/35 via-paper/10 to-paper/60" />
    </div>
  )
}

export default SonicWaveformBackground
