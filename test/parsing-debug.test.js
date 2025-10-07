import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Parsing Debug', () => {
	beforeEach(() => {
		// Simulate ruwiki.config.json being loaded correctly
		config.shellTemplate = 'Блок проектов статьи';
		config.bannerNamePrefixes = ['Статья проекта '];
	});

	it('should debug parsing of the exact wikitext from user', () => {
		// Exact wikitext from user's issue
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		console.log('=== PARSING DEBUG ===');
		console.log('Original wikitext:');
		console.log(wikitext);
		console.log('');

		// Parse templates (as setup.js does)
		const allTemplates = parseTemplates( wikitext, true );
		console.log('All templates found:', allTemplates.length);
		
		allTemplates.forEach( ( template, i ) => {
			const title = template.getTitle();
			const mainText = title ? title.getMainText() : 'NO_TITLE';
			const isShell = template.isShellTemplate();
			
			console.log(`Template ${i}:`);
			console.log(`  - Title: "${mainText}"`);
			console.log(`  - isShellTemplate(): ${isShell}`);
			console.log(`  - redirectTarget: ${template.redirectTarget ? 'exists' : 'null'}`);
			console.log(`  - parameters: ${template.parameters ? template.parameters.length : 'undefined'}`);
			
			if ( template.parameters && template.parameters.length > 0 ) {
				template.parameters.forEach( ( param, j ) => {
					console.log(`    - Param ${j}: name="${param.name}", value="${param.value}"`);
				});
			}
			console.log('');
		});

		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		console.log('Valid templates (with titles):', validTemplates.length);
		
		const shellTemplates = validTemplates.filter( t => t.isShellTemplate() );
		console.log('Shell templates:', shellTemplates.length);
		
		const nonShellTemplates = validTemplates.filter( t => !t.isShellTemplate() );
		console.log('Non-shell templates:', nonShellTemplates.length);
		
		// Check if all 3 nested templates are found
		const nestedTemplateNames = nonShellTemplates.map( t => t.getTitle().getMainText() );
		console.log('Nested template names:', nestedTemplateNames);
		
		expect( validTemplates ).toHaveLength( 4 ); // 1 shell + 3 nested
		expect( shellTemplates ).toHaveLength( 1 ); // 1 shell template
		expect( nonShellTemplates ).toHaveLength( 3 ); // 3 nested templates
		
		expect( nestedTemplateNames ).toContain( 'Статья проекта Права человека' );
		expect( nestedTemplateNames ).toContain( 'Статья проекта Социология' );
		expect( nestedTemplateNames ).toContain( 'Статья проекта Феминизм' );
		
		console.log('✅ All 3 nested templates parsed correctly!');
	} );
} );
