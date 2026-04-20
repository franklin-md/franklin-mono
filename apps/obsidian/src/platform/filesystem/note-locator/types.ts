import type { AbsolutePath } from '@franklin/lib';

export type NoteLocatorResolver = (input: string) => AbsolutePath | undefined;
