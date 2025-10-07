import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Setup.js Simulation', () => {
	beforeEach(() => {
		config.shellTemplate = 'Блок проектов статьи';
		// Mock banner lists as they would be in real app
		config.bannerNamePrefixes = ['Статья проекта'];
	});

	it('should simulate the exact setup.js filtering logic', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Step 1: Parse all templates (as setup.js does)
		const allTemplates = parseTemplates( wikitext, true );
		expect( allTemplates.length ).toBeGreaterThan( 0 );

		// Step 2: Filter out invalid templates (as setup.js does)
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		expect( validTemplates.length ).toBeGreaterThan( 0 );

		// Step 3: Simulate the banner filtering logic from setup.js
		const bannerTemplates = validTemplates.filter( ( template ) => {
			if ( template.isShellTemplate() ) {
				return true; // Shell template is always included
			}
			
			const mainText = template.redirectTarget ?
				template.redirectTarget.getMainText() :
				template.getTitle().getMainText();
			
			// Check if it matches banner name prefixes (fallback logic)
			const hasKnownPrefix = Array.isArray( config.bannerNamePrefixes ) && 
				config.bannerNamePrefixes.some( ( prefix ) => 
					typeof prefix === 'string' && mainText.indexOf( prefix ) === 0
				);
			
			return hasKnownPrefix;
		});

		console.log('=== SETUP.JS SIMULATION ===');
		console.log('All templates:', allTemplates.length);
		console.log('Valid templates:', validTemplates.length);
		console.log('Banner templates after filtering:', bannerTemplates.length);
		
		bannerTemplates.forEach( ( t, i ) => {
			console.log(`Banner ${i}:`, t.getTitle().getMainText(), '- isShell:', t.isShellTemplate());
		});

		// Check results
		expect( bannerTemplates.length ).toBeGreaterThan( 0 );
		
		// Find shell template
		const shellTemplate = bannerTemplates.find( t => t.isShellTemplate() );
		expect( shellTemplate ).toBeDefined();
		
		// Find non-shell templates
		const nonShellTemplates = bannerTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell banner templates found:', nonShellTemplates.length);
		
		// This is the key - how many non-shell templates make it through the filtering?
		expect( nonShellTemplates ).toHaveLength( 3 );
		
		const templateNames = nonShellTemplates.map( t => t.getTitle().getMainText() );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).toContain( 'Статья проекта Феминизм' );
	} );
} );
