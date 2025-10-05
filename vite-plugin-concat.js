import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Vite plugin to concatenate files after build
 * @param {Object} options - Plugin options
 * @param {string[]} options.files - Array of file paths to concatenate
 * @param {string} options.output - Output file path
 * @returns {Object} Vite plugin
 */
export default function concatPlugin(options = {}) {
	const { files = [], output = 'dist/concat.js' } = options;
	
	return {
		name: 'vite-plugin-concat',
		writeBundle() {
			const contents = files.map(file => {
				try {
					return readFileSync(file, 'utf8');
				} catch (error) {
					console.warn(`Warning: Could not read file ${file}:`, error.message);
					return '';
				}
			}).join('\n');
			
			writeFileSync(output, contents);
			console.log(`✓ Concatenated ${files.length} files to ${output}`);
		}
	};
}
