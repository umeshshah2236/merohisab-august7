import { Platform } from 'react-native';

// Performance utilities for Android optimization
export class PerformanceUtils {
  
  /**
   * Optimized console logging - reduces logging on Android for better performance
   */
  static log(message: string, ...args: any[]) {
    // Reduce logging on Android in production for better performance
    if (__DEV__ || Platform.OS !== 'android') {
      console.log(message, ...args);
    }
  }

  static warn(message: string, ...args: any[]) {
    if (__DEV__ || Platform.OS !== 'android') {
      console.warn(message, ...args);
    }
  }

  static error(message: string, ...args: any[]) {
    // Always log errors, but reduce details on Android
    if (Platform.OS === 'android' && !__DEV__) {
      console.error(message);
    } else {
      console.error(message, ...args);
    }
  }

  /**
   * Non-blocking async wrapper that yields control to UI thread
   */
  static async runNonBlocking<T>(operation: () => Promise<T>): Promise<T> {
    // Yield control to UI thread before heavy operations on Android
    if (Platform.OS === 'android') {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return await operation();
  }

  /**
   * Debounced operation to prevent UI freezing
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Split heavy operations into chunks for better Android performance
   */
  static async processInChunks<T, R>(
    items: T[],
    processor: (item: T) => R | Promise<R>,
    chunkSize: number = Platform.OS === 'android' ? 10 : 50
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      // Process chunk
      const chunkResults = await Promise.all(
        chunk.map(item => processor(item))
      );
      
      results.push(...chunkResults);
      
      // Yield control to UI thread between chunks on Android
      if (Platform.OS === 'android' && i + chunkSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return results;
  }

  /**
   * Android-optimized timeout wrapper
   */
  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = Platform.OS === 'android' ? 15000 : 10000
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });
    
    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Optimized setState wrapper that batches updates on Android
   */
  static batchStateUpdates(updates: Array<() => void>) {
    if (Platform.OS === 'android') {
      // Batch updates to prevent multiple re-renders
      setTimeout(() => {
        updates.forEach(update => update());
      }, 0);
    } else {
      // Execute immediately on iOS
      updates.forEach(update => update());
    }
  }

  /**
   * Memory management - force garbage collection on Android
   */
  static optimizeMemory() {
    if (Platform.OS === 'android' && global.gc) {
      try {
        global.gc();
      } catch (e) {
        // Ignore if gc is not available
      }
    }
  }
}

// Optimized logger that reduces output on Android
export const logger = {
  log: PerformanceUtils.log,
  warn: PerformanceUtils.warn,
  error: PerformanceUtils.error,
};

// Export shortcuts for common operations
export const runNonBlocking = PerformanceUtils.runNonBlocking;
export const debounce = PerformanceUtils.debounce;
export const processInChunks = PerformanceUtils.processInChunks;
export const withTimeout = PerformanceUtils.withTimeout;
export const batchStateUpdates = PerformanceUtils.batchStateUpdates;
export const optimizeMemory = PerformanceUtils.optimizeMemory;