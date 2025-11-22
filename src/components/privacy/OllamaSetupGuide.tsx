/**
 * OllamaSetupGuide - Installation and setup instructions for Ollama
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Code,
  Icon,
  Separator,
  Badge,
  Link,
} from '@chakra-ui/react';
import { Steps } from '@chakra-ui/react/steps';
import { Alert } from '@chakra-ui/react/alert';
import { FiCheckCircle, FiAlertCircle, FiExternalLink } from 'react-icons/fi';
import { OllamaService } from '@/services/ai/OllamaService';

const steps = [
  {
    title: 'Install Ollama',
    description: 'Download and install Ollama on your system',
  },
  {
    title: 'Start Ollama',
    description: 'Run Ollama service in the background',
  },
  {
    title: 'Pull Model',
    description: 'Download the recommended AI model',
  },
  {
    title: 'Verify Setup',
    description: 'Test that everything is working',
  },
];

export const OllamaSetupGuide: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const checkOllamaStatus = async () => {
    setIsChecking(true);
    setErrorMessage(null);

    try {
      const ollamaService = new OllamaService();
      const available = await ollamaService.isAvailable();
      setIsAvailable(available);

      if (available) {
        setActiveStep(4); // All steps complete
      } else {
        const models = await ollamaService.listModels();
        if (models.length > 0) {
          setActiveStep(3); // Ollama running but model not found
          setErrorMessage(
            'Ollama is running but the recommended model (qwen2.5-coder:32b-instruct) is not installed.'
          );
        } else {
          setActiveStep(2); // Ollama running but no models
          setErrorMessage('Ollama is running but no models are installed.');
        }
      }
    } catch (error) {
      setIsAvailable(false);
      setActiveStep(1); // Ollama not running
      setErrorMessage('Ollama is not running or not installed.');
    } finally {
      setIsChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box p={6} maxW="900px">
      <VStack align="stretch" gap={6}>
        <Box>
          <Heading size="lg" mb={2}>
            Ollama Setup Guide
          </Heading>
          <Text color="gray.600">
            Set up Ollama for local, privacy-focused AI processing
          </Text>
        </Box>

        <Alert.Root
          status={isAvailable ? 'success' : 'info'}
          variant="subtle"
        >
          <HStack justify="space-between" w="full">
            <HStack>
              <Icon
                as={isAvailable ? FiCheckCircle : FiAlertCircle}
                boxSize={5}
              />
              <Alert.Title>
                {isAvailable
                  ? 'Ollama is ready to use!'
                  : 'Ollama is not configured yet'}
              </Alert.Title>
            </HStack>
            <Button
              size="sm"
              onClick={checkOllamaStatus}
              loading={isChecking}
            >
              Check Status
            </Button>
          </HStack>
        </Alert.Root>

        {errorMessage && (
          <Alert.Root status="warning">
            <Alert.Description fontSize="sm">{errorMessage}</Alert.Description>
          </Alert.Root>
        )}

        <Steps.Root defaultValue={activeStep} orientation="vertical" gap={0}>
          <Steps.List>
          {steps.map((step, index) => (
            <Steps.Item key={index} index={index}>
              <Steps.Trigger>
                <Steps.Indicator>
                  <Steps.Status
                    complete={<Steps.CompletedContent />}
                    incomplete={<Steps.Number />}
                  />
                </Steps.Indicator>

              <Box flexShrink="0">
                <Steps.Title>{step.title}</Steps.Title>
                <Steps.Description>{step.description}</Steps.Description>

                {index === 0 && (
                  <Box mt={3} p={4} bg="gray.50" borderRadius="md">
                    <VStack align="stretch" gap={3}>
                      <Text fontWeight="semibold">Installation:</Text>

                      <Box>
                        <HStack justify="space-between" mb={2}>
                          <Badge>macOS</Badge>
                        </HStack>
                        <Code p={3} display="block" borderRadius="md">
                          brew install ollama
                        </Code>
                        <Text fontSize="sm" color="gray.600" mt={2}>
                          Or download from{' '}
                          <Link
                            href="https://ollama.ai/download"
                            target="_blank"
                            color="blue.500"
                          >
                            ollama.ai/download <Icon as={FiExternalLink} />
                          </Link>
                        </Text>
                      </Box>

                      <Box>
                        <HStack justify="space-between" mb={2}>
                          <Badge>Linux</Badge>
                        </HStack>
                        <Code p={3} display="block" borderRadius="md">
                          curl -fsSL https://ollama.ai/install.sh | sh
                        </Code>
                      </Box>

                      <Box>
                        <HStack justify="space-between" mb={2}>
                          <Badge>Windows</Badge>
                        </HStack>
                        <Text fontSize="sm">
                          Download the installer from{' '}
                          <Link
                            href="https://ollama.ai/download"
                            target="_blank"
                            rel="noopener noreferrer"
                            color="blue.500"
                          >
                            ollama.ai/download <Icon as={FiExternalLink} />
                          </Link>
                        </Text>
                      </Box>
                    </VStack>
                  </Box>
                )}

                {index === 1 && (
                  <Box mt={3} p={4} bg="gray.50" borderRadius="md">
                    <VStack align="stretch" gap={3}>
                      <Text fontWeight="semibold">Start Ollama:</Text>

                      <Box>
                        <Text fontSize="sm" mb={2}>
                          Run this command in your terminal:
                        </Text>
                        <HStack>
                          <Code p={3} flex={1} borderRadius="md">
                            ollama serve
                          </Code>
                          <Button
                            size="sm"
                            onClick={() => copyToClipboard('ollama serve')}
                          >
                            Copy
                          </Button>
                        </HStack>
                      </Box>

                      <Alert.Root status="info" variant="subtle" fontSize="sm">
                        <Alert.Description>
                          Keep this terminal window open. Ollama needs to run in
                          the background to process requests.
                        </Alert.Description>
                      </Alert.Root>
                    </VStack>
                  </Box>
                )}

                {index === 2 && (
                  <Box mt={3} p={4} bg="gray.50" borderRadius="md">
                    <VStack align="stretch" gap={3}>
                      <Text fontWeight="semibold">Download the AI Model:</Text>

                      <Box>
                        <Text fontSize="sm" mb={2}>
                          Recommended model (32B parameters, high quality):
                        </Text>
                        <HStack>
                          <Code p={3} flex={1} borderRadius="md">
                            ollama pull qwen2.5-coder:32b-instruct
                          </Code>
                          <Button
                            size="sm"
                            onClick={() =>
                              copyToClipboard('ollama pull qwen2.5-coder:32b-instruct')
                            }
                          >
                            Copy
                          </Button>
                        </HStack>
                      </Box>

                      <Alert.Root status="warning" variant="subtle" fontSize="sm">
                        <VStack align="start" gap={1}>
                          <Text fontWeight="semibold">Note:</Text>
                          <Text>
                            • Download size: ~20GB (requires fast internet)
                          </Text>
                          <Text>
                            • Disk space: ~20GB free space required
                          </Text>
                          <Text>
                            • RAM: 16GB+ recommended for best performance
                          </Text>
                        </VStack>
                      </Alert.Root>

                      <Separator />

                      <Box>
                        <Text fontSize="sm" mb={2}>
                          Alternative (smaller, faster download):
                        </Text>
                        <HStack>
                          <Code p={3} flex={1} borderRadius="md">
                            ollama pull qwen2.5-coder:7b-instruct
                          </Code>
                          <Button
                            size="sm"
                            onClick={() =>
                              copyToClipboard('ollama pull qwen2.5-coder:7b-instruct')
                            }
                          >
                            Copy
                          </Button>
                        </HStack>
                        <Text fontSize="xs" color="gray.600" mt={2}>
                          Download size: ~4.7GB, requires 8GB+ RAM
                        </Text>
                      </Box>
                    </VStack>
                  </Box>
                )}

                {index === 3 && (
                  <Box mt={3} p={4} bg="gray.50" borderRadius="md">
                    <VStack align="stretch" gap={3}>
                      <Text fontWeight="semibold">Verify Installation:</Text>

                      <Box>
                        <Text fontSize="sm" mb={2}>
                          Test that Ollama is working:
                        </Text>
                        <HStack>
                          <Code p={3} flex={1} borderRadius="md">
                            ollama list
                          </Code>
                          <Button
                            size="sm"
                            onClick={() => copyToClipboard('ollama list')}
                          >
                            Copy
                          </Button>
                        </HStack>
                        <Text fontSize="xs" color="gray.600" mt={2}>
                          You should see qwen2.5-coder in the list
                        </Text>
                      </Box>

                      <Button
                        colorScheme="blue"
                        onClick={checkOllamaStatus}
                        loading={isChecking}
                      >
                        Verify Setup
                      </Button>
                    </VStack>
                  </Box>
                )}
              </Box>
              </Steps.Trigger>
              <Steps.Separator />
            </Steps.Item>
          ))}
          </Steps.List>
        </Steps.Root>

        {isAvailable && (
          <Alert.Root status="success">
            <VStack align="start" gap={2}>
              <HStack>
                <Icon as={FiCheckCircle} color="green.500" boxSize={5} />
                <Alert.Title fontWeight="semibold">Setup Complete!</Alert.Title>
              </HStack>
              <Alert.Description fontSize="sm">
                Ollama is running and ready to use. You can now use local AI
                processing with complete privacy.
              </Alert.Description>
            </VStack>
          </Alert.Root>
        )}

        <Separator />

        <Box>
          <Heading size="sm" mb={3}>
            Troubleshooting
          </Heading>
          <VStack align="stretch" gap={2}>
            <Box>
              <Text fontWeight="semibold" fontSize="sm">
                Ollama not responding?
              </Text>
              <Text fontSize="sm" color="gray.600">
                Make sure Ollama is running: <Code>ollama serve</Code>
              </Text>
            </Box>
            <Box>
              <Text fontWeight="semibold" fontSize="sm">
                Model not found?
              </Text>
              <Text fontSize="sm" color="gray.600">
                Pull the model: <Code>ollama pull qwen2.5-coder:32b-instruct</Code>
              </Text>
            </Box>
            <Box>
              <Text fontWeight="semibold" fontSize="sm">
                Slow performance?
              </Text>
              <Text fontSize="sm" color="gray.600">
                Use a smaller model or ensure you have enough RAM (16GB+
                recommended)
              </Text>
            </Box>
          </VStack>
        </Box>

        <Box>
          <Text fontSize="sm" color="gray.600">
            For more help, visit the{' '}
            <Link href="https://ollama.ai/docs" target="_blank" rel="noopener noreferrer" color="blue.500">
              Ollama documentation <Icon as={FiExternalLink} />
            </Link>
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};
