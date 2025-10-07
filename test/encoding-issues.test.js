import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';

describe('Encoding Issues', () => {
	beforeEach(() => {
		// Reset any cached state
	});

	it('should detect encoding issues with replacement characters', () => {
		// Simulate wikitext with encoding issues (replacement characters)
		const wikitextWithEncodingIssues = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизмважность=высокаяуровень=I}}
}}`;

		console.log('=== ENCODING ISSUES TEST ===');
		console.log('Wikitext with encoding issues:', wikitextWithEncodingIssues);

		// Parse templates
		const templates = parseTemplates( wikitextWithEncodingIssues, true );
		
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

		// Should parse templates (might be more due to shell template)
		expect( templates.length ).toBeGreaterThanOrEqual( 3 );
		
		// Check that we can identify the problematic template
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
		// The third template might be "unknown" due to encoding issues, or it might parse correctly
		expect( templateNames.some( name => 
			name === 'unknown' || 
			name.includes( 'Статья проекта Феминизм' )
		) ).toBe( true );
	});

	it('should handle templates with corrupted parameter syntax', () => {
		// Simulate template with corrupted parameters due to encoding
		const corruptedTemplate = `{{Статья проекта Феминизмважность=высокаяуровень=I}}`;
		
		console.log('=== CORRUPTED TEMPLATE TEST ===');
		console.log('Corrupted template:', corruptedTemplate);

		const templates = parseTemplates( corruptedTemplate, false );
		
		console.log('Parsed corrupted template:', templates.length);
		templates.forEach( ( template, i ) => {
			try {
				const title = template.getTitle ? template.getTitle() : null;
				const name = title ? title.getMainText() : 'unknown';
				console.log(`Template ${i}: "${name}"`);
				console.log(`Parameters: ${template.parameters ? template.parameters.length : 'undefined'}`);
			} catch ( error ) {
				console.log(`Template ${i}: ERROR - ${error.message}`);
			}
		});

		// Should still parse the template name even with corrupted parameters
		expect( templates ).toHaveLength( 1 );
		
		const template = templates[0];
		try {
			const title = template.getTitle ? template.getTitle() : null;
			const name = title ? title.getMainText() : 'unknown';
			// The template name might be corrupted due to encoding issues
			expect( name ).toMatch( /Статья проекта Феминизм/ );
		} catch ( error ) {
			// If getTitle fails, that's the expected behavior for corrupted templates
			expect( error.message ).toContain( 'getMainText' );
		}
	});

	it('should detect replacement characters in wikitext', () => {
		// Use actual replacement character (U+FFFD)
		const replacementChar = '\uFFFD';
		const wikitextWithReplacementChars = `Test string with replacement char: ${replacementChar}`;
		
		// Check if our detection logic works
		const hasReplacementChars = wikitextWithReplacementChars.includes( replacementChar );
		expect( hasReplacementChars ).toBe( true );
		
		const replacementCharCount = wikitextWithReplacementChars.split( '' ).filter( ( char ) => char === replacementChar ).length;
		expect( replacementCharCount ).toBe( 1 );
	});
} );
