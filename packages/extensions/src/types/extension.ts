import type { CoreAPI } from '../api/core/index.js';

// Same API as Pi Extensions
export type Extension<TApi = CoreAPI> = (api: TApi) => void;
