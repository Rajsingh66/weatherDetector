import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Use repo subpath on GitHub Pages, root path elsewhere (Railway/local).
export default defineConfig({
    base: process.env.GITHUB_ACTIONS === 'true' ? '/weatherDetector/' : '/',
    plugins: [react()],
})
