/**
 * Prompt Template System
 * Reusable, versioned prompt templates with variable substitution
 */

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  description: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

export interface PromptVariables {
  [key: string]: string | number | boolean | string[];
}

export class PromptTemplateSystem {
  private templates = new Map<string, PromptTemplate>();
  private activeVersions = new Map<string, string>(); // templateId -> version

  constructor() {
    this.initializeDefaultTemplates();
  }

  // ==========================================================================
  // Template Management
  // ==========================================================================

  registerTemplate(template: Omit<PromptTemplate, 'createdAt' | 'updatedAt'>): void {
    const fullTemplate: PromptTemplate = {
      ...template,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const key = this.getTemplateKey(template.id, template.version);
    this.templates.set(key, fullTemplate);

    // Set as active version if first version or not set
    if (!this.activeVersions.has(template.id)) {
      this.activeVersions.set(template.id, template.version);
    }
  }

  getTemplate(id: string, version?: string): PromptTemplate | undefined {
    const templateVersion = version || this.activeVersions.get(id);
    if (!templateVersion) return undefined;

    return this.templates.get(this.getTemplateKey(id, templateVersion));
  }

  setActiveVersion(id: string, version: string): void {
    const key = this.getTemplateKey(id, version);
    if (!this.templates.has(key)) {
      throw new Error(`Template ${id} version ${version} not found`);
    }
    this.activeVersions.set(id, version);
  }

  listTemplates(category?: string): PromptTemplate[] {
    const templates = Array.from(this.templates.values());
    return category
      ? templates.filter((t) => t.category === category)
      : templates;
  }

  // ==========================================================================
  // Template Rendering
  // ==========================================================================

  render(
    templateId: string,
    variables: PromptVariables,
    version?: string
  ): { systemPrompt: string; userPrompt: string } {
    const template = this.getTemplate(templateId, version);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate required variables
    const missingVars = template.variables.filter((v) => !(v in variables));
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    return {
      systemPrompt: template.systemPrompt,
      userPrompt: this.substituteVariables(template.userPromptTemplate, variables),
    };
  }

  private substituteVariables(template: string, variables: PromptVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = Array.isArray(value) ? value.join(', ') : String(value);
      result = result.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    return result;
  }

  private getTemplateKey(id: string, version: string): string {
    return `${id}@${version}`;
  }

  // ==========================================================================
  // Default Templates
  // ==========================================================================

  private initializeDefaultTemplates(): void {
    // Summarization templates
    this.registerTemplate({
      id: 'summarize-academic',
      name: 'Academic Summarization',
      version: '1.0',
      category: 'summarization',
      description: 'Academic-style document summarization',
      systemPrompt:
        'You are an expert academic summarizer. Create precise, scholarly summaries that capture key arguments and evidence.',
      userPromptTemplate: `Summarize the following text in academic style:

{{optionalParams}}

Text:
{{text}}

Provide response as JSON with: text, keyPoints (array), citations (array), wordCount, confidence (0-1).`,
      variables: ['text', 'optionalParams'],
    });

    this.registerTemplate({
      id: 'summarize-brief',
      name: 'Brief Summarization',
      version: '1.0',
      category: 'summarization',
      description: 'Concise, brief summaries',
      systemPrompt:
        'You are an expert at creating concise summaries. Distill content to its essence.',
      userPromptTemplate: `Create a brief summary of the following text:

{{optionalParams}}

Text:
{{text}}

Provide response as JSON with: text, keyPoints (array), wordCount, confidence (0-1).`,
      variables: ['text', 'optionalParams'],
    });

    // Q&A template
    this.registerTemplate({
      id: 'qa-contextual',
      name: 'Contextual Q&A',
      version: '1.0',
      category: 'qa',
      description: 'Context-aware question answering',
      systemPrompt:
        'You are an expert academic assistant. Answer questions based on provided context with evidence and confidence scores.',
      userPromptTemplate: `Question: {{question}}

Context:
{{context}}

{{optionalParams}}

Provide response as JSON with: answer, evidence (array of {quote, source, relevanceScore}), confidence (0-1), followUpQuestions (array), reasoning.`,
      variables: ['question', 'context', 'optionalParams'],
    });

    // Theme extraction template
    this.registerTemplate({
      id: 'themes-interpretive',
      name: 'Interpretive Theme Analysis',
      version: '1.0',
      category: 'analysis',
      description: 'Extract interpretive themes with deep analysis',
      systemPrompt:
        'You are an expert literary analyst. Extract interpretive themes with rich descriptions, examples, and cultural context.',
      userPromptTemplate: `Extract themes from the following text:

{{optionalParams}}

Text:
{{text}}

Provide response as JSON array of themes with: name, description, examples (array), prevalence (0-1), relatedThemes (array), interpretation.`,
      variables: ['text', 'optionalParams'],
    });

    // Annotation suggestions template
    this.registerTemplate({
      id: 'annotations-pedagogical',
      name: 'Pedagogical Annotations',
      version: '1.0',
      category: 'pedagogy',
      description: 'Suggest pedagogically valuable annotations',
      systemPrompt:
        'You are an expert pedagogue. Suggest annotations that enhance understanding, critical thinking, and engagement.',
      userPromptTemplate: `Suggest valuable annotations for the following text:

{{optionalParams}}

Text:
{{text}}

Provide response as JSON array with: type, passage, location, reasoning, suggestedNote, pedagogicalValue (0-1), relatedConcepts (array).`,
      variables: ['text', 'optionalParams'],
    });

    // Argument mining template
    this.registerTemplate({
      id: 'arguments-analysis',
      name: 'Argument Structure Analysis',
      version: '1.0',
      category: 'analysis',
      description: 'Extract and analyze argument structures',
      systemPrompt:
        'You are an expert in argumentation theory. Extract claims, evidence, and logical structures.',
      userPromptTemplate: `Analyze the argument structure:

{{optionalParams}}

Text:
{{text}}

Provide JSON with: mainClaim, supportingClaims, counterClaims, evidence, structure, argumentMap.`,
      variables: ['text', 'optionalParams'],
    });

    // Question generation template
    this.registerTemplate({
      id: 'questions-generate',
      name: 'Question Generation',
      version: '1.0',
      category: 'pedagogy',
      description: 'Generate pedagogically valuable questions',
      systemPrompt:
        'You are an expert educator. Generate questions that promote critical thinking and deep understanding.',
      userPromptTemplate: `Generate discussion questions:

{{optionalParams}}

Text:
{{text}}

Provide JSON array with: question, type, difficulty, focusArea, suggestedAnswer, relatedConcepts, pedagogicalGoal.`,
      variables: ['text', 'optionalParams'],
    });

    // Entity relationships template
    this.registerTemplate({
      id: 'relationships-network',
      name: 'Entity Network Analysis',
      version: '1.0',
      category: 'analysis',
      description: 'Extract entity relationships and networks',
      systemPrompt:
        'You are an expert in network analysis. Extract entities, relationships, and social structures.',
      userPromptTemplate: `Extract entity relationships:

{{optionalParams}}

Text:
{{text}}

Provide JSON with: entities, relationships, powerDynamics, socialStructure.`,
      variables: ['text', 'optionalParams'],
    });

    // Comparative analysis template
    this.registerTemplate({
      id: 'compare-documents',
      name: 'Comparative Document Analysis',
      version: '1.0',
      category: 'analysis',
      description: 'Compare multiple documents',
      systemPrompt:
        'You are an expert in comparative analysis. Identify themes, similarities, differences, and synthesize insights.',
      userPromptTemplate: `Compare the following documents:

{{optionalParams}}

{{documentsText}}

Provide JSON with: documents, themes, similarities, differences, synthesis.`,
      variables: ['documentsText', 'optionalParams'],
    });
  }

  // ==========================================================================
  // A/B Testing Support
  // ==========================================================================

  private experimentResults = new Map<string, ExperimentResult>();

  startExperiment(
    experimentId: string,
    templateA: string,
    templateB: string,
    splitRatio = 0.5
  ): void {
    this.experimentResults.set(experimentId, {
      experimentId,
      templateA,
      templateB,
      splitRatio,
      resultsA: [],
      resultsB: [],
      startedAt: Date.now(),
    });
  }

  getExperimentTemplate(experimentId: string): string {
    const experiment = this.experimentResults.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    return Math.random() < experiment.splitRatio
      ? experiment.templateA
      : experiment.templateB;
  }

  recordExperimentResult(
    experimentId: string,
    templateId: string,
    metrics: {
      responseTime: number;
      userSatisfaction?: number;
      accuracy?: number;
    }
  ): void {
    const experiment = this.experimentResults.get(experimentId);
    if (!experiment) return;

    const result = {
      templateId,
      timestamp: Date.now(),
      ...metrics,
    };

    if (templateId === experiment.templateA) {
      experiment.resultsA.push(result);
    } else if (templateId === experiment.templateB) {
      experiment.resultsB.push(result);
    }
  }

  getExperimentResults(experimentId: string): ExperimentAnalysis | undefined {
    const experiment = this.experimentResults.get(experimentId);
    if (!experiment) return undefined;

    const analyzeResults = (results: ExperimentMetric[]) => ({
      count: results.length,
      avgResponseTime:
        results.reduce((sum, r) => sum + r.responseTime, 0) / results.length || 0,
      avgSatisfaction:
        results.reduce((sum, r) => sum + (r.userSatisfaction || 0), 0) /
          results.length || 0,
      avgAccuracy:
        results.reduce((sum, r) => sum + (r.accuracy || 0), 0) / results.length || 0,
    });

    return {
      experimentId,
      duration: Date.now() - experiment.startedAt,
      templateA: {
        id: experiment.templateA,
        ...analyzeResults(experiment.resultsA),
      },
      templateB: {
        id: experiment.templateB,
        ...analyzeResults(experiment.resultsB),
      },
    };
  }
}

interface ExperimentResult {
  experimentId: string;
  templateA: string;
  templateB: string;
  splitRatio: number;
  resultsA: ExperimentMetric[];
  resultsB: ExperimentMetric[];
  startedAt: number;
}

interface ExperimentMetric {
  templateId: string;
  timestamp: number;
  responseTime: number;
  userSatisfaction?: number;
  accuracy?: number;
}

interface ExperimentAnalysis {
  experimentId: string;
  duration: number;
  templateA: {
    id: string;
    count: number;
    avgResponseTime: number;
    avgSatisfaction: number;
    avgAccuracy: number;
  };
  templateB: {
    id: string;
    count: number;
    avgResponseTime: number;
    avgSatisfaction: number;
    avgAccuracy: number;
  };
}

export default PromptTemplateSystem;
