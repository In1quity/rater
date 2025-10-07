import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import BannerWidget from '../src/components/BannerWidget.js';
import BannerListWidget from '../src/components/BannerListWidget.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('OOUI Banner display', () => {
	beforeEach(() => {
		// Ensure shell detection matches ruwiki config
		config.shellTemplate = 'Блок проектов статьи';
	});

	it('should display 3 project banners parsed from shell parameter 1', () => {
		const wikitext = `{{Блок проектов статьи|\n{{Статья проекта Права человека}}\n{{Статья проекта Социология}}\n{{Статья проекта Феминизм|важность=высокая|уровень=I}}\n}}`;

		// Parse only top-level templates (as MainWindow does initially)
		const topLevelTemplates = parseTemplates( wikitext, false );

		// Mock paramData to prevent undefined access
		topLevelTemplates.forEach( t => {
			if ( !t.paramData ) t.paramData = {};
		} );

		// Build widgets as MainWindow would initially
		const widgets = topLevelTemplates.map( ( t ) => new BannerWidget( t, {
			preferences: { autofillClassFromOthers: true, autofillClassFromOres: true, autofillImportance: true },
			$overlay: global.$('<div>'),
			isArticle: true
		} ) );

		const list = new BannerListWidget({
			preferences: { autofillImportance: true }
		});
		list.addItems( widgets );

		// Initially should have only 1 template (the shell)
		expect( list.items ).toHaveLength( 1 );
		const shell = list.items.find( ( b ) => b.isShellTemplate );
		expect( shell ).toBeDefined();
		expect( shell.shellParam1Value ).toContain( '{{Статья проекта Права человека}}' );
		expect( shell.shellParam1Value ).toContain( '{{Статья проекта Социология}}' );
		expect( shell.shellParam1Value ).toContain( '{{Статья проекта Феминизм|важность=высокая|уровень=I}}' );

		// Now simulate the MainWindow logic for parsing nested templates
		if ( shell && shell.shellParam1Value ) {
			const nestedTemplates = parseTemplates( shell.shellParam1Value, true );
			
			// Mock paramData for nested templates
			nestedTemplates.forEach( t => {
				if ( !t.paramData ) t.paramData = {};
			} );
			
			const nestedBanners = nestedTemplates
				.filter( ( template ) => template.getTitle() !== null )
				.map( ( bannerTemplate ) => new BannerWidget(
					bannerTemplate,
					{
						preferences: { autofillClassFromOthers: true, autofillClassFromOres: true, autofillImportance: true },
						$overlay: global.$('<div>'),
						isArticle: true
					}
				) );
			
			// Add nested banners to the list
			if ( nestedBanners.length > 0 ) {
				list.addItems( nestedBanners );
			}
		}

		// After adding nested templates, should have 4 total (1 shell + 3 nested)
		expect( list.items ).toHaveLength( 4 );
		const nonShell = list.items.filter( ( b ) => !b.isShellTemplate );
		expect( nonShell ).toHaveLength( 3 );

		// Check that all 3 nested templates are present
		const templateNames = nonShell.map( b => b.mainText );
		expect( templateNames ).toContain( 'Статья проекта Права человека' );
		expect( templateNames ).toContain( 'Статья проекта Социология' );
		expect( templateNames ).toContain( 'Статья проекта Феминизм' );
	} );
} );


