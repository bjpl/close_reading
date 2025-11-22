/**
 * Prompt Template System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptTemplateSystem } from '../../../../src/services/ai/PromptTemplates';

describe('PromptTemplateSystem', () => {
  let system: PromptTemplateSystem;

  beforeEach(() => {
    system = new PromptTemplateSystem();
  });

  describe('Template Registration', () => {
    it('should register new templates', () => {
      system.registerTemplate({
        id: 'test-template',
        name: 'Test Template',
        version: '1.0',
        category: 'test',
        description: 'Test description',
        systemPrompt: 'System prompt',
        userPromptTemplate: 'User prompt: {{variable}}',
        variables: ['variable'],
      });

      const template = system.getTemplate('test-template');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Test Template');
    });

    it('should list templates by category', () => {
      const analysisTemplates = system.listTemplates('analysis');
      expect(analysisTemplates.length).toBeGreaterThan(0);
      expect(analysisTemplates.every((t) => t.category === 'analysis')).toBe(true);
    });

    it('should list all templates', () => {
      const allTemplates = system.listTemplates();
      expect(allTemplates.length).toBeGreaterThan(0);
    });
  });

  describe('Template Versioning', () => {
    it('should manage multiple versions', () => {
      system.registerTemplate({
        id: 'versioned',
        name: 'Versioned Template',
        version: '1.0',
        category: 'test',
        description: 'Version 1',
        systemPrompt: 'System v1',
        userPromptTemplate: 'User v1',
        variables: [],
      });

      system.registerTemplate({
        id: 'versioned',
        name: 'Versioned Template',
        version: '2.0',
        category: 'test',
        description: 'Version 2',
        systemPrompt: 'System v2',
        userPromptTemplate: 'User v2',
        variables: [],
      });

      const v1 = system.getTemplate('versioned', '1.0');
      const v2 = system.getTemplate('versioned', '2.0');

      expect(v1?.systemPrompt).toBe('System v1');
      expect(v2?.systemPrompt).toBe('System v2');
    });

    it('should set and retrieve active version', () => {
      system.registerTemplate({
        id: 'active-test',
        name: 'Active Test',
        version: '1.0',
        category: 'test',
        description: 'Test',
        systemPrompt: 'System',
        userPromptTemplate: 'User',
        variables: [],
      });

      system.registerTemplate({
        id: 'active-test',
        name: 'Active Test',
        version: '2.0',
        category: 'test',
        description: 'Test',
        systemPrompt: 'System v2',
        userPromptTemplate: 'User v2',
        variables: [],
      });

      system.setActiveVersion('active-test', '2.0');
      const active = system.getTemplate('active-test');

      expect(active?.version).toBe('2.0');
      expect(active?.systemPrompt).toBe('System v2');
    });
  });

  describe('Template Rendering', () => {
    it('should substitute variables correctly', () => {
      system.registerTemplate({
        id: 'substitute-test',
        name: 'Substitution Test',
        version: '1.0',
        category: 'test',
        description: 'Test variable substitution',
        systemPrompt: 'System prompt',
        userPromptTemplate:
          'Process {{text}} with {{style}} style and {{options}}',
        variables: ['text', 'style', 'options'],
      });

      const rendered = system.render('substitute-test', {
        text: 'document content',
        style: 'academic',
        options: 'detailed analysis',
      });

      expect(rendered.userPrompt).toContain('document content');
      expect(rendered.userPrompt).toContain('academic');
      expect(rendered.userPrompt).toContain('detailed analysis');
    });

    it('should handle array variables', () => {
      system.registerTemplate({
        id: 'array-test',
        name: 'Array Test',
        version: '1.0',
        category: 'test',
        description: 'Test array variables',
        systemPrompt: 'System',
        userPromptTemplate: 'Focus on: {{topics}}',
        variables: ['topics'],
      });

      const rendered = system.render('array-test', {
        topics: ['theme1', 'theme2', 'theme3'],
      });

      expect(rendered.userPrompt).toContain('theme1, theme2, theme3');
    });

    it('should throw error for missing variables', () => {
      system.registerTemplate({
        id: 'required-test',
        name: 'Required Test',
        version: '1.0',
        category: 'test',
        description: 'Test required variables',
        systemPrompt: 'System',
        userPromptTemplate: 'Process {{text}}',
        variables: ['text'],
      });

      expect(() => {
        system.render('required-test', {});
      }).toThrow();
    });

    it('should render with specific version', () => {
      system.registerTemplate({
        id: 'version-render',
        name: 'Version Render',
        version: '1.0',
        category: 'test',
        description: 'Test',
        systemPrompt: 'System v1',
        userPromptTemplate: 'User {{text}} v1',
        variables: ['text'],
      });

      system.registerTemplate({
        id: 'version-render',
        name: 'Version Render',
        version: '2.0',
        category: 'test',
        description: 'Test',
        systemPrompt: 'System v2',
        userPromptTemplate: 'User {{text}} v2',
        variables: ['text'],
      });

      const v1Render = system.render('version-render', { text: 'test' }, '1.0');
      const v2Render = system.render('version-render', { text: 'test' }, '2.0');

      expect(v1Render.userPrompt).toContain('v1');
      expect(v2Render.userPrompt).toContain('v2');
    });
  });

  describe('Default Templates', () => {
    it('should have summarization templates', () => {
      const academic = system.getTemplate('summarize-academic');
      const brief = system.getTemplate('summarize-brief');

      expect(academic).toBeDefined();
      expect(brief).toBeDefined();
    });

    it('should have Q&A template', () => {
      const qa = system.getTemplate('qa-contextual');
      expect(qa).toBeDefined();
      expect(qa?.category).toBe('qa');
    });

    it('should have analysis templates', () => {
      const themes = system.getTemplate('themes-interpretive');
      const arguments = system.getTemplate('arguments-analysis');

      expect(themes).toBeDefined();
      expect(arguments).toBeDefined();
    });

    it('should have pedagogy templates', () => {
      const annotations = system.getTemplate('annotations-pedagogical');
      const questions = system.getTemplate('questions-generate');

      expect(annotations).toBeDefined();
      expect(questions).toBeDefined();
    });
  });

  describe('A/B Testing', () => {
    beforeEach(() => {
      system.registerTemplate({
        id: 'template-a',
        name: 'Template A',
        version: '1.0',
        category: 'test',
        description: 'Variant A',
        systemPrompt: 'System A',
        userPromptTemplate: 'User A',
        variables: [],
      });

      system.registerTemplate({
        id: 'template-b',
        name: 'Template B',
        version: '1.0',
        category: 'test',
        description: 'Variant B',
        systemPrompt: 'System B',
        userPromptTemplate: 'User B',
        variables: [],
      });
    });

    it('should start A/B experiment', () => {
      system.startExperiment('test-exp', 'template-a', 'template-b', 0.5);

      expect(() => {
        system.getExperimentTemplate('test-exp');
      }).not.toThrow();
    });

    it('should record experiment results', () => {
      system.startExperiment('test-exp', 'template-a', 'template-b');

      system.recordExperimentResult('test-exp', 'template-a', {
        responseTime: 1000,
        userSatisfaction: 0.8,
      });

      const results = system.getExperimentResults('test-exp');
      expect(results).toBeDefined();
      expect(results?.templateA.count).toBe(1);
    });

    it('should analyze experiment metrics', () => {
      system.startExperiment('metrics-exp', 'template-a', 'template-b');

      system.recordExperimentResult('metrics-exp', 'template-a', {
        responseTime: 1000,
        userSatisfaction: 0.8,
        accuracy: 0.9,
      });

      system.recordExperimentResult('metrics-exp', 'template-b', {
        responseTime: 800,
        userSatisfaction: 0.85,
        accuracy: 0.92,
      });

      const results = system.getExperimentResults('metrics-exp');

      expect(results?.templateA.avgResponseTime).toBe(1000);
      expect(results?.templateB.avgResponseTime).toBe(800);
      expect(results?.templateB.avgSatisfaction).toBeGreaterThan(
        results?.templateA.avgSatisfaction || 0
      );
    });
  });
});
