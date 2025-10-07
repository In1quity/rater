import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { Template, parseTemplates } from '../src/utils/Template.js';

describe('Template Parsing', () => {
    beforeEach(() => {
        // Reset any cached data
        global.cache = {
            read: () => null,
            write: () => {},
            clearAllItems: () => {}
        };
    });

    describe('parseTemplates', () => {
        it('should parse simple template', () => {
            const wikitext = '{{Test Template|param1=value1|param2=value2}}';
            const templates = parseTemplates(wikitext);
            
            expect(templates).toHaveLength(1);
            expect(templates[0].name).toBe('Test Template');
            expect(templates[0].parameters).toHaveLength(2);
            expect(templates[0].parameters[0].name).toBe('param1');
            expect(templates[0].parameters[0].value).toBe('value1');
            expect(templates[0].parameters[1].name).toBe('param2');
            expect(templates[0].parameters[1].value).toBe('value2');
        });

        it('should parse template with positional parameters', () => {
            const wikitext = '{{Test Template|value1|value2|param=value3}}';
            const templates = parseTemplates(wikitext);
            
            expect(templates).toHaveLength(1);
            expect(templates[0].parameters).toHaveLength(3);
            expect(templates[0].parameters[0].name).toBe(1);
            expect(templates[0].parameters[0].value).toBe('value1');
            expect(templates[0].parameters[1].name).toBe(2);
            expect(templates[0].parameters[1].value).toBe('value2');
            expect(templates[0].parameters[2].name).toBe('param');
            expect(templates[0].parameters[2].value).toBe('value3');
        });

        it('should parse nested templates', () => {
            const wikitext = '{{Outer Template|{{Inner Template|param=value}}}}';
            const templates = parseTemplates(wikitext, true);
            
            expect(templates).toHaveLength(2);
            expect(templates[0].name).toBe('Outer Template');
            expect(templates[1].name).toBe('Inner Template');
        });

        it('should handle empty template', () => {
            const wikitext = '{{Empty Template}}';
            const templates = parseTemplates(wikitext);
            
            expect(templates).toHaveLength(1);
            expect(templates[0].name).toBe('Empty Template');
            expect(templates[0].parameters).toHaveLength(0);
        });

        it('should handle template with spaces in parameters', () => {
            const wikitext = '{{Test Template| param1 = value1 | param2 = value2 }}';
            const templates = parseTemplates(wikitext);
            
            expect(templates).toHaveLength(1);
            expect(templates[0].parameters[0].name).toBe('param1');
            expect(templates[0].parameters[0].value).toBe('value1');
            expect(templates[0].parameters[1].name).toBe('param2');
            expect(templates[0].parameters[1].value).toBe('value2');
        });

        it('should not split nested template pipes into separate parameters', () => {
            const wikitext = '{{Shell|1={{Inner|a=1|b=2}}}}';
            const templates = parseTemplates(wikitext);
            expect(templates).toHaveLength(1);
            const shell = templates[0];
            const param1 = shell.parameters.find(p => String(p.name) === '1');
            expect(param1).toBeDefined();
            expect(param1.value).toContain('{{Inner|a=1|b=2}}');
        });
    });

    describe('Template class', () => {
        it('should create template with correct properties', () => {
            const wikitext = '{{Test Template|param=value}}';
            const template = new Template(wikitext);
            
            expect(template.wikitext).toBe(wikitext);
            expect(template.parameters).toEqual([]);
            expect(template.pipeStyle).toBe(' |');
            expect(template.equalsStyle).toBe('=');
            expect(template.endBracesStyle).toBe('}}');
        });

        it('should add parameters correctly', () => {
            const template = new Template('{{Test}}');
            template.addParam('param1', 'value1', '|param1=value1');
            
            expect(template.parameters).toHaveLength(1);
            expect(template.parameters[0].name).toBe('param1');
            expect(template.parameters[0].value).toBe('value1');
            expect(template.parameters[0].wikitext).toBe('||param1=value1');
        });

        it('should get parameters by name', () => {
            const template = new Template('{{Test}}');
            template.addParam('param1', 'value1', '|param1=value1');
            template.addParam('param2', 'value2', '|param2=value2');
            
            const param = template.getParam('param1');
            expect(param).toBeDefined();
            expect(param.value).toBe('value1');
            
            const nonExistent = template.getParam('nonexistent');
            expect(nonExistent).toBeUndefined();
        });

        it('should set and get name correctly', () => {
            const template = new Template('{{Test Template}}');
            template.setName('Test Template');
            
            expect(template.name).toBe('Test Template');
        });

        it('should get title correctly', () => {
            const template = new Template('{{Test Template}}');
            template.setName('Test Template');
            
            const title = template.getTitle();
            expect(title.getPrefixedText()).toBe('Template:Test Template');
            expect(title.getMainText()).toBe('Test Template');
        });
    });
});
