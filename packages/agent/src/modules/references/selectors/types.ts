export type SelectorFieldValue =
	| string
	| number
	| SelectorIntegerRange
	| undefined;

export type SelectorFields = Readonly<Record<string, SelectorFieldValue>>;

export type SelectorIntegerRange = {
	readonly start: number;
	readonly end: number;
};

export type SelectorIntegerOptions = {
	readonly min?: number;
	readonly max?: number;
};

export type SelectorIntegerRangeParseResult =
	| {
			readonly ok: true;
			readonly range: SelectorIntegerRange;
	  }
	| {
			readonly ok: false;
			readonly reversed?: SelectorIntegerRange;
	  };
