/**
 * The one Playwright project every config runs (the suite, the bug-hunt checker,
 * the boot timings, the screenshots since item 072): Desktop Chrome, and the GPU drawing (full Chromium, ANGLE on
 * D3D11) unless WW_GPU=0, which goes back to headless software GL. `use` is laid
 * over the device before the GPU's channel and launch options; `args` follow the
 * GPU's own launch flags.
 */

import { devices, type PlaywrightTestConfig } from '@playwright/test';

type Use = NonNullable<PlaywrightTestConfig['use']>;

export function gpuProjects(extra: { args?: string[]; use?: Use } = {}): NonNullable<PlaywrightTestConfig['projects']> {
  return [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...extra.use,
        ...(process.env.WW_GPU === '0'
          ? {}
          : { channel: 'chromium', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=d3d11', '--enable-gpu', ...(extra.args ?? [])] } }),
      },
    },
  ];
}
