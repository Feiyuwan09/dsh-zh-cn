/**
 * dsh-zh-cn · 始终使用简体中文回复（Host）
 *
 * 机制（仅使用公开接口）：
 *   1) 根作用域监听 `system-prompt/assemble` 瀑布事件（dsh-scope 过滤器放行
 *      非作用域监听器，因此能收到每个 Agent —— 包括子 Agent —— 的组装）。
 *      每次组装完成后，在 persona（deployment:persona-prefix）之后插入一个
 *      `zh-cn:language` 规则段，强制模型始终以简体中文输出：
 *        - 正文回复；
 *        - 工具调用之间的叙述文字；
 *        - 思考过程（thinking）。
 *      唯一例外：用户明确要求使用其他语言时，遵照用户要求。
 *   2) 同时注册一个全局 `required` runtime context 作为兜底：minimal 预设
 *      使用 `complete` persona，宿主在瀑布结束后会把它恢复为唯一 section，
 *      瀑布注入的段落会被丢弃；而 required context 不受 complete 恢复影响，
 *      且 `refreshContext` 在 runtime-context 被抑制时仍保留 required 项，
 *      从而覆盖 minimal（子代理）等所有场景。
 *
 * 特性：
 *   - 零运行时依赖：只使用注入的 systemPrompt 服务，不 import 任何
 *     @deepseek-ai/* 包，规避 profile node_modules 的解析差异；
 *   - 幂等：同一 assembly 已含本段时不重复注入；
 *   - 不动 tools / contexts / variables，也不改动任何既有段落内容；
 *   - 规则文本不含 {{...}}，不会触发提示词变量插值错误。
 *
 * 修改后重启 Harness 生效。
 */

/** Cordis 插件名（Loader 诊断使用）。 */
export const name = 'zh-cn'

/** 本插件需要的服务（所有 base profile 均提供 systemPrompt）。 */
export const inject = ['systemPrompt']

/** 注入的段落名 / context 名，用于幂等检测。 */
const SECTION_NAME = 'zh-cn:language'
const CONTEXT_NAME = 'zh-cn:language'

/** 语言规则正文（简体中文，模型可读的硬约束）。 */
const RULE_TEXT = `## 语言规则（始终生效）

- 你必须始终使用简体中文回复，包括正文、工具调用之间的叙述文字，以及思考过程（thinking）。
- 即使提问者使用其他语言，也一律使用简体中文回复；唯一例外是用户明确要求使用其他语言时，遵照用户要求。
- 代码块内的代码、路径、命令、日志输出、报错信息、API 名称、包名、URL 等保持原文不翻译；代码注释和代码周围的解释文字使用简体中文。
- 技术术语可保留英文原文，但句子组织必须使用简体中文。
- 引用工具结果、解释命令输出、描述操作步骤时，叙述一律使用简体中文。`

/** 兜底 context 的精简强约束（complete persona 场景：minimal 子代理等）。 */
const CONTEXT_TEXT = `语言约束（始终生效）：始终使用简体中文回复，包括正文、工具调用之间的叙述文字和思考过程；唯一例外是用户明确要求其他语言。代码、路径、命令、日志、报错、术语等保持原文。`

/**
 * 在组装结果的 persona 段之后插入语言规则段。
 * @param sections - 瀑布产出的段列表。
 * @returns 插入后的新段列表（原数组不变）。
 */
function insertRule(sections) {
  const rule = { name: SECTION_NAME, text: RULE_TEXT }
  const personaIndex = sections.findIndex(section => section.name === 'deployment:persona-prefix')
  const fused = [...sections]
  fused.splice(personaIndex < 0 ? 0 : personaIndex + 1, 0, rule)
  return fused
}

/**
 * @param ctx - 插件上下文，携带 systemPrompt 服务。
 */
export function apply(ctx) {
  // 兜底：全局 required context（覆盖 complete persona 恢复与 runtime-context 抑制场景）。
  ctx.systemPrompt.context({
    name: CONTEXT_NAME,
    order: 50, // 位于 working-directory(100) 之前，runtime context 快照的最前面
    text: CONTEXT_TEXT,
    interpolate: false,
    required: true,
  })

  ctx.on('system-prompt/assemble', async (assembly, context, next) => {
    const original = await next()
    const sections = original?.sections
    if (!Array.isArray(sections)) return original
    // 幂等：该 assembly 已含本段时不再重复。
    if (sections.some(section => section.name === SECTION_NAME)) return original
    return { ...original, sections: insertRule(sections) }
  })
}
