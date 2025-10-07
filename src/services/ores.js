import API from '@services/api.js';
import i18n from '@services/i18n.js';
import config from '@constants/config.js';
// <nowiki>

// Fetch ORES articlequality prediction for a revision and map to UI-friendly summary
const getPrediction = function ( latestRevId, opts ) {
	const options = opts || {};
	const wiki = options.wiki || ( config && config.ores && config.ores.wiki ) || 'enwiki';
	const tiers = ( options.tiers && Array.isArray( options.tiers ) ) ? options.tiers : ( ( config && config.ores && Array.isArray( config.ores.topTierClasses ) ) ? config.ores.topTierClasses : [ 'FA', 'GA' ] );
	const baseline = options.baseline || ( ( config && config.ores && config.ores.baselineClass ) || 'B' );
	if ( !latestRevId ) {
		return $.Deferred().resolve( null );
	}
	return API.getORES( latestRevId, wiki )
		.then( ( result ) => {
			const root = result && ( result[ wiki ] || result[ Object.keys( result )[ 0 ] ] );
			if ( !root || !root.scores || !root.scores[ latestRevId ] || !root.scores[ latestRevId ].articlequality ) {
				return $.Deferred().resolve( null );
			}
			const data = root.scores[ latestRevId ].articlequality;
			if ( data.error ) {
				return $.Deferred().resolve( null );
			}
			const prediction = data.score.prediction;
			const probabilities = data.score.probability || {};
			if ( tiers.includes( prediction ) ) {
				const sum = tiers.reduce( ( acc, k ) => acc + ( probabilities[ k ] || 0 ), 0 ) + ( probabilities[ baseline ] || 0 );
				return {
					prediction: baseline + ' ' + i18n.t( 'ores-or-higher' ),
					probability: ( sum * 100 ).toFixed( 1 ) + '%'
				};
			}
			return {
				prediction,
				probability: ( ( probabilities[ prediction ] || 0 ) * 100 ).toFixed( 1 ) + '%'
			};
		} )
		.catch( () => null );
};

export { getPrediction };
// </nowiki>
