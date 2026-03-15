import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')?.[1]
const isGitHubActionsBuild = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  plugins: [react()],
  base: isGitHubActionsBuild && repositoryName ? `/${repositoryName}/` : '/',
})
