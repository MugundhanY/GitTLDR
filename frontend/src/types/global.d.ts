/**
 * Global type definitions for GitTLDR
 */

declare global {
  interface Window {
    /**
     * Global flag to prevent duplicate API calls to /api/thinking
     * Set by useMultiStepReasoning hook, checked by ThinkingProcess component
     * 
     * TEMPORARY FIX: This should be replaced with proper state management
     * See DUPLICATE_API_CALLS_FIX.md for proper refactoring plan
     */
    __thinkingInProgress?: boolean
  }
}

export {}
