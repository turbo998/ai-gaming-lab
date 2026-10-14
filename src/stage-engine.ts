export type StageTabId = 'wanan' | 'scrap' | 'echo';
export type WananCarId = 'fd3s' | 'bnr34' | 'na1';
export type EchoPresetId = 'shanghai' | 'ironcrown' | 'harness';

export interface WananStageFlags {
  popupLights: boolean;
  suspensionDynamics: boolean;
  exhaustAndRotors: boolean;
  wireframeTopology: boolean;
}

export interface ScrapStageFlags {
  hydraulicRecoil: boolean;
  coreDashOverdrive: boolean;
  hectorLockShatter: boolean;
  animeCutInImpact: boolean;
}

export interface EchoStageFlags {
  webAudioSynth: boolean;
  tunnelReverb: boolean;
  storyNodeIndex: number;
}

export interface StageState {
  activeTab: StageTabId;
  selectedCar: WananCarId;
  wanan: WananStageFlags;
  scrap: ScrapStageFlags;
  echoPreset: EchoPresetId;
  echo: EchoStageFlags;
  tickCount: number;
  simTimeSec: number;
  lastRenderSignature: string;
}

export interface CarSpec {
  id: WananCarId;
  name: string;
  subtitle: string;
  dimensions: string;
  layout: string;
  hasPopups: boolean;
  lengthScale: number;
  widthScale: number;
  cabinHeight: number;
  noseSlope: number;
  wingHeight: number;
}

export const STAGE_CARS: Record<WananCarId, CarSpec> = {
  fd3s: {
    id: 'fd3s',
    name: 'RX-7 FD3S',
    subtitle: '13B-REW 双转子涡轮 · 回声车间唐澄座驾',
    dimensions: '4285 × 1760 × 1230 mm · 轴距 2425 mm',
    layout: 'FR · 双转子顺序双涡轮 · 可动跳灯',
    hasPopups: true,
    lengthScale: 1.0,
    widthScale: 0.98,
    cabinHeight: 0.44,
    noseSlope: 0.22,
    wingHeight: 0.18,
  },
  bnr34: {
    id: 'bnr34',
    name: 'Skyline GT-R BNR34',
    subtitle: 'RB26DETT 直列六缸双涡轮 · 沈砚精密标定座驾',
    dimensions: '4600 × 1780 × 1360 mm · 轴距 2665 mm',
    layout: 'F-AWD ATTESA E-TS · 固定狭长前灯 · 高耸尾翼',
    hasPopups: false,
    lengthScale: 1.08,
    widthScale: 1.02,
    cabinHeight: 0.52,
    noseSlope: 0.30,
    wingHeight: 0.28,
  },
  na1: {
    id: 'na1',
    name: 'NSX NA1',
    subtitle: 'C30A VTEC V6 全铝单体壳 · 许知衡耐力赛座驾',
    dimensions: '4430 × 1810 × 1170 mm · 轴距 2530 mm',
    layout: 'MR · 中置横置 V6 · 隐藏式跳灯 + 贯穿式一体尾翼',
    hasPopups: true,
    lengthScale: 1.05,
    widthScale: 1.04,
    cabinHeight: 0.39,
    noseSlope: 0.19,
    wingHeight: 0.14,
  },
};

export const STORY_NODES: Record<EchoPresetId, { code: string; title: string; detail: string }[]> = {
  shanghai: [
    { code: 'CH-01 // 末班灯', title: '回声车间第一只封箱', detail: '陈屿提议在搬迁前录下六段高架夜行声档；前 3 名完赛解锁车间首卷母带。' },
    { code: 'CH-02 // 桥缝之间', title: '沈砚的测量学与最快单圈', detail: '卢浦引桥伸缩缝高频震动合成；擦碰 ≤ 3 次验证悬挂阻尼与路线余量。' },
    { code: 'CH-03 // 不拍终点', title: '唐澄拒绝把车间拍成怀旧背景', detail: 'FD3S 跳灯切破江雾，领先唐澄完赛触发暗房显影对话。' },
    { code: 'CH-04 // 回声不回答', title: '林岚坦承纪录留不住旧厂房', detail: '跨江隧道双延迟混响（Tunnel Delay）全开，前 2 名完赛。' },
    { code: 'CH-05 // 把路留出来', title: '许知衡直面耐力赛退役心结', detail: '外港 S 弯连续重心转移（Pitch/Roll），擦碰 ≤ 2 次。' },
    { code: 'CH-06 // 零点以东', title: '东岸灯塔终章 · 领跑者/同行者/抵达者', detail: '新车间在零点以东亮灯，永久最佳评价不因重玩覆盖。' },
  ],
  ironcrown: [
    { code: 'ACT I // 绿溪出战', title: 'R-17「锻火拳」驶入铁冠竞技场', detail: '莫琳远程校准 17 号回收炉心，爆铆拳炮与磁盾线圈上线。' },
    { code: 'ACT II // 焊死封盖', title: '场地中间维修棚护卫事件触发', detail: '击碎赤砂牙轮与铁壁角斗机残骸，莫琳发现敌机检修盖被铁冠焊死，实为被奴役的筑路机。' },
    { code: 'ACT III // 铁冠锁碎', title: '赫克托破甲反转：从死斗到解救', detail: '击碎「铁冠·赫克托」胸口限位锁具，释放灾变期救援主脑，全频道广播自由校准信号。' },
  ],
  harness: [
    { code: 'GATE-01 // 60HZ FIXED STEP', title: '30/60/120Hz 跨刷新率确定性收敛', detail: '物理模拟与渲染帧解耦，相同输入种子在任意显示器刷新率下产出恒定轨迹。' },
    { code: 'GATE-02 // ZERO RACE ALLOC', title: '比赛期 0 动态模型构建守卫', detail: '赛道预热期（Asset Warmup）一次性实例化全部车体与天际线批次，竞速帧 0 新增 Mesh。' },
    { code: 'GATE-03 // BOT & E2E VERIFY', title: '自动巡航策略与 88 视角回归验证', detail: '内建智能 Bot 在 180 秒内自动完成 6 章竞速与 3 阶段 Boss 破甲，Playwright 零错误通过。' },
  ],
};

