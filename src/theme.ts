/**
 * Chakra UI v3 Theme Configuration
 *
 * Creates a custom theme system using Chakra UI v3's createSystem API.
 * Replaces the old extendTheme pattern from v2.
 */
import { createSystem, defaultConfig } from '@chakra-ui/react';

/**
 * Create the theme system with default configuration
 *
 * To customize, spread defaultConfig and override specific values:
 * const system = createSystem(defaultConfig, {
 *   theme: {
 *     tokens: { ... },
 *     semanticTokens: { ... },
 *   },
 * });
 */
export const system = createSystem(defaultConfig);
