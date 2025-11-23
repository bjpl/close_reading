/**
 * Claude Feature Panel Component
 * UI for toggling and configuring Claude AI features
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Textarea,
  createToaster,
  Badge,
  NativeSelectRoot,
  NativeSelectField,
  Spinner,
} from '@chakra-ui/react';
import { Accordion } from '@chakra-ui/react/accordion';
import { Switch } from '@chakra-ui/react';
import type { ClaudeService } from '../../services/ai';

interface Feature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  estimatedCost: number;
}

interface ClaudeFeaturePanelProps {
  claudeService: ClaudeService | null;
  documentText: string;
  onResult: (feature: string, result: unknown) => void;
}

const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
});

export const ClaudeFeaturePanel: React.FC<ClaudeFeaturePanelProps> = ({
  claudeService,
  documentText,
  onResult,
}) => {
  const [features, setFeatures] = useState<Feature[]>([
    {
      id: 'summarize',
      name: 'Document Summarization',
      description: 'Generate academic, brief, or detailed summaries',
      enabled: true,
      category: 'Analysis',
      estimatedCost: 0,
    },
    {
      id: 'answerQuestion',
      name: 'Q&A System',
      description: 'Ask questions with context-aware responses',
      enabled: true,
      category: 'Interaction',
      estimatedCost: 0,
    },
    {
      id: 'extractThemes',
      name: 'Theme Extraction',
      description: 'Extract interpretive themes with examples',
      enabled: true,
      category: 'Analysis',
      estimatedCost: 0,
    },
    {
      id: 'suggestAnnotations',
      name: 'Annotation Suggestions',
      description: 'AI-powered annotation recommendations',
      enabled: true,
      category: 'Pedagogy',
      estimatedCost: 0,
    },
    {
      id: 'mineArguments',
      name: 'Argument Mining',
      description: 'Extract claims, evidence, and structure',
      enabled: true,
      category: 'Analysis',
      estimatedCost: 0,
    },
    {
      id: 'generateQuestions',
      name: 'Question Generation',
      description: 'Generate discussion and study questions',
      enabled: true,
      category: 'Pedagogy',
      estimatedCost: 0,
    },
    {
      id: 'extractRelationships',
      name: 'Entity Relationships',
      description: 'Map character and concept relationships',
      enabled: true,
      category: 'Analysis',
      estimatedCost: 0,
    },
    {
      id: 'compareDocuments',
      name: 'Comparative Analysis',
      description: 'Compare multiple documents',
      enabled: false,
      category: 'Analysis',
      estimatedCost: 0,
    },
  ]);

  const [loading, setLoading] = useState<string | null>(null);
  const [summaryStyle, setSummaryStyle] = useState<'academic' | 'brief' | 'detailed'>(
    'academic'
  );
  const [question, setQuestion] = useState('');

  React.useEffect(() => {
    if (claudeService && documentText) {
      updateCostEstimates();
    }
  }, [claudeService, documentText]);

  const updateCostEstimates = () => {
    if (!claudeService) return;

    setFeatures((prev) =>
      prev.map((feature) => ({
        ...feature,
        estimatedCost: claudeService.estimateCost(documentText, feature.id).cost,
      }))
    );
  };

  const toggleFeature = (featureId: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const executeFeature = async (featureId: string) => {
    if (!claudeService || !documentText) {
      toaster.create({
        title: 'Error',
        description: 'Claude service not initialized or no document loaded',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(featureId);

    try {
      let result;

      switch (featureId) {
        case 'summarize':
          result = await claudeService.summarize(documentText, {
            style: summaryStyle,
            level: 'document',
            includeCitations: true,
          });
          break;

        case 'answerQuestion':
          if (!question.trim()) {
            toaster.create({
              title: 'Error',
              description: 'Please enter a question',
              type: 'error',
              duration: 3000,
            });
            return;
          }
          result = await claudeService.answerQuestion(question, documentText, {
            includeEvidence: true,
            maxFollowUps: 3,
          });
          break;

        case 'extractThemes':
          result = await claudeService.extractThemes(documentText, {
            minThemes: 3,
            maxThemes: 8,
            includeExamples: true,
            depth: 'moderate',
          });
          break;

        case 'suggestAnnotations':
          result = await claudeService.suggestAnnotations(documentText, {
            minPedagogicalValue: 0.6,
            maxSuggestions: 10,
          });
          break;

        case 'mineArguments':
          result = await claudeService.mineArguments(documentText, {
            includeCounterArguments: true,
            generateMap: true,
          });
          break;

        case 'generateQuestions':
          result = await claudeService.generateQuestions(documentText, {
            count: 8,
            includeAnswers: true,
          });
          break;

        case 'extractRelationships':
          result = await claudeService.extractRelationships(documentText, {
            includePowerDynamics: true,
            includeNetworkAnalysis: true,
          });
          break;

        default:
          throw new Error(`Unknown feature: ${featureId}`);
      }

      onResult(featureId, result);

      toaster.create({
        title: 'Success',
        description: `${features.find((f) => f.id === featureId)?.name} completed`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error(`Error executing ${featureId}:`, error);
      toaster.create({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(null);
    }
  };

  const groupedFeatures = features.reduce(
    (acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    },
    {} as Record<string, Feature[]>
  );

  if (!claudeService) {
    return (
      <Box p={4} bg="yellow.50" borderRadius="md">
        <Text>Configure Claude API key in settings to use AI features</Text>
      </Box>
    );
  }

  return (
    <Box p={4} borderWidth={1} borderRadius="lg">
      <VStack align="stretch" gap={4}>
        <Text fontSize="xl" fontWeight="bold">
          Claude AI Features
        </Text>

        <Accordion.Root multiple>
          {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
            <Accordion.Item key={category} value={category}>
              <Accordion.ItemTrigger>
                <Box flex="1" textAlign="left">
                  <HStack>
                    <Text fontWeight="semibold">{category}</Text>
                    <Badge>{categoryFeatures.length} features</Badge>
                  </HStack>
                </Box>
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <VStack align="stretch" gap={3}>
                  {categoryFeatures.map((feature) => (
                    <Box
                      key={feature.id}
                      p={3}
                      bg={feature.enabled ? 'blue.50' : 'gray.50'}
                      borderRadius="md"
                    >
                      <HStack justify="space-between" mb={2}>
                        <VStack align="start" gap={1}>
                          <HStack>
                            <Text fontWeight="medium">{feature.name}</Text>
                            <Badge colorScheme="green" title={`Estimated cost: $${feature.estimatedCost.toFixed(4)}`}>
                              ${feature.estimatedCost.toFixed(4)}
                            </Badge>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            {feature.description}
                          </Text>
                        </VStack>
                        <Switch.Root
                          checked={feature.enabled}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        >
                          <Switch.Thumb />
                        </Switch.Root>
                      </HStack>

                      {feature.enabled && (
                        <VStack align="stretch" gap={2} mt={2}>
                          {feature.id === 'summarize' && (
                            <NativeSelectRoot size="sm">
                              <NativeSelectField
                                value={summaryStyle}
                                onChange={(e) =>
                                  setSummaryStyle(
                                    e.target.value as 'academic' | 'brief' | 'detailed'
                                  )
                                }
                              >
                                <option value="academic">Academic</option>
                                <option value="brief">Brief</option>
                                <option value="detailed">Detailed</option>
                              </NativeSelectField>
                            </NativeSelectRoot>
                          )}

                          {feature.id === 'answerQuestion' && (
                            <Textarea
                              size="sm"
                              placeholder="Enter your question..."
                              value={question}
                              onChange={(e) => setQuestion(e.target.value)}
                            />
                          )}

                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={() => executeFeature(feature.id)}
                            loading={loading === feature.id}
                            disabled={!documentText || loading !== null}
                          >
                            {loading === feature.id ? (
                              <Spinner size="sm" mr={2} />
                            ) : null}
                            Run {feature.name}
                          </Button>
                        </VStack>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </VStack>
    </Box>
  );
};

export default ClaudeFeaturePanel;
