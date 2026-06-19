import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();

  // Si algún test reemplazó window.location sin `origin` (patrón usado en unit tests
  // de redirect: delete window.location; window.location = { href: '' }),
  // restaurarlo para que React Router no falle en tests subsiguientes.
  if (!window.location?.origin) {
    try {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: {
          href: 'http://localhost/',
          origin: 'http://localhost',
          pathname: '/',
          search: '',
          hash: '',
          hostname: 'localhost',
        },
      });
    } catch (_) {}
  }
});