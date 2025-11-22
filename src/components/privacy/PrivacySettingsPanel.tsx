/**
 * PrivacySettingsPanel - UI for managing privacy settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Spinner,
  VStack,
  HStack,
  Badge,
  Separator,
  createToaster,
} from '@chakra-ui/react';
import { Switch } from '@chakra-ui/react/switch';
import { NumberInput } from '@chakra-ui/react/number-input';
import { Field } from '@chakra-ui/react/field';
import { Alert } from '@chakra-ui/react/alert';
import { getPrivacyManager } from '@/services/PrivacyManager';
import { PrivacySettings } from '@/services/ai/types';

const toaster = createToaster({ placement: 'bottom-end' });

interface PrivacySettingsPanelProps {
  userId: string;
  onSettingsChange?: (settings: PrivacySettings) => void;
}

export const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({
  userId,
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const privacyManager = getPrivacyManager();

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const loadedSettings = await privacyManager.loadSettings(userId);
      setSettings(loadedSettings);
    } catch (error) {
      toaster.create({
        title: 'Failed to load privacy settings',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (updates: Partial<PrivacySettings>) => {
    if (!settings) return;

    try {
      setSaving(true);
      const updated = await privacyManager.updateSettings(userId, updates);
      setSettings(updated);
      onSettingsChange?.(updated);

      toaster.create({
        title: 'Settings updated',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      toaster.create({
        title: 'Failed to update settings',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const getComplianceStatus = () => {
    if (!settings) return null;
    return privacyManager.getComplianceStatus();
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4}>Loading privacy settings...</Text>
      </Box>
    );
  }

  if (!settings) {
    return (
      <Alert.Root status="error">
        <Alert.Title>Failed to load privacy settings</Alert.Title>
      </Alert.Root>
    );
  }

  const compliance = getComplianceStatus();

  return (
    <Box p={6} maxW="800px">
      <VStack align="stretch" gap={6}>
        <Box>
          <Heading size="lg" mb={2}>
            Privacy Settings
          </Heading>
          <Text color="gray.600">
            Control how your data is processed and protected
          </Text>
        </Box>

        {compliance && (
          <Box>
            <HStack mb={2}>
              <Badge colorScheme={compliance.gdprCompliant ? 'green' : 'yellow'}>
                GDPR {compliance.gdprCompliant ? 'Compliant' : 'Not Compliant'}
              </Badge>
              <Badge colorScheme={compliance.irbCompliant ? 'green' : 'yellow'}>
                IRB {compliance.irbCompliant ? 'Compliant' : 'Not Compliant'}
              </Badge>
            </HStack>
            {compliance.recommendations.length > 0 && (
              <Alert.Root status="info">
                <VStack align="start" gap={1}>
                  <Text fontWeight="semibold">Recommendations:</Text>
                  {compliance.recommendations.map((rec, idx) => (
                    <Text key={idx} fontSize="sm">
                      • {rec}
                    </Text>
                  ))}
                </VStack>
              </Alert.Root>
            )}
          </Box>
        )}

        <Separator />

        <Field.Root>
          <HStack justify="space-between">
            <Box>
              <Field.Label mb={1}>Privacy Mode</Field.Label>
              <Field.HelperText mt={0}>
                Only use local AI providers (no cloud processing)
              </Field.HelperText>
            </Box>
            <Switch.Root
              checked={settings.privacy_mode_enabled}
              onCheckedChange={(details: { checked: boolean }) =>
                updateSetting({ privacy_mode_enabled: details.checked })
              }
              disabled={saving}
              colorPalette="green"
              size="lg"
            >
              <Switch.Thumb />
            </Switch.Root>
          </HStack>
        </Field.Root>

        <Field.Root>
          <HStack justify="space-between">
            <Box>
              <Field.Label mb={1}>Allow Cloud Processing</Field.Label>
              <Field.HelperText mt={0}>
                Allow using cloud AI providers (Claude)
              </Field.HelperText>
            </Box>
            <Switch.Root
              checked={settings.allow_cloud_processing}
              onCheckedChange={(details: { checked: boolean }) =>
                updateSetting({ allow_cloud_processing: details.checked })
              }
              disabled={saving || settings.privacy_mode_enabled}
              colorPalette="blue"
              size="lg"
            >
              <Switch.Thumb />
            </Switch.Root>
          </HStack>
        </Field.Root>

        <Field.Root>
          <HStack justify="space-between">
            <Box>
              <Field.Label mb={1}>Require Confirmation for Cloud</Field.Label>
              <Field.HelperText mt={0}>
                Ask before sending data to cloud providers
              </Field.HelperText>
            </Box>
            <Switch.Root
              checked={settings.require_confirmation_for_cloud}
              onCheckedChange={(details: { checked: boolean }) =>
                updateSetting({
                  require_confirmation_for_cloud: details.checked,
                })
              }
              disabled={saving || !settings.allow_cloud_processing}
              colorPalette="orange"
              size="lg"
            >
              <Switch.Thumb />
            </Switch.Root>
          </HStack>
        </Field.Root>

        <Field.Root>
          <HStack justify="space-between">
            <Box>
              <Field.Label mb={1}>PII Detection</Field.Label>
              <Field.HelperText mt={0}>
                Automatically detect and sanitize personally identifiable information
              </Field.HelperText>
            </Box>
            <Switch.Root
              checked={settings.pii_detection_enabled}
              onCheckedChange={(details: { checked: boolean }) =>
                updateSetting({ pii_detection_enabled: details.checked })
              }
              disabled={saving}
              colorPalette="purple"
              size="lg"
            >
              <Switch.Thumb />
            </Switch.Root>
          </HStack>
        </Field.Root>

        <Field.Root>
          <Field.Label>Data Retention Period (days)</Field.Label>
          <NumberInput.Root
            value={settings.data_retention_days.toString()}
            onValueChange={(details: { valueAsNumber: number }) =>
              updateSetting({ data_retention_days: details.valueAsNumber })
            }
            min={1}
            max={365}
            disabled={saving}
          >
            <NumberInput.Input />
          </NumberInput.Root>
          <Field.HelperText>
            How long to keep privacy audit logs (recommended: 90 days for GDPR)
          </Field.HelperText>
        </Field.Root>

        <Separator />

        <Box>
          <Text fontSize="sm" color="gray.600">
            Privacy mode ensures your data stays on your device by using only
            local AI providers (Ollama, Browser ML). Cloud providers like Claude
            offer better quality but require sending data to external servers.
          </Text>
        </Box>

        <HStack>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const exported = await privacyManager.exportPrivacyData(userId);
                const blob = new Blob([JSON.stringify(exported, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `privacy-data-${new Date().toISOString()}.json`;
                a.click();
                URL.revokeObjectURL(url);

                toaster.create({
                  title: 'Privacy data exported',
                  type: 'success',
                  duration: 3000,
                });
              } catch (error) {
                toaster.create({
                  title: 'Export failed',
                  type: 'error',
                  duration: 3000,
                });
              }
            }}
          >
            Export Privacy Data
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};
