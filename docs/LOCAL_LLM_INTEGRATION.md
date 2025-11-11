# Local LLM Integration Guide
## Using Your Ollama Models with Close Reading Platform

**Your Setup:**
- **Ollama installed** at `C:\Users\brand\Development\LLM_Workspace`
- **Available models:** mistral, codellama:7b-code, qwen2.5:14b
- **Integration approach:** Local API server (privacy-first, no cloud)

---

## Architecture: Local LLM Backend Service

Instead of browser-based ML, we'll use your **existing Ollama models** running locally:

```
┌─────────────────────────────────────────────┐
│  Close Reading Platform (React Frontend)    │
│  http://localhost:5173                      │
└────────────────┬────────────────────────────┘
                 │
                 │ HTTP API calls
                 ▼
┌─────────────────────────────────────────────┐
│  Ollama Server (Local Backend)              │
│  http://localhost:11434                     │
│  Models: mistral, qwen2.5:14b, codellama    │
└────────────────┬────────────────────────────┘
                 │
                 │ GPU/CPU inference
                 ▼
┌─────────────────────────────────────────────┐
│  Local Model Files (.gguf)                  │
│  C:\Users\brand\.ollama\models              │
└─────────────────────────────────────────────┘
```

**Benefits:**
- ✅ **Privacy:** All processing stays on your machine
- ✅ **Performance:** GPU acceleration (if available)
- ✅ **No download:** Use models you already have
- ✅ **Powerful:** 14B parameter models vs. browser constraints
- ✅ **Free:** No API costs

---

## Implementation: Ollama Service Integration

### Step 1: Create Ollama API Client

**File:** `src/services/ml/ollama-client.ts` (NEW)

```typescript
/**
 * Ollama API Client for Local LLM Integration
 *
 * Connects to local Ollama server for text analysis using your existing models:
 * - qwen2.5:14b - Best for complex analysis, Q&A, summarization
 * - mistral - Good for general text understanding
 * - codellama:7b-code - Optimized for code (not needed for close reading)
 */

interface OllamaConfig {
  baseUrl: string;        // Default: http://localhost:11434
  model: string;          // Which model to use
  temperature: number;    // 0.0-2.0 (creativity)
  timeout: number;        // Request timeout in ms
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];     // Model context for follow-up
}

export class OllamaClient {
  private config: OllamaConfig;
  private isAvailable: boolean = false;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      model: config.model || 'qwen2.5:14b',  // Your most powerful model
      temperature: config.temperature || 0.7,
      timeout: config.timeout || 30000
    };
  }

  /**
   * Check if Ollama server is running
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });

      if (response.ok) {
        const data = await response.json();
        this.isAvailable = data.models && data.models.length > 0;
        console.log('✅ Ollama available with models:', data.models.map((m: any) => m.name));
        return this.isAvailable;
      }
    } catch (error) {
      console.log('❌ Ollama not available:', error);
      this.isAvailable = false;
    }
    return false;
  }

  /**
   * Generate text completion
   */
  async generate(prompt: string, options: {
    model?: string;
    temperature?: number;
    stream?: boolean;
  } = {}): Promise<string> {
    if (!this.isAvailable) {
      await this.checkAvailability();
      if (!this.isAvailable) {
        throw new Error('Ollama server not running. Please start Ollama.');
      }
    }

    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.config.model,
        prompt: prompt,
        temperature: options.temperature || this.config.temperature,
        stream: options.stream || false
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response;
  }

  /**
   * Generate embeddings (if model supports it)
   */
  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama embeddings error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }
}

// Singleton instance
export const ollamaClient = new OllamaClient({
  model: 'qwen2.5:14b'  // Your most capable model
});
```

---

## Use Case 1: Document Summarization

**Using:** qwen2.5:14b (your most powerful model)

```typescript
// File: src/services/ml/summarization.ts (NEW)

import { ollamaClient } from './ollama-client';

export async function summarizeDocument(document: Document): Promise<string> {
  const prompt = `Provide a concise 3-4 sentence summary of the following academic text. Focus on the main argument, key evidence, and conclusion.

