import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// NetworkMonitor — singleton that tracks online/offline state
// ---------------------------------------------------------------------------

const OFFLINE_QUEUE_KEY = '@aangan/offline_queue';

type NetworkCallback = (isOnline: boolean) => void;

class NetworkMonitorImpl {
  private _isOnline = true;
  private _listeners: Set<NetworkCallback> = new Set();
  private _unsubscribeNetInfo: (() => void) | null = null;

  /** Current connectivity status. */
  get isOnline(): boolean {
    return this._isOnline;
  }

  /** Start listening to NetInfo. Call once at app boot. */
  init(): void {
    if (this._unsubscribeNetInfo) return; // already initialized

    this._unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      if (online !== this._isOnline) {
        this._isOnline = online;
        this._listeners.forEach((cb) => cb(online));
      }
    });
  }

  /** Register a callback for connectivity changes. */
  subscribe(callback: NetworkCallback): void {
    this._listeners.add(callback);
  }

  /** Remove a previously registered callback. */
  unsubscribe(callback: NetworkCallback): void {
    this._listeners.delete(callback);
  }

  /** Tear down the NetInfo listener entirely. */
  destroy(): void {
    this._unsubscribeNetInfo?.();
    this._unsubscribeNetInfo = null;
    this._listeners.clear();
  }
}

export const NetworkMonitor = new NetworkMonitorImpl();

// ---------------------------------------------------------------------------
// withRetry — exponential-backoff wrapper for async functions
// ---------------------------------------------------------------------------

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
}

const RETRYABLE_PATTERNS = ['network', 'timeout', 'fetch', 'ECONNREFUSED', 'ENOTFOUND'];

function isRetryableError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Non-retryable errors are thrown immediately
      if (!isRetryableError(error)) {
        throw error;
      }

      // No delay after the final attempt — we'll throw below
      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// OfflineQueue — persisted queue for failed write operations
// ---------------------------------------------------------------------------

interface QueuedOperation {
  id: string;
  type: string;
  payload: any;
  createdAt: string;
}

// Runtime-only map of operation factories keyed by id.
// We cannot persist the `fn` itself, so callers must re-register factories
// for any operations that were enqueued before a restart.
const _operationFactories = new Map<string, () => Promise<any>>();

class OfflineQueueImpl {
  private _queue: QueuedOperation[] = [];
  private _loaded = false;
  private _processing = false;

  /** Load persisted queue from AsyncStorage. Call once at app boot. */
  async load(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      this._queue = raw ? JSON.parse(raw) : [];
    } catch {
      this._queue = [];
    }
    this._loaded = true;
  }

  /** Add a failed write operation to the queue. */
  enqueue(operation: { type: string; payload: any; fn: () => Promise<any> }): void {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry: QueuedOperation = {
      id,
      type: operation.type,
      payload: operation.payload,
      createdAt: new Date().toISOString(),
    };
    _operationFactories.set(id, operation.fn);
    this._queue.push(entry);
    this._persist();
  }

  /** Process all queued operations. Call when connectivity is restored. */
  async processQueue(): Promise<void> {
    if (this._processing || this._queue.length === 0) return;
    this._processing = true;

    const completed: string[] = [];

    for (const entry of [...this._queue]) {
      const fn = _operationFactories.get(entry.id);
      if (!fn) {
        // No factory available (e.g. app restarted) — skip but keep in queue
        continue;
      }

      try {
        await fn();
        completed.push(entry.id);
        _operationFactories.delete(entry.id);
      } catch {
        // Operation still failing — leave in queue for next attempt
        break;
      }
    }

    this._queue = this._queue.filter((e) => !completed.includes(e.id));
    await this._persist();
    this._processing = false;
  }

  /** Number of operations waiting in the queue. */
  getQueueLength(): number {
    return this._queue.length;
  }

  /** Remove all queued operations. */
  async clear(): Promise<void> {
    this._queue = [];
    _operationFactories.clear();
    await this._persist();
  }

  // -- internal helpers --

  private async _persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this._queue));
    } catch {
      // Storage write failed — best effort
    }
  }
}

export const OfflineQueue = new OfflineQueueImpl();
