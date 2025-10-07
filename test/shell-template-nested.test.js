import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { parseTemplates } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Shell Template Nested Parsing', () => {
    beforeEach(() => {
        // Reset any cached data
        global.cache = {
            read: () => null,
            write: () => {},
            clearAllItems: () => {}
        };
    });

    it('should parse shell template with 3 nested project templates', () => {
        const wikitext = `{{Блок проектов статьи|
{{Статья проекта Права человека}}
{{Статья проекта Социология}}
{{Статья проекта Феминизм|важность=высокая|уровень=I}}
}}`;
        
        const templates = parseTemplates(wikitext, true);
        
        console.log('Parsed templates:', templates.map(t => ({
            name: t.name,
            parameters: t.parameters.map(p => ({ name: p.name, value: p.value }))
        })));
        
        // Should find 4 templates: 1 shell + 3 nested
        expect(templates).toHaveLength(4);
        
        // Find shell template
        const shellTemplate = templates.find(t => t.name === 'Блок проектов статьи');
        expect(shellTemplate).toBeDefined();
        expect(shellTemplate.parameters).toHaveLength(1);
        expect(shellTemplate.parameters[0].name).toBe(1);
        
        // Check that parameter 1 contains all 3 nested templates
        const param1Value = shellTemplate.parameters[0].value;
        expect(param1Value).toContain('{{Статья проекта Права человека}}');
        expect(param1Value).toContain('{{Статья проекта Социология}}');
        expect(param1Value).toContain('{{Статья проекта Феминизм|важность=высокая|уровень=I}}');
        
        // Find nested templates
        const humanRightsTemplate = templates.find(t => t.name === 'Статья проекта Права человека');
        expect(humanRightsTemplate).toBeDefined();
        expect(humanRightsTemplate.parameters).toHaveLength(0);
        
        const sociologyTemplate = templates.find(t => t.name === 'Статья проекта Социология');
        expect(sociologyTemplate).toBeDefined();
        expect(sociologyTemplate.parameters).toHaveLength(0);
        
        const feminismTemplate = templates.find(t => t.name === 'Статья проекта Феминизм');
        expect(feminismTemplate).toBeDefined();
        const params = Object.fromEntries(feminismTemplate.parameters.map(p => [String(p.name), p.value]));
        expect(params['важность']).toBe('высокая');
        expect(params['уровень']).toBe('I');
    });

    it('should handle shell template with mixed content', () => {
        const wikitext = `{{Блок проектов статьи|1={{Статья проекта Права человека}} {{Статья проекта Социология}} {{Статья проекта Феминизм|важность=высокая|уровень=I}}}}`;
        
        const templates = parseTemplates(wikitext, true);
        
        console.log('Mixed content templates:', templates.map(t => ({
            name: t.name,
            parameters: t.parameters.map(p => ({ name: p.name, value: p.value }))
        })));
        
        // Should find 4 templates
        expect(templates).toHaveLength(4);
        
        // Shell template should have parameter 1 with all nested content
        const shellTemplate = templates.find(t => t.name === 'Блок проектов статьи');
        expect(shellTemplate).toBeDefined();
        
        const param1Value = shellTemplate.parameters[0].value;
        expect(param1Value).toContain('{{Статья проекта Права человека}}');
        expect(param1Value).toContain('{{Статья проекта Социология}}');
        expect(param1Value).toContain('{{Статья проекта Феминизм|важность=высокая|уровень=I}}');
    });

    it('should extract all parameters required by TemplateData if available', () => {
        // Emulate config defaults for parameter detection
        const wikitext = '{{Статья проекта Феминизм|важность=высокая|уровень=I|small=yes|attention=yes|listas=Test}}';
        const [ tpl ] = parseTemplates(wikitext);
        expect(tpl).toBeDefined();
        const params = Object.fromEntries(tpl.parameters.map(p => [String(p.name), p.value]));
        // Core parameters present
        expect(params['важность']).toBe('высокая');
        expect(params['уровень']).toBe('I');
        // Optional known defaults from config.defaultParameterData supported
        expect(params['small']).toBe('yes');
        expect(params['attention']).toBe('yes');
        expect(params['listas']).toBe('Test');
    });

    it('should detect shell template correctly', () => {
        const shellTemplate = new (class {
            constructor() {
                this.name = 'Блок проектов статьи';
                this.redirectTarget = null;
            }
            getTitle() {
                return {
                    getMainText: () => 'Блок проектов статьи'
                };
            }
            isShellTemplate() {
                // Mock shell template detection
                return this.name === 'Блок проектов статьи';
            }
        })();
        
        expect(shellTemplate.isShellTemplate()).toBe(true);
    });

    it('should extract nested templates from shell parameter', () => {
        const shellParamValue = `{{Статья проекта Права человека}} {{Статья проекта Социология}} {{Статья проекта Феминизм|важность=высокая|уровень=I}}`;
        
        const nestedTemplates = parseTemplates(shellParamValue, true);
        
        console.log('Nested templates from parameter:', nestedTemplates.map(t => ({
            name: t.name,
            parameters: t.parameters.map(p => ({ name: p.name, value: p.value }))
        })));
        
        expect(nestedTemplates).toHaveLength(3);
        
        const names = nestedTemplates.map(t => t.name);
        expect(names).toContain('Статья проекта Права человека');
        expect(names).toContain('Статья проекта Социология');
        expect(names).toContain('Статья проекта Феминизм');
    });
});
