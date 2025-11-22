/**
 * TooLoo.ai Brand Color Palette & Customization System
 * Provides theme management and real-time color customization
 */

class ColorPaletteManager {
  constructor() {
    this.themes = {
      default: this.getTooLooBrandPalette(),
      dark: this.getDarkModePalette(),
      vibrant: this.getVibrantPalette(),
      minimal: this.getMinimalPalette(),
      ocean: this.getOceanPalette(),
      sunset: this.getSunsetPalette()
    };

    this.currentTheme = 'default';
    this.loadFromStorage();
    this.applyTheme();
  }

  /**
   * TooLoo Default Brand Palette
   * Based on modern AI product design
   */
  getTooLooBrandPalette() {
    return {
      name: 'TooLoo Brand',
      primary: '#3b82f6',        // Sky Blue - Primary action
      secondary: '#10b981',      // Emerald Green - Success
      accent: '#f59e0b',         // Amber - Warning
      danger: '#ef4444',         // Red - Error
      info: '#06b6d4',           // Cyan - Information
      pending: '#8b5cf6',        // Purple - Processing
      background: '#0a0e27',     // Dark Navy - Main background
      surface: '#1e2d47',        // Slate Blue - Card background
      border: '#94a3b8',         // Slate - Border color
      text: '#e2e8f0',           // White slate - Main text
      textSecondary: '#cbd5e1',  // Light slate - Secondary text
      textTertiary: '#94a3b8',   // Muted slate - Tertiary text
      hover: 'rgba(59,130,246,.15)',
      active: 'rgba(59,130,246,.25)',
      disabled: 'rgba(148,163,184,.2)'
    };
  }

  /**
   * Dark Mode Palette - Ultra dark with high contrast
   */
  getDarkModePalette() {
    return {
      name: 'Dark Mode',
      primary: '#60a5fa',        // Lighter blue
      secondary: '#34d399',      // Lighter green
      accent: '#fbbf24',         // Lighter amber
      danger: '#f87171',         // Lighter red
      info: '#22d3ee',           // Lighter cyan
      pending: '#a78bfa',        // Lighter purple
      background: '#030712',     // Ultra dark
      surface: '#111827',        // Very dark
      border: '#6b7280',         // Lighter border
      text: '#f9fafb',           // Almost white
      textSecondary: '#e5e7eb',  // Light gray
      textTertiary: '#9ca3af',   // Medium gray
      hover: 'rgba(96,165,250,.15)',
      active: 'rgba(96,165,250,.25)',
      disabled: 'rgba(107,114,128,.2)'
    };
  }

  /**
   * Vibrant Palette - Bold, high-energy colors
   */
  getVibrantPalette() {
    return {
      name: 'Vibrant',
      primary: '#2563eb',        // Bold blue
      secondary: '#059669',      // Bold green
      accent: '#d97706',         // Bold amber
      danger: '#dc2626',         // Bold red
      info: '#0891b2',           // Bold cyan
      pending: '#7c3aed',        // Bold purple
      background: '#0f172a',     // Dark slate
      surface: '#1e293b',        // Medium slate
      border: '#64748b',         // Slate border
      text: '#f1f5f9',           // Bright text
      textSecondary: '#cbd5e1',  // Light text
      textTertiary: '#94a3b8',   // Muted text
      hover: 'rgba(37,99,235,.2)',
      active: 'rgba(37,99,235,.3)',
      disabled: 'rgba(100,116,139,.2)'
    };
  }

  /**
   * Minimal Palette - Clean, understated colors
   */
  getMinimalPalette() {
    return {
      name: 'Minimal',
      primary: '#1f2937',        // Dark gray
      secondary: '#6b7280',      // Medium gray
      accent: '#9ca3af',         // Light gray
      danger: '#374151',         // Error gray
      info: '#4b5563',           // Info gray
      pending: '#6b7280',        // Pending gray
      background: '#ffffff',     // White
      surface: '#f9fafb',        // Off-white
      border: '#e5e7eb',         // Light border
      text: '#111827',           // Dark text
      textSecondary: '#4b5563',  // Medium text
      textTertiary: '#9ca3af',   // Light text
      hover: 'rgba(31,41,55,.05)',
      active: 'rgba(31,41,55,.1)',
      disabled: 'rgba(156,163,175,.2)'
    };
  }

