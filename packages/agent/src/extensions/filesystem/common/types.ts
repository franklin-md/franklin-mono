export type FileSnapshot = { hash: string; text?: string };

export type FileRecord = Record<string, FileSnapshot>;

/** One-based, inclusive bounds of complete lines, including their terminators. */
export type LineRange = { startLine: number; endLine: number };
