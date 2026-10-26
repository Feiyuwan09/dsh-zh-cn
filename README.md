# dsh-zh-cn

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

DSH 插件：让 AI **始终使用简体中文回复**，包括：

- 正文回复；
- 工具调用之间的叙述文字；
- 思考过程（thinking）。

唯一例外：用户明确要求使用其他语言时，遵照用户要求。

## 安装（本地插件）

1. 将本目录（`dsh-zh-cn`）放到 `~/.dsh/plugins/` 下；
2. 编辑 `~/.dsh/profiles/<profile>/package.json`：

   - 在 `dependencies` 中加入：

     ```json
     "dsh-zh-cn": "file:../../plugins/dsh-zh-cn"
     ```

   - 在 `dsh.profile.bundles` 中加入：

     ```json
     "dsh-zh-cn"
     ```

3. 重启 DeepSeek Harness（重启时插件管理器会用 pnpm 完成安装与 patch 注册）。

## 配置

插件安装后即全局生效，作用于该 profile 下的所有会话（包括子 Agent）。

## 工作原理

双保险注入：

1. **主路径 — 提示词段落**：在根作用域监听公开的 `system-prompt/assemble`
   瀑布事件（与官方 `dsh-unrestricted` 相同的注入路径），每次组装完成后在
   persona 段之后插入 `zh-cn:language` 语言规则段（含完整规则：正文、叙述
   文字、思考过程一律简体中文；代码/路径/命令/日志保持原文）；
2. **兜底 — required runtime context**：注册全局 `required` context。
   `minimal` 预设（子代理常用）使用 `complete` persona，宿主在瀑布结束后
   会把 persona 恢复为唯一 section、丢弃瀑布注入的段落；而 required
   context 不受 complete 恢复影响，且 runtime-context 被抑制时仍保留，
   从而覆盖 minimal 子代理等所有场景。

其他特性：

- 幂等注入：同一组装只插入一次；
- 零运行时依赖：只使用注入的 `systemPrompt` 服务；
- 不动 tools / contexts / variables，也不改动任何既有段落内容；
- 兼容 standard / ptc / cordis / minimal 预设。

## 开发

```bash
npm run check   # 语法检查
npm test        # 单元测试
```

## 卸载

删除 profile `package.json` 中的 `dsh-zh-cn` 依赖与 bundle 条目，重启 Harness。

## License

MIT
