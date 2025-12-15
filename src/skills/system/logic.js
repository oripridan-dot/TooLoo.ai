/**
 * @file SystemSkill - Logic Layer
 * @description Backend brain for System/Settings skill
 * @version 1.0.0
 */
// =============================================================================
// DEFAULT SETTINGS
// =============================================================================
const DEFAULT_SETTINGS = {
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
let currentSettings = { ...DEFAULT_SETTINGS };
// =============================================================================
// CORE LOGIC
// =============================================================================
export async function systemExecute(input, context) {
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
function handleGet(setting) {
    if (setting) {
        const value = currentSettings[setting];
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
function handleSet(setting, value, context) {
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
    currentSettings[setting] = value;
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
function handleList() {
    const settingsList = Object.entries(DEFAULT_SETTINGS).map(([key, defaultValue]) => ({
        name: key,
        currentValue: currentSettings[key],
        defaultValue,
        type: typeof defaultValue,
    }));
    return {
        action: 'list',
        success: true,
        data: { settings: settingsList },
    };
}
function handleReset(setting, context) {
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
        currentSettings[setting] =
            DEFAULT_SETTINGS[setting];
        context.services.emit('skill:system:setting-reset', { setting });
        return {
            action: 'reset',
            success: true,
            data: { [setting]: currentSettings[setting] },
            message: `Setting "${setting}" reset to default`,
        };
    }
    // Reset all settings
    currentSettings = { ...DEFAULT_SETTINGS };
    context.services.emit('skill:system:settings-reset-all', {});
    return {
        action: 'reset',
        success: true,
        data: { ...currentSettings },
        message: 'All settings reset to defaults',
    };
}
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
export function getSettings() {
    return { ...currentSettings };
}
export function getSetting(key) {
    return currentSettings[key];
}
//# sourceMappingURL=logic.js.map