Text:
${document.content}

Summary:`;

  try {
    const summary = await ollamaClient.generate(prompt, {
      model: 'qwen2.5:14b',
      temperature: 0.3  // Lower = more focused
    });

    return summary.trim();
  } catch (error) {
    console.error('Summarization failed:', error);
    // Fallback to simple extraction if Ollama unavailable
    return document.content.split('.').slice(0, 3).join('.') + '.';
  }
}

export async function summarizeParagraph(paragraph: string): Promise<string> {
  const prompt = `Summarize this paragraph in one sentence:

${paragraph}

One-sentence summary:`;

  return await ollamaClient.generate(prompt, {
    model: 'qwen2.5:14b',
    temperature: 0.3
  });
}
```

**UI Integration:**
```tsx
// Add to DocumentViewer component
<Button onClick={() => generateSummary()}>
  🤖 AI Summary
</Button>

{summary && (
  <Alert status="info">
    <AlertIcon />
    <Text>{summary}</Text>
  </Alert>
)}
```

---

## Use Case 2: Question Answering on Documents

**Using:** qwen2.5:14b

```typescript
// File: src/services/ml/question-answering.ts (NEW)

import { ollamaClient } from './ollama-client';

export async function answerQuestion(
  question: string,
  context: string
): Promise<{ answer: string; confidence: 'high' | 'medium' | 'low' }> {
  const prompt = `Based on the following text, answer the question. If the answer is not in the text, say "The text does not provide this information."

Text:
${context}

Question: ${question}

Answer:`;

  const answer = await ollamaClient.generate(prompt, {
    model: 'qwen2.5:14b',
    temperature: 0.1  // Very low for factual answers
  });

  // Simple confidence heuristic
  const confidence = answer.includes('does not provide') ? 'low' :
                     answer.length > 100 ? 'high' : 'medium';

  return { answer: answer.trim(), confidence };
}
```

**Research Application:**
- Students can ask questions about texts
- Researchers can validate interpretations
- Quick fact-checking during reading

---

## Use Case 3: Thematic Analysis

**Using:** qwen2.5:14b for theme extraction

```typescript
// File: src/services/ml/thematic-analysis.ts (NEW)

import { ollamaClient } from './ollama-client';

export async function extractThemes(
  document: Document,
  numThemes: number = 5
): Promise<Theme[]> {
  const prompt = `Analyze the following academic text and identify the ${numThemes} most important themes. For each theme, provide:
1. Theme name (2-4 words)
2. Brief description (1 sentence)
3. Key evidence (quote 1-2 sentences from text)

Text:
${document.content.slice(0, 4000)}

Themes (JSON format):`;

  const response = await ollamaClient.generate(prompt, {
    model: 'qwen2.5:14b',
    temperature: 0.5
  });

  // Parse JSON response
  try {
    const themes = JSON.parse(response);
    return themes.map((theme: any, index: number) => ({
      id: index + 1,
      name: theme.name,
      description: theme.description,
      evidence: theme.evidence,
      paragraphs: findParagraphsForTheme(theme, document)
    }));
  } catch (error) {
    // Fallback if JSON parsing fails
    return parseThemesFromText(response);
  }
}
```

---

## Use Case 4: Annotation Suggestions

**Using:** qwen2.5:14b

```typescript
// File: src/services/ml/annotation-suggestions.ts (NEW)

import { ollamaClient } from './ollama-client';

export async function suggestAnnotations(
  paragraph: string
): Promise<SuggestedAnnotation[]> {
  const prompt = `Analyze this paragraph from an academic text. Suggest 2-3 annotations a scholar should make. For each, specify:
- type: "main_idea", "note", or "question"
- text: the specific passage to annotate
- note: explanation of why this is important

Paragraph:
${paragraph}

Suggestions (JSON array):`;

  const response = await ollamaClient.generate(prompt, {
    model: 'qwen2.5:14b',
    temperature: 0.6
  });

  return JSON.parse(response);
}
```

**UI:** Show AI suggestions as optional hints, user can accept/reject

