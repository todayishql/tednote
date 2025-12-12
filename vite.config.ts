import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Setting base to './' allows the app to be deployed to any subdirectory (like /repo-name/)
  // without needing to know the exact repo name ahead of time.
  base: './',
})
