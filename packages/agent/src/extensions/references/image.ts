import { base64 } from '@franklin/lib';
import type { CoreModule } from '../../modules/core/index.js';
import type { ReferenceHandler } from '../../modules/references/api/index.js';
import type { ReferencesModule } from '../../modules/references/module.js';
import { defineExtension } from '../../modules/state/index.js';
import { isSupportedImageType } from '../filesystem/common/supported.js';
import { hasBytesData } from './data.js';

const imageDocumentReferenceHandler: ReferenceHandler = {
	test(reference) {
		return (
			hasBytesData(reference) &&
			reference.data.mime !== undefined &&
			isSupportedImageType(reference.data.mime)
		);
	},
	toContext(reference) {
		const data = reference.data;
		if (data?.type !== 'bytes' || data.mime === undefined) {
			return {
				content: [
					{
						type: 'text',
						text: 'Reference unavailable: Image bytes are required.',
					},
				],
				isError: true,
			};
		}
		return {
			content: [
				{
					type: 'image',
					data: base64(data.bytes),
					mimeType: data.mime,
				},
			],
		};
	},
};

export const imageDocumentReferenceExtension = defineExtension<
	[ReferencesModule, CoreModule]
>((api) => {
	api.registerReferenceHandler(imageDocumentReferenceHandler);
	api.on('systemPrompt', (prompt) => {
		prompt.setPart(
			'Reading images is supported.\nSupported selectors: none currently.',
			{ once: true },
		);
	});
});