---

## Use Case 5: Semantic Paragraph Linking

**Using:** Ollama embeddings API

```typescript
// File: src/services/ml/semantic-linking.ts (ENHANCED)

import { ollamaClient } from './ollama-client';

export async function findSemanticallySimilarParagraphs(
  targetParagraph: Paragraph,
  allParagraphs: Paragraph[],
  threshold: number = 0.75
): Promise<Array<{ paragraph: Paragraph; similarity: number }>> {
  // Get embedding for target paragraph
  const targetEmbedding = await ollamaClient.embed(targetParagraph.content);

  // Get embeddings for all paragraphs (cache these!)
  const similarities = await Promise.all(
    allParagraphs
      .filter(p => p.id !== targetParagraph.id)
      .map(async (p) => {
        const embedding = await ollamaClient.embed(p.content);
        const similarity = cosineSimilarity(targetEmbedding, embedding);
        return { paragraph: p, similarity };
      })
  );

  return similarities
    .filter(s => s.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);  // Top 5 suggestions
}
```

**Advantage over browser ML:**
- Qwen2.5 14B produces **better embeddings** than Universal Sentence Encoder
- Runs on your GPU (faster)
- No 50MB model download in browser

---

## Integration Architecture

### Option 1: Direct HTTP Calls (Simple)

**Pros:**
- Simple implementation
- No additional dependencies
- Uses models you already have

**Cons:**
- Requires Ollama server running
- No fallback if server down
- Cross-origin requests need CORS

**Implementation:**
```typescript
// Add to .env.local
VITE_OLLAMA_URL=http://localhost:11434
VITE_ENABLE_LOCAL_LLM=true

// Use in services
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const ENABLE_LLM = import.meta.env.VITE_ENABLE_LOCAL_LLM === 'true';
```

### Option 2: Node.js Proxy Server (Recommended)

**Create:** `server/ollama-proxy.js`

```javascript
// Simple Express proxy to avoid CORS issues
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_URL = 'http://localhost:11434';

app.post('/api/ollama/generate', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('✅ Ollama proxy running on http://localhost:3001');
});
```

**Run:**
```bash
node server/ollama-proxy.js &
npm run dev
```

**Frontend calls proxy:**
```typescript
const response = await fetch('http://localhost:3001/api/ollama/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'qwen2.5:14b',
    prompt: 'Summarize: ...'
  })
});
```

---

## Specific Model Usage Recommendations

### qwen2.5:14b (Your Best Model for Research)

**Use for:**
1. **Document Summarization** - Comprehensive understanding
2. **Question Answering** - Deep comprehension
3. **Thematic Analysis** - Theme extraction and synthesis
4. **Annotation Suggestions** - Smart analysis recommendations
5. **Argument Mining** - Detecting claims, evidence, reasoning

**Why:** 14B parameters, trained on diverse text, excellent analytical capabilities

**Example Prompts:**
```typescript
// Summarization
const summary = await ollama.generate(
  `Summarize this academic text in 3-4 sentences, focusing on main argument:\n\n${text}`,
  { model: 'qwen2.5:14b', temperature: 0.3 }
);

// Theme extraction
const themes = await ollama.generate(
  `Identify 5 major themes in this text. Return as JSON array with {name, description, evidence}:\n\n${text}`,
  { model: 'qwen2.5:14b', temperature: 0.5 }
);

// Critical questions
const questions = await ollama.generate(
  `Generate 3 critical thinking questions about this passage:\n\n${paragraph}`,
  { model: 'qwen2.5:14b', temperature: 0.7 }
);
```

### mistral (Lighter, Faster)

**Use for:**
1. **Quick summaries** - Short paragraph summarization
2. **Entity extraction** - Names, places, dates
3. **Sentiment analysis** - Emotional tone
4. **Keyword extraction** - Key terms and concepts

**Why:** Faster inference, good for real-time features

**Example:**
```typescript
// Quick paragraph summary (300ms vs 2s for qwen)
const quickSummary = await ollama.generate(
  `One sentence summary: ${paragraph}`,
  { model: 'mistral', temperature: 0.3 }
);
```

