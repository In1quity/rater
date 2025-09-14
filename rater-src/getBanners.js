import API from "./api";
import { isAfterDate, uniqueArray } from "./util";
import * as cache from "./cache";
import config from "./config";
// <nowiki>

// Debug logger (enable with window.RATER_DEBUG = true)
var dlog = function(){ try { if (window && window.RATER_DEBUG) { console.log.apply(console, ["[Rater:getBanners]"].concat([].slice.call(arguments))); } } catch(e){ /* ignore */ } };

var cacheBanners = function(banners) {
	cache.write("banners", banners, 2, 60);
};

/**
 * Gets banners/options from the Api
 * 
 * @returns {Promise} Resolved with: banners object, bannerOptions array
 */
var getListOfBannersFromApi = function() {

	var finishedPromise = $.Deferred();
	try { dlog("Start getListOfBannersFromApi"); } catch(e){ /* ignore */ }

	// Localized Template namespace prefix (e.g., "Template:", "Шаблон:")
	var templateNsName = (config.mw && config.mw.wgFormattedNamespaces && (config.mw.wgFormattedNamespaces[10] || "Template")) || "Template";
	var templateNsPrefix = String(templateNsName) + ":";
	try { dlog("Using template NS:", templateNsName); } catch(e){ /* ignore */ }

	var categories = Object.keys(config.categories)
		.map(function(abbreviation){
			return {
				title: config.categories[abbreviation],
				abbreviation: abbreviation,
				banners: [],
				processed: $.Deferred()
			};
		})
		// Filter out categories without titles to avoid API errors on other wikis
		.filter(function(cat){ return !!cat.title; });
	try { dlog("Root categories:", categories.map(function(c){return c.title+" ("+c.abbreviation+")";})); } catch(e){ /* ignore */ }

	// Recursively collect all template pages (ns 10) from a category and its subcategories
	var collectTemplatesRecursively = function(rootCategoryTitle) {
		var outTitles = [];
		var queue = [];
		var seen = Object.create(null);
		if (rootCategoryTitle) { queue.push(rootCategoryTitle); }

		function queryOne(catTitle, cont) {
			var params = {
				action: "query",
				format: "json",
				list: "categorymembers",
				cmtitle: catTitle,
				cmprop: "title|ns",
				cmtype: "page|subcat",
				cmlimit: "500"
			};
			if (cont) { $.extend(params, cont); }
			return API.get(params).then(function(result){
				try { dlog("Fetched:", catTitle, "members:", (result && result.query && result.query.categorymembers && result.query.categorymembers.length) || 0, result && result.continue ? "(cont)" : ""); } catch(e){ /* ignore */ }
				var members = (result && result.query && result.query.categorymembers) || [];
				members.forEach(function(m){
					var title = String(m && m.title || "");
					if (m && m.ns === 10) {
						if (title.indexOf(templateNsPrefix) === 0) { title = title.slice(templateNsPrefix.length); }
						else if (title.indexOf("Template:") === 0) { title = title.slice("Template:".length); }
						outTitles.push(title);
					} else if (m && m.ns === 14 && !seen[title]) {
						seen[title] = true;
						queue.push(title);
					}
				});
				if (result && result.continue) { return queryOne(catTitle, result.continue); }
			});
		}

		function step() {
			if (!queue.length) {
				var list = uniqueArray(outTitles);
				try { dlog("Category traversal finished. Unique templates:", list.length); } catch(e){ /* ignore */ }
				return $.Deferred().resolve(list).promise();
			}
			var next = queue.shift();
			if (seen[next]) { return step(); }
			seen[next] = true;
			try { dlog("Traverse subcategory:", next, "queue:", queue.length); } catch(e){ /* ignore */ }
			return queryOne(next).then(step, step);
		}

		return step();
	};
	
	categories.forEach(function(cat, index, arr) {
		$.when( arr[index-1] && arr[index-1].processed || true ).then(function(){
			collectTemplatesRecursively(cat.title)
				.then(function(titles){ categories[index].banners = titles || []; try{ dlog("Collected for", cat.title, ":", (titles||[]).length);}catch(e){ /* ignore */ } })
				.always(function(){ categories[index].processed.resolve(); });
		});
	});
	
	categories[categories.length-1].processed.then(function(){
		var base = { withRatings: [], withoutRatings: [], wrappers: [], notWPBM: [], inactive: [], wir: [] };
		categories.forEach(function(catObject){ base[catObject.abbreviation] = catObject.banners; });
		try { dlog("Final groups:", Object.keys(base).map(function(k){return k+":"+(base[k]||[]).length;})); } catch(e){ /* ignore */ }
		finishedPromise.resolve(base);
	});
	
	return finishedPromise;
};

/**
 * Gets banners from cache, if there and not too old
 * 
 * @returns {Promise} Resolved with banners object
 */
var getBannersFromCache = function() {
	var cachedBanners = cache.read("banners");
	if (
		!cachedBanners ||
		!cachedBanners.value ||
		!cachedBanners.staleDate
	) {
		try { dlog("Cache miss: banners"); } catch(e){ /* ignore */ }
		return $.Deferred().reject();
	}
	if ( isAfterDate(cachedBanners.staleDate) ) {
		// Update in the background; still use old list until then  
		try { dlog("Cache stale: refreshing in background"); } catch(e){ /* ignore */ }
		getListOfBannersFromApi().then(cacheBanners);
	}
	try { dlog("Cache hit: banners"); } catch(e){ /* ignore */ }
	return $.Deferred().resolve(cachedBanners.value);
};

/**
 * Gets banner names, grouped by type (withRatings, withoutRatings, wrappers, notWPBM)
 * @returns {Promise<Object>} Object of string arrays keyed by type (withRatings, withoutRatings, wrappers, notWPBM)
 */
var getBannerNames = () => getBannersFromCache()
	.then( banners => {
		// Ensure all keys exist
		if (!banners.withRatings || !banners.withoutRatings || !banners.wrappers || !banners.notWPBM || !banners.inactive || !banners.wir) {
			getListOfBannersFromApi().then(cacheBanners);
			return $.extend(
				{ withRatings: [], withoutRatings: [], wrappers: [], notWPBM: [], inactive: [], wir: [] },
				banners
			);
		}
		// Success: pass through
		return banners;
	} )
	.catch( () => {
		// Failure: get from Api, then cache them
		let bannersPromise = getListOfBannersFromApi();
		bannersPromise.then(cacheBanners);
		return bannersPromise;
	} );

export { getBannerNames };
// </nowiki>