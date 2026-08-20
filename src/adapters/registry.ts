import {
  normalizeTarget,
  type CanonicalTarget,
  type Target,
} from '../core/index.js';
import type { Adapter } from './types.js';
import { ClaudeAdapter } from './claude.js';
import { CursorAdapter } from './cursor.js';
import { WindsurfAdapter } from './windsurf.js';
import { RooAdapter } from './roo.js';
import { AiderAdapter } from './aider.js';
import { AAIFAdapter } from './aaif.js';

export class AdapterRegistry {
  private readonly adapters: Map<CanonicalTarget, Adapter> = new Map();

  constructor() {
    this.register(new ClaudeAdapter());
    this.register(new CursorAdapter());
    this.register(new WindsurfAdapter());
    this.register(new RooAdapter());
    this.register(new AiderAdapter());
    this.register(new AAIFAdapter());
  }

  /**
   * Registers an adapter instance. Overwrites existing adapter for same target.
   */
  public register(adapter: Adapter): this {
    this.adapters.set(adapter.target, adapter);
    return this;
  }

  /**
   * Retrieves an adapter by canonical target or target alias.
   */
  public get(target: Target | CanonicalTarget | string): Adapter | undefined {
    try {
      const canonical = normalizeTarget(target);
      return this.adapters.get(canonical);
    } catch {
      return undefined;
    }
  }

  /**
   * Checks if an adapter is registered for the target.
   */
  public has(target: Target | CanonicalTarget | string): boolean {
    return this.get(target) !== undefined;
  }

  /**
   * Returns all registered adapters.
   */
  public getAll(): Adapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Returns all supported canonical target names.
   */
  public getTargets(): CanonicalTarget[] {
    return Array.from(this.adapters.keys());
  }
}

export const defaultAdapterRegistry = new AdapterRegistry();
