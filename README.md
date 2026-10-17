# opencode-deepseek-websearch

DeepSeek's [Search and Fetch APIs](https://api-docs.deepseek.com/zh-cn/guides/search) for OpenCode: a native `websearch` provider plus a `deepseek.fetch` tool.

Unofficial. Not affiliated with DeepSeek or OpenCode.

## What it does

- **Search** — registers a `websearch` provider with id `deepseek`, backed by `POST /v1/tools/search`. Models use OpenCode's built-in `websearch` tool as usual.
- **Fetch** — registers a tool `deepseek.fetch` (effective name `deepseek_fetch`), backed by `POST /v1/tools/fetch`. Returns the page title and Markdown body.

Search results are capped to keep context small: 8 results by default, `snippet` at 300 chars, `summary` at 1200 chars.

## Requirements

- OpenCode v2 (plugin API `@opencode/plugin` >= 2.0.32)
- A DeepSeek API key with access to the tools endpoints

## Install

Clone and point OpenCode at the directory:

```bash
git clone https://github.com/JOEYZYC/opencode-deepseek-websearch.git
```

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

Or provide the key through the environment and omit `apiKeyFile`:

```bash
DEEPSEEK_API_KEY=sk-...
```

`apiKeyFile` is not expanded, so pass an absolute path. The key is read once at plugin setup.

## Usage

Ask for current information; the model calls `websearch` and gets DeepSeek results with URLs. To read a specific page:

```
deepseek.fetch({ "url": "https://api-docs.deepseek.com/zh-cn/guides/search" })
```

In Code Mode the tool is reachable as `tools.deepseek.fetch`.

### Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `apiKeyFile` | string | — | Absolute path to a file containing the API key |
| `count` | number | `8` | Search results per query, clamped to 1-50 |

## Restrict to one agent

The plugin registers its tools globally. To allow search only for a research agent, deny it globally and allow it per agent:

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

## Cost and limits

Pricing from the DeepSeek docs (October 2026):

- Search and Fetch: **5 CNY per 1,000 successful requests** each. Failed calls, empty results, and timeouts are not billed.
- QPS: **5** per account for each endpoint, counted independently. Fetch also rate-limits per target domain.
- `count` does not change the per-request price.

These endpoints are separate from models: any model can use them, and `deepseek-flash` works fine. Only DeepSeek's server-side `web_search` tool in the Responses API is limited to `deepseek-v4-pro`.

## Notes

- Unofficial and experimental. DeepSeek may change `/v1/tools/*`, and OpenCode's plugin API may change between major versions.
- No retries are implemented; HTTP 408, 429, and 5xx are surfaced as errors so the caller can decide.
- Fetch only handles pages whose content can be extracted as Markdown. PDFs and Office files are not supported.

## License

MIT
