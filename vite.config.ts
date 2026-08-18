import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    // Cloudflare отдаёт статику как есть — хэши в именах, чтобы не ловить старый кэш
    assetsDir: 'assets',
  },
})
