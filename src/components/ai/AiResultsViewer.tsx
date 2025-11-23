/**
 * AI Results Viewer Component
 * Display results from Claude AI features
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Separator,
  Code,
  Button,
  createToaster,
} from '@chakra-ui/react';
import { Accordion } from '@chakra-ui/react/accordion';
import { List } from '@chakra-ui/react/list';
import type {
  ClaudeResponse,
  Summary,
  QuestionAnswer,
  Theme,
  AnnotationSuggestion,
  ArgumentStructure,
  GeneratedQuestion,
  EntityNetwork,
  ComparativeAnalysis,
} from '../../services/ai';

interface AiResultsViewerProps {
  feature: string;
  result: ClaudeResponse<unknown>;
}

const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
});

export const AiResultsViewer: React.FC<AiResultsViewerProps> = ({
  feature,
  result,
}) => {

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${feature}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toaster.create({
      title: 'Exported',
      description: `${feature} results exported successfully`,
      type: 'success',
      duration: 2000,
    });
  };

  const renderContent = () => {
    switch (feature) {
      case 'summarize':
        return <SummaryView data={result.data as Summary} />;
      case 'answerQuestion':
        return <QuestionAnswerView data={result.data as QuestionAnswer} />;
      case 'extractThemes':
        return <ThemesView data={result.data as Theme[]} />;
      case 'suggestAnnotations':
        return <AnnotationsView data={result.data as AnnotationSuggestion[]} />;
      case 'mineArguments':
        return <ArgumentsView data={result.data as ArgumentStructure} />;
      case 'generateQuestions':
        return <QuestionsView data={result.data as GeneratedQuestion[]} />;
      case 'extractRelationships':
        return <RelationshipsView data={result.data as EntityNetwork} />;
      case 'compareDocuments':
        return <ComparativeView data={result.data as ComparativeAnalysis} />;
      default:
        return <Code>{JSON.stringify(result.data, null, 2)}</Code>;
    }
  };

  return (
    <Box p={4} borderWidth={1} borderRadius="lg">
      <VStack align="stretch" gap={4}>
        <HStack justify="space-between">
          <HStack>
            <Text fontSize="xl" fontWeight="bold">
              {feature.replace(/([A-Z])/g, ' $1').trim()}
            </Text>
            {result.cached && <Badge colorScheme="green">Cached</Badge>}
          </HStack>
          <Button size="sm" onClick={handleExport}>
            Export
          </Button>
        </HStack>

        <HStack gap={4} fontSize="sm" color="gray.600">
          <Text>
            <strong>Tokens:</strong> {result.usage.inputTokens} in /{' '}
            {result.usage.outputTokens} out
          </Text>
          <Text>
            <strong>Cost:</strong> ${result.usage.estimatedCost.toFixed(4)}
          </Text>
          <Text>
            <strong>Model:</strong> {result.model}
          </Text>
        </HStack>

        <Separator />

        {renderContent()}
      </VStack>
    </Box>
  );
};

// Specialized view components

const SummaryView: React.FC<{ data: Summary }> = ({ data }) => (
  <VStack align="stretch" gap={3}>
    <Box>
      <Text fontWeight="semibold" mb={2}>
        Summary
      </Text>
      <Text>{data.text}</Text>
    </Box>

    <Box>
      <Text fontWeight="semibold" mb={2}>
        Key Points
      </Text>
      <List.Root pl={5}>
        {data.keyPoints.map((point, idx) => (
          <List.Item key={idx}>{point}</List.Item>
        ))}
      </List.Root>
    </Box>

    <HStack gap={4}>
      <Badge>Words: {data.wordCount}</Badge>
      <Badge colorScheme="blue">Confidence: {(data.confidence * 100).toFixed(0)}%</Badge>
    </HStack>

    {data.citations && data.citations.length > 0 && (
      <Box>
        <Text fontWeight="semibold" mb={2}>
          Citations
        </Text>
        <List.Root pl={5}>
          {data.citations.map((citation, idx) => (
            <List.Item key={idx}>
              {citation.text} ({citation.source})
            </List.Item>
          ))}
        </List.Root>
      </Box>
    )}
  </VStack>
);

const QuestionAnswerView: React.FC<{ data: QuestionAnswer }> = ({ data }) => (
  <VStack align="stretch" gap={3}>
    <Box>
      <Text fontWeight="semibold" mb={2}>
        Question
      </Text>
      <Text fontStyle="italic">{data.question}</Text>
    </Box>

    <Box>
      <Text fontWeight="semibold" mb={2}>
        Answer
      </Text>
      <Text>{data.answer}</Text>
      <Badge mt={2} colorScheme="blue">
        Confidence: {(data.confidence * 100).toFixed(0)}%
      </Badge>
    </Box>

    {data.evidence.length > 0 && (
      <Box>
        <Text fontWeight="semibold" mb={2}>
          Evidence
        </Text>
        <VStack align="stretch" gap={2}>
          {data.evidence.map((evidence, idx) => (
            <Box key={idx} p={2} bg="gray.50" borderRadius="md">
              <Text fontSize="sm">"{evidence.quote}"</Text>
              <Text fontSize="xs" color="gray.600" mt={1}>
                Source: {evidence.source} | Relevance:{' '}
                {(evidence.relevanceScore * 100).toFixed(0)}%
              </Text>
            </Box>
          ))}
        </VStack>
      </Box>
    )}

    {data.followUpQuestions.length > 0 && (
      <Box>
        <Text fontWeight="semibold" mb={2}>
          Follow-up Questions
        </Text>
        <List.Root pl={5}>
          {data.followUpQuestions.map((q, idx) => (
            <List.Item key={idx}>{q}</List.Item>
          ))}
        </List.Root>
      </Box>
    )}
  </VStack>
);

const ThemesView: React.FC<{ data: Theme[] }> = ({ data }) => (
  <Accordion.Root multiple>
    {data.map((theme, idx) => (
      <Accordion.Item key={idx} value={`theme-${idx}`}>
        <Accordion.ItemTrigger>
          <Box flex="1" textAlign="left">
            <HStack>
              <Text fontWeight="semibold">{theme.name}</Text>
              <Badge>{(theme.prevalence * 100).toFixed(0)}% prevalent</Badge>
            </HStack>
          </Box>
          <Accordion.ItemIndicator />
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          <VStack align="stretch" gap={3}>
            <Text>{theme.description}</Text>

            <Box>
              <Text fontWeight="semibold" mb={2}>
                Interpretation
              </Text>
              <Text>{theme.interpretation}</Text>
            </Box>

            {theme.examples.length > 0 && (
              <Box>
                <Text fontWeight="semibold" mb={2}>
                  Examples
                </Text>
                <VStack align="stretch" gap={2}>
                  {theme.examples.map((example, exIdx) => (
                    <Box key={exIdx} p={2} bg="blue.50" borderRadius="md">
                      <Text fontSize="sm">"{example.text}"</Text>
                      <Text fontSize="xs" color="gray.600" mt={1}>
                        {example.location}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </Accordion.ItemContent>
      </Accordion.Item>
    ))}
  </Accordion.Root>
);

const AnnotationsView: React.FC<{ data: AnnotationSuggestion[] }> = ({ data }) => (
  <VStack align="stretch" gap={3}>
    {data.map((annotation, idx) => (
      <Box key={idx} p={3} borderWidth={1} borderRadius="md">
        <HStack justify="space-between" mb={2}>
          <Badge colorScheme="purple">{annotation.type}</Badge>
          <Badge colorScheme="green">
            Value: {(annotation.pedagogicalValue * 100).toFixed(0)}%
          </Badge>
        </HStack>
        <Text fontSize="sm" fontStyle="italic" mb={2}>
          "{annotation.passage}"
        </Text>
        <Text fontSize="sm" mb={2}>
          <strong>Suggested Note:</strong> {annotation.suggestedNote}
        </Text>
        <Text fontSize="sm" color="gray.600">
          <strong>Reasoning:</strong> {annotation.reasoning}
        </Text>
      </Box>
    ))}
  </VStack>
);

const ArgumentsView: React.FC<{ data: ArgumentStructure }> = ({ data }) => (
  <VStack align="stretch" gap={4}>
    <Box>
      <Text fontWeight="semibold" mb={2}>
        Main Claim
      </Text>
      <Box p={3} bg="blue.50" borderRadius="md">
        <Text>{data.mainClaim.text}</Text>
        <Badge mt={2}>Strength: {(data.mainClaim.strength * 100).toFixed(0)}%</Badge>
      </Box>
    </Box>

    {data.supportingClaims.length > 0 && (
      <Box>
        <Text fontWeight="semibold" mb={2}>
          Supporting Claims ({data.supportingClaims.length})
        </Text>
        <VStack align="stretch" gap={2}>
          {data.supportingClaims.map((claim, idx) => (
            <Box key={idx} p={2} bg="green.50" borderRadius="md">
              <Text fontSize="sm">{claim.text}</Text>
            </Box>
          ))}
        </VStack>
      </Box>
    )}

    {data.counterClaims.length > 0 && (
      <Box>
        <Text fontWeight="semibold" mb={2}>
          Counter Claims ({data.counterClaims.length})
        </Text>
        <VStack align="stretch" gap={2}>
          {data.counterClaims.map((claim, idx) => (
            <Box key={idx} p={2} bg="red.50" borderRadius="md">
              <Text fontSize="sm">{claim.text}</Text>
            </Box>
          ))}
        </VStack>
      </Box>
    )}

    <Box>
      <Text fontWeight="semibold" mb={2}>
        Argument Structure
      </Text>
      <HStack gap={4}>
        <Badge>Coherence: {(data.structure.coherence * 100).toFixed(0)}%</Badge>
        <Badge>Completeness: {(data.structure.completeness * 100).toFixed(0)}%</Badge>
      </HStack>
      <Text mt={2} fontSize="sm">
        {data.structure.logicalFlow}
      </Text>
    </Box>
  </VStack>
);

const QuestionsView: React.FC<{ data: GeneratedQuestion[] }> = ({ data }) => (
  <VStack align="stretch" gap={3}>
    {data.map((question, idx) => (
      <Box key={idx} p={3} borderWidth={1} borderRadius="md">
        <HStack mb={2}>
          <Badge colorScheme="blue">{question.type}</Badge>
          <Badge colorScheme="orange">{question.difficulty}</Badge>
        </HStack>
        <Text fontWeight="semibold" mb={2}>
          {idx + 1}. {question.question}
        </Text>
        {question.suggestedAnswer && (
          <Text fontSize="sm" color="gray.600" mb={2}>
            <strong>Suggested Answer:</strong> {question.suggestedAnswer}
          </Text>
        )}
        <Text fontSize="sm" color="gray.600">
          <strong>Goal:</strong> {question.pedagogicalGoal}
        </Text>
      </Box>
    ))}
  </VStack>
);

const RelationshipsView: React.FC<{ data: EntityNetwork }> = ({ data }) => (
  <VStack align="stretch" gap={4}>
    <Box>
      <Text fontWeight="semibold" mb={2}>
        Entities ({data.entities.length})
      </Text>
      <VStack align="stretch" gap={2}>
        {data.entities.slice(0, 10).map((entity, idx) => (
          <HStack key={idx}>
            <Badge colorScheme="purple">{entity.type}</Badge>
            <Text flex={1}>{entity.name}</Text>
            <Badge>{(entity.significance * 100).toFixed(0)}%</Badge>
          </HStack>
        ))}
      </VStack>
    </Box>

    <Box>
      <Text fontWeight="semibold" mb={2}>
        Relationships ({data.relationships.length})
      </Text>
      <VStack align="stretch" gap={2}>
        {data.relationships.slice(0, 10).map((rel, idx) => (
          <Box key={idx} p={2} bg="gray.50" borderRadius="md">
            <Text fontSize="sm">
              <strong>{rel.entity1}</strong> → <strong>{rel.entity2}</strong>
            </Text>
            <Text fontSize="sm" color="gray.600">
              {rel.description}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>

    {data.powerDynamics.length > 0 && (
      <Box>
        <Text fontWeight="semibold" mb={2}>
          Power Dynamics
        </Text>
        <VStack align="stretch" gap={2}>
          {data.powerDynamics.map((dynamic, idx) => (
            <Box key={idx} p={2} bg="orange.50" borderRadius="md">
              <Text fontSize="sm">
                <strong>{dynamic.dominant}</strong> over{' '}
                <strong>{dynamic.subordinate}</strong>
              </Text>
              <Text fontSize="sm" color="gray.600">
                Basis: {dynamic.basis}
              </Text>
            </Box>
          ))}
        </VStack>
      </Box>
    )}
  </VStack>
);

const ComparativeView: React.FC<{ data: ComparativeAnalysis }> = ({ data }) => (
  <VStack align="stretch" gap={4}>
    <Box>
      <Text fontWeight="semibold" mb={2}>
        Documents
      </Text>
      <VStack align="stretch" gap={2}>
        {data.documents.map((doc, idx) => (
          <Box key={idx} p={2} bg="gray.50" borderRadius="md">
            <Text fontWeight="semibold">{doc.title}</Text>
            <Text fontSize="sm">{doc.summary}</Text>
          </Box>
        ))}
      </VStack>
    </Box>

    <Box>
      <Text fontWeight="semibold" mb={2}>
        Cross-Document Themes
      </Text>
      <VStack align="stretch" gap={2}>
        {data.themes.map((theme, idx) => (
          <Box key={idx} p={2} borderWidth={1} borderRadius="md">
            <Text fontWeight="semibold">{theme.theme}</Text>
            <Text fontSize="sm">{theme.interpretation}</Text>
          </Box>
        ))}
      </VStack>
    </Box>

    <Box>
      <Text fontWeight="semibold" mb={2}>
        Synthesis
      </Text>
      <Text>{data.synthesis.overallAnalysis}</Text>
      <Box mt={2}>
        <Text fontSize="sm" fontWeight="semibold" mb={1}>
          Key Insights:
        </Text>
        <List.Root pl={5}>
          {data.synthesis.keyInsights.map((insight, idx) => (
            <List.Item key={idx} fontSize="sm">
              {insight}
            </List.Item>
          ))}
        </List.Root>
      </Box>
    </Box>
  </VStack>
);

export default AiResultsViewer;
