import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Filtering Issue Investigation', () => {
	beforeEach(() => {
		config.shellTemplate = 'Блок проектов статьи';
		// Mock banner lists as they would be in real app
		config.bannerNamePrefixes = ['Статья проекта'];
	});

	it('should check which templates pass the filtering in setup.js', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Step 1: Parse all templates (as setup.js does)
		const allTemplates = parseTemplates( wikitext, true );
		console.log('=== FILTERING INVESTIGATION ===');
		console.log('All templates found:', allTemplates.length);
		
		allTemplates.forEach( ( t, i ) => {
			console.log(`Template ${i}: "${t.getTitle().getMainText()}" (isShell: ${t.isShellTemplate()})`);
		});

		// Step 2: Filter out invalid templates
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		console.log('Valid templates:', validTemplates.length);

		// Step 3: Apply the exact filtering logic from setup.js
		const bannerTemplates = validTemplates.filter( ( template ) => {
			if ( template.isShellTemplate() ) {
				console.log(`✓ Shell template "${template.getTitle().getMainText()}" - included`);
				return true;
			}
			
			const mainText = template.redirectTarget ?
				template.redirectTarget.getMainText() :
				template.getTitle().getMainText();
			
			// Check if it matches banner name prefixes (fallback logic)
			const hasKnownPrefix = Array.isArray( config.bannerNamePrefixes ) && 
				config.bannerNamePrefixes.some( ( prefix ) => 
					typeof prefix === 'string' && mainText.indexOf( prefix ) === 0
				);
			
			console.log(`Template "${mainText}": hasKnownPrefix=${hasKnownPrefix}`);
			
			return hasKnownPrefix;
		});

		console.log('Banner templates after filtering:', bannerTemplates.length);
		bannerTemplates.forEach( ( t, i ) => {
			console.log(`Banner ${i}: "${t.getTitle().getMainText()}" (isShell: ${t.isShellTemplate()})`);
		});

		// Check results
		const shellTemplate = bannerTemplates.find( t => t.isShellTemplate() );
		expect( shellTemplate ).toBeDefined();
		
		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell templates that passed filtering:', nonShellTemplates.length);
		
		// This is the key question: how many non-shell templates pass the filtering?
		expect( nonShellTemplates ).toHaveLength( 3 );
		
		const templateNames = nonShellTemplates.map( t => t.getTitle().getMainText() );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).toContain( 'Статья проекта Феминизм' );
	} );

	it('should check if the issue is with banner list filtering', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Parse templates
		const allTemplates = parseTemplates( wikitext, true );
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		
		// Simulate the real setup.js filtering with mock banner lists
		const mockBannerLists = {
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
			const isListed = mockBannerLists.withRatings.includes( mainText ) ||
					mockBannerLists.withoutRatings.includes( mainText ) ||
					mockBannerLists.wrappers.includes( mainText ) ||
					mockBannerLists.notWPBM.includes( mainText ) ||
					mockBannerLists.inactive.includes( mainText ) ||
					mockBannerLists.wir.includes( mainText );
			
			// Fallback: treat as banner if it matches known name prefixes
			const hasKnownPrefix = Array.isArray( config.bannerNamePrefixes ) && 
				config.bannerNamePrefixes.some( ( prefix ) => 
					typeof prefix === 'string' && mainText.indexOf( prefix ) === 0
				);
			
			console.log(`Template "${mainText}": isListed=${isListed}, hasKnownPrefix=${hasKnownPrefix}, included=${isListed || hasKnownPrefix}`);
			
			return isListed || hasKnownPrefix;
		});

		console.log('=== BANNER LIST FILTERING ===');
		console.log('Banner templates after filtering:', bannerTemplates.length);
		bannerTemplates.forEach( ( t, i ) => {
			console.log(`Banner ${i}: "${t.getTitle().getMainText()}" (isShell: ${t.isShellTemplate()})`);
		});

		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell templates that passed filtering:', nonShellTemplates.length);
		
		// Check if all 3 templates pass the filtering
		expect( nonShellTemplates ).toHaveLength( 3 );
	} );
} );