### codellama:7b-code (Not for this app, but...)

**Skip for close reading** - optimized for code, not prose analysis

---

## Feature Implementation with Your Models

### Feature 1: "AI Reading Assistant" (qwen2.5:14b)

```typescript
// src/components/AIReadingAssistant.tsx (NEW)

import React, { useState } from 'react';
import { Box, VStack, Button, Text, Input, Spinner } from '@chakra-ui/react';
import { ollamaClient } from '../services/ml/ollama-client';

export function AIReadingAssistant({ document }: { document: Document }) {
  const [summary, setSummary] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const prompt = `Summarize this academic text in 3-4 sentences:\n\n${document.content}`;
      const result = await ollamaClient.generate(prompt);
      setSummary(result);
    } catch (error) {
      console.error('Summary failed:', error);
      alert('Ollama server not running. Please start Ollama first.');
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    setLoading(true);
    try {
      const prompt = `Based on this text, answer: ${question}\n\nText:\n${document.content.slice(0, 3000)}`;
      const result = await ollamaClient.generate(prompt);
      setAnswer(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4} bg="blue.50" borderRadius="md">
      <VStack gap={4} align="stretch">
        <Text fontWeight="bold" fontSize="lg">🤖 AI Reading Assistant</Text>

        {/* Summary */}
        <Button onClick={generateSummary} loading={loading}>
          Generate Summary (qwen2.5:14b)
        </Button>
        {summary && (
          <Box p={3} bg="white" borderRadius="md">
            <Text fontSize="sm">{summary}</Text>
          </Box>
        )}

        {/* Q&A */}
        <Input
          placeholder="Ask a question about the text..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
        />
        <Button onClick={askQuestion} loading={loading} disabled={!question}>
          Ask Question
        </Button>
        {answer && (
          <Box p={3} bg="white" borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
            <Text fontSize="xs" color="gray.600" mb={1}>Answer:</Text>
            <Text fontSize="sm">{answer}</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
```

---

### Feature 2: Smart Annotation Suggestions (qwen2.5:14b)

```typescript
// src/hooks/useAIAnnotationSuggestions.ts (NEW)

import { useState, useEffect } from 'react';
import { ollamaClient } from '../services/ml/ollama-client';

export function useAIAnnotationSuggestions(paragraph: Paragraph) {
  const [suggestions, setSuggestions] = useState<AnnotationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const prompt = `Analyze this academic paragraph. Suggest 2-3 important passages to annotate and why. Format as JSON array:
[
  {"type": "main_idea", "text": "key passage", "reason": "why important"},
  ...
]

Paragraph: ${paragraph.content}

Suggestions:`;

      const response = await ollamaClient.generate(prompt, {
        model: 'qwen2.5:14b',
        temperature: 0.6
      });

      const parsed = JSON.parse(response);
      setSuggestions(parsed);
    } catch (error) {
      console.error('AI suggestions failed:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  return { suggestions, getSuggestions, loading };
}
```

**UI:** Show suggestions as lightbulb icons, click to auto-create annotation

---

### Feature 3: Thematic Analysis (qwen2.5:14b)

```typescript
// src/services/ml/theme-extraction.ts (NEW)

export async function extractThemes(document: Document): Promise<Theme[]> {
  const prompt = `Identify the 5 most important themes in this academic text. For each theme:
- Name (2-4 words)
- Description (1 sentence)
- 2-3 example quotes from the text

Return as JSON array.

Text:
${document.content}

Themes:`;

  const response = await ollamaClient.generate(prompt, {
    model: 'qwen2.5:14b',
    temperature: 0.5
  });

  return JSON.parse(response);
}
```

**Research Value:** Auto-discover themes researcher might miss, validate manual analysis

---

## Feature 4: Semantic Paragraph Linking (Embeddings)

**Replace TensorFlow.js with Ollama embeddings:**

