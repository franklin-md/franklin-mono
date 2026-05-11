import { StateEffect } from '@codemirror/state';

/* Sets `oldContent` on a DiffState field. */
export const setDiffEffect = StateEffect.define<{ oldContent: string }>();

/* Changes `DiffState` field to an empty state. */
export const clearDiffEffect = StateEffect.define();

/* Sets `oldContent` on a DiffState field. Compared to `setDiffEffect`,
this effect has an inverted effect, because it changes the old cached version
of a file; the inversion restores the cached file to the original version.
*/
export const setBaselineEffect = StateEffect.define<{ oldContent: string }>();

/* Sets the ID of the hunk that the mouse is hovering over. */
export const setHoveredHunkEffect = StateEffect.define<string | null>();
