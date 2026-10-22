/**
 * The one Playwright project every config runs (the suite, the bug-hunt checker,
 * the boot timings, the screenshots since item 072): Desktop Chrome (1280×720), and the GPU drawing (full Chromium, ANGLE on
 * D3D11) unless WW_GPU=0, which goes back to headless software GL. `use` is laid
 * over the device before the GPU's channel and the launch options. The launch flags
 * are always autoplay without a gesture, then the GPU's own (unless WW_GPU=0), then `args`.
 */

import { devices, type PlaywrightTestConfig } from '@playwright/test';

type Use = NonNullable<PlaywrightTestConfig['use']>;

export function gpuProjects(extra: { args?: string[]; use?: Use } = {}): NonNullable<PlaywrightTestConfig['projects']> {
  const gpu = process.env.WW_GPU !== '0';
  return [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...extra.use,
        ...(gpu ? { channel: 'chromium' } : {}),
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required', ...(gpu ? ['--use-angle=d3d11', '--enable-gpu'] : []), ...(extra.args ?? [])] },
      },
    },
  ];
}
