import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Shell Template Debug', () => {
	beforeEach(() => {
		// Use default config
		config.shellTemplate = 'WikiProject banner shell';
		config.bannerNamePrefixes = ['WP ', 'WikiProject '];
	});

	it('should debug shell template recognition', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Parse templates
		const allTemplates = parseTemplates( wikitext, true );
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		
		console.log('=== SHELL TEMPLATE DEBUG ===');
		console.log('All templates found:', validTemplates.length);
		
		validTemplates.forEach( ( template, i ) => {
			const mainText = template.redirectTarget ?
				template.redirectTarget.getMainText() :
				template.getTitle().getMainText();
			
			const isShell = template.isShellTemplate();
			
			console.log(`Template ${i}: "${mainText}"`);
			console.log(`  - isShellTemplate(): ${isShell}`);
			console.log(`  - config.shellTemplate: "${config.shellTemplate}"`);
			console.log(`  - template.getTitle().getMainText(): "${template.getTitle().getMainText()}"`);
			console.log(`  - template.redirectTarget: ${template.redirectTarget ? 'exists' : 'null'}`);
		});

		// Check if any template is recognized as shell
		const shellTemplates = validTemplates.filter( t => t.isShellTemplate() );
		console.log('Shell templates found:', shellTemplates.length);
		
		expect( validTemplates.length ).toBeGreaterThan( 0 );
	} );
} );
