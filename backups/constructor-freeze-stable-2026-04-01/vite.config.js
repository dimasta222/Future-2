import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')?.[1]
const isGitHubActionsBuild = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [react()],
  base: isGitHubActionsBuild && repositoryName ? `/${repositoryName}/` : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }

          if (id.includes('/src/components/constructor/') || id.includes('/src/utils/constructor/')) {
            return 'constructor'
          }

          if (id.includes('/src/portfolio/')) {
            return 'portfolio'
          }
        },
      },
    },
  },
})
