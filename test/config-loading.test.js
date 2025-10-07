import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { config, loadExternalConfig } from '../src/constants/config.js';

describe('Config Loading', () => {
	beforeEach(() => {
		// Reset config to default state
		config.shellTemplate = 'WikiProject banner shell';
		config.bannerNamePrefixes = ['WP ', 'WikiProject '];
		config.categories = {
			withRatings: 'Category:WikiProject banners with quality assessment',
			withoutRatings: 'Category:WikiProject banners without quality assessment',
			wrappers: 'Category:WikiProject banner wrapper templates',
			notWPBM: 'Category:WikiProject banner templates not based on WPBannerMeta',
			inactive: 'Category:Inactive WikiProject banners',
			wir: 'Category:Wrapper templates for WikiProject Women in Red'
		};
	});

	it('should load ruwiki config from window.RATER_CONFIG', async () => {
		// Simulate ruwiki config being loaded via window.RATER_CONFIG
		global.window.RATER_CONFIG = {
			shellTemplate: 'Шаблон:Блок проектов статьи',
			bannerNamePrefixes: ['Статья проекта '],
			categories: {
				withRatings: 'Категория:Шаблоны проектов:Баннеры',
				withoutRatings: '',
				wrappers: '',
				notWPBM: '',
				inactive: '',
				wir: ''
			}
		};

		await loadExternalConfig();

		console.log('=== CONFIG LOADING TEST ===');
		console.log('Shell template:', config.shellTemplate);
		console.log('Banner name prefixes:', config.bannerNamePrefixes);
		console.log('Categories:', config.categories);

		expect( config.shellTemplate ).toBe( 'Шаблон:Блок проектов статьи' );
		expect( config.bannerNamePrefixes ).toEqual( ['Статья проекта '] );
		expect( config.categories.withRatings ).toBe( 'Категория:Шаблоны проектов:Баннеры' );
	});

	it('should load ruwiki config from window.RATER_CONFIG_URL', async () => {
		// Mock jQuery.get to return ruwiki config
		const mockRuwikiConfig = {
			shellTemplate: 'Шаблон:Блок проектов статьи',
			bannerNamePrefixes: ['Статья проекта '],
			categories: {
				withRatings: 'Категория:Шаблоны проектов:Баннеры',
				withoutRatings: '',
				wrappers: '',
				notWPBM: '',
				inactive: '',
				wir: ''
			}
		};

		global.window.RATER_CONFIG_URL = '/examples/ruwiki.config.json';
		
		// Mock $.get to return the config
		global.$.get = (url) => {
			if (url === '/examples/ruwiki.config.json') {
				return Promise.resolve(mockRuwikiConfig);
			}
			return Promise.reject(new Error('Unknown URL'));
		};

		await loadExternalConfig();

		console.log('=== CONFIG URL LOADING TEST ===');
		console.log('Shell template:', config.shellTemplate);
		console.log('Banner name prefixes:', config.bannerNamePrefixes);
		console.log('Categories:', config.categories);

		expect( config.shellTemplate ).toBe( 'Шаблон:Блок проектов статьи' );
		expect( config.bannerNamePrefixes ).toEqual( ['Статья проекта '] );
		expect( config.categories.withRatings ).toBe( 'Категория:Шаблоны проектов:Баннеры' );
	});

	it('should work with loaded ruwiki config for banner filtering', async () => {
		// Load ruwiki config
		global.window.RATER_CONFIG = {
			shellTemplate: 'Шаблон:Блок проектов статьи',
			bannerNamePrefixes: ['Статья проекта '],
			categories: {
				withRatings: 'Категория:Шаблоны проектов:Баннеры',
				withoutRatings: '',
				wrappers: '',
				notWPBM: '',
				inactive: '',
				wir: ''
			}
		};

		await loadExternalConfig();

		// Simulate banner filtering with loaded config
		const templateNames = [
			'Статья проекта Права человека',
			'Статья проекта Социология', 
			'Статья проекта Феминизм'
		];

		const emptyBannerLists = {
			withRatings: [],
			withoutRatings: [],
			wrappers: [],
			notWPBM: [],
			inactive: [],
			wir: []
		};

		const filteredTemplates = templateNames.filter( ( mainText ) => {
			// Primary inclusion via fetched banner lists (all empty)
			const isListed = emptyBannerLists.withRatings.includes( mainText ) ||
					emptyBannerLists.withoutRatings.includes( mainText ) ||
					emptyBannerLists.wrappers.includes( mainText ) ||
					emptyBannerLists.notWPBM.includes( mainText ) ||
					emptyBannerLists.inactive.includes( mainText ) ||
					emptyBannerLists.wir.includes( mainText );
			
			// Fallback: treat as banner if it matches known name prefixes
			const hasKnownPrefix = Array.isArray( config.bannerNamePrefixes ) && 
				config.bannerNamePrefixes.some( ( prefix ) => 
					typeof prefix === 'string' && mainText.indexOf( prefix ) === 0
				);
			
			console.log(`Template "${mainText}": isListed=${isListed}, hasKnownPrefix=${hasKnownPrefix}, included=${isListed || hasKnownPrefix}`);
			
			return isListed || hasKnownPrefix;
		});

		console.log('=== BANNER FILTERING WITH LOADED CONFIG ===');
		console.log('Filtered templates:', filteredTemplates.length);
		console.log('Templates:', filteredTemplates);

		expect( filteredTemplates ).toHaveLength( 3 );
		expect( filteredTemplates ).toContain( 'Статья проекта Права человека' );
		expect( filteredTemplates ).toContain( 'Статья проекта Социология' );
		expect( filteredTemplates ).toContain( 'Статья проекта Феминизм' );
	});
} );
