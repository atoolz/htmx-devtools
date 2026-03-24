import { defineConfig, build, type Plugin, type InlineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'
import { readFile, writeFile, rm } from 'fs/promises'
import { existsSync } from 'fs'

// Flatten nested HTML outputs to dist root and fix relative paths
function flattenHtml(): Plugin {
  return {
    name: 'flatten-html',
    closeBundle: async () => {
      const distDir = resolve(__dirname, 'dist')
      const srcDir = resolve(distDir, 'src')
      if (!existsSync(srcDir)) return

      const moves = [
        { from: 'src/devtools/devtools.html', to: 'devtools.html', depth: 2 },
        { from: 'src/panel/panel.html', to: 'panel.html', depth: 2 },
      ]

      for (const { from, to, depth } of moves) {
        const fromPath = resolve(distDir, from)
        const toPath = resolve(distDir, to)
        if (!existsSync(fromPath)) continue

        let html = await readFile(fromPath, 'utf-8')
        const prefix = '../'.repeat(depth)
        html = html.replaceAll(`"${prefix}`, '"./').replaceAll(`'${prefix}`, '\'\./')
        await writeFile(toPath, html)
      }

      await rm(srcDir, { recursive: true, force: true })
    },
  }
}

// Build self-contained IIFE scripts for content-script and page-script
function buildIIFEScripts(): Plugin {
  const entries: Record<string, string> = {
    'page-script': resolve(__dirname, 'src/page/page-script.ts'),
    'content-script': resolve(__dirname, 'src/content/content-script.ts'),
    'background': resolve(__dirname, 'src/background/background.ts'),
  }

  return {
    name: 'build-iife-scripts',
    closeBundle: async () => {
      for (const [name, entry] of Object.entries(entries)) {
        await build({
          configFile: false,
          resolve: {
            alias: {
              '@shared': resolve(__dirname, 'src/shared'),
            },
          },
          build: {
            lib: {
              entry,
              formats: ['iife'],
              name: name.replace(/-/g, '_'),
              fileName: () => `${name}.js`,
            },
            outDir: 'dist',
            emptyOutDir: false,
            sourcemap: false,
            minify: 'esbuild',
            target: 'chrome120',
          },
          logLevel: 'warn',
        } satisfies InlineConfig)
      }
    },
  }
}

export default defineConfig({
  plugins: [preact(), flattenHtml(), buildIIFEScripts()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  base: './',
  build: {
    rollupOptions: {
      input: {
        devtools: resolve(__dirname, 'src/devtools/devtools.html'),
        panel: resolve(__dirname, 'src/panel/panel.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    target: 'chrome120',
    minify: process.env.NODE_ENV === 'development' ? false : 'esbuild',
  },
})
