# opencode-deepseek-websearch

**English** | [简体中文](README.zh-CN.md)

[DeepSeek's Search and Fetch APIs](https://api-docs.deepseek.com/zh-cn/guides/search) for OpenCode, wired in as a native `websearch` provider and a `deepseek.fetch` tool.

![license](https://img.shields.io/badge/license-MIT-blue)
![OpenCode](https://img.shields.io/badge/OpenCode-v2-000000)
![plugin API](https://img.shields.io/badge/%40opencode%2Fplugin-%3E%3D2.0.32-6e56cf)

> Unofficial. Not affiliated with DeepSeek or OpenCode.

## Why

- **Search that any model can use.** Results come back through OpenCode's built-in `websearch` tool, so you don't need a DeepSeek model to get DeepSeek results.
- **Read the source, not just the snippet.** `deepseek.fetch` returns the full page as Markdown with its title.
- **Small by default.** 8 results per query, snippets capped at 300 characters, summaries at 1200. Searching shouldn't cost you half a context window.
- **No SDK, no build step.** Plain TypeScript that OpenCode loads directly.

## Requirements

- OpenCode v2 (plugin API `@opencode/plugin` >= 2.0.32)
- A DeepSeek API key with access to the `/v1/tools/*` endpoints

## Install

Clone the repo somewhere stable:

```bash
git clone https://github.com/JOEYZYC/opencode-deepseek-websearch.git
```

Point OpenCode at the directory and make DeepSeek the default search provider:

```jsonc
// opencode.jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-deepseek-websearch",
      "options": { "apiKeyFile": "/absolute/path/to/deepseek.key" }
    }
  ],
  "websearch": { "provider": "deepseek" }
}
```

`apiKeyFile` is read verbatim, so use an absolute path. The key is loaded once at startup.

Or skip the file and use the environment:

```bash
DEEPSEEK_API_KEY=sk-...
```

The environment variable wins if both are set. Setup fails loudly with a clear message when neither is available.

<details>
<summary>Alternative: drop-in plugin directory</summary>

OpenCode also auto-loads plugins from `~/.config/opencode/plugins/`. Copy `index.ts` and `deepseek.ts` into `plugins/deepseek-web/` to get the same provider without a config entry.

One catch: auto-loaded plugins don't receive `plugins[].options`, so `apiKeyFile` and `count` are unavailable there — set `DEEPSEEK_API_KEY` instead and accept the default count.

</details>

## Usage

Ask for current information. The model calls `websearch` and gets DeepSeek results with URLs:

```
What changed in the DeepSeek API this month?
```

To read a specific page:

```
deepseek.fetch({ "url": "https://api-docs.deepseek.com/zh-cn/guides/search" })
```

The tool returns `# <title>` followed by the page body as Markdown. In Code Mode it is reachable as `tools.deepseek.fetch`.

### Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `apiKeyFile` | string | — | Absolute path to a file containing the API key |
| `count` | number | `8` | Search results per query, clamped to 1-50 |

## Restrict it to one agent

The plugin registers its tools globally. To let only a research agent search, deny globally and allow per agent:

```jsonc
{
  "permissions": [
    { "action": "websearch", "resource": "*", "effect": "deny" },
    { "action": "deepseek_*", "resource": "*", "effect": "deny" }
  ],
  "agents": {
    "res-web": {
      "permissions": [
        { "action": "websearch", "resource": "*", "effect": "allow" },
        { "action": "deepseek_*", "resource": "*", "effect": "allow" }
      ]
    }
  }
}
```

The later agent rule overrides the global deny.

## How it works

| Piece | Endpoint | Notes |
|---|---|---|
| `websearch` provider `deepseek` | `POST /v1/tools/search` | Sends `{ query, count, need_content: false }`, maps `results[]` to URL / title / snippet / summary / date |
| `deepseek.fetch` | `POST /v1/tools/fetch` | Sends `{ url }`, returns title plus extracted Markdown |

Non-2xx responses are surfaced as errors with the status and the first 300 characters of the body. There are no retries.

## Cost and limits

Pricing from the DeepSeek docs (October 2026):

- Search and Fetch: **5 CNY per 1,000 successful requests** each. Failed calls, empty results, and timeouts are not billed.
- QPS: **5** per account for each endpoint, counted independently. Fetch also rate-limits per target domain.
- `count` does not change the per-request price.

These endpoints are separate from models: any model can use them, and `deepseek-flash` works fine. Only DeepSeek's server-side `web_search` tool in the Responses API is limited to `deepseek-v4-pro`.

## Troubleshooting

**`set DEEPSEEK_API_KEY or plugins[].options.apiKeyFile` on startup** — no key was found. Check that the env var is visible to the OpenCode process, or that `apiKeyFile` is absolute and readable. The key is read once, so restart after changing it.

**HTTP 401 / 403** — the key lacks access to the tools endpoints.

**HTTP 429** — you hit the 5 QPS limit. Calls are not retried; wait or batch your queries.

**Fetch returns little or nothing** — the page has no extractable body. PDFs and Office files are not supported.

## Notes

- Unofficial and experimental. DeepSeek may change `/v1/tools/*`, and OpenCode's plugin API may change between major versions.
- No telemetry, no proxy, no caching: requests go straight from your machine to `api.deepseek.com`.
- Fetch swallows the whole page, unlike search results which are trimmed. Long documents will be long.

## Development

There is no build step — OpenCode loads the TypeScript sources directly. Edit `index.ts` or `deepseek.ts`, restart OpenCode, and the new code is live. Point `plugins[].package` at this checkout while developing.

Tests and type checking are not set up yet.

## License

MIT
