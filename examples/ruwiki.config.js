/* <nowiki> */

// Example per-wiki configuration for Russian Wikipedia (ruwiki)
// Copy this file's contents to a wiki page (e.g., on mediawiki.org) and load it via:
// mw.loader.load("https://www.mediawiki.org/w/index.php?title=Path/To/ruwiki.config.js&action=raw&ctype=text/javascript");
// Then load the Rater bundle:
// mw.loader.load("https://www.mediawiki.org/w/index.php?title=rater.js&action=raw&ctype=text/javascript");

/*
Required: Set ORES wiki model for quality predictions used by Rater.
Optional: Override shell templates, banner defaults, and custom banners to match local wiki usage.
See rater-src/config.js for the default structure you can override.
*/

window.RATER_CONFIG = {
	// Configure ORES to use Russian Wikipedia models
	ores: {
		wiki: "ruwiki"
	},

	// Uncomment and adjust as needed for your wiki:
	// shellTemplates: [
	// 	"Название шаблона оболочки проектов"
	// ],

	// bannerDefaults: {
	// 	classes: [
	// 		"FA", "GA", "B", "C", "Start", "Stub", "List"
	// 	],
	// 	importances: [
	// 		"Top", "High", "Mid", "Low", "Bottom", "NA"
	// 	]
	// },

	// customBanners: {
	// 	"Проект:Пример": {
	// 		classes: ["FA", "GA", "B", "C", "Start", "Stub"],
	// 		importances: ["Top", "High", "Mid", "Low", "NA"]
	// 	}
	// }
};

/* </nowiki> */


