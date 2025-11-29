# Integration Guide

**Version:** 0.1.0
**Last Updated:** November 11, 2025

Guide for extending and integrating with the Close Reading Platform.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Adding New AI Providers](#adding-new-ai-providers)
- [Extending Annotation Types](#extending-annotation-types)
- [Adding Embedding Models](#adding-embedding-models)
- [Customizing Prompts](#customizing-prompts)
- [Adding Export Formats](#adding-export-formats)
- [Plugin System](#plugin-system-future)
- [API Integration](#api-integration)
- [Webhooks](#webhooks-future)

---

## Architecture Overview

### Service Layer Architecture

The platform uses a service-based architecture:

```
┌─────────────────────────────────────────┐
│          UI Components (React)          │
├─────────────────────────────────────────┤
│          Custom Hooks Layer             │
├─────────────────────────────────────────┤
│        State Management (Zustand)       │
├─────────────────────────────────────────┤
│           Service Layer                 │
│  ┌──────────┬──────────┬──────────┐   │
│  │ Document │   ML     │ Citation │   │
│  │ Services │ Services │ Services │   │
│  └──────────┴──────────┴──────────┘   │
├─────────────────────────────────────────┤
│        External Services                │
│  ┌──────────┬──────────┬──────────┐   │
│  │ Supabase │ TF.js    │ Claude   │   │
│  └──────────┴──────────┴──────────┘   │
└─────────────────────────────────────────┘
```

### Key Integration Points

1. **Service Layer**: Add new services or extend existing ones
2. **ML Pipeline**: Add new models or providers
3. **Citation Formatters**: Add new citation styles
4. **Export Pipeline**: Add new export formats
5. **Hooks**: Add lifecycle hooks for plugins

---

## Adding New AI Providers

### Overview

Currently supports:
- TensorFlow.js (embeddings)
- Claude API (future)
- Ollama (future)

### Adding a New Provider

#### 1. Create Provider Interface

```typescript
// src/services/ai/providers/MyProvider.ts

export interface MyProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model: string;
}

export class MyProvider {
  private config: MyProviderConfig;

  constructor(config: MyProviderConfig) {
    this.config = config;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Implementation
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text
      })
    });

    const data = await response.json();
    return data.embedding;
  }

  async generateCompletion(prompt: string): Promise<string> {
    // Implementation
  }
}
```

#### 2. Create Provider Factory

```typescript
// src/services/ai/ProviderFactory.ts

import { MyProvider } from './providers/MyProvider';
import { TensorFlowProvider } from './providers/TensorFlowProvider';

export type AIProvider = 'tensorflow' | 'myprovider';

export interface ProviderConfig {
  provider: AIProvider;
  config: Record<string, any>;
}

export class ProviderFactory {
  static create(config: ProviderConfig) {
    switch (config.provider) {
      case 'tensorflow':
        return new TensorFlowProvider(config.config);
      case 'myprovider':
        return new MyProvider(config.config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
}
```

#### 3. Update Configuration

```typescript
// src/config/ai.ts

export const AI_CONFIG: ProviderConfig = {
  provider: process.env.VITE_AI_PROVIDER as AIProvider || 'tensorflow',
  config: {
    apiKey: process.env.VITE_AI_API_KEY,
    endpoint: process.env.VITE_AI_ENDPOINT,
    model: process.env.VITE_AI_MODEL || 'default'
  }
};
```

#### 4. Add Environment Variables

```env
# .env.local
VITE_AI_PROVIDER=myprovider
VITE_AI_API_KEY=your_api_key
VITE_AI_ENDPOINT=https://api.example.com/v1
VITE_AI_MODEL=my-model-v1
```

#### 5. Update Service Usage

```typescript
// src/services/ml/embeddings.ts

import { ProviderFactory } from '@/services/ai/ProviderFactory';
import { AI_CONFIG } from '@/config/ai';

export class EmbeddingService {
  private provider: any;

  async initialize() {
    this.provider = ProviderFactory.create(AI_CONFIG);
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const vector = await this.provider.generateEmbedding(text);
    return {
      text,
      vector,
      modelVersion: AI_CONFIG.config.model,
      timestamp: Date.now()
    };
  }
}
```

---

## Extending Annotation Types

### Adding New Annotation Type

#### 1. Update Type Definition

```typescript
// src/types/index.ts

export type AnnotationType =
  | 'highlight'
  | 'note'
  | 'main_idea'
  | 'citation'
  | 'question'
  | 'critical'
  | 'definition'
  | 'example'
  | 'summary'
  | 'my_custom_type';  // Add new type
```

#### 2. Add Color Mapping

```typescript
// src/services/AnnotationService.ts

const ANNOTATION_COLORS: Record<AnnotationType, HighlightColor> = {
  highlight: 'yellow',
  note: 'blue',
  main_idea: 'orange',
  citation: 'green',
  question: 'pink',
  critical: 'red',
  definition: 'purple',
  example: 'green',
  summary: 'gray',
  my_custom_type: 'blue',  // Add default color
};
```

#### 3. Add UI Support

```typescript
// src/components/AnnotationToolbar.tsx

const ANNOTATION_TYPES = [
  { value: 'highlight', label: 'Highlight', icon: 'FiHighlight' },
  { value: 'note', label: 'Note', icon: 'FiMessageSquare' },
  // ... existing types
  { value: 'my_custom_type', label: 'My Type', icon: 'FiStar' },
];
```

#### 4. Add Custom Behavior (Optional)

```typescript
// src/services/AnnotationService.ts

createAnnotation(data: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Annotation {
  const annotation = {
    ...data,
    id: this.generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Custom behavior for new type
  if (annotation.type === 'my_custom_type') {
    annotation.metadata = {
      ...annotation.metadata,
      customField: 'custom value'
    };
  }

  this.annotations.set(annotation.id, annotation);
  return annotation;
}
```

#### 5. Add Database Migration (if needed)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_custom_annotation_type.sql

-- Update enum type
ALTER TYPE annotation_type ADD VALUE 'my_custom_type';

-- Or if using text constraint
ALTER TABLE annotations
  DROP CONSTRAINT IF EXISTS annotations_type_check;

ALTER TABLE annotations
  ADD CONSTRAINT annotations_type_check
  CHECK (type IN ('highlight', 'note', ..., 'my_custom_type'));
```

---

## Adding Embedding Models

### Integrating New Embedding Model

#### 1. Create Model Wrapper

```typescript
// src/services/ml/models/MyEmbeddingModel.ts

export class MyEmbeddingModel {
  private model: any;
  private modelVersion: string = 'my-model-v1';

  async initialize(): Promise<void> {
    // Load model
    this.model = await this.loadModel();
  }

  async embed(text: string): Promise<number[]> {
    // Preprocess
    const tokens = this.tokenize(text);

    // Generate embedding
    const embedding = await this.model.predict(tokens);

    // Convert to array
    return Array.from(embedding);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      texts.map(text => this.embed(text))
    );
    return embeddings;
  }

  private async loadModel() {
    // Model loading logic
  }

  private tokenize(text: string): number[] {
    // Tokenization logic
  }
}
```

#### 2. Register Model

```typescript
// src/services/ml/embeddings.ts

import { MyEmbeddingModel } from './models/MyEmbeddingModel';
import { UniversalSentenceEncoder } from './models/UniversalSentenceEncoder';

export type EmbeddingModelType = 'use' | 'mymodel';

export class EmbeddingService {
  private model: any;
  private modelType: EmbeddingModelType;

  constructor(modelType: EmbeddingModelType = 'use') {
    this.modelType = modelType;
  }

  async initialize(): Promise<void> {
    switch (this.modelType) {
      case 'use':
        this.model = new UniversalSentenceEncoder();
        break;
      case 'mymodel':
        this.model = new MyEmbeddingModel();
        break;
    }

    await this.model.initialize();
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const vector = await this.model.embed(text);
    return {
      text,
      vector,
      modelVersion: this.model.modelVersion,
      timestamp: Date.now()
    };
  }
}
```

#### 3. Configure Model Selection

```typescript
// src/config/ml.ts

export const ML_CONFIG = {
  embeddingModel: (process.env.VITE_EMBEDDING_MODEL as EmbeddingModelType) || 'use',
  cacheEnabled: true,
  batchSize: 32
};
```

---

## Customizing Prompts

### Prompt Template System

#### 1. Define Prompt Templates

```typescript
// src/services/ai/prompts.ts

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
}

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  summarize: {
    id: 'summarize',
    name: 'Summarize Text',
    template: `Summarize the following text in {{length}} sentences:\n\n{{text}}`,
    variables: ['text', 'length']
  },
  extract_terms: {
    id: 'extract_terms',
    name: 'Extract Key Terms',
    template: `Extract key terms from the following text:\n\n{{text}}\n\nFormat as JSON array.`,
    variables: ['text']
  },
  // Add custom templates
  my_custom_prompt: {
    id: 'my_custom_prompt',
    name: 'My Custom Prompt',
    template: `Custom prompt with {{variable1}} and {{variable2}}`,
    variables: ['variable1', 'variable2']
  }
};
```

#### 2. Create Prompt Service

```typescript
// src/services/ai/PromptService.ts

export class PromptService {
  render(templateId: string, variables: Record<string, string>): string {
    const template = PROMPT_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate variables
    const missing = template.variables.filter(v => !(v in variables));
    if (missing.length > 0) {
      throw new Error(`Missing variables: ${missing.join(', ')}`);
    }

    // Replace variables
    let prompt = template.template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return prompt;
  }

  addTemplate(template: PromptTemplate): void {
    PROMPT_TEMPLATES[template.id] = template;
  }
}

export const promptService = new PromptService();
```

#### 3. Use Custom Prompts

```typescript
// Usage example
import { promptService } from '@/services/ai/PromptService';

// Add custom template
promptService.addTemplate({
  id: 'analyze_argument',
  name: 'Analyze Argument',
  template: `Analyze the argument in the following text:\n\n{{text}}\n\nFocus on: {{focus}}`,
  variables: ['text', 'focus']
});

// Render prompt
const prompt = promptService.render('analyze_argument', {
  text: paragraph.text,
  focus: 'logical structure and evidence'
});

// Send to AI provider
const analysis = await aiProvider.generateCompletion(prompt);
```

---

## Adding Export Formats

### Creating Custom Export Format

#### 1. Define Format Interface

```typescript
// src/services/export/formats/MyFormat.ts

import { Annotation, Document, Paragraph } from '@/types';

export interface MyFormatOptions {
  includeMetadata?: boolean;
  sortBy?: 'position' | 'date' | 'type';
}

export class MyFormatExporter {
  export(
    document: Document,
    annotations: Annotation[],
    paragraphs: Paragraph[],
    options: MyFormatOptions = {}
  ): string {
    const output = {
      document: {
        title: document.title,
        author: document.author,
        metadata: options.includeMetadata ? this.getMetadata(document) : undefined
      },
      annotations: this.formatAnnotations(annotations, options),
      paragraphs: this.formatParagraphs(paragraphs)
    };

    return this.serialize(output);
  }

  private formatAnnotations(annotations: Annotation[], options: MyFormatOptions): any[] {
    let sorted = [...annotations];

    if (options.sortBy === 'date') {
      sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else if (options.sortBy === 'type') {
      sorted.sort((a, b) => a.type.localeCompare(b.type));
    }

    return sorted.map(ann => ({
      id: ann.id,
      type: ann.type,
      text: ann.target.range?.selectedText,
      note: ann.content,
      tags: ann.tags
    }));
  }

  private formatParagraphs(paragraphs: Paragraph[]): any[] {
    return paragraphs.map(p => ({
      id: p.id,
      content: p.content,
      position: p.position
    }));
  }

  private serialize(data: any): string {
    // Convert to desired format (JSON, XML, etc.)
    return JSON.stringify(data, null, 2);
  }

  private getMetadata(document: Document) {
    return {
      wordCount: document.content.split(/\s+/).length,
      created: document.created_at,
      fileType: document.file_type
    };
  }
}
```

#### 2. Register Format

```typescript
// src/services/export/ExportService.ts

import { MyFormatExporter } from './formats/MyFormat';
import { JSONExporter } from './formats/JSON';
import { PDFExporter } from './formats/PDF';

export type ExportFormat = 'json' | 'pdf' | 'myformat';

export class ExportService {
  private exporters: Map<ExportFormat, any>;

  constructor() {
    this.exporters = new Map([
      ['json', new JSONExporter()],
      ['pdf', new PDFExporter()],
      ['myformat', new MyFormatExporter()]
    ]);
  }

  async export(
    format: ExportFormat,
    document: Document,
    annotations: Annotation[],
    options?: any
  ): Promise<Blob> {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      throw new Error(`Unsupported format: ${format}`);
    }

    const content = exporter.export(document, annotations, document.paragraphs, options);
    return new Blob([content], { type: this.getMimeType(format) });
  }

  private getMimeType(format: ExportFormat): string {
    const types: Record<ExportFormat, string> = {
      json: 'application/json',
      pdf: 'application/pdf',
      myformat: 'application/x-myformat'
    };
    return types[format] || 'text/plain';
  }
}
```

#### 3. Add UI Support

```typescript
// src/components/ExportDialog.tsx

const EXPORT_FORMATS = [
  { value: 'json', label: 'JSON', extension: '.json' },
  { value: 'pdf', label: 'PDF', extension: '.pdf' },
  { value: 'myformat', label: 'My Format', extension: '.myformat' }
];

export function ExportDialog() {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [options, setOptions] = useState({});

  const handleExport = async () => {
    const blob = await exportService.export(
      format,
      document,
      annotations,
      options
    );

    downloadBlob(blob, `${document.title}.${getExtension(format)}`);
  };

  return (
    <Dialog>
      <Select value={format} onChange={setFormat}>
        {EXPORT_FORMATS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </Select>
      {/* Format-specific options */}
      <Button onClick={handleExport}>Export</Button>
    </Dialog>
  );
}
```

---

## Plugin System (Future)

### Plugin Architecture

**Planned Features:**

```typescript
// Future plugin interface
export interface Plugin {
  name: string;
  version: string;

  // Lifecycle hooks
  onInstall?(): Promise<void>;
  onUninstall?(): Promise<void>;
  onEnable?(): Promise<void>;
  onDisable?(): Promise<void>;

  // Feature extensions
  annotationTypes?: AnnotationType[];
  exportFormats?: ExportFormat[];
  aiProviders?: AIProvider[];

  // UI extensions
  toolbarButtons?: ToolbarButton[];
  sidebarPanels?: SidebarPanel[];

  // Event listeners
  onAnnotationCreate?(annotation: Annotation): void;
  onDocumentLoad?(document: Document): void;
}

// Plugin registration
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  async enable(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (plugin?.onEnable) {
      await plugin.onEnable();
    }
  }
}
```

---

## API Integration

### REST API Endpoints

#### Creating Custom API Endpoints

```typescript
// supabase/functions/my-endpoint/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { documentId } = await req.json();

    // Custom logic
    const result = await processDocument(documentId);

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

#### Calling Custom Endpoints

```typescript
// src/services/api/custom.ts

export async function callMyEndpoint(documentId: string) {
  const response = await fetch(
    `${process.env.VITE_SUPABASE_URL}/functions/v1/my-endpoint`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseClient.auth.session()?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentId })
    }
  );

  if (!response.ok) {
    throw new Error('API call failed');
  }

  return response.json();
}
```

---

## Webhooks (Future)

### Webhook System

**Planned webhook events:**

```typescript
export type WebhookEvent =
  | 'annotation.created'
  | 'annotation.updated'
  | 'annotation.deleted'
  | 'document.uploaded'
  | 'document.parsed'
  | 'link.created';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
}

export class WebhookService {
  async trigger(event: WebhookEvent, data: any): Promise<void> {
    const webhooks = await this.getWebhooks(event);

    await Promise.all(
      webhooks.map(webhook =>
        this.sendWebhook(webhook.url, { event, timestamp: new Date().toISOString(), data })
      )
    );
  }

  private async sendWebhook(url: string, payload: WebhookPayload): Promise<void> {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
}
```

---

## Best Practices

### Integration Guidelines

1. **Maintain Backwards Compatibility**: Don't break existing APIs
2. **Use TypeScript**: Strong typing prevents integration errors
3. **Document Thoroughly**: Include examples and use cases
4. **Test Integrations**: Unit and integration tests
5. **Handle Errors Gracefully**: Clear error messages
6. **Version Your Integrations**: Semantic versioning
7. **Provide Migrations**: Help users upgrade

### Performance Considerations

- **Cache Aggressively**: Cache API responses and ML results
- **Batch Operations**: Group requests when possible
- **Lazy Load**: Load plugins/extensions on demand
- **Monitor Performance**: Track integration performance
- **Rate Limiting**: Respect API rate limits

### Security

- **Validate Input**: Never trust external data
- **Sanitize Output**: Prevent XSS and injection
- **API Keys**: Store securely in environment variables
- **Rate Limiting**: Protect against abuse
- **Audit Logging**: Log integration activities

---

## Examples

### Complete Integration Example

See [examples/custom-integration/](../examples/custom-integration/) for:
- Custom AI provider integration
- New annotation type with UI
- Custom export format
- Plugin skeleton

---

**Last Updated:** November 11, 2025
**Version:** 0.1.0

For more information, see [Developer Guide](DEVELOPER_GUIDE.md) and [API Reference](API_REFERENCE.md).
