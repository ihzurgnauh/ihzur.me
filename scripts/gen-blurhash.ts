import { resolve } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'
import fs from 'fs-extra'
import fg from 'fast-glob'
import { encode } from 'blurhash'
import { ofetch } from 'ofetch'
import sharp from 'sharp'

const ROOT = process.cwd()
const MAP_FILE = resolve(ROOT, 'data/blurhash-map.json')

// Read cache
let hashMap: Record<string, string> = {}
if (existsSync(MAP_FILE)) {
  hashMap = fs.readJSONSync(MAP_FILE)
}

async function run() {
  console.log('generate blurhash...')
  
  // Scan all md files
  const postFiles = await fg(['pages/**/*.md'], { cwd: ROOT, absolute: true })
  const urlsToProcess = new Set<string>()

  // Extract image links
  for (const file of postFiles) {
    const content = readFileSync(file, 'utf-8')
    // Match ![...](http...) and <img src="http...">
    const imgRegex = /!\[.*?\]\((https?:\/\/.*?)\)|<img.*?src=["'](https?:\/\/.*?)["']/gi
    
    let match
    while ((match = imgRegex.exec(content)) !== null) {
      const url = match[1] || match[2]
     
      if (url && !hashMap[url]) {
        urlsToProcess.add(url)
      }
    }
  }

  if (urlsToProcess.size === 0) {
    console.log('All images are cached.')
    return
  }

  console.log(`Found ${urlsToProcess.size} new images, generating Blurhash...`);

  for (const url of urlsToProcess) {
    try {
      const arrayBuffer = await ofetch(url, { responseType: 'arrayBuffer' })
      
      const image = sharp(Buffer.from(arrayBuffer))
      const { data, info } = await image
        .resize(32, 32, { fit: 'inside' }) 
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      // 生成 hash
      const hash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3)
      
      hashMap[url] = hash
      console.log(`[OK] ${url}`)
      
    } catch (e) {
      console.error(`[Error] Failed to process: ${url}`);
    }
  }

  fs.ensureDirSync(resolve(ROOT, 'data'))
  fs.writeJSONSync(MAP_FILE, hashMap, { spaces: 2 })
  console.log('Done. blurhash-map.json updated.')
}

run()
