import type { CoreAPI } from '../api/core/api.js';

// Same API as Pi Extensions
export type Extension<TApi = CoreAPI> = (api: TApi) => void;
