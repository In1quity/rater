import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Ruwiki Config Simulation', () => {
	beforeEach(() => {
		// Simulate ruwiki.config.json settings
		config.shellTemplate = 'Блок проектов статьи';
		config.bannerNamePrefixes = ['Статья проекта ']; // With space as in ruwiki.config.json
		config.categories = {
			withRatings: 'Категория:Шаблоны проектов:Баннеры',
			withoutRatings: '',
			wrappers: '',
			notWPBM: '',
			inactive: '',
			wir: ''
		};
	});

	it('should work with ruwiki config and empty banner lists', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Parse templates
		const allTemplates = parseTemplates( wikitext, true );
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		
		// Simulate empty banner lists (as they might be in real app)
		const emptyBannerLists = {
			withRatings: [],
			withoutRatings: [],
			wrappers: [],
			notWPBM: [],
			inactive: [],
			wir: []
		};

		const bannerTemplates = validTemplates.filter( ( template ) => {
			if ( template.isShellTemplate() ) {
				return true;
			}
			
			const mainText = template.redirectTarget ?
				template.redirectTarget.getMainText() :
				template.getTitle().getMainText();
			
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

		console.log('=== RUWIKI CONFIG TEST ===');
		console.log('Banner templates after filtering:', bannerTemplates.length);
		bannerTemplates.forEach( ( t, i ) => {
			console.log(`Banner ${i}: "${t.getTitle().getMainText()}" (isShell: ${t.isShellTemplate()})`);
		});

		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell templates that passed filtering:', nonShellTemplates.length);
		
		// With ruwiki config, all 3 templates should pass the filtering
		expect( bannerTemplates ).toHaveLength( 4 ); // 1 shell + 3 non-shell
		expect( nonShellTemplates ).toHaveLength( 3 ); // All 3 non-shell templates
		
		const templateNames = nonShellTemplates.map( t => t.getTitle().getMainText() );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).toContain( 'Статья проекта Феминизм' );
	} );

	it('should work with partial banner lists from API', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Parse templates
		const allTemplates = parseTemplates( wikitext, true );
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		
		// Simulate partial banner lists from API (only 2 out of 3 templates)
		const partialBannerLists = {
			withRatings: ['Статья проекта Права человека', 'Статья проекта Социология'],
			withoutRatings: [],
			wrappers: [],
			notWPBM: [],
			inactive: [],
			wir: []
		};

		const bannerTemplates = validTemplates.filter( ( template ) => {
			if ( template.isShellTemplate() ) {
				return true;
			}
			
			const mainText = template.redirectTarget ?
				template.redirectTarget.getMainText() :
				template.getTitle().getMainText();
			
			// Primary inclusion via fetched banner lists
			const isListed = partialBannerLists.withRatings.includes( mainText ) ||
					partialBannerLists.withoutRatings.includes( mainText ) ||
					partialBannerLists.wrappers.includes( mainText ) ||
					partialBannerLists.notWPBM.includes( mainText ) ||
					partialBannerLists.inactive.includes( mainText ) ||
					partialBannerLists.wir.includes( mainText );
			
			// Fallback: treat as banner if it matches known name prefixes
			const hasKnownPrefix = Array.isArray( config.bannerNamePrefixes ) && 
				config.bannerNamePrefixes.some( ( prefix ) => 
					typeof prefix === 'string' && mainText.indexOf( prefix ) === 0
				);
			
			console.log(`Template "${mainText}": isListed=${isListed}, hasKnownPrefix=${hasKnownPrefix}, included=${isListed || hasKnownPrefix}`);
			
			return isListed || hasKnownPrefix;
		});

		console.log('=== PARTIAL BANNER LISTS WITH RUWIKI CONFIG ===');
		console.log('Banner templates after filtering:', bannerTemplates.length);
		bannerTemplates.forEach( ( t, i ) => {
			console.log(`Banner ${i}: "${t.getTitle().getMainText()}" (isShell: ${t.isShellTemplate()})`);
		});

		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell templates that passed filtering:', nonShellTemplates.length);
		
		// Even with partial banner lists, ruwiki config should catch all 3 via prefix
		expect( bannerTemplates ).toHaveLength( 4 ); // 1 shell + 3 non-shell
		expect( nonShellTemplates ).toHaveLength( 3 ); // All 3 non-shell templates
		
		const templateNames = nonShellTemplates.map( t => t.getTitle().getMainText() );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).toContain( 'Статья проекта Феминизм' );
	} );
} );
