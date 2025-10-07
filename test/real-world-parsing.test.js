import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Real World Parsing Issue', () => {
	beforeEach(() => {
		// Set shell template config as it would be in real app
		config.shellTemplate = 'Блок проектов статьи';
	});

	it('should reproduce the exact parsing behavior from setup.js', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// This is exactly what setup.js does: parseTemplates(wikitext, true)
		const allTemplates = parseTemplates( wikitext, true );
		
		console.log('=== REAL WORLD PARSING DEBUG ===');
		console.log('Input wikitext:', wikitext);
		console.log('All templates found:', allTemplates.length);
		
		allTemplates.forEach( ( t, i ) => {
			console.log(`Template ${i}:`, t.getTitle().getMainText());
			console.log(`  - isShellTemplate:`, t.isShellTemplate());
			if ( t.isShellTemplate() ) {
				console.log(`  - shellParam1Value:`, t.shellParam1Value);
			}
		});

		// Check what templates are found
		expect( allTemplates.length ).toBeGreaterThan( 0 );
		
		// Find shell template
		const shellTemplate = allTemplates.find( t => t.isShellTemplate() );
		expect( shellTemplate ).toBeDefined();
		
		// Find non-shell templates (should be 3)
		const nonShellTemplates = allTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell templates found:', nonShellTemplates.length);
		nonShellTemplates.forEach( ( t, i ) => {
			console.log(`  Non-shell ${i}:`, t.getTitle().getMainText());
		});
		
		// This is the key test - how many non-shell templates are found?
		// If this fails, it means the parsing is not working correctly
		expect( nonShellTemplates ).toHaveLength( 3 );
		
		// Check that all 3 expected templates are present
		const templateNames = nonShellTemplates.map( t => t.getTitle().getMainText() );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).toContain( 'Статья проекта Феминизм' );
		
		// Debug: if the test fails, let's see what was actually found
		if ( nonShellTemplates.length !== 3 ) {
			console.log('EXPECTED 3 non-shell templates, but found:', nonShellTemplates.length);
			console.log('Template names found:', templateNames);
		}
	} );

	it('should show what happens with non-recursive parsing', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// This is what MainWindow does initially: parseTemplates(wikitext, false)
		const topLevelTemplates = parseTemplates( wikitext, false );
		
		console.log('=== TOP-LEVEL PARSING DEBUG ===');
		console.log('Top-level templates found:', topLevelTemplates.length);
		
		topLevelTemplates.forEach( ( t, i ) => {
			console.log(`Top-level ${i}:`, t.getTitle().getMainText());
			console.log(`  - isShellTemplate:`, t.isShellTemplate());
		});

		// Should find only the shell template at top level
		expect( topLevelTemplates ).toHaveLength( 1 );
		expect( topLevelTemplates[0].isShellTemplate() ).toBe( true );
	} );
} );
