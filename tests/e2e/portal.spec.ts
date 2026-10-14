import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.describe('AI Gaming & Procedural Animation Lab Portal E2E', () => {
  test('renders Clawpilot theme, switches light/dark, interacts with all 3 stage tabs, and verifies research docs', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await mkdir('docs/evidence', { recursive: true });

    await page.goto('/?scoutTheme=dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('h1')).toContainText('从单段视觉动画到可验证的实时三维与机甲游戏工程');

    // Verify Tab 1: Wanan 3D Engine & Car Switching + Mechanical Toggles
    const initialStage = await page.evaluate(() => window.__labStage?.getState());
    expect(initialStage?.activeTab).toBe('wanan');
    expect(initialStage?.selectedCar).toBe('fd3s');
    await expect(page.locator('#stage-controls-wanan')).toBeVisible();
    await expect(page.locator('#stage-controls-scrap')).toBeHidden();
    await expect(page.locator('#stage-controls-echo')).toBeHidden();

    await page.click('[data-car-id="bnr34"]');
    await page.click('[data-wanan-toggle="wireframeTopology"]');
    const afterWananToggle = await page.evaluate(() => window.__labStage?.stepFrames(5));
    expect(afterWananToggle?.selectedCar).toBe('bnr34');
    expect(afterWananToggle?.wanan.wireframeTopology).toBe(true);
    await expect(page.locator('#stage-hud-left')).toContainText('Skyline GT-R BNR34');

    await page.screenshot({ path: 'docs/evidence/portal-stage-wanan-dark.png', fullPage: false });

    // Switch to Tab 2: Scrap Swarm 2D Mecha Engine & Anime Impact Frame
    await page.click('#tab-scrap');
    await page.click('[data-scrap-toggle="animeCutInImpact"]');
    const afterScrapToggle = await page.evaluate(() => window.__labStage?.stepFrames(8));
    expect(afterScrapToggle?.activeTab).toBe('scrap');
    expect(afterScrapToggle?.scrap.animeCutInImpact).toBe(true);
    await expect(page.locator('#stage-hud-left')).toContainText('R-17 VS HECTOR');
    await expect(page.locator('#stage-controls-wanan')).toBeHidden();
    await expect(page.locator('#stage-controls-scrap')).toBeVisible();
    await expect(page.locator('#stage-controls-echo')).toBeHidden();

    await page.screenshot({ path: 'docs/evidence/portal-stage-scrap-dark.png', fullPage: false });

    // Switch to Tab 3: Echo Tape & Radio Comms Visualizer
    await page.click('#tab-echo');
    await page.click('[data-echo-preset="ironcrown"]');
    await page.click('#echo-advance-btn');
    const afterEchoToggle = await page.evaluate(() => window.__labStage?.stepFrames(5));
    expect(afterEchoToggle?.activeTab).toBe('echo');
    expect(afterEchoToggle?.echoPreset).toBe('ironcrown');
    expect(afterEchoToggle?.echo.storyNodeIndex).toBe(1);
    await expect(page.locator('#stage-hud-left')).toContainText('ACT II // 焊死封盖');
    await expect(page.locator('#stage-controls-wanan')).toBeHidden();
    await expect(page.locator('#stage-controls-scrap')).toBeHidden();
    await expect(page.locator('#stage-controls-echo')).toBeVisible();

    // Toggle theme to light mode
    await page.click('#theme-toggle-btn');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.screenshot({ path: 'docs/evidence/portal-overview-light.png', fullPage: true });

    // Navigate to research whitepaper and verify Clawpilot rendering
    await page.click('a[href="./research/gemini4-animation-and-game-engineering.html"]');
    await expect(page.locator('h1')).toContainText('对标 Opus 5.5 动画能力');
    await page.click('a[href="../"]');
    await expect(page.locator('h1')).toContainText('从单段视觉动画到可验证的实时三维与机甲游戏工程');

    expect(consoleErrors).toEqual([]);
  });
});
