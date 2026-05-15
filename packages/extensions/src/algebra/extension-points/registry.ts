/*
Registry Type:
- A key->any[] typed record of values contributed by extensions
*/

import type { Apply } from '@franklin/lib';
import type { API as APIFamily } from '../api/types.js';

// TODO: Move to utils.
type OverloadedParameters<T> = T extends {
	(...args: infer A1): unknown;
	(...args: infer A2): unknown;
	(...args: infer A3): unknown;
	(...args: infer A4): unknown;
	(...args: infer A5): unknown;
	(...args: infer A6): unknown;
	(...args: infer A7): unknown;
	(...args: infer A8): unknown;
	(...args: infer A9): unknown;
}
	? A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | A9
	: T extends {
				(...args: infer A1): unknown;
				(...args: infer A2): unknown;
				(...args: infer A3): unknown;
				(...args: infer A4): unknown;
				(...args: infer A5): unknown;
				(...args: infer A6): unknown;
				(...args: infer A7): unknown;
				(...args: infer A8): unknown;
		  }
		? A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8
		: T extends {
					(...args: infer A1): unknown;
					(...args: infer A2): unknown;
					(...args: infer A3): unknown;
					(...args: infer A4): unknown;
					(...args: infer A5): unknown;
					(...args: infer A6): unknown;
					(...args: infer A7): unknown;
			  }
			? A1 | A2 | A3 | A4 | A5 | A6 | A7
			: T extends {
						(...args: infer A1): unknown;
						(...args: infer A2): unknown;
						(...args: infer A3): unknown;
						(...args: infer A4): unknown;
						(...args: infer A5): unknown;
						(...args: infer A6): unknown;
				  }
				? A1 | A2 | A3 | A4 | A5 | A6
				: T extends {
							(...args: infer A1): unknown;
							(...args: infer A2): unknown;
							(...args: infer A3): unknown;
							(...args: infer A4): unknown;
							(...args: infer A5): unknown;
					  }
					? A1 | A2 | A3 | A4 | A5
					: T extends {
								(...args: infer A1): unknown;
								(...args: infer A2): unknown;
								(...args: infer A3): unknown;
								(...args: infer A4): unknown;
						  }
						? A1 | A2 | A3 | A4
						: T extends {
									(...args: infer A1): unknown;
									(...args: infer A2): unknown;
									(...args: infer A3): unknown;
							  }
							? A1 | A2 | A3
							: T extends {
										(...args: infer A1): unknown;
										(...args: infer A2): unknown;
								  }
								? A1 | A2
								: T extends (...args: infer A) => unknown
									? A
									: never;

type ContributedValue<T> = OverloadedParameters<T>;

// Gets the names of the contributions of API, defaulting to an erased runtime
// while still allowing compilers to recover the runtime-specialised view.
export type Registry<API extends APIFamily, Runtime extends API['In'] = any> = {
	[ContributionName in keyof Apply<API, Runtime>]: ContributedValue<
		Apply<API, Runtime>[ContributionName]
	>[];
};
