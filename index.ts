import { readFile } from "node:fs/promises"
import { Plugin } from "@opencode/plugin"
import { clampCount, fetchPage, search } from "./deepseek.ts"

interface Options {
  /** Absolute path to a file containing the DeepSeek API key. */
  apiKeyFile?: string
  /** Number of search results to request, 1-50. Default: 8. */
  count?: number
}

async function loadKey(options: Options): Promise<string | undefined> {
  const fromEnv = process.env.DEEPSEEK_API_KEY?.trim()
  if (fromEnv) return fromEnv
  if (!options.apiKeyFile) return undefined
  try {
    const key = (await readFile(options.apiKeyFile, "utf8")).trim()
    return key || undefined
  } catch {
    return undefined
  }
}

function published(date: string | null) {
  if (!date) return {}
  const value = Date.parse(date)
  return Number.isFinite(value) ? { published: value } : {}
}

export default Plugin.define({
  id: "deepseek.web",
  async setup(ctx) {
    const options = (ctx.options ?? {}) as Options
    const key = await loadKey(options)
    if (!key) {
      throw new Error("[deepseek.web] set DEEPSEEK_API_KEY or plugins[].options.apiKeyFile")
    }

    await ctx.websearch.transform((editor) => {
      editor.add({
        id: "deepseek",
        name: "DeepSeek Search",
        execute: async ({ query }, { signal }) => {
          const hits = await search(key, query, clampCount(options.count), signal)
          return hits.map((hit) => ({
            url: hit.url,
            title: hit.title,
            content: [hit.snippet, hit.summary].filter(Boolean).join("\n\n"),
            time: published(hit.date),
          }))
        },
      })
      editor.default.set("deepseek")
    })

    await ctx.tool.transform((editor) => {
      editor.namespace({ name: "deepseek", description: "DeepSeek web search and page fetch" })
      editor.add({
        name: "fetch",
        description:
          "Fetch a web page through DeepSeek and return its content as Markdown. Use for reading articles, docs or pages found by web search.",
        input: {
          type: "object",
          properties: {
            url: { type: "string", description: "HTTP or HTTPS URL to fetch" },
          },
          required: ["url"],
          additionalProperties: false,
        },
        options: { namespace: "deepseek" },
        execute: async ({ url }: { url: string }, context: { signal: AbortSignal }) => {
          const page = await fetchPage(key, url, context.signal)
          return { content: `# ${page.title}\n\n${page.content}` }
        },
      })
    })
  },
})
