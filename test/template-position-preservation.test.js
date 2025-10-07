import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';

describe('Template Position Preservation', () => {
    beforeEach(() => {
        // Reset any cached data
        global.cache = {
            read: () => null,
            write: () => {},
            clearAllItems: () => {}
        };
    });

    it('should preserve shell template position among other templates', () => {
        const pageWikitext = `== Введение ==
Some text here.

{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}

{{Другой шаблон|параметр=значение}}
More text.

{{Ещё один шаблон|param=value}}`;

        const templates = parseTemplates(pageWikitext, true);
        
        // Should find all templates in correct order
        expect(templates).toHaveLength(6); // 1 shell + 3 nested + 2 other templates
        
        // Find shell template
        const shellTemplate = templates.find(t => t.name === 'Блок проектов статьи');
        expect(shellTemplate).toBeDefined();
        
        // Find other templates
        const otherTemplate = templates.find(t => t.name === 'Другой шаблон');
        const anotherTemplate = templates.find(t => t.name === 'Ещё один шаблон');
        expect(otherTemplate).toBeDefined();
        expect(anotherTemplate).toBeDefined();
        
        // Verify shell template contains all 3 nested projects
        const param1Value = shellTemplate.parameters[0].value;
        expect(param1Value).toContain('{{Статья проекта Права человека}}');
        expect(param1Value).toContain('{{Статья проекта Социология}}');
        expect(param1Value).toContain('{{Статья проекта Феминизм|важность=высокая|уровень=I}}');
    });

    it('should handle multiple shell templates on same page', () => {
        const pageWikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
}}

{{Другой шаблон|param=value}}

{{Блок проектов статьи|
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
{{Статья проекта Биология}}
}}`;

        const templates = parseTemplates(pageWikitext, true);
        
        // Should find 2 shell templates + 4 nested + 1 other
        expect(templates).toHaveLength(7);
        
        const shellTemplates = templates.filter(t => t.name === 'Блок проектов статьи');
        expect(shellTemplates).toHaveLength(2);
        
        // First shell template
        const firstShell = shellTemplates[0];
        const firstParam1 = firstShell.parameters[0].value;
        expect(firstParam1).toContain('{{Статья проекта Права человека}}');
        expect(firstParam1).toContain('{{Статья проекта Социология}}');
        
        // Second shell template
        const secondShell = shellTemplates[1];
        const secondParam1 = secondShell.parameters[0].value;
        expect(secondParam1).toContain('{{Статья проекта Феминизм|важность=высокая|уровень=I}}');
        expect(secondParam1).toContain('{{Статья проекта Биология}}');
    });

    it('should preserve template order in complex page structure', () => {
        const complexPageWikitext = `== Секция 1 ==
{{Инфобокс|название=Тест}}

{{Блок проектов статьи|
{{Статья проекта Права человека|важность=высокая}}
{{Статья проекта Социология|уровень=II}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}

== Секция 2 ==
{{Другой шаблон|параметр=значение}}

{{Ещё один шаблон|param=value}}

{{Блок проектов статьи|
{{Статья проекта Биология|уровень=III}}
}}`;

        const templates = parseTemplates(complexPageWikitext, true);
        
        // Should find all templates
        expect(templates.length).toBeGreaterThan(5);
        
        // Verify shell templates are found
        const shellTemplates = templates.filter(t => t.name === 'Блок проектов статьи');
        expect(shellTemplates).toHaveLength(2);
        
        // Verify other templates are also found
        const infobox = templates.find(t => t.name === 'Инфобокс');
        const otherTemplate = templates.find(t => t.name === 'Другой шаблон');
        const anotherTemplate = templates.find(t => t.name === 'Ещё один шаблон');
        
        expect(infobox).toBeDefined();
        expect(otherTemplate).toBeDefined();
        expect(anotherTemplate).toBeDefined();
    });

    it('should handle shell template with mixed content and other templates', () => {
        const mixedWikitext = `Some text before.

{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}

Some text between.

{{Другой шаблон|параметр=значение}}

More text after.`;

        const templates = parseTemplates(mixedWikitext, true);
        
        // Should find shell template and other template
        expect(templates).toHaveLength(5); // 1 shell + 3 nested + 1 other
        
        const shellTemplate = templates.find(t => t.name === 'Блок проектов статьи');
        const otherTemplate = templates.find(t => t.name === 'Другой шаблон');
        
        expect(shellTemplate).toBeDefined();
        expect(otherTemplate).toBeDefined();
        
        // Verify shell template structure is preserved
        const param1Value = shellTemplate.parameters[0].value;
        expect(param1Value).toContain('{{Статья проекта Права человека}}');
        expect(param1Value).toContain('{{Статья проекта Социология}}');
        expect(param1Value).toContain('{{Статья проекта Феминизм|важность=высокая|уровень=I}}');
    });

    it('should not affect other templates when modifying shell template', () => {
        // Simulate page with shell template and other templates
        const originalWikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
}}

{{Другой шаблон|параметр=значение}}

{{Ещё один шаблон|param=value}}`;

        const templates = parseTemplates(originalWikitext, true);
        
        // Find shell template and modify it
        const shellTemplate = templates.find(t => t.name === 'Блок проектов статьи');
        expect(shellTemplate).toBeDefined();
        
        // Modify parameter 1 (simulate user changes)
        const param1 = shellTemplate.getParam(1);
        param1.value = '{{Статья проекта Права человека|важность=высокая}} {{Статья проекта Социология|уровень=II}} {{Статья проекта Феминизм|важность=высокая|уровень=I}}';
        
        // Find other templates
        const otherTemplate = templates.find(t => t.name === 'Другой шаблон');
        const anotherTemplate = templates.find(t => t.name === 'Ещё один шаблон');
        
        // Verify other templates are unchanged
        expect(otherTemplate.parameters[0].name).toBe('параметр');
        expect(otherTemplate.parameters[0].value).toBe('значение');
        expect(anotherTemplate.parameters[0].name).toBe('param');
        expect(anotherTemplate.parameters[0].value).toBe('value');
        
        // Verify shell template changes are preserved
        expect(param1.value).toContain('{{Статья проекта Права человека|важность=высокая}}');
        expect(param1.value).toContain('{{Статья проекта Социология|уровень=II}}');
        expect(param1.value).toContain('{{Статья проекта Феминизм|важность=высокая|уровень=I}}');
    });
});
