import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import config from '../src/constants/config.js';

describe('Shell Template Alias Issues', () => {
	beforeEach(() => {
		// Reset config to simulate the issue
		config.shellTemplate = 'Шаблон:Блок проектов статьи';
	});

	it('should detect double prefix issue in aliases', () => {
		// Simulate the double prefix issue: [Шаблон:Шаблон:Блок проектов статьи]
		const problematicAliases = ['Шаблон:Шаблон:Блок проектов статьи'];
		
		console.log('=== DOUBLE PREFIX ISSUE TEST ===');
		console.log('Problematic aliases:', problematicAliases);

		// Test normalization function
		const normalize = ( name ) => String( name || '' )
			.replace( /^Template:/i, '' )
			.replace( /^Шаблон:/i, '' );

		problematicAliases.forEach( ( alias, i ) => {
			const normalized = normalize( alias );
			console.log(`Alias ${i}: "${alias}" -> normalized: "${normalized}"`);
			
			// The double prefix should be handled
			expect( normalized ).toBe( 'Шаблон:Блок проектов статьи' );
		});
	});

	it('should handle shell template detection with various alias formats', () => {
		const testCases = [
			{
				name: 'Блок проектов статьи',
				aliases: ['Шаблон:Блок проектов статьи'],
				expected: true
			},
			{
				name: 'Блок проектов статьи', 
				aliases: ['Шаблон:Шаблон:Блок проектов статьи'], // Double prefix
				expected: false // Should fail due to double prefix
			},
			{
				name: 'Блок проектов статьи',
				aliases: ['Template:Блок проектов статьи'],
				expected: true
			},
			{
				name: 'Блок проектов статьи',
				aliases: ['Блок проектов статьи'], // No prefix
				expected: true
			}
		];

		console.log('=== SHELL TEMPLATE ALIAS DETECTION TEST ===');

		testCases.forEach( ( testCase, i ) => {
			console.log(`Test case ${i}: "${testCase.name}" with aliases:`, testCase.aliases);
			
			// Simulate the normalization and matching logic
			const normalize = ( name ) => String( name || '' )
				.replace( /^Template:/i, '' )
				.replace( /^Шаблон:/i, '' );

			const normalizedMain = normalize( testCase.name );
			console.log(`  - Normalized main: "${normalizedMain}"`);

			const aliasMatches = testCase.aliases.map( alias => {
				const normalizedAlias = normalize( alias );
				console.log(`  - Alias "${alias}" -> normalized: "${normalizedAlias}"`);
				return normalizedAlias === normalizedMain;
			});

			const hasMatch = aliasMatches.some( match => match );
			console.log(`  - Has match: ${hasMatch}`);
			console.log(`  - Expected: ${testCase.expected}`);
			
			expect( hasMatch ).toBe( testCase.expected );
		});
	});

	it('should detect when aliases have incorrect prefixes', () => {
		const shellTemplate = 'Блок проектов статьи';
		const configShellTemplate = 'Шаблон:Блок проектов статьи';
		
		// Test various alias scenarios that might cause issues
		const aliasScenarios = [
			{
				aliases: ['Шаблон:Блок проектов статьи'],
				description: 'Normal alias with prefix',
				shouldMatch: true
			},
			{
				aliases: ['Шаблон:Шаблон:Блок проектов статьи'],
				description: 'Double prefix alias',
				shouldMatch: false
			},
			{
				aliases: ['Template:Блок проектов статьи'],
				description: 'English prefix alias',
				shouldMatch: true
			},
			{
				aliases: ['Template:Template:Блок проектов статьи'],
				description: 'Double English prefix alias',
				shouldMatch: false
			}
		];

		console.log('=== ALIAS PREFIX DETECTION TEST ===');
		console.log(`Shell template: "${shellTemplate}"`);
		console.log(`Config shell template: "${configShellTemplate}"`);

		aliasScenarios.forEach( ( scenario, i ) => {
			console.log(`\nScenario ${i}: ${scenario.description}`);
			console.log(`Aliases:`, scenario.aliases);

			// Test normalization
			const normalize = ( name ) => String( name || '' )
				.replace( /^Template:/i, '' )
				.replace( /^Шаблон:/i, '' );

			const normalizedMain = normalize( shellTemplate );
			console.log(`Normalized main: "${normalizedMain}"`);

			const matches = scenario.aliases.map( alias => {
				const normalizedAlias = normalize( alias );
				const matches = normalizedAlias === normalizedMain;
				console.log(`  - "${alias}" -> "${normalizedAlias}" -> matches: ${matches}`);
				return matches;
			});

			const hasMatch = matches.some( match => match );
			console.log(`Has match: ${hasMatch} (expected: ${scenario.shouldMatch})`);
			
			expect( hasMatch ).toBe( scenario.shouldMatch );
		});
	});
} );
