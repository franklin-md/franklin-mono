import type { App } from 'obsidian';
import { createContext, useContext } from 'react';

export const ObsidianAppContext = createContext<App | null>(null);

export function useObsidianApp() {
	return useContext(ObsidianAppContext);
}
