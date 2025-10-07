import { applyBannerInsert as applyCore } from '@utils/wikitext-apply.js';
// <nowiki>

// Service wrapper for applying banner inserts to talk wikitext
const applyBannerInsert = function ( talkWikitext, bannersWikitext, existingBannerNames ) {
	return applyCore( talkWikitext, bannersWikitext, existingBannerNames );
};

export { applyBannerInsert };
// </nowiki>
