import { describe, it, expect } from 'vitest';
import { cn } from '../../../lib/utils';

describe('cn', () => {
  it('concatena clases simples', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('resuelve conflictos de tailwind dejando la última', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('ignora valores falsy', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });
});