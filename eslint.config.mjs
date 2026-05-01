// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import obsidianmd from 'eslint-plugin-obsidianmd';
import storybook from 'eslint-plugin-storybook';

import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import vitest from '@vitest/eslint-plugin';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: [
			'**/dist/**',
			'**/node_modules/**',
			'**/*.d.ts',
			'**/*.tsbuildinfo',
			'**/storybook-static/**',
			'**/vitest.config.ts',
			'vitest.aliases.ts',
			'**/vite.config.ts',
			'**/electron.vite.config.ts',
			'**/out/**',
			'docs/**',
		],
	},
	{
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}'],
		rules: {
			'import/no-extraneous-dependencies': 'off',
			'obsidianmd/no-nodejs-modules': 'off',
			'obsidianmd/ui/sentence-case': [
				'error',
				{
					brands: ['Franklin'],
					enforceCamelCaseLower: true,
				},
			],
		},
	},
	{
		files: [
			'apps/demo/**/*.{js,mjs,cjs,ts,mts,cts,tsx}',
			'apps/shared/**/*.{js,mjs,cjs,ts,mts,cts,tsx}',
			'apps/obsidian/build/**/*.{js,mjs,cjs}',
			'apps/obsidian/src/mocks/**/*.{ts,tsx}',
			'packages/**/*.{js,mjs,cjs,ts,mts,cts,tsx}',
			'scripts/**/*.{js,mjs,cjs,ts,mts,cts,tsx}',
			'**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,tsx}',
			'**/test-helpers.{js,mjs,cjs,ts,mts,cts,tsx}',
		],
		rules: {
			'no-restricted-globals': 'off',
			'no-restricted-imports': 'off',
			'obsidianmd/hardcoded-config-path': 'off',
			'obsidianmd/no-static-styles-assignment': 'off',
			'obsidianmd/no-tfile-tfolder-cast': 'off',
			'obsidianmd/object-assign': 'off',
			'obsidianmd/prefer-active-doc': 'off',
			'obsidianmd/prefer-active-window-timers': 'off',
			'obsidianmd/prefer-create-el': 'off',
			'obsidianmd/prefer-instanceof': 'off',
			'obsidianmd/rule-custom-message': 'off',
		},
	},
	{
		files: ['**/*.{js,mjs,cjs}'],
		extends: [js.configs.recommended],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.{ts,mts,cts,tsx}'],
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.strictTypeChecked,
		],
		languageOptions: {
			globals: {
				...globals.node,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'separate-type-imports',
				},
			],
			'@typescript-eslint/no-confusing-void-expression': [
				'error',
				{
					ignoreArrowShorthand: true,
					ignoreVoidOperator: true,
				},
			],
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksVoidReturn: {
						arguments: true,
						attributes: false,
					},
				},
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/only-throw-error': 'error',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowNumber: true,
				},
			],
			'@typescript-eslint/switch-exhaustiveness-check': [
				'error',
				{
					allowDefaultCaseForExhaustiveSwitch: true,
				},
			],
			'no-fallthrough': 'error',
		},
	},
	{
		files: ['**/*.test.{ts,mts,cts}'],
		extends: [vitest.configs.recommended, vitest.configs.env],
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/unbound-method': 'off',
			'vitest/expect-expect': 'off',
		},
	},
	// Prevent Electron renderer code from importing the full @franklin/agent
	// barrel, which pulls in Node.js-only dependencies (StdioTransport, spawn).
	// Renderer code must use @franklin/agent/browser instead.
	{
		files: ['apps/demo/src/renderer/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '@franklin/agent',
							message:
								'Use @franklin/agent/browser in renderer code to avoid pulling in Node.js dependencies.',
						},
					],
				},
			],
		},
	},
	eslintConfigPrettier,
	storybook.configs['flat/recommended'],
);
