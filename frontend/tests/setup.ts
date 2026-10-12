import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

beforeEach(() => {
  try { localStorage.clear(); } catch { /* node env */ }
});
