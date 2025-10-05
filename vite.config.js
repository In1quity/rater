import { defineConfig } from 'vite';
import concatPlugin from './vite-plugin-concat.js';

export default defineConfig({
	plugins: [
		concatPlugin({
			files: ['comment-top.js', 'dist/rater.js', 'comment-bottom.js'],
			output: 'dist/rater.min.js'
		})
	],
	build: {
		lib: {
			entry: 'rater-src/App.js',
			name: 'RaterApp',
			fileName: (format) => `rater.${format}.js`,
			formats: ['iife']
		},
		target: 'es2017',
		minify: true,
		sourcemap: true,
		cssCodeSplit: false, // Inline all CSS in JS
		rollupOptions: {
			output: {
				// Ensure CSS is inlined in the JS bundle
				inlineDynamicImports: true,
				// Custom file names for different modes
				entryFileNames: 'rater.js',
				chunkFileNames: 'rater.js'
			}
		}
	},
	css: {
		// Minify CSS
		minify: true
	}
});
