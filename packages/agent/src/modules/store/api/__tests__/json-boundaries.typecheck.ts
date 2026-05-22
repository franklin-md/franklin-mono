import type { JsonValue } from '@franklin/lib';

import type { StoreAPI } from '../api.js';
import { storeKey, type StoreValueType } from '../key.js';
import type { StoreMapping } from '../registry/mapping.js';
import type { StoreState } from '../../state.js';

type ExpectJson<T extends JsonValue> = T;

type _StoreMappingIsJson = ExpectJson<StoreMapping>;
type _StoreStateIsJson = ExpectJson<StoreState>;

const _jsonKey = storeKey<'settings', { enabled: boolean }>('settings');
type _KeyValueIsJson = ExpectJson<StoreValueType<typeof _jsonKey>>;

const _api = null as unknown as StoreAPI;

_api.registerStore(_jsonKey, { enabled: true }, 'shared');
_api.registerStore('raw_json', { count: 1, tags: ['json'] }, 'private');

// @ts-expect-error store keys can only carry JSON values.
storeKey<'bad_date', { createdAt: Date }>('bad_date');

// @ts-expect-error raw store registrations can only persist JSON values.
_api.registerStore('bad_raw_date', { createdAt: new Date() }, 'private');

void (null as unknown as _StoreMappingIsJson);
void (null as unknown as _StoreStateIsJson);
void (null as unknown as _KeyValueIsJson);
