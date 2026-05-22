import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import { execSync } from 'child_process'

let gitCommit = 'unknown'
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) {
  console.warn('Could not read git commit')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(gitCommit),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(new Date().toISOString().split('T')[0])
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
