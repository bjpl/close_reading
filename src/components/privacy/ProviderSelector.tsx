/**
 * ProviderSelector - UI for selecting AI provider
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Spinner,
} from '@chakra-ui/react';
import { RadioGroup } from '@chakra-ui/react';
import { Tooltip } from '@chakra-ui/react/tooltip';
import { Alert } from '@chakra-ui/react/alert';
import { FiCloud, FiMonitor, FiGlobe, FiLock } from 'react-icons/fi';
import { AIRouter } from '@/services/ai/AIRouter';

// Types
type AIProviderType = 'ollama' | 'claude' | 'browser-ml';
interface AIProviderMetadata {
  name: string;
  privacy: 'local' | 'cloud';
  quality: string;
  speed: string;
  cost: string;
  requiresSetup?: boolean;
  modelName?: string;
}

interface ProviderOption {
  type: AIProviderType;
  metadata: AIProviderMetadata;
  available: boolean;
}

interface ProviderSelectorProps {
  router: AIRouter;
  value?: AIProviderType;
  onChange?: (provider: AIProviderType) => void;
  privacyMode?: boolean;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  router,
  value,
  onChange,
  privacyMode = false,
}) => {
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>(
    value || 'ollama'
  );

  useEffect(() => {
    loadProviders();
  }, [router]);

  useEffect(() => {
    if (value) {
      setSelectedProvider(value);
    }
  }, [value]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const status = await router.getProviderStatus();
      setProviders(status);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    const provider = value as AIProviderType;
    setSelectedProvider(provider);
    onChange?.(provider);
  };

  const getProviderIcon = (type: AIProviderType) => {
    switch (type) {
      case 'ollama':
        return FiMonitor;
      case 'claude':
        return FiCloud;
      case 'browser-ml':
        return FiGlobe;
      default:
        return FiMonitor;
    }
  };

  const getQualityBadge = (quality: string) => {
    const colorMap: Record<string, string> = {
      'very-high': 'purple',
      high: 'blue',
      medium: 'green',
      low: 'gray',
    };
    return <Badge colorScheme={colorMap[quality] || 'gray'}>{quality}</Badge>;
  };

  const getSpeedBadge = (speed: string) => {
    const colorMap: Record<string, string> = {
      'very-fast': 'green',
      fast: 'blue',
      medium: 'yellow',
      slow: 'orange',
    };
    return <Badge colorScheme={colorMap[speed] || 'gray'}>{speed}</Badge>;
  };

  if (loading) {
    return (
      <Box textAlign="center" p={4}>
        <Spinner />
        <Text mt={2}>Loading providers...</Text>
      </Box>
    );
  }

  const availableProviders = privacyMode
    ? providers.filter(p => p.metadata.privacy === 'local')
    : providers;

  return (
    <Box>
      {privacyMode && (
        <Alert.Root status="info" mb={4}>
          <HStack>
            <Icon as={FiLock} />
            <Text fontSize="sm">
              Privacy mode enabled - only local providers available
            </Text>
          </HStack>
        </Alert.Root>
      )}

      <RadioGroup.Root
        value={selectedProvider}
        onValueChange={(details: { value: string | null }) => {
          if (details.value) {
            handleChange(details.value);
          }
        }}
      >
        <VStack align="stretch" gap={3}>
          {availableProviders.map((provider) => (
            <Box
              key={provider.type}
              p={4}
              border="1px solid"
              borderColor={
                selectedProvider === provider.type ? 'blue.500' : 'gray.200'
              }
              borderRadius="md"
              bg={selectedProvider === provider.type ? 'blue.50' : 'white'}
              cursor={provider.available ? 'pointer' : 'not-allowed'}
              opacity={provider.available ? 1 : 0.6}
              transition="all 0.2s"
              _hover={
                provider.available
                  ? {
                      borderColor: 'blue.300',
                      shadow: 'sm',
                    }
                  : {}
              }
            >
              <HStack justify="space-between">
                <HStack gap={3}>
                  <RadioGroup.Item
                    value={provider.type}
                    disabled={!provider.available}
                    colorPalette="blue"
                  />
                  <Icon
                    as={getProviderIcon(provider.type)}
                    boxSize={5}
                    color={provider.available ? 'blue.500' : 'gray.400'}
                  />
                  <VStack align="start" gap={0}>
                    <HStack>
                      <Text fontWeight="semibold">{provider.metadata.name}</Text>
                      {provider.metadata.privacy === 'local' && (
                        <Tooltip.Root>
                          <Tooltip.Trigger>
                            <Icon as={FiLock} color="green.500" />
                          </Tooltip.Trigger>
                          <Tooltip.Content>Processes data locally</Tooltip.Content>
                        </Tooltip.Root>
                      )}
                      {!provider.available && (
                        <Badge colorScheme="red">Unavailable</Badge>
                      )}
                    </HStack>
                    <HStack gap={2} fontSize="xs">
                      {getQualityBadge(provider.metadata.quality)}
                      {getSpeedBadge(provider.metadata.speed)}
                      <Badge
                        colorScheme={
                          provider.metadata.cost === 'free' ? 'green' : 'yellow'
                        }
                      >
                        {provider.metadata.cost}
                      </Badge>
                      <Badge variant="outline">
                        {provider.metadata.privacy}
                      </Badge>
                    </HStack>
                  </VStack>
                </HStack>

                {provider.metadata.modelName && (
                  <Text fontSize="xs" color="gray.500">
                    {provider.metadata.modelName}
                  </Text>
                )}
              </HStack>

              {!provider.available && provider.metadata.requiresSetup && (
                <Text fontSize="xs" color="gray.600" mt={2}>
                  Setup required - see setup guide
                </Text>
              )}
            </Box>
          ))}
        </VStack>
      </RadioGroup.Root>

      {availableProviders.length === 0 && (
        <Alert.Root status="warning">
          <Alert.Title>No providers available. Please configure at least one provider.</Alert.Title>
        </Alert.Root>
      )}
    </Box>
  );
};