  /**
   * Ocean Palette - Cool water-inspired colors
   */
  getOceanPalette() {
    return {
      name: 'Ocean',
      primary: '#0369a1',        // Deep ocean
      secondary: '#06b6d4',      // Cyan wave
      accent: '#00d9ff',         // Bright cyan
      danger: '#e11d48',         // Rose danger
      info: '#0ea5e9',           // Sky blue
      pending: '#06b6d4',        // Teal pending
      background: '#082f49',     // Deep blue-green
      surface: '#0c4a6e',        // Ocean blue
      border: '#0e7490',         // Teal border
      text: '#ecf0f1',           // Light text
      textSecondary: '#b0e0e6',  // Powder blue
      textTertiary: '#7ec8e3',   // Steel blue
      hover: 'rgba(3,105,161,.2)',
      active: 'rgba(3,105,161,.3)',
      disabled: 'rgba(15,118,142,.2)'
    };
  }

  /**
   * Sunset Palette - Warm, energetic colors
   */
  getSunsetPalette() {
    return {
      name: 'Sunset',
      primary: '#ea580c',        // Orange
      secondary: '#f59e0b',      // Amber
      accent: '#fbbf24',         // Golden
      danger: '#991b1b',         // Deep red
      info: '#fed7aa',           // Light orange
      pending: '#f97316',        // Orange-red
      background: '#3d2817',     // Dark brown
      surface: '#5a3a1a',        // Brown
      border: '#ea580c',         // Orange border
      text: '#fffbeb',           // Cream text
      textSecondary: '#fed7aa',  // Peach text
      textTertiary: '#fdba74',   // Light orange text
      hover: 'rgba(234,88,12,.2)',
      active: 'rgba(234,88,12,.3)',
      disabled: 'rgba(180,83,9,.2)'
    };
  }

