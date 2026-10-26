// dsh-zh-cn 单元测试：验证 apply(ctx) 的注册与注入逻辑。
import { apply, inject, name } from '../lib/index.mjs'

function makeCtx() {
  const listeners = []
  const contexts = []
  return {
    listeners,
    contexts,
    on(event, fn) {
      listeners.push({ event, fn })
      return () => {}
    },
    systemPrompt: {
      context(entry) {
        contexts.push(entry)
        return () => {}
      },
    },
  }
}

// 模拟一个 waterfall listener 执行
async function runListener(fn, assembly, context) {
  const next = async () => ({ ...assembly, sections: [...assembly.sections], contexts: [...assembly.contexts] })
  return fn({ ...assembly, sections: [...assembly.sections], contexts: [...assembly.contexts] }, context, next)
}

let failed = 0
function check(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) failed++
}

// 1. 基本导出
check('name 导出', name === 'zh-cn')
check('inject 包含 systemPrompt', Array.isArray(inject) && inject.includes('systemPrompt'))

// 2. 注册 system-prompt/assemble 监听 + required context
const ctx = makeCtx()
apply(ctx)
check('注册了 system-prompt/assemble 监听', ctx.listeners.some(l => l.event === 'system-prompt/assemble'))
check('注册了 required context 兜底', ctx.contexts.length === 1 && ctx.contexts[0].required === true)
check('context 名与规则一致', ctx.contexts[0].name === 'zh-cn:language')
check('context 文本含简体中文', ctx.contexts[0].text.includes('简体中文'))
const listener = ctx.listeners.find(l => l.event === 'system-prompt/assemble').fn

// 3. persona 后插入
const persona = { name: 'deployment:persona-prefix', text: 'You are a coding agent powered by the {{model}} model.' }
const base = { sections: [persona, { name: 'plan:policy', text: 'plan stuff' }], contexts: [], tools: [], variables: {} }
const out1 = await runListener(listener, base, {})
check('插入 zh-cn:language 段', out1.sections.some(s => s.name === 'zh-cn:language'))
check('位于 persona 之后、plan 之前', out1.sections[1].name === 'zh-cn:language')
check('原有段不变', out1.sections[0].text === persona.text && out1.sections[2].name === 'plan:policy' && out1.sections[2].text === 'plan stuff')
check('规则文本包含简体中文与思考过程', out1.sections[1].text.includes('简体中文') && out1.sections[1].text.includes('思考过程'))

// 4. 幂等：已含本段时不再插入
const out2 = await runListener(listener, { ...base, sections: [...base.sections, { name: 'zh-cn:language', text: 'x' }] }, {})
check('幂等：不重复注入', out2.sections.filter(s => s.name === 'zh-cn:language').length === 1)

// 5. 无 persona 段时插到开头
const out3 = await runListener(listener, { ...base, sections: [{ name: 'x:y', text: 'z' }] }, {})
check('无 persona 时插到开头', out3.sections[0].name === 'zh-cn:language')

// 6. 原 sections 数组不被突变
await runListener(listener, base, {})
check('原数组不变', base.sections.length === 2 && base.sections[0].name === 'deployment:persona-prefix')

// 7. contexts 不被改动
const baseCtx = { ...base, contexts: [{ name: 'subagent:delegation', text: 'delegated' }] }
const out4 = await runListener(listener, baseCtx, {})
check('contexts 原样保留', out4.contexts.length === 1 && out4.contexts[0].name === 'subagent:delegation')

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
