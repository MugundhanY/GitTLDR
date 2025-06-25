// Performance monitoring utility for development
interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private entries: Map<string, PerformanceEntry> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'development';

  start(name: string): void {
    if (!this.enabled) return;
    
    this.entries.set(name, {
      name,
      startTime: performance.now()
    });
  }

  end(name: string): number | null {
    if (!this.enabled) return null;
    
    const entry = this.entries.get(name);
    if (!entry) {
      console.warn(`Performance entry "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - entry.startTime;
    
    entry.endTime = endTime;
    entry.duration = duration;

    // Log slow operations
    if (duration > 100) {
      console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    } else if (duration > 50) {
      console.log(`⚡ ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  measure(name: string, fn: () => Promise<any>): Promise<any> {
    if (!this.enabled) return fn();
    
    this.start(name);
    return fn().finally(() => {
      this.end(name);
    });
  }

  getEntries(): PerformanceEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void {
    this.entries.clear();
  }

  // Get summary of all measurements
  getSummary(): void {
    if (!this.enabled) return;
    
    const entries = this.getEntries().filter(e => e.duration !== undefined);
    if (entries.length === 0) return;

    console.group('🔍 Performance Summary');
    entries
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .forEach(entry => {
        const duration = entry.duration!;
        const emoji = duration > 100 ? '🐌' : duration > 50 ? '⚡' : '✅';
        console.log(`${emoji} ${entry.name}: ${duration.toFixed(2)}ms`);
      });
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();