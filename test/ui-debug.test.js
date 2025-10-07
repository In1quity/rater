import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('UI Debug', () => {
	beforeEach(() => {
		// Simulate ruwiki.config.json being loaded correctly
		config.shellTemplate = 'Блок проектов статьи';
		config.bannerNamePrefixes = ['Статья проекта '];
	});

	it('should debug UI data flow', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Simulate setup.js behavior
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

		// Filter banners (as setup.js does)
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
			
			return isListed || hasKnownPrefix;
		});

		console.log('=== UI DEBUG ===');
		console.log('Setup.js results:');
		console.log('  - Total templates found:', validTemplates.length);
		console.log('  - Banner templates after filtering:', bannerTemplates.length);
		
		const shellTemplates = bannerTemplates.filter( t => t.isShellTemplate() );
		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		
		console.log('  - Shell templates:', shellTemplates.length);
		console.log('  - Non-shell templates:', nonShellTemplates.length);
		
		// Simulate MainWindow.js receiving data from setup.js
		const data = {
			banners: bannerTemplates
		};
		
		console.log('Data passed to MainWindow:');
		console.log('  - data.banners.length:', data.banners.length);
		
		// Simulate MainWindow.js processing
		const bannerListItems = data.banners.filter( t => !t.isShellTemplate() );
		console.log('  - Banner list items (non-shell):', bannerListItems.length);
		
		bannerListItems.forEach( ( t, i ) => {
			const name = t.getTitle().getMainText();
			console.log(`    - Banner ${i}: "${name}"`);
		});

		// Check if all 3 templates are available for UI
		expect( data.banners ).toHaveLength( 4 ); // 1 shell + 3 non-shell
		expect( bannerListItems ).toHaveLength( 3 ); // 3 non-shell templates
		
		const templateNames = bannerListItems.map( t => t.getTitle().getMainText() );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).toContain( 'Статья проекта Феминизм' );
		
		console.log('✅ All 3 templates available for UI!');
	} );
} );
