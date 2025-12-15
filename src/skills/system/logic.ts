/**
 * @file SystemSkill - Logic Layer
 * @description Backend brain for System/Settings skill
 * @version 1.0.0
 */

import type { KernelContext } from '../../kernel/types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface SystemInput {
  action: 'get' | 'set' | 'list' | 'reset';
  setting?: string;
  value?: unknown;
}

export interface SystemOutput {
  action: string;
  success: boolean;
  data: Record<string, unknown>;
  message?: string;
}

export interface SystemSettings {
  theme: 'dark' | 'light' | 'system';
  language: string;
  defaultModel: string;
  defaultProvider: string;
  temperature: number;
  maxTokens: number;
  autoSave: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_SETTINGS: SystemSettings = {
  theme: 'dark',
  language: 'en',
  defaultModel: 'gpt-4',
  defaultProvider: 'openai',
  temperature: 0.7,
  maxTokens: 4096,
  autoSave: true,
  notifications: true,
  soundEnabled: false,
  fontSize: 'medium',
};

// =============================================================================
// IN-MEMORY STORAGE (Replace with real persistence)
// =============================================================================

let currentSettings: SystemSettings = { ...DEFAULT_SETTINGS };

// =============================================================================
// CORE LOGIC
// =============================================================================

export async function systemExecute(
  input: SystemInput,
  context: KernelContext
): Promise<SystemOutput> {
  switch (input.action) {
    case 'get':
      return handleGet(input.setting);

    case 'set':
      return handleSet(input.setting, input.value, context);

    case 'list':
      return handleList();

    case 'reset':
      return handleReset(input.setting, context);

    default:
      return {
        action: input.action,
        success: false,
        data: {},
        message: `Unknown action: ${input.action}`,
      };
  }
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

function handleGet(setting?: string): SystemOutput {
  if (setting) {
    const value = currentSettings[setting as keyof SystemSettings];
    if (value === undefined) {
      return {
        action: 'get',
        success: false,
        data: {},
        message: `Unknown setting: ${setting}`,
      };
    }
    return {
      action: 'get',
      success: true,
      data: { [setting]: value },
    };
  }

  // Return all settings
  return {
    action: 'get',
    success: true,
    data: { ...currentSettings },
  };
}

function handleSet(
  setting: string | undefined,
  value: unknown,
  context: KernelContext
): SystemOutput {
  if (!setting) {
    return {
      action: 'set',
      success: false,
      data: {},
      message: 'Setting name is required',
    };
  }

  if (!(setting in DEFAULT_SETTINGS)) {
    return {
      action: 'set',
      success: false,
      data: {},
      message: `Unknown setting: ${setting}`,
    };
  }

  // Update the setting
  (currentSettings as unknown as Record<string, unknown>)[setting] = value;

  // Emit event
  context.services.emit('skill:system:setting-changed', {
    setting,
    value,
    user: context.user?.id,
  });

  return {
    action: 'set',
    success: true,
    data: { [setting]: value },
    message: `Setting "${setting}" updated successfully`,
  };
}

function handleList(): SystemOutput {
  const settingsList = Object.entries(DEFAULT_SETTINGS).map(([key, defaultValue]) => ({
    name: key,
    currentValue: currentSettings[key as keyof SystemSettings],
    defaultValue,
    type: typeof defaultValue,
  }));

  return {
    action: 'list',
    success: true,
    data: { settings: settingsList },
  };
}

function handleReset(setting: string | undefined, context: KernelContext): SystemOutput {
  if (setting) {
    // Reset single setting
    if (!(setting in DEFAULT_SETTINGS)) {
      return {
        action: 'reset',
        success: false,
        data: {},
        message: `Unknown setting: ${setting}`,
      };
    }

    (currentSettings as unknown as Record<string, unknown>)[setting] =
      DEFAULT_SETTINGS[setting as keyof SystemSettings];

    context.services.emit('skill:system:setting-reset', { setting });

    return {
      action: 'reset',
      success: true,
      data: { [setting]: currentSettings[setting as keyof SystemSettings] },
      message: `Setting "${setting}" reset to default`,
    };
  }

  // Reset all settings
  currentSettings = { ...DEFAULT_SETTINGS };

  context.services.emit('skill:system:settings-reset-all', {});

  return {
    action: 'reset',
    success: true,
    data: { ...currentSettings } as Record<string, unknown>,
    message: 'All settings reset to defaults',
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function getSettings(): SystemSettings {
  return { ...currentSettings };
}

export function getSetting<K extends keyof SystemSettings>(key: K): SystemSettings[K] {
  return currentSettings[key];
}
