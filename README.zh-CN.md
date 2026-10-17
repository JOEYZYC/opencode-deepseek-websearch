# opencode-deepseek-websearch

[English](README.md) | **简体中文**

把 [DeepSeek 的 Search 和 Fetch API](https://api-docs.deepseek.com/zh-cn/guides/search) 接进 OpenCode：注册一个原生的 `websearch` provider，再加一个 `deepseek.fetch` 工具。

![license](https://img.shields.io/badge/license-MIT-blue)
![OpenCode](https://img.shields.io/badge/OpenCode-v2-000000)
![plugin API](https://img.shields.io/badge/%40opencode%2Fplugin-%3E%3D2.0.32-6e56cf)

> 非官方项目，与 DeepSeek、OpenCode 均无隶属关系。

## 为什么用它

- **任何模型都能用上 DeepSeek 的搜索结果。** 结果通过 OpenCode 内置的 `websearch` 工具返回，不必使用 DeepSeek 的模型。
- **能读全文，不只读摘要。** `deepseek.fetch` 返回页面标题和 Markdown 正文。
- **默认就很小。** 每次查询 8 条结果，`snippet` 截到 300 字，`summary` 截到 1200 字。搜索不该吃掉半个上下文窗口。
- **没有 SDK，没有构建步骤。** 纯 TypeScript 源码，OpenCode 直接加载。

## 环境要求

- OpenCode v2（插件 API `@opencode/plugin` >= 2.0.32）
- 一个有 `/v1/tools/*` 权限的 DeepSeek API Key

## 安装

先克隆到一个固定的目录：

```bash
git clone https://github.com/JOEYZYC/opencode-deepseek-websearch.git
```

然后在配置里指向该目录，并把 DeepSeek 设为默认搜索源：

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

`apiKeyFile` 会按原样读取，所以必须写绝对路径。密钥只在启动时读一次。

也可以不写文件，直接用环境变量：

```bash
DEEPSEEK_API_KEY=sk-...
```

两者都设置时环境变量优先。都拿不到时，插件会在启动阶段直接报错，不会静默失败。

<details>
<summary>另一种方式：放进插件目录</summary>

OpenCode 也会自动加载 `~/.config/opencode/plugins/` 下的插件。把 `index.ts` 和 `deepseek.ts` 复制到 `plugins/deepseek-web/`，不用改配置就能生效。

有一个限制：自动加载的插件拿不到 `plugins[].options`，所以这种方式用不了 `apiKeyFile` 和 `count`，只能设 `DEEPSEEK_API_KEY`，结果数固定为默认值。

</details>

## 使用

直接问需要时效性的问题，模型会调用 `websearch` 并拿到带链接的 DeepSeek 结果：

```
这个月 DeepSeek API 有什么变化？
```

要读某个具体页面：

```
deepseek.fetch({ "url": "https://api-docs.deepseek.com/zh-cn/guides/search" })
```

返回内容是 `# <标题>` 加上页面正文的 Markdown。在 Code Mode 里，工具路径是 `tools.deepseek.fetch`。

### 配置项

| 配置 | 类型 | 默认值 | 含义 |
|---|---|---|---|
| `apiKeyFile` | string | — | 存放 API Key 的文件绝对路径 |
| `count` | number | `8` | 每次查询的结果数，限定在 1-50 |

## 只给某个 agent 用

插件注册的工具是全局的。如果只想让研究类 agent 搜索，可以先全局禁止，再对单个 agent 放行：

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

写在后面的 agent 规则会覆盖全局的禁止规则。

## 实现方式

| 组件 | 接口 | 说明 |
|---|---|---|
| `websearch` provider `deepseek` | `POST /v1/tools/search` | 发送 `{ query, count, need_content: false }`，把 `results[]` 映射为 URL / 标题 / 摘要 / 概述 / 日期 |
| `deepseek.fetch` | `POST /v1/tools/fetch` | 发送 `{ url }`，返回标题和抽取出的 Markdown |

非 2xx 响应会带上状态码和响应体前 300 字抛出为错误，不做重试。

## 费用与限制

以下价格来自 DeepSeek 文档（2026 年 10 月）：

- Search 和 Fetch 各按 **每 1,000 次成功请求 5 元** 计费。失败调用、空结果和超时不计费。
- QPS：每个账号每个接口 **5 次/秒**，两个接口独立计算。Fetch 还会按目标域名限流。
- `count` 不影响单次请求的价格。

这两个接口和模型是分开的：任何模型都能调用，`deepseek-flash` 也没问题。只有 Responses API 里服务端的 `web_search` 工具才限定 `deepseek-v4-pro`。

## 常见问题

**启动时报 `set DEEPSEEK_API_KEY or plugins[].options.apiKeyFile`** —— 没找到密钥。确认环境变量对 OpenCode 进程可见，或者 `apiKeyFile` 是绝对路径且可读。密钥只在启动时读一次，改完要重启。

**HTTP 401 / 403** —— 该 Key 没有 tools 接口的权限。

**HTTP 429** —— 触发了 5 QPS 限制。插件不重试，等一会儿或把查询分批。

**Fetch 返回内容很少或为空** —— 页面没有可抽取的正文。PDF 和 Office 文件不支持。

## 说明

- 非官方、实验性。DeepSeek 可能调整 `/v1/tools/*`，OpenCode 的插件 API 也可能在跨大版本时变化。
- 无遥测、无代理、无缓存：请求从你的机器直接发到 `api.deepseek.com`。
- Fetch 会返回整页内容，而搜索结果经过截断。遇到长文档时，返回就会很长。

## 开发

没有构建步骤——OpenCode 直接加载 TypeScript 源码。改完 `index.ts` 或 `deepseek.ts`，重启 OpenCode 即生效。开发时把 `plugins[].package` 指向本地检出目录即可。

目前还没有配置测试和类型检查。

## 许可证

MIT
