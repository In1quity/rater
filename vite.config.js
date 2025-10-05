import { defineConfig } from 'vite';
import commonjs from '@rollup/plugin-commonjs';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import concatPlugin from './vite-plugin-concat.js';

export default defineConfig({
	plugins: [
		cssInjectedByJsPlugin(),
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
		rollupOptions: {
			plugins: [
				commonjs({
					include: ['**/*.js', '**/*.json'],
					transformMixedEsModules: true
				})
			],
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
	},
	// Enable CommonJS support
	optimizeDeps: {
		include: ['**/*']
	}
});
