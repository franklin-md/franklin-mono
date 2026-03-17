// Browser-safe exports (the bulk of the public API)
export * from './browser.js';

// Node-only: transports
export { createMemoryTransport } from './transport/index.js';
export { StdioTransport } from './transport/stdio.js';
export type { StdioTransportOptions } from './transport/stdio.js';

// Extensions are re-exported via browser.ts above.
