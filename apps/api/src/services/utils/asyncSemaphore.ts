/**
 * Asynchronous Bounded Concurrency Semaphore
 * Governed by AGENTS.md § 4.3 and system-resilience-release spec.
 * Throttles outbound parallel requests to prevent external API rate-limit storms.
 */

export class AsyncSemaphore {
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(public readonly maxConcurrency: number) {
    if (maxConcurrency <= 0) {
      throw new Error(`maxConcurrency must be a positive integer, received ${maxConcurrency}`);
    }
  }

  async acquire(): Promise<() => void> {
    if (this.running < this.maxConcurrency) {
      this.running++;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          this.release();
        }
      };
    }

    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        let released = false;
        resolve(() => {
          if (!released) {
            released = true;
            this.release();
          }
        });
      });
    });
  }

  private release(): void {
    this.running--;
    if (this.queue.length > 0 && this.running < this.maxConcurrency) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  get activeCount(): number {
    return this.running;
  }

  get queueLength(): number {
    return this.queue.length;
  }
}
