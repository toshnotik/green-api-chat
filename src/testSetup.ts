import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

HTMLElement.prototype.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