export function createInitialStageState(): StageState {
  return {
    activeTab: 'wanan',
    selectedCar: 'fd3s',
    wanan: {
      popupLights: true,
      suspensionDynamics: true,
      exhaustAndRotors: true,
      wireframeTopology: false,
    },
    scrap: {
      hydraulicRecoil: true,
      coreDashOverdrive: true,
      hectorLockShatter: true,
      animeCutInImpact: false,
    },
    echoPreset: 'shanghai',
    echo: {
      webAudioSynth: false,
      tunnelReverb: true,
      storyNodeIndex: 0,
    },
    tickCount: 0,
    simTimeSec: 0,
    lastRenderSignature: 'init',
  };
}

export function stepStageState(state: StageState, dtSec = 1 / 60): StageState {
  state.tickCount += 1;
  state.simTimeSec = Number((state.simTimeSec + dtSec).toFixed(4));
  state.lastRenderSignature = [
    state.activeTab,
    state.selectedCar,
    Number(state.wanan.popupLights),
    Number(state.wanan.suspensionDynamics),
    Number(state.wanan.exhaustAndRotors),
    Number(state.wanan.wireframeTopology),
    Number(state.scrap.hydraulicRecoil),
    Number(state.scrap.coreDashOverdrive),
    Number(state.scrap.hectorLockShatter),
    Number(state.scrap.animeCutInImpact),
    state.echoPreset,
    state.echo.storyNodeIndex,
    state.tickCount,
  ].join(':');
  return state;
}

export function computeHudSummary(state: StageState): { leftTitle: string; leftSummary: string; rightTelemetry: string } {
  if (state.activeTab === 'wanan') {
    const car = STAGE_CARS[state.selectedCar];
    const activeFeatures: string[] = [];
    if (state.wanan.popupLights) activeFeatures.push(car.hasPopups ? '跳灯开合 38°' : '固定狭长前灯组');
    if (state.wanan.suspensionDynamics) activeFeatures.push('60Hz 俯仰/侧倾悬挂');
    if (state.wanan.exhaustAndRotors) activeFeatures.push('双出蓝紫回火 + 680°C 刹车盘');
    if (state.wanan.wireframeTopology) activeFeatures.push('轮拱开孔线框拓扑');
    return {
      leftTitle: `ENGINE: WANAN-3D-PARAMETRIC // ${car.name}`,
      leftSummary: `${car.subtitle} · 激活模块：${activeFeatures.join(' / ') || '基础曲面检视'}`,
      rightTelemetry: `Catalog: 44 JDM IDs | Car: ${car.id.toUpperCase()} | Tick: ${state.tickCount} | Race Alloc: 0`,
    };
  }
  if (state.activeTab === 'scrap') {
    const activeFeatures: string[] = [];
    if (state.scrap.hydraulicRecoil) activeFeatures.push('爆铆枪液压后坐力+抛壳');
    if (state.scrap.coreDashOverdrive) activeFeatures.push('炉心冲刺残影+黄金斗气');
    if (state.scrap.hectorLockShatter) activeFeatures.push('赫克托铁冠锁具破甲');
    if (state.scrap.animeCutInImpact) activeFeatures.push('番剧横向切入+黑白冲击帧');
    return {
      leftTitle: 'ENGINE: SCRAP-SWARM-2D-SKELETAL // R-17 VS HECTOR',
      leftSummary: `多关节程序化机甲骨骼 · 激活演出：${activeFeatures.join(' / ') || '基础待机姿态'}`,
      rightTelemetry: `Units: 5 Mechas | Seed: 20261015 | 60Hz Step: ${state.tickCount} | Bot Clear: PASS`,
    };
  }
  const nodes = STORY_NODES[state.echoPreset];
  const node = nodes[state.echo.storyNodeIndex % nodes.length];
  return {
    leftTitle: `ENGINE: ECHO-SYNTH & STORY-FSM // ${node.code}`,
    leftSummary: `${node.title} — ${node.detail}`,
    rightTelemetry: `WebAudio: ${state.echo.webAudioSynth ? 'ACTIVE' : 'STANDBY'} | Reverb: ${state.echo.tunnelReverb ? 'TUNNEL-ON' : 'DRY'} | Node: ${(state.echo.storyNodeIndex % nodes.length) + 1}/${nodes.length}`,
  };
}
