import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Env files live in .envs/ (.env.dev committed, .env.prod gitignored)
  // instead of Vite's usual project-root .env/.env.local. Paired with the
  // `--mode dev` / `--mode prod` flags in package.json scripts, so Vite
  // looks for .envs/.env.dev and .envs/.env.prod respectively.
  envDir: './.envs',
  server: {
    port: 5173,
  },
})
