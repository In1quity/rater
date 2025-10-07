// Simple debug script without imports
const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;

console.log('=== DEBUGGING SHELL TEMPLATE PARSING ===');
console.log('Input wikitext:');
console.log(wikitext);
console.log('\n');

// Simple regex-based parsing for debugging
function parseTemplatesSimple(wikitext) {
    const templates = [];
    const templateRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = templateRegex.exec(wikitext)) !== null) {
        const content = match[1];
        const name = content.split('|')[0].trim();
        const parameters = [];
        
        // Parse parameters
        const paramParts = content.split('|').slice(1);
        paramParts.forEach((part, index) => {
            const trimmed = part.trim();
            if (trimmed.includes('=')) {
                const [paramName, paramValue] = trimmed.split('=', 2);
                parameters.push({
                    name: paramName.trim(),
                    value: paramValue.trim()
                });
            } else if (trimmed) {
                parameters.push({
                    name: index + 1,
                    value: trimmed
                });
            }
        });
        
        templates.push({
            name: name,
            parameters: parameters,
            wikitext: match[0]
        });
    }
    
    return templates;
}

const templates = parseTemplatesSimple(wikitext);

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
        const nestedTemplates = parseTemplatesSimple(param1.value);
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
