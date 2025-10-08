// <nowiki>

/**
 * Helper to create DOM elements (jQuery replacement)
 * @param {string} tag - HTML tag name
 * @param {Object|null} attrs - Attributes to set on the element
 * @param {...(string|Node)} children - Child nodes or text
 * @returns {HTMLElement}
 */
export const createElement = function ( tag, attrs, ...children ) {
	const el = document.createElement( tag );
	if ( attrs ) {
		Object.keys( attrs ).forEach( ( key ) => {
			if ( key === 'class' ) {
				el.className = attrs[ key ];
			} else if ( key === 'style' && typeof attrs[ key ] === 'object' ) {
				Object.assign( el.style, attrs[ key ] );
			} else {
				el.setAttribute( key, attrs[ key ] );
			}
		} );
	}
	children.forEach( ( child ) => {
		if ( typeof child === 'string' ) {
			el.appendChild( document.createTextNode( child ) );
		} else if ( child ) {
			el.appendChild( child );
		}
	} );
	return el;
};

/**
 * Create a styled element with CSS string (used commonly in OOUI $element)
 * @param {string} tag - HTML tag name
 * @param {string} styleString - CSS string
 * @returns {HTMLElement}
 */
export const createStyledElement = function ( tag, styleString ) {
	const el = document.createElement( tag );
	el.setAttribute( 'style', styleString );
	return el;
};

// </nowiki>
