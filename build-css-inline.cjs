const fs = require('fs');
const path = require('path');

// Read CSS file
const cssPath = path.join(__dirname, 'dist', 'rater.min.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// Read JS file
const jsPath = path.join(__dirname, 'dist', 'rater.min.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Create CSS injection code
const cssInjection = `
// Injected CSS
const styles = \`${cssContent}\`;
if (typeof mw !== 'undefined' && mw.util && mw.util.addCSS) {
	mw.util.addCSS(styles);
} else if (typeof document !== 'undefined') {
	const style = document.createElement('style');
	style.textContent = styles;
	document.head.appendChild(style);
}

`;

// Combine CSS injection + JS content
const combinedContent = cssInjection + jsContent;

// Write combined file
fs.writeFileSync(jsPath, combinedContent);

console.log('CSS injected into JS file successfully');
