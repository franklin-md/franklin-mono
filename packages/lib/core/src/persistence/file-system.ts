import type { Filesystem } from '../filesystem.js';

export type PersistenceFilesystem = Pick<
	Filesystem,
	'readFile' | 'writeFile' | 'readdir' | 'deleteFile' | 'mkdir'
>;

export type FileSystemOps = PersistenceFilesystem;
