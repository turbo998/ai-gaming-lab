# AI Gaming & Procedural Animation Lab (ai-gaming-lab)

**从单段视觉动画到可验证的实时三维与机甲游戏工程** — 面向合作伙伴直观展示 **Gemini 4** 对标 Opus 5.5 动画制作能力，并进一步跨越到「参数化 3D/2D 几何建模 + 物理/多关节驱动动画 + 多幕互动剧情 + Web Audio 程序化声学合成 + 60Hz 确定性验证 Harness」的全栈工程实验室门户。

- **在线演示门户 (GitHub Pages)**: `https://turbo998.github.io/ai-gaming-lab/`
- **旗舰项目一：《湾岸 Midnight · 零点以东》**: [在线畅玩](./demos/wanan-midnight/) | [源码仓库 turbo998/wanan-midnight](https://github.com/turbo998/wanan-midnight)
- **旗舰项目二：《废土斗机祭 · Scrap Swarm》**: [在线畅玩](./demos/scrap-swarm/) | [角色与机体设定集](./demos/scrap-swarm/design/) | [源码仓库 turbo998/scrap-swarm](https://github.com/turbo998/scrap-swarm)

---

## 核心架构模块

1. **实时程序化动画与建模拆解舞台 (`index.html` + `src/stage-engine.ts` + `src/main.ts`)**
   - **Tab 1 — 3D JDM 参数曲面与机械动画拆解 (Wanan Midnight Engine)**：支持切换 `RX-7 FD3S`、`Skyline GT-R BNR34`、`NSX NA1`，实时交互检视跳灯开合机构（Pop-up Headlights Actuation）、60Hz 加减速俯仰与过弯侧倾（Pitch/Dive & Roll）、换挡双出蓝紫回火与刹车盘灼热（Exhaust Backfire & Glowing Rotors）、线框拓扑与轮拱开孔（Wireframe & Wheel-Arch Topology）。
   - **Tab 2 — 2D 多关节机甲骨骼与番剧冲击帧拆解 (Scrap Swarm Engine)**：实时渲染 `R-17「锻火拳」` 对阵冠军机 `「铁冠·赫克托」`，支持检视履带滚轮与爆铆枪液压后坐力抛壳、炉心冲刺残影与黄金觉醒斗气、赫克托三阶段与铁冠锁具破甲裂解、番剧横向切入特写（Anime Cut-in）与黑白冲击帧（Impact Frame）。
   - **Tab 3 — 程序化声波合成与多幕叙事时间轴 (Echo Tape & Radio Comms Visualizer)**：展示零外部音频资产的 Web Audio 合成器频谱、「回声车间」双转轮磁带机动画、卢浦隧道延迟混响与多分支叙事状态机。

2. **系统化技术资产白皮书 (`docs/*.md` → `dist/research/*.html`)**
   - [对标 Opus 5.5 动画能力：Gemini 4 程序化 3D/2D 动画与可验证游戏工程白皮书](./docs/gemini4-animation-and-game-engineering.md)
   - [wanan-midnight 技术资产沉淀：44 车参数曲面、可动跳灯、动态姿态动画与上海篇六章叙事架构](./docs/wanan-midnight-technical-assets.md)
   - [scrap-swarm 技术资产沉淀：多关节机甲骨骼状态机、番剧冲击帧演出与 60Hz 确定性竞技场 Harness](./docs/scrap-swarm-technical-assets.md)
   - [合作伙伴演示手册：3 分钟高管速览与 10 分钟技术深潜脚本](./docs/partner-demo-playbook.md)

---

## 本地构建与验证

```powershell
npm ci
npm run check
```

`npm run check` 依次执行：
1. `npm run typecheck` (`tsc --noEmit`)
2. `npm run test` (`vitest run` 校验动画舞台状态机、车型参数、叙事节点与确定性步进)
3. `npm run build` (`vite build && node scripts/assemble.mjs` 组装门户、研究文档与双旗舰 Demo)
4. `npm run test:e2e` (`playwright test` 验证明暗主题切换、三大动画舞台 Tab 实时交互重绘、研究文档导航与零控制台错误，并输出证据截图至 `docs/evidence/`)
