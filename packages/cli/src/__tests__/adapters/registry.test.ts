import { describe, it, expect } from 'vitest';
import { AdapterRegistry, defaultAdapterRegistry } from '../../adapters/registry.js';
import { ClaudeAdapter } from '../../adapters/claude.js';
import type { Adapter } from '../../adapters/types.js';

describe('AdapterRegistry', () => {
  it('contains all 6 built-in canonical adapters by default', () => {
    const targets = defaultAdapterRegistry.getTargets();
    expect(targets).toEqual(['claude', 'cursor', 'windsurf', 'roo', 'aider', 'aaif']);
    expect(defaultAdapterRegistry.getAll()).toHaveLength(6);
  });

  it('retrieves adapters using canonical names and alias targets', () => {
    expect(defaultAdapterRegistry.get('claude')).toBeInstanceOf(ClaudeAdapter);
    expect(defaultAdapterRegistry.get('claude-code')).toBeInstanceOf(ClaudeAdapter);
    expect(defaultAdapterRegistry.get('roo-code')?.target).toBe('roo');
    expect(defaultAdapterRegistry.get('aaif-agents-md')?.target).toBe('aaif');
  });

  it('returns undefined for unknown target names', () => {
    expect(defaultAdapterRegistry.get('nonexistent-target')).toBeUndefined();
    expect(defaultAdapterRegistry.has('unknown')).toBe(false);
  });

  it('allows registering and overriding custom adapters', () => {
    const registry = new AdapterRegistry();
    const customAdapter: Adapter = {
      target: 'claude',
      name: 'Custom Claude Adapter',
      description: 'Custom implementation',
      compile: () => [{ path: 'CLAUDE.md', content: '# Custom' }],
    };

    registry.register(customAdapter);
    expect(registry.get('claude')?.name).toBe('Custom Claude Adapter');
  });
});