  /**
   * Apply theme to DOM and CSS variables
   */
  applyTheme(themeName = null) {
    const theme = themeName ? this.themes[themeName] : this.themes[this.currentTheme];
    if (!theme) return;

    if (themeName) {
      this.currentTheme = themeName;
    }

    // Set CSS custom properties for global use
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      if (key !== 'name') {
        root.style.setProperty(`--color-${key}`, value);
      }
    });

    // Update inline styles on visualizations if they exist
    this.updateVisualizationColors(theme);

    // Save to localStorage
    this.saveToStorage();
  }

  /**
   * Update colors in active visualizations
   */
  updateVisualizationColors(theme) {
    if (window.vizEngine) {
      window.vizEngine.colorScheme = {
        success: theme.secondary,
        warning: theme.accent,
        error: theme.danger,
        info: theme.info,
        pending: theme.pending
      };
    }
  }

  /**
   * Create custom theme
   */
  createCustomTheme(name, colors) {
    this.themes[name] = {
      name: name,
      ...this.themes.default, // Start with defaults
      ...colors // Override with custom colors
    };
    return this.themes[name];
  }

  /**
   * Get all available themes
   */
  getAvailableThemes() {
    return Object.entries(this.themes).map(([key, theme]) => ({
      id: key,
      name: theme.name
    }));
  }

  /**
   * Update a single color in current theme
   */
  updateColor(colorName, value) {
    this.themes[this.currentTheme][colorName] = value;
    this.applyTheme();
  }

  /**
   * Export current theme as JSON
   */
  exportTheme() {
    return JSON.stringify(this.themes[this.currentTheme], null, 2);
  }

  /**
   * Import theme from JSON
   */
  importTheme(json, name = 'imported') {
    try {
      const theme = JSON.parse(json);
      this.themes[name] = theme;
      return true;
    } catch (err) {
      console.error('Failed to import theme:', err);
      return false;
    }
  }

  /**
   * Save current theme to localStorage
   */
  saveToStorage() {
    localStorage.setItem('tooloo_current_theme', this.currentTheme);
    localStorage.setItem('tooloo_all_themes', JSON.stringify(this.themes));
  }

  /**
   * Load theme from localStorage
   */
  loadFromStorage() {
    const saved = localStorage.getItem('tooloo_current_theme');
    if (saved && this.themes[saved]) {
      this.currentTheme = saved;
    }

    const customThemes = localStorage.getItem('tooloo_all_themes');
    if (customThemes) {
      try {
        const imported = JSON.parse(customThemes);
        this.themes = { ...this.themes, ...imported };
      } catch (err) {
        console.warn('Failed to load custom themes:', err);
      }
    }
  }

  /**
   * Reset to default theme
   */
  resetToDefault() {
    this.currentTheme = 'default';
    this.applyTheme();
  }

  /**
   * Get current theme colors
   */
  getCurrentTheme() {
    return this.themes[this.currentTheme];
  }

  /**
   * Generate CSS variable definitions
   */
  generateCSSVariables() {
    const theme = this.themes[this.currentTheme];
    let css = ':root {\n';
    Object.entries(theme).forEach(([key, value]) => {
      if (key !== 'name') {
        css += `  --color-${key}: ${value};\n`;
      }
    });
    css += '}\n';
    return css;
  }

  /**
   * Create UI component for theme switcher
   */
  createThemeSwitcher() {
    const container = document.createElement('div');
    container.id = 'theme-switcher';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: rgba(15,23,42,.95);
      border: 1px solid rgba(148,163,184,.2);
      border-radius: 8px;
      padding: 16px;
      backdrop-filter: blur(10px);
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-size: 12px; font-weight: 700; margin-bottom: 12px; color: #60a5fa; text-transform: uppercase;';
    title.textContent = '🎨 Theme';
    container.appendChild(title);

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px;
      background: rgba(30,41,59,.6);
      border: 1px solid rgba(59,130,246,.3);
      color: #e2e8f0;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 12px;
      cursor: pointer;
    `;

    this.getAvailableThemes().forEach(theme => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.name;
      option.selected = theme.id === this.currentTheme;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      this.applyTheme(e.target.value);
    });

    container.appendChild(select);

    // Color customization inputs
    const theme = this.themes[this.currentTheme];
    const colors = ['primary', 'secondary', 'accent', 'danger'];
    
    colors.forEach(colorName => {
      const label = document.createElement('label');
      label.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center; font-size: 11px; color: #cbd5e1;';
      
      const input = document.createElement('input');
      input.type = 'color';
      input.value = theme[colorName];
      input.style.cssText = 'width: 24px; height: 24px; border: 1px solid rgba(148,163,184,.3); border-radius: 3px; cursor: pointer;';
      
      input.addEventListener('change', (e) => {
        this.updateColor(colorName, e.target.value);
      });

      label.appendChild(input);
      label.appendChild(document.createTextNode(colorName.charAt(0).toUpperCase() + colorName.slice(1)));
      container.appendChild(label);
    });

    // Export/Import buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 6px; margin-top: 12px;';

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📤';
    exportBtn.title = 'Export Theme';
    exportBtn.style.cssText = `
      flex: 1;
      padding: 6px;
      background: rgba(59,130,246,.2);
      border: 1px solid rgba(59,130,246,.3);
      color: #60a5fa;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    exportBtn.onclick = () => {
      const json = this.exportTheme();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tooloo-theme-${this.currentTheme}.json`;
      a.click();
    };

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄';
    resetBtn.title = 'Reset to Default';
    resetBtn.style.cssText = `
      flex: 1;
      padding: 6px;
      background: rgba(239,68,68,.2);
      border: 1px solid rgba(239,68,68,.3);
      color: #ef4444;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    resetBtn.onclick = () => {
      this.resetToDefault();
      select.value = 'default';
    };

    buttonContainer.appendChild(exportBtn);
    buttonContainer.appendChild(resetBtn);
    container.appendChild(buttonContainer);

    return container;
  }
}

// Initialize globally
window.colorPalette = new ColorPaletteManager();
