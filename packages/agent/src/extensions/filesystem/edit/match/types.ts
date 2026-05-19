export type MatchResult =
	| {
			readonly found: true;
			/** Start index of the match within `content`. */
			readonly index: number;
			/** Length of the matched text. */
			readonly length: number;
			/** Whether fuzzy normalization was needed. */
			readonly fuzzy: boolean;
			/**
			 * The content string to use for replacement.
			 * Exact match: original content. Fuzzy match: normalized content.
			 */
			readonly content: string;
			readonly ambiguous?: false;
	  }
	| {
			readonly found: false;
			/** True when the search text was found but matched more than once. */
			readonly ambiguous: boolean;
	  };
