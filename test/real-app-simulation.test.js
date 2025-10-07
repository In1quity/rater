import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Real App Simulation', () => {
	beforeEach(() => {
		// Simulate ruwiki.config.json being loaded
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

	it('should work correctly with ruwiki config in real app', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Parse templates (as setup.js does)
		const allTemplates = parseTemplates( wikitext, true );
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		
		// Simulate empty banner lists from API (as they might be in real app)
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

		console.log('=== REAL APP SIMULATION ===');
		console.log('Config loaded:');
		console.log('  - shellTemplate:', config.shellTemplate);
		console.log('  - bannerNamePrefixes:', config.bannerNamePrefixes);
		console.log('  - categories.withRatings:', config.categories.withRatings);
		
		console.log('Banner filtering results:');
		console.log('  - Total templates found:', validTemplates.length);
		console.log('  - Banner templates after filtering:', bannerTemplates.length);
		
		bannerTemplates.forEach( ( t, i ) => {
			const isShell = t.isShellTemplate();
			const name = t.getTitle().getMainText();
			console.log(`  - Banner ${i}: "${name}" (isShell: ${isShell})`);
		});

		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('  - Non-shell templates:', nonShellTemplates.length);
		
		// With ruwiki config, all 3 templates should be recognized
		expect( bannerTemplates ).toHaveLength( 4 ); // 1 shell + 3 non-shell
		expect( nonShellTemplates ).toHaveLength( 3 ); // All 3 non-shell templates
		
		const templateNames = nonShellTemplates.map( t => t.getTitle().getMainText() );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).toContain( 'Статья проекта Феминизм' );
		
		console.log('✅ SUCCESS: All 3 templates recognized with ruwiki config!');
	} );
} );
