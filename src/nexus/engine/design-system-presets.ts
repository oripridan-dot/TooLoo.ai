// @version 2.1.11
/**
 * Design System Presets
 * Professional design system examples inspired by real design systems
 */

const DESIGN_SYSTEM_PRESETS = {
  // Material Design inspired
  material: {
    name: 'Material Design System',
    colors: {
      primary: '#1976d2',
      secondary: '#dc004e',
      tertiary: '#7cb342',
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3',
      background: '#fafafa',
      surface: '#ffffff',
      border: '#bdbdbd',
      text: '#212121'
    },
    typography: {
      primary: 'Roboto, sans-serif',
      secondary: 'Roboto Mono, monospace',
      mono: 'Roboto Mono, monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    }
  },

  // Dark Mode Modern (like GitHub, Figma Dark)
  darkModern: {
    name: 'Dark Mode Modern',
    colors: {
      primary: '#0969da',
      secondary: '#d1242f',
      tertiary: '#2da44e',
      success: '#3fb950',
      error: '#da3633',
      warning: '#d29922',
      info: '#79c0ff',
      background: '#0d1117',
      surface: '#161b22',
      border: '#30363d',
      text: '#c9d1d9'
    },
    typography: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      secondary: '"Courier New", Courier, monospace',
      mono: '"Courier New", Courier, monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    }
  },

  // Ant Design (Enterprise)
  antDesign: {
    name: 'Ant Design System',
    colors: {
      primary: '#1890ff',
      secondary: '#722ed1',
      tertiary: '#faad14',
      success: '#52c41a',
      error: '#ff4d4f',
      warning: '#faad14',
      info: '#1890ff',
      background: '#fafafa',
      surface: '#ffffff',
      border: '#d9d9d9',
      text: '#000000'
    },
    typography: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      secondary: '"SFMono", "Monaco", "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
      mono: '"SFMono", "Monaco", "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    }
  },

  // Chakra UI (Modern Accessible)
  chakraUI: {
    name: 'Chakra UI Design System',
    colors: {
      primary: '#3182ce',
      secondary: '#805ad5',
      tertiary: '#d69e2e',
      success: '#38a169',
      error: '#e53e3e',
      warning: '#ed8936',
      info: '#3182ce',
      background: '#ffffff',
      surface: '#f7fafc',
      border: '#cbd5e0',
      text: '#2d3748'
    },
    typography: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif',
      secondary: '"Monaco", "Menlo", "Ubuntu Mono", "Courier New", monospace',
      mono: '"Monaco", "Menlo", "Ubuntu Mono", "Courier New", monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    }
  },

  // Apple Design System (Human Interface Guidelines)
  appleHIG: {
    name: 'Apple Human Interface',
    colors: {
      primary: '#007AFF',
      secondary: '#5AC8FA',
      tertiary: '#FF2D55',
      success: '#34C759',
      error: '#FF3B30',
      warning: '#FF9500',
      info: '#5AC8FA',
      background: '#ffffff',
      surface: '#f2f2f7',
      border: '#e0e0e0',
      text: '#000000'
    },
    typography: {
      primary: 'system-ui, -apple-system, BlinkMacSystemFont, "San Francisco", sans-serif',
      secondary: 'Monaco, Courier, monospace',
      mono: 'Monaco, Courier, monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    }
  },

  // Carbon Design (IBM)
  carbon: {
    name: 'IBM Carbon Design System',
    colors: {
      primary: '#0f62fe',
      secondary: '#161616',
      tertiary: '#24a148',
      success: '#24a148',
      error: '#da1e28',
      warning: '#f1c21b',
      info: '#0f62fe',
      background: '#f4f4f4',
      surface: '#ffffff',
      border: '#e0e0e0',
      text: '#161616'
    },
    typography: {
      primary: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      secondary: '"IBM Plex Mono", Courier New, monospace',
      mono: '"IBM Plex Mono", Courier New, monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px'
    }
  },

  // Fluent Design (Microsoft)
  fluentUI: {
    name: 'Microsoft Fluent Design',
    colors: {
      primary: '#0078d4',
      secondary: '#7fba00',
      tertiary: '#ff8c00',
      success: '#107c10',
      error: '#e81123',
      warning: '#ffb900',
      info: '#0078d4',
      background: '#f3f2f1',
      surface: '#ffffff',
      border: '#d2d0ce',
      text: '#323130'
    },
    typography: {
      primary: '"Segoe UI", "Segoe UI Web (West European)", sans-serif',
      secondary: '"Courier New", Courier, monospace',
      mono: '"Courier New", Courier, monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    }
  },

  // Tailwind CSS Inspired
  tailwind: {
    name: 'Tailwind CSS Design System',
    colors: {
      primary: '#3b82f6',
      secondary: '#ec4899',
      tertiary: '#f59e0b',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#06b6d4',
      background: '#ffffff',
      surface: '#f9fafb',
      border: '#e5e7eb',
      text: '#111827'
    },
    typography: {
      primary: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      secondary: 'ui-monospace, SFMono-Regular, "SF Mono", Courier New, monospace',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Courier New, monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    }
  },

  // Bootstrap Inspired
  bootstrap: {
    name: 'Bootstrap Design System',
    colors: {
      primary: '#0d6efd',
      secondary: '#6c757d',
      tertiary: '#198754',
      success: '#198754',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#0dcaf0',
      background: '#ffffff',
      surface: '#f8f9fa',
      border: '#dee2e6',
      text: '#212529'
    },
    typography: {
      primary: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      secondary: '"SFMono-Regular", SFMono-Regular, Menlo, "Courier New", monospace',
      mono: '"SFMono-Regular", SFMono-Regular, Menlo, "Courier New", monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    }
  },

  // Neon/Cyberpunk (Modern Vibrant)
  neon: {
    name: 'Neon Cyberpunk Design',
    colors: {
      primary: '#ff006e',
      secondary: '#00f5ff',
      tertiary: '#ffbe0b',
      success: '#8338ec',
      error: '#ff006e',
      warning: '#ffbe0b',
      info: '#00f5ff',
      background: '#0a0e27',
      surface: '#16213e',
      border: '#00f5ff',
      text: '#eaeaea'
    },
    typography: {
      primary: 'Courier New, monospace',
      secondary: 'IBM Plex Mono, monospace',
      mono: 'IBM Plex Mono, monospace'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    }
  }
};

export default DESIGN_SYSTEM_PRESETS;