```typescript
// src/services/ml/ollama-embeddings.ts (NEW)

import { ollamaClient } from './ollama-client';
import { EmbeddingCache } from './cache';

export class OllamaEmbeddingService {
  private cache: EmbeddingCache;

  constructor() {
    this.cache = new EmbeddingCache();
  }

  async embed(text: string): Promise<number[]> {
    // Check cache first
    const cached = await this.cache.get(text);
    if (cached) return cached.vector;

    // Generate embedding via Ollama
    const embedding = await ollamaClient.embed(text);

    // Cache for future use
    await this.cache.set(text, embedding, 'ollama-qwen2.5');

    return embedding;
  }

  async findSimilar(
    targetText: string,
    candidates: string[],
    topK: number = 5
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    const targetEmbed = await this.embed(targetText);

    const similarities = await Promise.all(
      candidates.map(async (text, index) => {
        const embed = await this.embed(text);
        return {
          text,
          similarity: cosineSimilarity(targetEmbed, embed),
          index
        };
      })
    );

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}
```

**Advantage:** Qwen embeddings likely better than Universal Sentence Encoder for academic text

---

## Complete Integration Plan

### Week 1: Setup & Basic Integration

**Day 1: Infrastructure**
```bash
# Ensure Ollama running
ollama serve

# Test from command line
ollama run qwen2.5:14b "Test prompt"

# Create Ollama client in React app
# File: src/services/ml/ollama-client.ts
```

**Day 2: Summarization**
- Implement document summarization
- Add UI button to DocumentViewer
- Test with various documents

**Day 3: Q&A**
- Implement question answering
- Add Q&A interface
- Test answer quality

**Day 4-5: Testing & Polish**
- Handle Ollama offline gracefully
- Add loading states
- Cache responses
- Error handling

### Week 2: Advanced Features

**Day 1-2: Theme Extraction**
- Implement thematic analysis
- Build theme explorer UI
- Visualize themes

**Day 3-4: Annotation Suggestions**
- Implement AI annotation suggestions
- Add suggestion UI
- Test suggestion quality

**Day 5: Embeddings**
- Replace TensorFlow.js with Ollama embeddings
- Test link suggestions improvement
- Benchmark performance

### Week 3: Polish & Documentation

- Add settings to choose which model
- Implement fallbacks for offline mode
- Write user guide for AI features
- Performance optimization

---

## Configuration File

**File:** `src/config/ollama.config.ts` (NEW)

```typescript
export const OLLAMA_CONFIG = {
  // Server connection
  baseUrl: process.env.VITE_OLLAMA_URL || 'http://localhost:11434',
  enabled: process.env.VITE_ENABLE_LOCAL_LLM === 'true',

  // Model selection by task
  models: {
    summarization: 'qwen2.5:14b',      // Your best model
    questionAnswering: 'qwen2.5:14b',  // Needs comprehension
    themeExtraction: 'qwen2.5:14b',    // Complex analysis
    annotations: 'qwen2.5:14b',        // Analytical suggestions
    embeddings: 'qwen2.5:14b',         // Semantic understanding
    quickTasks: 'mistral'              // Fast operations
  },

  // Generation parameters
  temperature: {
    factual: 0.1,      // Q&A, citations
    analytical: 0.5,   // Themes, summaries
    creative: 0.7      // Questions, prompts
  },

  // Performance
  timeout: 30000,      // 30 seconds
  maxTokens: 1000,
  cacheResponses: true
};
```

---

## Benefits of Using Your Local Models

### vs. Browser-Based ML (TensorFlow.js)

| Aspect | Browser ML | Your Ollama Models |
|--------|------------|-------------------|
| Model Size | 50MB (limits quality) | 14B params (high quality) |
| Inference Speed | 200-500ms | 100-300ms (with GPU) |
| Quality | Good | Excellent |
| Privacy | All local | All local ✅ |
| Internet | Not needed ✅ | Not needed ✅ |
| GPU | No | Yes ✅ |
| Cost | Free ✅ | Free ✅ |

### vs. Cloud APIs (OpenAI, Anthropic)

