import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { scanFonts } from './scripts/scan-fonts.mjs'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')?.[1]
const isGitHubActionsBuild = process.env.GITHUB_ACTIONS === 'true'

function localFontsPlugin() {
  return {
    name: 'local-fonts',
    buildStart() {
      scanFonts()
    },
    configureServer(server) {
      server.watcher.add('public/fonts')
      server.watcher.on('all', (event, path) => {
        if (path.includes('/public/fonts/') && /\.(ttf|otf|woff2?)$/i.test(path)) {
          scanFonts()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localFontsPlugin()],
  base: isGitHubActionsBuild && repositoryName ? `/${repositoryName}/` : '/',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }

          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'pdf-vendor'
          }

          if (id.includes('node_modules/pdfjs-dist')) {
            return 'pdfjs-vendor'
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
