import { getTemplateDataDetails } from '@services/templateData.js';
import * as cache from '@services/cache.js';
// <nowiki>

const loadParamDataAndSuggestions = function ( template ) {
	const done = $.Deferred();
	if ( template.paramData ) {
		return done.resolve();
	}
	const prefixedText = template.redirectTarget ? template.redirectTarget.getPrefixedText() : template.getTitle().getPrefixedText();
	const cachedInfo = cache.read( prefixedText + '-params' );
	const rebuildAliases = function () {
		template.paramAliases = {};
		$.each( template.paramData, ( paraName, paraData ) => {
			if ( paraData && Array.isArray( paraData.aliases ) ) {
				paraData.aliases.forEach( ( alias ) => {
					template.paramAliases[ alias ] = paraName;
				} );
			}
		} );
	};
	const computeCanonicalNames = function () {
		const findByNameOrAlias = function ( target ) {
			const lcTarget = String( target || '' ).toLowerCase();
			for ( const key in template.paramData ) {
				if ( Object.prototype.hasOwnProperty.call( template.paramData, key ) ) {
					if ( String( key ).toLowerCase() === lcTarget ) {
						return key;
					}
				}
			}
			for ( const alias in template.paramAliases ) {
				if ( Object.prototype.hasOwnProperty.call( template.paramAliases, alias ) ) {
					if ( String( alias ).toLowerCase() === lcTarget ) {
						return template.paramAliases[ alias ];
					}
				}
			}
			return null;
		};
		let className = findByNameOrAlias( 'class' );
		let importanceName = findByNameOrAlias( 'importance' );
		if ( !className ) {
			const keys = Object.keys( template.paramData || {} );
			className = keys.find( ( k ) => /class|класс|уров/i.test( String( k ).toLowerCase() ) );
		}
		if ( !importanceName ) {
			const keys2 = Object.keys( template.paramData || {} );
			importanceName = keys2.find( ( k ) => /importance|важност/i.test( String( k ).toLowerCase() ) );
		}
		template.classParamName = className || 'class';
		template.importanceParamName = importanceName || 'importance';
	};

	if (
		cachedInfo && cachedInfo.value && cachedInfo.staleDate &&
		cachedInfo.value.paramData !== null && cachedInfo.value.paramData !== undefined &&
		cachedInfo.value.parameterSuggestions !== null && cachedInfo.value.parameterSuggestions !== undefined &&
		cachedInfo.value.paramAliases !== null && cachedInfo.value.paramAliases !== undefined
	) {
		template.notemplatedata = cachedInfo.value.notemplatedata;
		template.paramData = cachedInfo.value.paramData;
		template.parameterSuggestions = cachedInfo.value.parameterSuggestions;
		template.paramAliases = cachedInfo.value.paramAliases;
		rebuildAliases();
		computeCanonicalNames();
		done.resolve();
		return done;
	}

	getTemplateDataDetails( prefixedText ).then( ( details ) => {
		template.notemplatedata = !!details.notemplatedata;
		template.paramData = details.paramData || {};
		template.parameterSuggestions = details.parameterSuggestions || [];
		template.paramAliases = details.paramAliases || {};
		template.classParamName = details.classParamName || 'class';
		template.importanceParamName = details.importanceParamName || 'importance';
		cache.write( prefixedText + '-params', details, 1 );
		return true;
	} ).then( done.resolve, done.reject );

	return done;
};

export { loadParamDataAndSuggestions };
// </nowiki>