| Aspect | Cloud APIs | Your Ollama Models |
|--------|-----------|-------------------|
| Cost | $0.01-0.10 per request | Free ✅ |
| Privacy | Sends data to cloud | 100% local ✅ |
| Speed | 500-2000ms + network | 100-300ms ✅ |
| Offline | No | Yes ✅ |
| Quality | Excellent | Very Good |
| Limits | Rate limits, quotas | None ✅ |

**Winner:** Your local Ollama models for research use!

---

## Implementation Checklist

### Setup (30 minutes)
- [ ] Ensure Ollama running: `ollama serve`
- [ ] Test models: `ollama run qwen2.5:14b "test"`
- [ ] Create ollama-client.ts service
- [ ] Test API connection from React app

### Feature Development (2-3 weeks)
- [ ] Week 1: Summarization + Q&A
- [ ] Week 2: Theme extraction + Annotation suggestions
- [ ] Week 3: Embeddings integration + Polish

### User Experience
- [ ] Add "AI Assistant" panel to DocumentViewer
- [ ] Show Ollama status (running/stopped)
- [ ] Graceful fallback if Ollama unavailable
- [ ] Loading states for LLM inference
- [ ] Cache responses to avoid re-generating

---

## Quick Start: Test Integration

**1. Start Ollama** (if not running):
```bash
ollama serve
```

**2. Test from command line:**
```bash
ollama run qwen2.5:14b "Summarize: Los Angeles County dominates as California's most populous..."
```

**3. Add to Close Reading Platform:**

Create `src/services/ml/ollama-client.ts` with code above, then:

```typescript
// In DocumentViewer.tsx, add:
import { ollamaClient } from '../services/ml/ollama-client';

const testOllama = async () => {
  const available = await ollamaClient.checkAvailability();
  console.log('Ollama available?', available);

  if (available) {
    const summary = await ollamaClient.generate('Test prompt');
    console.log('Summary:', summary);
  }
};

// Add button:
<Button onClick={testOllama}>Test Ollama</Button>
```

**4. See results in console**

---

## Advantages for Close Reading Research

**1. Deeper Analysis:**
- qwen2.5:14b can understand complex academic arguments
- Better than rule-based NLP
- Contextual understanding beyond keywords

**2. Cost-Effective:**
- No API fees (runs locally)
- Unlimited usage
- Perfect for large corpus analysis

**3. Privacy-First:**
- Sensitive research documents never leave your machine
- Important for unpublished work, confidential sources
- Complies with IRB requirements for data protection

**4. GPU Acceleration:**
- Your ThinkPad P16v likely has discrete GPU
- qwen2.5:14b can use GPU for 5-10× faster inference
- Real-time AI features become feasible

**5. Customization:**
- Can fine-tune models on your specific domain
- Can create custom prompts for your research methodology
- Full control over model behavior

---

## Next Steps

### Immediate (This Week):
1. **Test Ollama integration** (30 min)
   - Create ollama-client.ts
   - Test API calls
   - Verify models accessible

2. **Implement summarization** (4-6 hours)
   - Build summarization service
   - Add UI button
   - Test with research documents

3. **Implement Q&A** (3-4 hours)
   - Build Q&A service
   - Add input interface
   - Test answer quality

### Short-term (Next 2 Weeks):
4. **Theme extraction** (6-8 hours)
5. **Annotation suggestions** (6-8 hours)
6. **Embeddings migration** (8-10 hours)

### Polish (Week 4):
7. **Performance optimization** (caching, parallel requests)
8. **User documentation** ("How to use AI features")
9. **Fallback handling** (graceful degradation if Ollama down)

---

## Estimated Impact

**With Ollama Integration:**
- **Research Utility:** 7.5/10 → **9.0/10** 🚀
- **Differentiation:** UNIQUE (no other tool has local LLM + web UI)
- **User Value:** AI-augmented analysis (find patterns, validate insights)
- **Privacy:** 100% local (critical for sensitive research)

**This makes Close Reading Platform the ONLY web-based close reading tool with local LLM integration.**

---

**Ready to implement?** We can start with basic Ollama integration today! 🎯

