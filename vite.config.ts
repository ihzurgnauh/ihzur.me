import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import fs from 'fs-extra'
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import Inspect from 'vite-plugin-inspect'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import Markdown from 'unplugin-vue-markdown/vite'
import Vue from '@vitejs/plugin-vue'
import matter from 'gray-matter'
import AutoImport from 'unplugin-auto-import/vite'
import Anchor from 'markdown-it-anchor'
import LinkAttributes from 'markdown-it-link-attributes'
import UnoCSS from 'unocss/vite'
import SVG from 'vite-svg-loader'
import MarkdownItShiki from '@shikijs/markdown-it'
import { rendererRich, transformerTwoslash } from '@shikijs/twoslash'
import Footnote from 'markdown-it-footnote'
import { figure } from "@mdit/plugin-figure"
import { slugify } from './scripts/slugify'
import GitHubAlerts from 'markdown-it-github-alerts'

// @ts-expect-error missing types
import TOC from 'markdown-it-table-of-contents'

const promises: Promise<any>[] = []

const BLURHASH_MAP = fs.readJSONSync(
  resolve(process.cwd(), 'data/blurhash-map.json'), 
  { throws: false }
) || {}

export default defineConfig({
  resolve: {
    alias: [
      { find: '~/', replacement: `${resolve(__dirname, 'src')}/` },
    ],
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@vueuse/core',
      'dayjs',
      'dayjs/plugin/localizedFormat',
    ],
  },
  plugins: [
    UnoCSS(),
    Vue({
      include: [/\.vue$/, /\.md$/]
    }),

    VueRouter({
      extensions: ['.vue', '.md'],
      routesFolder: 'pages',
      logs: true,
      extendRoute(route) {
        const path = route.components.get('default')
        if (!path)
          return

        if (!path.includes('projects.md') && path.endsWith('.md')) {
          const { data } = matter(fs.readFileSync(path, 'utf-8'))
          route.addToMeta({
            frontmatter: data,
          })
        }
      },
    }),

    Markdown({
      wrapperComponent: 'WrapperPost',
      wrapperClasses: (id, code) => code.includes('@layout-full-width')
        ? ''
        : 'prose m-auto slide-enter-content',
      headEnabled: true,
      exportFrontmatter: false,
      exposeFrontmatter: false,
      exposeExcerpt: false,
      markdownItOptions: {
        quotes: '""\'\'',
      },
      async markdownItSetup(md) {
        md.use(await MarkdownItShiki({
          themes: {
            dark: 'vitesse-dark',
            light: 'vitesse-light',
          },
          defaultColor: false,
          cssVariablePrefix: '--s-',
          transformers: [
            transformerTwoslash({
              explicitTrigger: true,
              renderer: rendererRich(),
            }),
          ],
        }))

        md.use(Anchor, {
          slugify,
          permalink: Anchor.permalink.linkInsideHeader({
            symbol: '#',
            renderAttrs: () => ({ 'aria-hidden': 'true' }),
          }),
        })

        md.use(LinkAttributes, {
          matcher: (link: string) => /^https?:\/\//.test(link),
          attrs: {
            target: '_blank',
            rel: 'noopener',
          },
        })

        md.use(TOC, {
          includeLevel: [1, 2, 3, 4],
          slugify,
          containerHeaderHtml: '<div class="table-of-contents-anchor"><div class="i-line-md-align-left" /></div>',
        })

        md.use(GitHubAlerts)

        md.use(Footnote)

        md.use(figure)
        
        // Save default renderer
        const defaultImageRule = md.renderer.rules.image || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))
        const defaultHtmlBlockRule = md.renderer.rules.html_block || ((tokens, idx) => tokens[idx].content)
        const defaultHtmlInlineRule = md.renderer.rules.html_inline || ((tokens, idx) => tokens[idx].content)

        const replaceImgWithBlurHash = (content: string) => {
          return content.replace(/<img([^>]+)>/gi, (match, attrs) => {
            const srcMatch = attrs.match(/src=["']([^"']+)["']/)
            const altMatch = attrs.match(/alt=["']([^"']+)["']/)

            const src = srcMatch ? srcMatch[1] : ''
            const alt = altMatch ? altMatch[1] : ''
            const hash = BLURHASH_MAP[src]

            if (hash) {
              return `<BlurImage src="${src}" alt="${alt}" hash="${hash}" />`
            }
            return match
          })
        }

        md.renderer.rules.image = (tokens, idx, options, env, self) => {
          const token = tokens[idx]
          const src = token.attrGet('src') || ''
          const alt = token.content || token.attrGet('alt') || ''
          const hash = BLURHASH_MAP[src]

          if (hash) {
            return `<BlurImage src="${src}" alt="${alt}" hash="${hash}" />`
          }

          return defaultImageRule(tokens, idx, options, env, self)
        }

        md.renderer.rules.html_block = (tokens, idx, options, env, self) => {
          const content = tokens[idx].content
          if (content.includes('<img')) {
            return replaceImgWithBlurHash(content)
          }
          return defaultHtmlBlockRule(tokens, idx, options, env, self)
        }

        md.renderer.rules.html_inline = (tokens, idx, options, env, self) => {
          const content = tokens[idx].content
          if (content.includes('<img')) {
            return replaceImgWithBlurHash(content)
          }
          return defaultHtmlInlineRule(tokens, idx, options, env, self)
        }
      }
    }),

    AutoImport({
      imports: [
        'vue',
        VueRouterAutoImports,
        '@vueuse/core'
      ],
    }),

    Components({
      extensions: ['vue', 'md'],
      dts: true,
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [
        IconsResolver({
          componentPrefix: '',
        }),
      ],
    }),

    Inspect(),

    Icons({
      defaultClass: 'inline',
      defaultStyle: 'vertical-align: sub;',
    }),

    SVG({
      svgo: false,
      defaultImport: 'url',
    }),

    {
      name: 'await',
      async closeBundle() {
        await Promise.all(promises)
      },
    },
  ],

  build: {
    rollupOptions: {
      onwarn(warning, next) {
        if (warning.code !== 'UNUSED_EXTERNAL_IMPORT')
          next(warning)
      },
    },
  },

  ssgOptions: {
    formatting: 'minify'
  },
})
