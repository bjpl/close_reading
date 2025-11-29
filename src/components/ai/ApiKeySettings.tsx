/**
 * API Key Settings Component
 * Manage Claude API configuration
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  InputGroup,
  IconButton,
  createToaster,
  NativeSelectRoot,
  NativeSelectField,
} from '@chakra-ui/react';
import { Field } from '@chakra-ui/react/field';
import { NumberInput } from '@chakra-ui/react/number-input';
import { Alert } from '@chakra-ui/react/alert';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import type { ClaudeService, ClaudeConfig } from '../../services/ai';
import { logger } from '../../utils/logger';

interface ApiKeySettingsProps {
  onConfigUpdate: (config: ClaudeConfig) => void;
  currentService?: ClaudeService | null;
}

const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
});

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({
  onConfigUpdate,
  currentService,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState<ClaudeConfig>({
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    rateLimitPerMinute: 50,
  });
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem('claude-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        validateConfig(parsed);
      } catch (error) {
        logger.error({ error }, 'Error loading saved config');
      }
    }
  }, []);

  const validateConfig = (cfg: ClaudeConfig) => {
    const valid = cfg.apiKey.trim().length > 0 && cfg.apiKey.startsWith('sk-ant-');
    setIsValid(valid);
    return valid;
  };

  const handleSave = () => {
    if (!validateConfig(config)) {
      toaster.create({
        title: 'Invalid Configuration',
        description: 'API key must start with sk-ant-',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem('claude-config', JSON.stringify(config));

    // Update service
    onConfigUpdate(config);

    toaster.create({
      title: 'Configuration Saved',
      description: 'Claude API settings have been updated',
      type: 'success',
      duration: 3000,
    });
  };

  const handleTest = async () => {
    if (!currentService) {
      toaster.create({
        title: 'Error',
        description: 'Service not initialized',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      // Test with a simple request
      await currentService.summarize('This is a test document.', {
        style: 'brief',
        level: 'document',
      });

      toaster.create({
        title: 'Connection Successful',
        description: 'API key is valid and working',
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 5000,
      });
    }
  };

  const handleClear = () => {
    localStorage.removeItem('claude-config');
    setConfig({
      apiKey: '',
      model: 'claude-sonnet-4-20250514',
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      rateLimitPerMinute: 50,
    });
    setIsValid(false);

    toaster.create({
      title: 'Configuration Cleared',
      description: 'All settings have been reset',
      type: 'info',
      duration: 3000,
    });
  };

  return (
    <Box p={4} borderWidth={1} borderRadius="lg">
      <VStack align="stretch" gap={4}>
        <Text fontSize="xl" fontWeight="bold">
          Claude API Settings
        </Text>

        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Title>Your API key is stored locally and never sent to our servers</Alert.Title>
        </Alert.Root>

        <Field.Root required>
          <Field.Label>API Key</Field.Label>
          <InputGroup endElement={
            <IconButton
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              size="sm"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? <FaEyeSlash /> : <FaEye />}
            </IconButton>
          }>
            <Input
              type={showApiKey ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={config.apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newConfig = { ...config, apiKey: e.target.value };
                setConfig(newConfig);
                validateConfig(newConfig);
              }}
            />
          </InputGroup>
          <Field.HelperText>
            Get your API key from{' '}
            <a
              href="https://console.anthropic.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'blue' }}
            >
              console.anthropic.com
            </a>
          </Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>Model</Field.Label>
          <NativeSelectRoot>
            <NativeSelectField
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
            >
              <option value="claude-sonnet-4-20250514">
                Claude Sonnet 4 (Recommended)
              </option>
              <option value="claude-sonnet-4.5-20250929">
                Claude Sonnet 4.5 (Latest)
              </option>
              <option value="claude-3-5-sonnet-20241022">
                Claude 3.5 Sonnet
              </option>
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              <option value="claude-3-haiku-20240307">
                Claude 3 Haiku (Fastest)
              </option>
            </NativeSelectField>
          </NativeSelectRoot>
          <Field.HelperText>
            Different models have different costs and capabilities
          </Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>Rate Limit (requests per minute)</Field.Label>
          <NumberInput.Root
            value={config.rateLimitPerMinute?.toString() || '50'}
            min={1}
            max={100}
            onValueChange={(e: { value: string }) =>
              setConfig({ ...config, rateLimitPerMinute: Number(e.value) || 50 })
            }
          >
            <NumberInput.Input />
          </NumberInput.Root>
          <Field.HelperText>
            Free tier: 3 req/min | Pro tier: 50 req/min
          </Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>Max Retries</Field.Label>
          <NumberInput.Root
            value={config.maxRetries?.toString() || '3'}
            min={0}
            max={10}
            onValueChange={(e: { value: string }) => setConfig({ ...config, maxRetries: Number(e.value) || 3 })}
          >
            <NumberInput.Input />
          </NumberInput.Root>
          <Field.HelperText>
            Number of retry attempts for failed requests
          </Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>Timeout (ms)</Field.Label>
          <NumberInput.Root
            value={config.timeout?.toString() || '30000'}
            min={5000}
            max={120000}
            step={1000}
            onValueChange={(e: { value: string }) => setConfig({ ...config, timeout: Number(e.value) || 30000 })}
          >
            <NumberInput.Input />
          </NumberInput.Root>
          <Field.HelperText>Maximum time to wait for API response</Field.HelperText>
        </Field.Root>

        <HStack gap={2}>
          <Button
            colorScheme="blue"
            onClick={handleSave}
            disabled={!isValid}
            flex={1}
          >
            Save Configuration
          </Button>
          <Button onClick={handleTest} disabled={!currentService} flex={1}>
            Test Connection
          </Button>
          <Button onClick={handleClear} variant="outline">
            Clear
          </Button>
        </HStack>

        {isValid && (
          <Alert.Root status="success">
            <Alert.Indicator />
            <Alert.Title>Configuration is valid and ready to use</Alert.Title>
          </Alert.Root>
        )}
      </VStack>
    </Box>
  );
};

export default ApiKeySettings;
