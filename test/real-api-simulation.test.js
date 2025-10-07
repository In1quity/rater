import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Real API Simulation', () => {
	beforeEach(() => {
		config.shellTemplate = 'Блок проектов статьи';
		// Simulate real config - might be empty or different
		config.bannerNamePrefixes = [];
	});

	it('should simulate what happens with empty banner lists', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Parse templates
		const allTemplates = parseTemplates( wikitext, true );
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		
		console.log('=== REAL API SIMULATION ===');
		console.log('All templates found:', allTemplates.length);
		console.log('Valid templates:', validTemplates.length);
		
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
				console.log(`✓ Shell template "${template.getTitle().getMainText()}" - included`);
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
			
			// Fallback: treat as banner if it matches known name prefixes (empty array)
			const hasKnownPrefix = Array.isArray( config.bannerNamePrefixes ) && 
				config.bannerNamePrefixes.some( ( prefix ) => 
					typeof prefix === 'string' && mainText.indexOf( prefix ) === 0
				);
			
			console.log(`Template "${mainText}": isListed=${isListed}, hasKnownPrefix=${hasKnownPrefix}, included=${isListed || hasKnownPrefix}`);
			
			return isListed || hasKnownPrefix;
		});

		console.log('Banner templates after filtering:', bannerTemplates.length);
		bannerTemplates.forEach( ( t, i ) => {
			console.log(`Banner ${i}: "${t.getTitle().getMainText()}" (isShell: ${t.isShellTemplate()})`);
		});

		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell templates that passed filtering:', nonShellTemplates.length);
		
		// With empty banner lists and no prefixes, only shell template should pass
		expect( bannerTemplates ).toHaveLength( 1 ); // Only shell template
		expect( nonShellTemplates ).toHaveLength( 0 ); // No non-shell templates
	} );

	it('should check what happens with partial banner lists', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Parse templates
		const allTemplates = parseTemplates( wikitext, true );
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		
		// Simulate partial banner lists (only 2 out of 3 templates are in the lists)
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
			
			// Fallback: treat as banner if it matches known name prefixes (empty)
			const hasKnownPrefix = Array.isArray( config.bannerNamePrefixes ) && 
				config.bannerNamePrefixes.some( ( prefix ) => 
					typeof prefix === 'string' && mainText.indexOf( prefix ) === 0
				);
			
			console.log(`Template "${mainText}": isListed=${isListed}, hasKnownPrefix=${hasKnownPrefix}, included=${isListed || hasKnownPrefix}`);
			
			return isListed || hasKnownPrefix;
		});

		console.log('=== PARTIAL BANNER LISTS ===');
		console.log('Banner templates after filtering:', bannerTemplates.length);
		bannerTemplates.forEach( ( t, i ) => {
			console.log(`Banner ${i}: "${t.getTitle().getMainText()}" (isShell: ${t.isShellTemplate()})`);
		});

		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell templates that passed filtering:', nonShellTemplates.length);
		
		// With partial banner lists, only 2 out of 3 templates should pass
		expect( bannerTemplates ).toHaveLength( 3 ); // 1 shell + 2 non-shell
		expect( nonShellTemplates ).toHaveLength( 2 ); // Only 2 non-shell templates
		
		const templateNames = nonShellTemplates.map( t => t.getTitle().getMainText() );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).not.toContain( 'Статья проекта Феминизм' ); // This one is missing!
	} );
} );
