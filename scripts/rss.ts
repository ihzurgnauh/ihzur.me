import { dirname } from 'node:path'
import fg from 'fast-glob'
import fs from 'fs-extra'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import type { FeedOptions, Item } from 'feed'
import { Feed } from 'feed'

const DOMAIN = 'https://ihzurgnauh.github.io'
const AUTHOR = {
  name: 'ihzurgnauh',
  email: 'zhiruhuang7@gmail.com',
  link: DOMAIN,
}
const markdown = MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})

async function run() {
  await buildBlogRSS()
}

async function buildBlogRSS() {
  const postFiles = await fg('pages/posts/*.md')
  const noteFiles = await fg('pages/notes/*.md')
  const allFiles = [...postFiles, ...noteFiles]

  const options = {
    title: 'ihzurgnauh',
    description: '在循环往复的时空中，将时间的痕迹存储于此',
    id: 'https://ihzurgnauh.github.io',
    link: 'https://ihzurgnauh.github.io',
    copyright: 'CC BY-NC-SA 4.0 2023-PRESENT © ihzurgnauh',
    feedLinks: {
      json: 'https://ihzurgnauh.github.io/feed.json',
      atom: 'https://ihzurgnauh.github.io/feed.atom',
      rss: 'https://ihzurgnauh.github.io/feed.xml',
    },
  }
  const posts: any[] = (
    await Promise.all(
      allFiles.filter(i => !i.includes('index'))
        .map(async (i) => {
          const raw = await fs.readFile(i, 'utf-8')
          const { data, content } = matter(raw)

          // if (data.lang !== 'zh')
          //   return

          const html = markdown.render(content)
            .replace('src="/', `src="${DOMAIN}/`)

          if (data.image?.startsWith('/'))
            data.image = DOMAIN + data.image

          return {
            ...data,
            date: new Date(data.date),
            content: html,
            author: [AUTHOR],
            link: DOMAIN + i.replace(/^pages(.+)\.md$/, '$1'),
          }
        }),
    ))
    .filter(Boolean)

  posts.sort((a, b) => +new Date(b.date) - +new Date(a.date))

  await writeFeed('feed', options, posts)
}

async function writeFeed(name: string, options: FeedOptions, items: Item[]) {
  options.author = AUTHOR
  options.image = 'https://ihzurgnauh.github.io/avatar.png'
  options.favicon = 'https://ihzurgnauh.github.io/logo.png'

  const feed = new Feed(options)

  items.forEach(item => feed.addItem(item))

  await fs.ensureDir(dirname(`./dist/${name}`))
  await fs.writeFile(`./dist/${name}.xml`, feed.rss2(), 'utf-8')
  await fs.writeFile(`./dist/${name}.atom`, feed.atom1(), 'utf-8')
  await fs.writeFile(`./dist/${name}.json`, feed.json1(), 'utf-8')
}

run()
