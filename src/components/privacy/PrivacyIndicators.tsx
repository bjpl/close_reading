/**
 * PrivacyIndicators - Show which provider is being used and privacy status
 */

import React from 'react';
import {
  Box,
  HStack,
  Badge,
  Icon,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Tooltip } from '@chakra-ui/react/tooltip';
import { Popover } from '@chakra-ui/react/popover';
import { FiLock, FiCloud, FiMonitor, FiGlobe, FiAlertTriangle } from 'react-icons/fi';

// Types
type AIProviderType = 'ollama' | 'claude' | 'browser-ml';
interface PIIDetectionResult {
  found: boolean;
  types: string[];
}

interface PrivacyIndicatorsProps {
  currentProvider: AIProviderType;
  privacyMode?: boolean;
  piiDetected?: PIIDetectionResult;
  showDetails?: boolean;
}

export const PrivacyIndicators: React.FC<PrivacyIndicatorsProps> = ({
  currentProvider,
  privacyMode = false,
  piiDetected,
  showDetails = false,
}) => {
  const getProviderInfo = () => {
    switch (currentProvider) {
      case 'ollama':
        return {
          name: 'Ollama',
          icon: FiMonitor,
          color: 'green',
          privacy: 'local',
          description: 'Processing locally on your device',
        };
      case 'claude':
        return {
          name: 'Claude',
          icon: FiCloud,
          color: 'blue',
          privacy: 'cloud',
          description: 'Processing in the cloud via Anthropic API',
        };
      case 'browser-ml':
        return {
          name: 'Browser ML',
          icon: FiGlobe,
          color: 'purple',
          privacy: 'local',
          description: 'Processing in your browser',
        };
      default:
        return {
          name: 'Unknown',
          icon: FiMonitor,
          color: 'gray',
          privacy: 'unknown',
          description: 'Provider information unavailable',
        };
    }
  };

  const providerInfo = getProviderInfo();
  const isLocal = providerInfo.privacy === 'local';

  return (
    <HStack gap={2}>
      {/* Privacy Mode Indicator */}
      {privacyMode && (
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Badge colorScheme="green" display="flex" alignItems="center" gap={1}>
              <Icon as={FiLock} />
              Privacy Mode
            </Badge>
          </Tooltip.Trigger>
          <Tooltip.Content>Privacy mode active - using local processing only</Tooltip.Content>
        </Tooltip.Root>
      )}

      {/* Provider Indicator */}
      <Popover.Root positioning={{ placement: 'bottom-start' }}>
        <Popover.Trigger>
          <Badge
            colorScheme={providerInfo.color}
            display="flex"
            alignItems="center"
            gap={1}
            cursor="pointer"
          >
            <Icon as={providerInfo.icon} />
            {providerInfo.name}
            {isLocal && <Icon as={FiLock} boxSize={3} />}
          </Badge>
        </Popover.Trigger>
        {showDetails && (
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Header fontWeight="semibold">
              {providerInfo.name} Provider
            </Popover.Header>
            <Popover.Body>
              <VStack align="start" gap={2} fontSize="sm">
                <HStack>
                  <Icon as={isLocal ? FiLock : FiCloud} />
                  <Text>
                    <strong>Privacy:</strong> {providerInfo.privacy}
                  </Text>
                </HStack>
                <Text color="gray.600">{providerInfo.description}</Text>
                {!isLocal && (
                  <Text fontSize="xs" color="orange.600">
                    Data is sent to external servers for processing
                  </Text>
                )}
              </VStack>
            </Popover.Body>
          </Popover.Content>
        )}
      </Popover.Root>

      {/* PII Detection Indicator */}
      {piiDetected?.found && (
        <Popover.Root positioning={{ placement: 'bottom-start' }}>
          <Popover.Trigger>
            <Badge
              colorScheme="orange"
              display="flex"
              alignItems="center"
              gap={1}
              cursor="pointer"
            >
              <Icon as={FiAlertTriangle} />
              PII Detected
            </Badge>
          </Popover.Trigger>
          {showDetails && (
            <Popover.Content>
              <Popover.Arrow />
              <Popover.Header fontWeight="semibold">
                Personally Identifiable Information Detected
              </Popover.Header>
              <Popover.Body>
                <VStack align="start" gap={2} fontSize="sm">
                  <Text>The following types of PII were found:</Text>
                  <VStack align="start" gap={1}>
                    {piiDetected.types.map((type: string) => (
                      <HStack key={type}>
                        <Icon as={FiAlertTriangle} color="orange.500" />
                        <Text>{type.replace('-', ' ').toUpperCase()}</Text>
                      </HStack>
                    ))}
                  </VStack>
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    This data has been sanitized before processing.
                  </Text>
                </VStack>
              </Popover.Body>
            </Popover.Content>
          )}
        </Popover.Root>
      )}

      {/* Data Flow Indicator */}
      {!isLocal && !privacyMode && (
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Icon as={FiCloud} color="blue.500" boxSize={4} />
          </Tooltip.Trigger>
          <Tooltip.Content>Data is being sent to cloud servers</Tooltip.Content>
        </Tooltip.Root>
      )}
    </HStack>
  );
};

/**
 * Compact version for inline display
 */
export const CompactPrivacyIndicator: React.FC<{
  provider: AIProviderType;
  privacyMode?: boolean;
}> = ({ provider, privacyMode }) => {
  const isLocal = provider === 'ollama' || provider === 'browser-ml';

  return (
    <HStack gap={1} fontSize="xs" color="gray.600">
      <Icon
        as={isLocal || privacyMode ? FiLock : FiCloud}
        boxSize={3}
        color={isLocal || privacyMode ? 'green.500' : 'blue.500'}
      />
      <Text>{isLocal || privacyMode ? 'Local' : 'Cloud'}</Text>
    </HStack>
  );
};

/**
 * Status bar version for global display
 */
export const PrivacyStatusBar: React.FC<{
  provider: AIProviderType;
  privacyMode?: boolean;
  piiDetected?: PIIDetectionResult;
}> = ({ provider, privacyMode, piiDetected }) => {
  const isLocal = provider === 'ollama' || provider === 'browser-ml';

  return (
    <Box
      px={3}
      py={1}
      bg={isLocal || privacyMode ? 'green.50' : 'blue.50'}
      borderBottom="1px solid"
      borderColor={isLocal || privacyMode ? 'green.200' : 'blue.200'}
    >
      <HStack justify="space-between" fontSize="sm">
        <HStack>
          <Icon
            as={isLocal || privacyMode ? FiLock : FiCloud}
            color={isLocal || privacyMode ? 'green.600' : 'blue.600'}
          />
          <Text color={isLocal || privacyMode ? 'green.700' : 'blue.700'}>
            {privacyMode
              ? 'Privacy Mode Active'
              : isLocal
              ? 'Local Processing'
              : 'Cloud Processing'}
          </Text>
        </HStack>

        <PrivacyIndicators
          currentProvider={provider}
          privacyMode={privacyMode}
          piiDetected={piiDetected}
          showDetails={true}
        />
      </HStack>
    </Box>
  );
};
