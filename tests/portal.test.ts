import { describe, expect, it } from 'vitest';
import {
  createInitialStageState,
  stepStageState,
  computeHudSummary,
  STAGE_CARS,
  STORY_NODES,
} from '../src/stage-engine';

describe('AI Gaming Lab Interactive Stage Engine', () => {
  it('initializes with Wanan 3D tab and FD3S pop-up headlight car', () => {
    const state = createInitialStageState();
    expect(state.activeTab).toBe('wanan');
    expect(state.selectedCar).toBe('fd3s');
    expect(state.wanan.popupLights).toBe(true);
    expect(state.wanan.suspensionDynamics).toBe(true);
    expect(state.wanan.exhaustAndRotors).toBe(true);
    expect(state.wanan.wireframeTopology).toBe(false);
  });

  it('provides accurate JDM vehicle specifications for FD3S, BNR34, and NA1', () => {
    expect(STAGE_CARS.fd3s.hasPopups).toBe(true);
    expect(STAGE_CARS.bnr34.hasPopups).toBe(false);
    expect(STAGE_CARS.bnr34.dimensions).toContain('4600 × 1780 × 1360 mm');
    expect(STAGE_CARS.na1.hasPopups).toBe(true);
  });

  it('deterministically advances simulation ticks and updates render signatures across tabs', () => {
    const state = createInitialStageState();
    const sig0 = state.lastRenderSignature;
    stepStageState(state, 1 / 60);
    expect(state.tickCount).toBe(1);
    expect(state.lastRenderSignature).not.toBe(sig0);

    const wananHud = computeHudSummary(state);
    expect(wananHud.leftTitle).toContain('RX-7 FD3S');
    expect(wananHud.leftSummary).toContain('跳灯开合');

    state.activeTab = 'scrap';
    state.scrap.animeCutInImpact = true;
    stepStageState(state, 1 / 60);
    const scrapHud = computeHudSummary(state);
    expect(scrapHud.leftTitle).toContain('R-17 VS HECTOR');
    expect(scrapHud.leftSummary).toContain('番剧横向切入+黑白冲击帧');

    state.activeTab = 'echo';
    state.echoPreset = 'ironcrown';
    state.echo.storyNodeIndex = 2;
    stepStageState(state, 1 / 60);
    const echoHud = computeHudSummary(state);
    expect(echoHud.leftTitle).toContain('ACT III // 铁冠锁碎');
    expect(STORY_NODES.shanghai).toHaveLength(6);
    expect(STORY_NODES.ironcrown).toHaveLength(3);
  });
});
