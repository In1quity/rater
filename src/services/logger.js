// <nowiki>

// Lightweight leveled logger with namespace scoping
// Usage:
//   import logger from '@services/logger.js';
//   const log = logger.get('templateScanner');
//   log.info('Found %d templates', count);

const globalEnabled = () => {
	try {
		// window.RATER_DEBUG can be boolean or string of namespaces
		return typeof window !== 'undefined' ? window.RATER_DEBUG : false;
	} catch ( _e ) {
		return false;
	}
};

const format = ( args ) => {
	try {
		// Keep printf-like formatting; delegate to console
		return args;
	} catch ( _e ) {
		return args;
	}
};

const shouldLog = ( level, ns ) => {
	if ( level !== 'debug' ) {
		return true; // info/warn/error/log always on
	}
	const flag = globalEnabled();
	if ( flag === true ) {
		return true;
	}
	if ( typeof flag === 'string' ) {
		if ( flag.toLowerCase() === 'all' ) {
			return true;
		}
		return flag.split( /[\s,]+/ ).filter( Boolean ).some( ( x ) => String( x ).toLowerCase() === String( ns ).toLowerCase() );
	}
	return false;
};

const makePrinter = ( ns, level ) => function () {
	if ( !shouldLog( level, ns ) ) {
		return;
	}
	try {
		const prefix = `[Rater:${ ns }]`;
		const raw = format( Array.prototype.slice.call( arguments ) );
		const firstIsString = typeof raw[ 0 ] === 'string';
		const args = firstIsString ? [ prefix + ' ' + raw[ 0 ] ].concat( raw.slice( 1 ) ) : [ prefix ].concat( raw );
		const actual = ( level === 'debug' ) ? 'log' : level; // ensure visibility without Verbose filter
		if ( console[ actual ] ) {
			console[ actual ].apply( console, args );
		} else {
			console.log.apply( console, args );
		}
	} catch ( _e ) { /* ignore */ }
};

const get = ( ns ) => {
	const name = String( ns || 'app' );
	return {
		debug: makePrinter( name, 'debug' ),
		info: makePrinter( name, 'info' ),
		warn: makePrinter( name, 'warn' ),
		error: makePrinter( name, 'error' ),
		log: makePrinter( name, 'log' )
	};
};

export default { get };
// </nowiki>
