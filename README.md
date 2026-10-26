# dsh-zh-cn

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

DSH 插件：让 AI **始终使用简体中文回复**，包括：

- 正文回复；
- 工具调用之间的叙述文字；
- 思考过程（thinking）。

唯一例外：用户明确要求使用其他语言时，遵照用户要求。

## 一键安装

打开终端，运行（`<name>` 换成你的 profile 名，如 `desktop` / `web`）：

```bash
dsh plugin --profile <name> add github:Feiyuwan09/dsh-zh-cn
```

官方 `dsh plugin` 命令会转发给 pnpm 完成安装，并**自动**把插件注册进
profile 的 `dsh.profile.bundles`（带 `dsh.bundle` 声明的包在安装后自动成为
profile 补丁层），无需手动改任何文件。

然后**重启 DeepSeek Harness** 即生效。

> 说明：
>
> - 若 profile 尚未初始化（如第一次使用的自定义 profile），命令会自动创建；
> - `desktop` profile 需先至少启动过一次 DeepSeek Harness Desktop 才能使用
>   `dsh plugin` 管理，且运行时请完全退出后再执行；
> - 若提示 pnpm 拦截 git 依赖的构建脚本（prepare script），按输出提示把
>   pnpm 打印的 key 加入 profile 下的 `pnpm-workspace.yaml` 的 `allowBuilds`
>   后重跑。本插件为纯 JavaScript、无构建脚本，正常情况下不会触发。

## 卸载

```bash
dsh plugin --profile <name> remove dsh-zh-cn
```

然后重启 Harness。该命令会同步从依赖与 bundle 列表中移除插件。

## 手动安装（可选）

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

## License

MIT
