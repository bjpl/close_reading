/**
 * Week 4 Integration Example
 * Complete example showing how to use Ollama, AIRouter, and PrivacyManager together
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Textarea,
  Heading,
  Text,
  Alert,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from '@chakra-ui/react';

// Import AI services
import { OllamaService, AIRouter } from '@/services/ai';
import type { IAIProvider, AIProviderType } from '@/services/ai/types';
import { getPrivacyManager } from '@/services/PrivacyManager';

// Import privacy components
import {
  PrivacySettingsPanel,
  ProviderSelector,
  OllamaSetupGuide,
  PrivacyStatusBar,
} from '@/components/privacy';

// Import existing Claude service (from Week 3)
import { ClaudeService } from '@/services/ai/ClaudeService';

/**
 * Main AI Analysis Component
 * Demonstrates complete Week 4 integration
 */
export const AIAnalysisDemo: React.FC<{ userId: string }> = ({ userId }) => {
  // State management
  const [text, setText] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [router, setRouter] = useState<AIRouter | null>(null);
  const [currentProvider, setCurrentProvider] = useState<AIProviderType>('ollama');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [piiDetected, setPiiDetected] = useState<any>(null);

  const toast = useToast();
  const privacyManager = getPrivacyManager();

  /**
   * Initialize AI providers and router
   */
  useEffect(() => {
    initializeAI();
  }, []);

  const initializeAI = async () => {
    try {
      // Create provider instances
      const ollamaService = new OllamaService({
        baseUrl: 'http://localhost:11434',
        defaultModel: 'qwen2.5-coder:32b-instruct',
      });

      const claudeService = new ClaudeService({
        apiKey: process.env.VITE_ANTHROPIC_API_KEY || '',
      });

      // Create provider map
      const providers = new Map<AIProviderType, IAIProvider>([
        ['ollama', ollamaService],
        ['claude', claudeService],
      ]);

      // Create router with intelligent fallback
      const aiRouter = new AIRouter(providers, {
        preferredProvider: 'ollama',
        strategy: 'auto-best',
        trackMetrics: true,
      });

      // Initialize router
      await aiRouter.initialize();

      // Load privacy settings
      const settings = await privacyManager.loadSettings(userId);
      setPrivacyMode(settings.privacy_mode_enabled);

      // Apply privacy settings to router
      aiRouter.setPrivacySettings(settings);

      setRouter(aiRouter);

      toast({
        title: 'AI Services Ready',
        description: 'Local and cloud providers initialized',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to initialize AI:', error);
      toast({
        title: 'Initialization Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  /**
   * Process text with privacy validation
   */
  const processText = async (operation: string) => {
    if (!router || !text.trim()) return;

    setLoading(true);
    setResult('');
    setPiiDetected(null);

    try {
      // Step 1: Validate text for privacy concerns
      const validation = await privacyManager.validateForProcessing(
        text,
        currentProvider,
        userId
      );

      if (!validation.allowed) {
        toast({
          title: 'Processing Blocked',
          description: validation.reason,
          status: 'warning',
          duration: 5000,
        });
        setLoading(false);
        return;
      }

      // Step 2: Show PII warning if detected
      if (validation.piiDetected?.found) {
        setPiiDetected(validation.piiDetected);

        const confirmed = window.confirm(
          `PII detected: ${validation.piiDetected.types.join(', ')}\n\n` +
          `The data will be sanitized before processing. Continue?`
        );

        if (!confirmed) {
          setLoading(false);
          return;
        }
      }

      // Step 3: Use sanitized text if PII was detected
      const textToProcess = validation.sanitizedText || text;

      // Step 4: Execute the requested operation
      let response;
      switch (operation) {
        case 'summarize':
          response = await router.summarize(textToProcess);
          setResult(
            `Summary (via ${response.provider}):\n\n${response.summary}\n\n` +
            `Key Points:\n${response.keyPoints.map(p => `• ${p}`).join('\n')}`
          );
          break;

        case 'themes':
          response = await router.extractThemes(textToProcess);
          setResult(
            `Themes (via ${response.provider}):\n\n` +
            `${response.themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n` +
            `Confidence: ${(response.confidence * 100).toFixed(0)}%`
          );
          break;

        case 'question':
          const question = window.prompt('What question do you have about this text?');
          if (!question) {
            setLoading(false);
            return;
          }

          response = await router.answerQuestion(textToProcess, question);
          setResult(
            `Question: ${question}\n\n` +
            `Answer (via ${response.provider}):\n${response.answer}\n\n` +
            `Confidence: ${(response.confidence * 100).toFixed(0)}%`
          );
          break;

        case 'insights':
          response = await router.generateInsights(textToProcess);
          setResult(
            `Insights (via ${response.provider}):\n\n${response.text}\n\n` +
            `Latency: ${response.latency}ms`
          );
          break;

        default:
          toast({
            title: 'Unknown operation',
            status: 'error',
            duration: 3000,
          });
      }

      // Step 5: Log the successful processing
      await privacyManager.logAuditEntry({
        user_id: userId,
        action: 'cloud-processing',
        provider: currentProvider,
        pii_detected: validation.piiDetected?.found || false,
        pii_types: validation.piiDetected?.types,
        user_approved: true,
      });

      toast({
        title: 'Processing Complete',
        description: `Analysis completed using ${currentProvider}`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Processing failed:', error);
      toast({
        title: 'Processing Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle privacy mode toggle
   */
  const handlePrivacyModeToggle = async (enabled: boolean) => {
    try {
      await privacyManager.updateSettings(userId, {
        privacy_mode_enabled: enabled,
      });
      setPrivacyMode(enabled);

      if (router) {
        const settings = await privacyManager.loadSettings(userId);
        router.setPrivacySettings(settings);
      }

      toast({
        title: enabled ? 'Privacy Mode Enabled' : 'Privacy Mode Disabled',
        description: enabled
          ? 'Only local providers will be used'
          : 'Cloud providers are now allowed',
        status: 'info',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Failed to update privacy mode',
        status: 'error',
        duration: 3000,
      });
    }
  };

  /**
   * View provider status
   */
  const viewProviderStatus = async () => {
    if (!router) return;

    const status = await router.getProviderStatus();
    const metrics = router.getQualityMetrics();

    console.log('Provider Status:', status);
    console.log('Quality Metrics:', metrics);

    const statusText = status
      .map(
        s =>
          `${s.type}: ${s.available ? 'Available' : 'Unavailable'}\n` +
          `  Quality: ${s.metadata.quality}, Speed: ${s.metadata.speed}\n` +
          `  Metrics: ${metrics.get(s.type)?.successRate.toFixed(2)}% success rate`
      )
      .join('\n\n');

    alert(`Provider Status:\n\n${statusText}`);
  };

  return (
    <Box maxW="1200px" mx="auto" p={6}>
      {/* Privacy Status Bar */}
      <PrivacyStatusBar
        provider={currentProvider}
        privacyMode={privacyMode}
        piiDetected={piiDetected}
      />

      <VStack align="stretch" gap={6} mt={6}>
        {/* Header */}
        <Box>
          <Heading size="lg">AI Analysis Demo</Heading>
          <Text color="gray.600">
            Week 4: Ollama Integration with Privacy Controls
          </Text>
        </Box>

        {/* Tabs for different sections */}
        <Tabs>
          <TabList>
            <Tab>Analysis</Tab>
            <Tab>Privacy Settings</Tab>
            <Tab>Setup Guide</Tab>
            <Tab>Provider Status</Tab>
          </TabList>

          <TabPanels>
            {/* Analysis Tab */}
            <TabPanel>
              <VStack align="stretch" gap={4}>
                {/* Provider Selection */}
                {router && (
                  <Box>
                    <Heading size="sm" mb={3}>
                      Select AI Provider
                    </Heading>
                    <ProviderSelector
                      router={router}
                      value={currentProvider}
                      onChange={setCurrentProvider}
                      privacyMode={privacyMode}
                    />
                  </Box>
                )}

                {/* Text Input */}
                <Box>
                  <Heading size="sm" mb={2}>
                    Enter Text to Analyze
                  </Heading>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your text here for analysis..."
                    minH="200px"
                  />
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {text.length} characters
                  </Text>
                </Box>

                {/* Action Buttons */}
                <HStack>
                  <Button
                    colorScheme="blue"
                    onClick={() => processText('summarize')}
                    isLoading={loading}
                    isDisabled={!router || !text.trim()}
                  >
                    Summarize
                  </Button>
                  <Button
                    colorScheme="green"
                    onClick={() => processText('themes')}
                    isLoading={loading}
                    isDisabled={!router || !text.trim()}
                  >
                    Extract Themes
                  </Button>
                  <Button
                    colorScheme="purple"
                    onClick={() => processText('question')}
                    isLoading={loading}
                    isDisabled={!router || !text.trim()}
                  >
                    Ask Question
                  </Button>
                  <Button
                    colorScheme="orange"
                    onClick={() => processText('insights')}
                    isLoading={loading}
                    isDisabled={!router || !text.trim()}
                  >
                    Generate Insights
                  </Button>
                </HStack>

                {/* Results */}
                {result && (
                  <Box>
                    <Heading size="sm" mb={2}>
                      Results
                    </Heading>
                    <Box
                      p={4}
                      bg="gray.50"
                      borderRadius="md"
                      whiteSpace="pre-wrap"
                      fontFamily="monospace"
                      fontSize="sm"
                    >
                      {result}
                    </Box>
                  </Box>
                )}

                {/* PII Warning */}
                {piiDetected?.found && (
                  <Alert status="warning">
                    <VStack align="start" gap={1}>
                      <Text fontWeight="semibold">PII Detected and Sanitized</Text>
                      <Text fontSize="sm">
                        Types: {piiDetected.types.join(', ')}
                      </Text>
                    </VStack>
                  </Alert>
                )}
              </VStack>
            </TabPanel>

            {/* Privacy Settings Tab */}
            <TabPanel>
              <PrivacySettingsPanel
                userId={userId}
                onSettingsChange={(settings) => {
                  setPrivacyMode(settings.privacy_mode_enabled);
                  if (router) {
                    router.setPrivacySettings(settings);
                  }
                }}
              />
            </TabPanel>

            {/* Setup Guide Tab */}
            <TabPanel>
              <OllamaSetupGuide />
            </TabPanel>

            {/* Provider Status Tab */}
            <TabPanel>
              <VStack align="stretch" gap={4}>
                <Button onClick={viewProviderStatus} colorScheme="blue">
                  View Detailed Status
                </Button>

                {router && (
                  <Box>
                    <Heading size="sm" mb={3}>
                      Current Configuration
                    </Heading>
                    <VStack align="stretch" gap={2}>
                      <HStack justify="space-between">
                        <Text>Current Provider:</Text>
                        <Text fontWeight="semibold">{currentProvider}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Privacy Mode:</Text>
                        <Text fontWeight="semibold">
                          {privacyMode ? 'Enabled' : 'Disabled'}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};

/**
 * Example usage in a page component
 */
export const AnalysisPage: React.FC = () => {
  const [user] = useState({ id: 'example-user-id' }); // Get from auth context

  return (
    <Box minH="100vh" bg="gray.50">
      <AIAnalysisDemo userId={user.id} />
    </Box>
  );
};

export default AnalysisPage;
