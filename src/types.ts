export interface Post {
  path: string
  title: string
  date: string
  lang?: string
  desc?: string
  redirect?: string
}

type MediaState = 'done' | 'doing' | 'todo'

export type MediaType ='book' | 'movie'

export interface MediaRecord {
  name: string
  author?: string
  state?: MediaState
  date?: string
  note?: string
  lang?: string
}

