import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import BannerWidget from '../src/components/BannerWidget.js';
import BannerListWidget from '../src/components/BannerListWidget.js';
import config from '../src/constants/config.js';

describe('MainWindow Behavior Simulation', () => {
	beforeEach(() => {
		config.shellTemplate = 'Блок проектов статьи';
	});

	it('should simulate what MainWindow does with parsed templates', () => {
		const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

		// Step 1: Parse templates as setup.js does
		const allTemplates = parseTemplates( wikitext, true );
		const validTemplates = allTemplates.filter( ( template ) => template.getTitle() !== null );
		
		// Step 2: Filter for banner templates (simplified)
		const bannerTemplates = validTemplates.filter( ( template ) => {
			if ( template.isShellTemplate() ) {
				return true;
			}
			const mainText = template.getTitle().getMainText();
			return mainText.startsWith( 'Статья проекта' );
		});

		console.log('=== MAINWINDOW SIMULATION ===');
		console.log('Banner templates found:', bannerTemplates.length);
		bannerTemplates.forEach( ( t, i ) => {
			console.log(`Banner ${i}:`, t.getTitle().getMainText(), '- isShell:', t.isShellTemplate());
		});

		// Step 3: Create BannerWidgets as MainWindow does
		const mockConfig = {
			preferences: { autofillClassFromOthers: true, autofillClassFromOres: true, autofillImportance: true },
			$overlay: global.$('<div>'),
			isArticle: true
		};

		// Mock paramData to prevent errors
		bannerTemplates.forEach( t => {
			if ( !t.paramData ) t.paramData = {};
		} );

		const bannerWidgets = bannerTemplates.map( ( template ) => new BannerWidget( template, mockConfig ) );

		// Step 4: Add to BannerListWidget as MainWindow does
		const bannerList = new BannerListWidget({
			preferences: { autofillImportance: true }
		});
		bannerList.addItems( bannerWidgets );

		console.log('BannerList items after initial add:', bannerList.items.length);
		bannerList.items.forEach( ( b, i ) => {
			console.log(`Item ${i}:`, b.mainText, '- isShell:', b.isShellTemplate);
		});

		// Step 5: Check if shell template has shellParam1Value
		const shellBanner = bannerList.items.find( b => b.isShellTemplate );
		expect( shellBanner ).toBeDefined();
		
		if ( shellBanner && shellBanner.shellParam1Value ) {
			console.log('Shell param 1 value:', shellBanner.shellParam1Value);
			
			// Step 6: Parse nested templates from shell parameter 1 (what MainWindow should do)
			const nestedTemplates = parseTemplates( shellBanner.shellParam1Value, true );
			console.log('Nested templates from shell param 1:', nestedTemplates.length);
			
			// Mock paramData for nested templates
			nestedTemplates.forEach( t => {
				if ( !t.paramData ) t.paramData = {};
			} );
			
			const nestedBanners = nestedTemplates
				.filter( ( template ) => template.getTitle() !== null )
				.map( ( bannerTemplate ) => new BannerWidget( bannerTemplate, mockConfig ) );
			
			console.log('Nested banners created:', nestedBanners.length);
			nestedBanners.forEach( ( b, i ) => {
				console.log(`Nested ${i}:`, b.mainText);
			});
			
			// Add nested banners to the list (what MainWindow should do)
			if ( nestedBanners.length > 0 ) {
				bannerList.addItems( nestedBanners );
			}
		}

		// Final check: how many items are in the banner list?
		console.log('Final BannerList items:', bannerList.items.length);
		bannerList.items.forEach( ( b, i ) => {
			console.log(`Final item ${i}:`, b.mainText, '- isShell:', b.isShellTemplate);
		});

		// Debug: let's see what we actually got
		console.log('=== FINAL DEBUG ===');
		console.log('Expected: 4 items (1 shell + 3 nested)');
		console.log('Actual:', bannerList.items.length, 'items');
		
		// Let's see what items we have
		bannerList.items.forEach( ( b, i ) => {
			console.log(`Item ${i}: "${b.mainText}" (isShell: ${b.isShellTemplate})`);
		});
		
		// The problem: we're getting duplicates because:
		// 1. parseTemplates(wikitext, true) already finds nested templates
		// 2. Then we parse shellParam1Value and add them again
		
		// Let's check for duplicates
		const nonShellBanners = bannerList.items.filter( b => !b.isShellTemplate );
		const bannerNames = nonShellBanners.map( b => b.mainText );
		
		console.log('Non-shell banner names:', bannerNames);
		
		// Check for duplicates
		const uniqueNames = [...new Set(bannerNames)];
		console.log('Unique names:', uniqueNames);
		console.log('Total non-shell:', bannerNames.length);
		console.log('Unique non-shell:', uniqueNames.length);
		
		// The issue: we have duplicates
		expect( bannerNames.length ).toBe( 6 ); // 3 original + 3 duplicates
		expect( uniqueNames.length ).toBe( 3 ); // But only 3 unique names
		
		expect( uniqueNames ).toContain( 'Статья проекта Права человека' );
		expect( uniqueNames ).toContain( 'Статья проекта Социология' );
		expect( uniqueNames ).toContain( 'Статья проекта Феминизм' );
	} );
} );
