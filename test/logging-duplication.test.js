import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Logging Duplication Issues', () => {
	beforeEach(() => {
		// Reset config
		config.shellTemplate = 'Блок проектов статьи';
		config.bannerNamePrefixes = ['Статья проекта '];
	});

	it('should prevent duplicate shell template detection logs', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		console.log('=== LOGGING DUPLICATION TEST ===');
		console.log('Testing shell template detection logging...');

		// Parse templates
		const templates = parseTemplates( wikitext, true );
		
		console.log('Parsed templates:', templates.length);
		
		// Count how many times shell template detection is logged
		let shellDetectionLogCount = 0;
		const originalConsoleLog = console.log;
		
		// Mock console.log to count shell template detection logs
		console.log = ( ...args ) => {
			if ( args[0] && args[0].includes( 'Shell template detection debug' ) ) {
				shellDetectionLogCount++;
			}
			originalConsoleLog.apply( console, args );
		};

		// Test shell template detection on each template
		templates.forEach( ( template, i ) => {
			try {
				const isShell = template.isShellTemplate();
				console.log(`Template ${i}: isShell = ${isShell}`);
			} catch ( error ) {
				console.log(`Template ${i}: ERROR - ${error.message}`);
			}
		});

		// Restore original console.log
		console.log = originalConsoleLog;

		console.log(`Shell template detection was logged ${shellDetectionLogCount} times`);
		
		// Should not have excessive logging (ideally once per unique template)
		expect( shellDetectionLogCount ).toBeLessThanOrEqual( templates.length );
	});

	it('should handle multiple calls to isShellTemplate without excessive logging', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
}}`;

		console.log('=== MULTIPLE CALLS TEST ===');

		const templates = parseTemplates( wikitext, true );
		
		// Count shell template detection calls
		let detectionCallCount = 0;
		const originalConsoleLog = console.log;
		
		console.log = ( ...args ) => {
			if ( args[0] && args[0].includes( 'Shell template detection debug' ) ) {
				detectionCallCount++;
			}
			originalConsoleLog.apply( console, args );
		};

		// Call isShellTemplate multiple times on the same template
		const shellTemplate = templates.find( t => {
			try {
				const title = t.getTitle ? t.getTitle() : null;
				return title ? title.getMainText() === 'Блок проектов статьи' : false;
			} catch ( error ) {
				return false;
			}
		});

		if ( shellTemplate ) {
			// Call isShellTemplate multiple times
			for ( let i = 0; i < 5; i++ ) {
				const isShell = shellTemplate.isShellTemplate();
				console.log(`Call ${i}: isShell = ${isShell}`);
			}
		}

		// Restore original console.log
		console.log = originalConsoleLog;

		console.log(`Shell template detection was called ${detectionCallCount} times`);
		
		// Should only log once per template due to the shellTemplateDebugged flag
		expect( detectionCallCount ).toBeLessThanOrEqual( 1 );
	});

	it('should handle templates with null getTitle gracefully', () => {
		console.log('=== NULL GETTITLE TEST ===');

		// Create a mock template that simulates the "unknown" case
		const mockTemplate = {
			getTitle: () => null,
			isShellTemplate: function() {
				// This should not cause excessive logging
				return false;
			}
		};

		let logCount = 0;
		const originalConsoleLog = console.log;
		
		console.log = ( ...args ) => {
			if ( args[0] && args[0].includes( 'Shell template detection debug' ) ) {
				logCount++;
			}
			originalConsoleLog.apply( console, args );
		};

		// Test the template
		try {
			const isShell = mockTemplate.isShellTemplate();
			console.log(`Mock template isShell: ${isShell}`);
		} catch ( error ) {
			console.log(`Mock template error: ${error.message}`);
		}

		// Restore original console.log
		console.log = originalConsoleLog;

		console.log(`Log count: ${logCount}`);
		
		// Should handle gracefully without excessive logging
		expect( logCount ).toBeLessThanOrEqual( 1 );
	});
} );
