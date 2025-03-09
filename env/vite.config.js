import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  root: "src",
  base: "./",
  publicDir: "public",
  build: {
    outDir: "../build",
    target: 'esnext',
    rollupOptions: {
      output: {//名前を固定する
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  server: {
    host: true,
  },
  plugins: [
    react()
  ]
})