import { createContext, useContext, useState, type ReactNode } from 'react';

import { FuseFileCollection } from './fuse-file-collection.js';
import type { FileCollection } from './types.js';

const FileCollectionContext = createContext<FileCollection | undefined>(
	undefined,
);

export function FileCollectionProvider({
	collection,
	children,
}: {
	readonly collection: FileCollection;
	readonly children: ReactNode;
}) {
	return (
		<FileCollectionContext.Provider value={collection}>
			{children}
		</FileCollectionContext.Provider>
	);
}

export function useFileCollection(): FileCollection {
	const provided = useContext(FileCollectionContext);
	const [fallback] = useState<FileCollection>(() => new FuseFileCollection());
	return provided ?? fallback;
}
