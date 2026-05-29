import { createContext, useContext, useState, type ReactNode } from 'react';

import { FuseFileIndex } from './fuse-file-index.js';
import type { FileIndex } from './types.js';

const FileIndexContext = createContext<FileIndex | undefined>(undefined);

interface FileIndexProviderProps {
	readonly fileIndex: FileIndex;
	readonly children: ReactNode;
}

export function FileIndexProvider({
	fileIndex,
	children,
}: FileIndexProviderProps) {
	return (
		<FileIndexContext.Provider value={fileIndex}>
			{children}
		</FileIndexContext.Provider>
	);
}

export function useFileIndex(): FileIndex {
	const provided = useContext(FileIndexContext);
	const [fallback] = useState<FileIndex>(() => new FuseFileIndex());
	return provided ?? fallback;
}
