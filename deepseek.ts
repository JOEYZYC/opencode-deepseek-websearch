const BASE_URL = "https://api.deepseek.com"

export interface SearchHit {
  url: string
  title: string
  snippet: string
  summary: string
  date: string | null
}

async function call(key: string, path: string, body: unknown, signal?: AbortSignal) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`DeepSeek ${path} failed: HTTP ${response.status} ${detail.slice(0, 300)}`)
  }
  return response.json() as Promise<any>
}

export function clampCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 8
  return Math.min(50, Math.max(1, Math.trunc(value)))
}

export async function search(
  key: string,
  query: string,
  count: number,
  signal?: AbortSignal,
): Promise<SearchHit[]> {
  const data = await call(key, "/v1/tools/search", { query, count, need_content: false }, signal)
  const results = Array.isArray(data?.results) ? data.results : []
  return results.map((item: any) => ({
    url: item.url,
    title: item.title || item.url,
    snippet: String(item.snippet ?? "").slice(0, 300),
    summary: String(item.summary ?? "").slice(0, 1200),
    date: item.date ?? null,
  }))
}

export async function fetchPage(key: string, url: string, signal?: AbortSignal) {
  const data = await call(key, "/v1/tools/fetch", { url }, signal)
  return {
    title: data?.title || url,
    content: data?.content ?? "",
  }
}
