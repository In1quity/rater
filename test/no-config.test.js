import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('No Config Loading (Default Behavior)', () => {
	beforeEach(() => {
		// Use default config (no ruwiki.config.json loaded)
		config.shellTemplate = 'Блок проектов статьи'; // Match the wikitext
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

	it('should fail to recognize Russian templates with default config', () => {
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

		console.log('=== NO CONFIG TEST (DEFAULT BEHAVIOR) ===');
		console.log('Banner templates after filtering:', bannerTemplates.length);
		bannerTemplates.forEach( ( t, i ) => {
			console.log(`Banner ${i}: "${t.getTitle().getMainText()}" (isShell: ${t.isShellTemplate()})`);
		});

		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell templates that passed filtering:', nonShellTemplates.length);
		
		// With default config, Russian templates should NOT be recognized
		expect( bannerTemplates ).toHaveLength( 1 ); // Only shell template
		expect( nonShellTemplates ).toHaveLength( 0 ); // No non-shell templates recognized
	} );
} );
