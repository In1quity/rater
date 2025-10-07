// Debug script to test shell template parsing
import { parseTemplates } from '../src/utils/Template.js';

const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

console.log('=== DEBUGGING SHELL TEMPLATE PARSING ===');
console.log('Input wikitext:');
console.log(wikitext);
console.log('\n');

const templates = parseTemplates(wikitext, true);

console.log('Parsed templates:');
templates.forEach((template, index) => {
    console.log(`\nTemplate ${index + 1}:`);
    console.log(`  Name: "${template.name}"`);
    console.log(`  Parameters: ${template.parameters.length}`);
    template.parameters.forEach((param, paramIndex) => {
        console.log(`    ${paramIndex + 1}. ${param.name} = "${param.value}"`);
    });
});

console.log('\n=== ANALYSIS ===');
console.log(`Total templates found: ${templates.length}`);

const shellTemplate = templates.find(t => t.name === 'Блок проектов статьи');
if (shellTemplate) {
    console.log('\nShell template found:');
    console.log(`  Name: "${shellTemplate.name}"`);
    console.log(`  Parameters: ${shellTemplate.parameters.length}`);
    
    if (shellTemplate.parameters.length > 0) {
        const param1 = shellTemplate.parameters[0];
        console.log(`  Parameter 1: ${param1.name} = "${param1.value}"`);
        
        // Parse nested templates from parameter 1
        const nestedTemplates = parseTemplates(param1.value, true);
        console.log(`  Nested templates in param 1: ${nestedTemplates.length}`);
        nestedTemplates.forEach((nested, index) => {
            console.log(`    ${index + 1}. "${nested.name}" (${nested.parameters.length} params)`);
        });
    }
} else {
    console.log('\n❌ Shell template NOT found!');
}

const projectTemplates = templates.filter(t => 
    t.name.includes('Статья проекта')
);
console.log(`\nProject templates found: ${projectTemplates.length}`);
projectTemplates.forEach((template, index) => {
    console.log(`  ${index + 1}. "${template.name}" (${template.parameters.length} params)`);
});

export { templates };
