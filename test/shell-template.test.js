import { describe, it, expect, beforeEach } from 'vitest';
import '../test/setup.js';
import { Template } from '../src/utils/Template.js';
import config from '../src/constants/config.js';

describe('Shell Template Detection', () => {
    beforeEach(() => {
        // Reset shell template aliases cache
        global.shellTemplateAliases = null;
    });

    it('should detect shell template with exact match', () => {
        const template = new Template('{{WikiProject banner shell}}');
        template.setName('WikiProject banner shell');
        
        expect(template.isShellTemplate()).toBe(true);
    });

    it('should detect shell template with Template: prefix', () => {
        const template = new Template('{{Template:WikiProject banner shell}}');
        template.setName('Template:WikiProject banner shell');
        
        expect(template.isShellTemplate()).toBe(true);
    });

    it('should detect shell template with localized prefix', () => {
        const template = new Template('{{Шаблон:WikiProject banner shell}}');
        template.setName('Шаблон:WikiProject banner shell');
        
        expect(template.isShellTemplate()).toBe(true);
    });

    it('should not detect non-shell template', () => {
        const template = new Template('{{WikiProject Biology}}');
        template.setName('WikiProject Biology');
        
        expect(template.isShellTemplate()).toBe(false);
    });

    it('should handle redirects correctly', () => {
        const template = new Template('{{WikiProject banner shell}}');
        template.setName('WikiProject banner shell');
        template.redirectTarget = {
            getMainText: () => 'WikiProject banner shell'
        };
        
        expect(template.isShellTemplate()).toBe(true);
    });

    it('should normalize template names correctly', () => {
        const testCases = [
            { input: 'WikiProject banner shell', expected: true },
            { input: 'Template:WikiProject banner shell', expected: true },
            { input: 'Шаблон:WikiProject banner shell', expected: true },
            { input: 'WikiProject Biology', expected: false },
            { input: 'Template:WikiProject Biology', expected: false }
        ];

        testCases.forEach(({ input, expected }) => {
            const template = new Template(`{{${input}}}`);
            template.setName(input);
            
            expect(template.isShellTemplate()).toBe(expected);
        });
    });
});
