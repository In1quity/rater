import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import fs from 'node:fs';
import path from 'node:path';
// Inline userscript meta banner/footer so we don't maintain separate files
const banner = `/*
 * Rater: dialog interface to add, remove, or modify WikiProject banners
 * Author: Evad37
 * Licence: MIT / CC-BY 4.0 [https://github.com/evad37/rater/blob/master/LICENSE]
 * 
 * Built from source code at GitHub repository [https://github.com/evad37/rater].
 * All changes should be made in the repository, otherwise they will be lost.
 * 
 * To update this script from github, you must have a local repository set up. Then
 * follow the instructions at [https://github.com/evad37/rater/blob/master/README.md]
 */
/* eslint-env browser */
/* globals console, document, window, $, mw, OO, extraJs */
/* <nowiki> */`;
const footer = `/* </nowiki> */`;

export default defineConfig(({ command, mode }) => {
	const isProd = command === 'build' && mode === 'production';
	const isDev = command === 'serve' || mode === 'development';
	
	// Cache package.json and i18n data to avoid repeated file reads
	const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));
	const buildDate = new Date().toISOString().slice(0, 10);
	const enDict = JSON.parse(fs.readFileSync(new URL('./i18n/en.json', import.meta.url)));
	
	return {
	// Modern environment handling
	envPrefix: ['VITE_', 'RATER_'],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'@components': path.resolve(__dirname, 'src/components'),
			'@services': path.resolve(__dirname, 'src/services'),
			'@utils': path.resolve(__dirname, 'src/utils'),
			'@constants': path.resolve(__dirname, 'src/constants'),
			'@styles': path.resolve(__dirname, 'src/styles')
		}
	},
	define: {
		RATER_VERSION: JSON.stringify(pkg.version),
		BUILD_DATE: JSON.stringify(buildDate),
		RATER_I18N_EN: JSON.stringify(enDict),
		// Modern global definitions
		__DEV__: isDev,
		__PROD__: isProd
	},
	plugins: [
		cssInjectedByJsPlugin(),
		{
			name: 'rater-banner-footer',
			apply: 'build',
			enforce: 'post',
			generateBundle( _options, bundle ) {
				for ( const [ fileName, chunk ] of Object.entries( bundle ) ) {
					if ( chunk.type === 'chunk' && fileName.endsWith( '.js' ) ) {
						chunk.code = `${banner}\n${chunk.code}\n${footer}`;
					}
				}
			}
		},
		{
			name: 'rater-copy-index-as-loader',
			apply: 'build',
			generateBundle() {
				const indexPath = path.resolve(process.cwd(), 'index.js');
				if ( fs.existsSync(indexPath) ) {
					const source = fs.readFileSync(indexPath, 'utf8');
					this.emitFile({ type: 'asset', fileName: 'rater.js', source: `${banner}\n${source}\n${footer}` });
				}
			}
		}
	],
	build: {
		emptyOutDir: true,
		lib: {
			entry: 'src/App.js',
			name: 'Rater',
			fileName: () => 'rater-core.js',
			formats: ['iife']
		},
		target: 'es2017',
		minify: isProd ? 'esbuild' : false,
		sourcemap: isDev,
		esbuild: isProd ? { 
			drop: ['console', 'debugger'],
			target: 'es2017'
		} : undefined,
		rollupOptions: {
			output: {
				extend: true,
				inlineDynamicImports: true,
				entryFileNames: 'rater-core.js',
				chunkFileNames: 'rater-core.js',
				// Modern asset handling
				assetFileNames: (assetInfo) => {
					if (assetInfo.name?.endsWith('.css')) {
						return 'rater-core.css';
					}
					return assetInfo.name || 'assets/[name]-[hash][extname]';
				}
			}
		},
		// Modern build optimizations
		reportCompressedSize: false,
		chunkSizeWarningLimit: 1000
	},
	publicDir: false
	};
});
