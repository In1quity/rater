import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';

describe('Template Parsing Errors', () => {
	beforeEach(() => {
		// Reset any cached state
	});

	it('should handle templates that return null from getTitle()', () => {
		// Create a mock template that simulates the "unknown" case
		const wikitext = `{{InvalidTemplate}}`;
		
		console.log('=== NULL GETTITLE TEST ===');
		console.log('Wikitext:', wikitext);

		const templates = parseTemplates( wikitext, false );
		
		console.log('Parsed templates:', templates.length);
		templates.forEach( ( template, i ) => {
			try {
				const title = template.getTitle ? template.getTitle() : null;
				const name = title ? title.getMainText() : 'unknown';
				console.log(`Template ${i}: "${name}"`);
			} catch ( error ) {
				console.log(`Template ${i}: ERROR - ${error.message}`);
			}
		});

		// Should handle the case gracefully
		expect( templates ).toHaveLength( 1 );
		
		const template = templates[0];
		// The template should exist but getTitle() might return null
		expect( template ).toBeDefined();
	});

	it('should handle malformed template syntax', () => {
		// Test various malformed template scenarios
		const malformedTemplates = [
			'{{Unclosed template',
			'{{Template with | broken | syntax',
			'{{Template with = missing value',
			'{{Template with }} extra braces',
			'{{Template with {{ nested }} issues }}'
		];

		console.log('=== MALFORMED TEMPLATES TEST ===');

		malformedTemplates.forEach( ( wikitext, index ) => {
			console.log(`Testing malformed template ${index}:`, wikitext);
			
			const templates = parseTemplates( wikitext, false );
			
			console.log(`  - Parsed ${templates.length} templates`);
			templates.forEach( ( template, i ) => {
				try {
					const title = template.getTitle ? template.getTitle() : null;
					const name = title ? title.getMainText() : 'unknown';
					console.log(`    - Template ${i}: "${name}"`);
				} catch ( error ) {
					console.log(`    - Template ${i}: ERROR - ${error.message}`);
				}
			});
		});
	});

	it('should handle templates with special characters that break parsing', () => {
		// Test templates with characters that might cause parsing issues
		const specialCharTemplates = [
			'{{Template with "quotes"}}',
			'{{Template with \'single quotes\'}}',
			'{{Template with <tags>}}',
			'{{Template with &amp; entities}}',
			'{{Template with unicode: 测试}}'
		];

		console.log('=== SPECIAL CHARACTERS TEST ===');

		specialCharTemplates.forEach( ( wikitext, index ) => {
			console.log(`Testing special chars template ${index}:`, wikitext);
			
			const templates = parseTemplates( wikitext, false );
			
			console.log(`  - Parsed ${templates.length} templates`);
			templates.forEach( ( template, i ) => {
				try {
					const title = template.getTitle ? template.getTitle() : null;
					const name = title ? title.getMainText() : 'unknown';
					console.log(`    - Template ${i}: "${name}"`);
				} catch ( error ) {
					console.log(`    - Template ${i}: ERROR - ${error.message}`);
				}
			});
		});
	});

	it('should handle recursive parsing with corrupted nested templates', () => {
		const wikitextWithCorruptedNested = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизмважность=высокаяуровень=I}}
}}`;

		console.log('=== CORRUPTED NESTED TEMPLATES TEST ===');
		console.log('Wikitext with corrupted nested templates:', wikitextWithCorruptedNested);

		const templates = parseTemplates( wikitextWithCorruptedNested, true );
		
		console.log('Parsed templates (recursive):', templates.length);
		templates.forEach( ( template, i ) => {
			try {
				const title = template.getTitle ? template.getTitle() : null;
				const name = title ? title.getMainText() : 'unknown';
				console.log(`Template ${i}: "${name}"`);
			} catch ( error ) {
				console.log(`Template ${i}: ERROR - ${error.message}`);
			}
		});

		// Should parse all templates, including the corrupted one
		expect( templates.length ).toBeGreaterThanOrEqual( 3 );
		
		// Check that we get the expected template names
		const templateNames = templates.map( template => {
			try {
				const title = template.getTitle ? template.getTitle() : null;
				return title ? title.getMainText() : 'unknown';
			} catch ( error ) {
				return 'error';
			}
		});
		
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		// The corrupted template should be parsed but might show as "unknown" or have encoding issues
		expect( templateNames.some( name => 
			name === 'unknown' || 
			name === 'error' || 
			name.includes( 'Статья проекта Феминизм' )
		) ).toBe( true );
	});
} );
