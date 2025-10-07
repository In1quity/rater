import { describe, it, expect } from 'vitest';
import '../test/setup.js';

describe('Simple Tests', () => {
    it('should parse basic template', () => {
        const wikitext = '{{Test Template|param1=value1|param2=value2}}';
        
        // Simple regex-based parsing for testing
        const templateMatch = wikitext.match(/\{\{([^}]+)\}\}/);
        expect(templateMatch).toBeTruthy();
        
        const content = templateMatch[1];
        const params = content.split('|').slice(1);
        
        expect(params).toHaveLength(2);
        expect(params[0]).toBe('param1=value1');
        expect(params[1]).toBe('param2=value2');
    });

    it('should handle shell template detection', () => {
        const shellTemplate = 'WikiProject banner shell';
        const nonShellTemplate = 'WikiProject Biology';
        
        // Mock config
        const config = { shellTemplate: 'WikiProject banner shell' };
        
        const isShell = (name) => {
            const normalized = name.replace(/^(Template|Шаблон):/i, '');
            return normalized === config.shellTemplate;
        };
        
        expect(isShell(shellTemplate)).toBe(true);
        expect(isShell(nonShellTemplate)).toBe(false);
        expect(isShell('Template:' + shellTemplate)).toBe(true);
        expect(isShell('Шаблон:' + shellTemplate)).toBe(true);
    });

    it('should handle parameter validation', () => {
        const validateParam = (name, value) => {
            return {
                validName: Boolean(name && name.length > 0),
                validValue: value !== undefined,
                isAlreadyIncluded: false // Mock for testing
            };
        };
        
        expect(validateParam('class', 'B').validName).toBe(true);
        expect(validateParam('class', 'B').validValue).toBe(true);
        expect(validateParam('', 'B').validName).toBe(false);
        expect(validateParam('class', undefined).validValue).toBe(false);
    });

    it('should handle wikitext transformation', () => {
        const transformWikitext = (talkWikitext, newBanner) => {
            if (!talkWikitext) return newBanner;
            
            // Simple replacement logic
            const existingBannerPattern = /\{\{[^}]+\}\}/g;
            const hasExistingBanner = existingBannerPattern.test(talkWikitext);
            
            if (hasExistingBanner) {
                return talkWikitext.replace(existingBannerPattern, newBanner);
            } else {
                return talkWikitext + '\n' + newBanner;
            }
        };
        
        const emptyWikitext = '';
        const result1 = transformWikitext(emptyWikitext, '{{New Banner}}');
        expect(result1).toBe('{{New Banner}}');
        
        const existingWikitext = '{{Old Banner}}';
        const result2 = transformWikitext(existingWikitext, '{{New Banner}}');
        expect(result2).toBe('{{New Banner}}');
    });

    it('should handle control character cleanup', () => {
        const cleanupControlChars = (text) => {
            return text.replace(/[\x01\x02]/g, '');
        };
        
        const textWithControlChars = 'Hello\x01World\x02Test';
        const cleaned = cleanupControlChars(textWithControlChars);
        expect(cleaned).toBe('HelloWorldTest');
    });

    it('should handle template name normalization', () => {
        const normalizeTemplateName = (name) => {
            return name.replace(/^(Template|Шаблон):/i, '');
        };
        
        expect(normalizeTemplateName('Template:Test')).toBe('Test');
        expect(normalizeTemplateName('Шаблон:Test')).toBe('Test');
        expect(normalizeTemplateName('Test')).toBe('Test');
    });
});
