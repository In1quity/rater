import { describe, it, expect } from 'vitest';
import './setup.js';
import { scanTalkBanners, findBannerTemplatesOnTalk } from '../src/services/templateScanner.js';
import config from '../src/constants/config.js';

describe('templateScanner integration', () => {
	it('detects nested project templates inside shell', async () => {
		const wikitext = `{{Блок проектов статьи|\n{{Статья проекта Права человека}}\n{{Статья проекта Социология}}\n{{Статья проекта Феминизм|важность=высокая|уровень=I}}\n}}`;
		const allBanners = {
			withRatings: [ 'Статья проекта Права человека', 'Статья проекта Социология', 'Статья проекта Феминизм' ],
			withoutRatings: [], wrappers: [], notWPBM: [], inactive: [], wir: []
		};
		const res1 = scanTalkBanners( { wikitext, allBanners, shellTemplate: config.shellTemplate, namespaceAliases: config.templateNamespaceAliases || [] } );
		expect( res1.map( (r) => r.name ) ).toContain( 'Статья проекта Права человека' );
		const res2 = await findBannerTemplatesOnTalk( { wikitext, allBanners, shellTemplate: config.shellTemplate, namespaceAliases: config.templateNamespaceAliases || [], bannerNamePrefixes: config.bannerNamePrefixes || [] } );
		const arr = Array.isArray( res2 ) ? res2 : [ res2 ];
		expect( arr.map( (t) => t.getTitle().getMainText() ) ).toContain( 'Статья проекта Права человека' );
	} );
} );


