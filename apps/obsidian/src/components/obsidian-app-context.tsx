import { createSimpleContext } from '@franklin/react';
import type { App } from 'obsidian';

export const [ObsidianAppProvider, useObsidianApp] =
	createSimpleContext<App>('ObsidianApp');
