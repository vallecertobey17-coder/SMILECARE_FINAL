import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds one self-contained index.html (all JS/CSS inlined) for static hosting.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
