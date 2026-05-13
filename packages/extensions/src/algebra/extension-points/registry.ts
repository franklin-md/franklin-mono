/*
Registry Type:
- A key->any[] typed record of values contributed by extensions
*/

import type { Apply } from '@franklin/lib';
import type { API as APIFamily } from '../api/types.js';

type ContributedValue<T> = T extends (...args: any[]) => any
	? Parameters<T>
	: never;

// Gets the names of the contributions of API, and erases the value type
export type Registry<API extends APIFamily> = {
	[ContributionName in keyof Apply<API, any>]: ContributedValue<
		Apply<API, any>[ContributionName]
	>[];
};
