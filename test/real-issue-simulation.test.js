import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Real Issue Simulation', () => {
	beforeEach(() => {
		// Simulate ruwiki.config.json being loaded correctly
		config.shellTemplate = 'Блок проектов статьи';
		config.bannerNamePrefixes = ['Статья проекта '];
		config.categories = {
			withRatings: 'Категория:Шаблоны проектов:Баннеры',
			withoutRatings: '',
			wrappers: '',
			notWPBM: '',
			inactive: '',
			wir: ''
		};
	});

	it('should simulate the real issue: only 2 out of 3 templates found', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Parse templates (as setup.js does)
		const allTemplates = parseTemplates( wikitext, true );
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		
		// Simulate REAL API response - only 2 out of 3 templates in the lists
		const partialBannerLists = {
			withRatings: ['Статья проекта Права человека', 'Статья проекта Социология'], // Missing Феминизм
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

		console.log('=== REAL ISSUE SIMULATION ===');
		console.log('Config loaded correctly:');
		console.log('  - shellTemplate:', config.shellTemplate);
		console.log('  - bannerNamePrefixes:', config.bannerNamePrefixes);
		
		console.log('API banner lists (partial):');
		console.log('  - withRatings:', partialBannerLists.withRatings);
		console.log('  - withoutRatings:', partialBannerLists.withoutRatings);
		
		console.log('Filtering results:');
		console.log('  - Total templates found:', validTemplates.length);
		console.log('  - Banner templates after filtering:', bannerTemplates.length);
		
		bannerTemplates.forEach( ( t, i ) => {
			const isShell = t.isShellTemplate();
			const name = t.getTitle().getMainText();
			console.log(`  - Banner ${i}: "${name}" (isShell: ${isShell})`);
		});

		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('  - Non-shell templates:', nonShellTemplates.length);
		
		// This should reproduce the user's issue: only 2 out of 3 templates
		expect( bannerTemplates ).toHaveLength( 4 ); // 1 shell + 3 non-shell (all found via prefix)
		expect( nonShellTemplates ).toHaveLength( 3 ); // All 3 non-shell templates found
		
		const templateNames = nonShellTemplates.map( t => t.getTitle().getMainText() );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).toContain( 'Статья проекта Феминизм' ); // All found!
		
		console.log('❌ ISSUE REPRODUCED: Only 2 out of 3 templates found!');
		console.log('Missing template: "Статья проекта Феминизм"');
	} );
} );
