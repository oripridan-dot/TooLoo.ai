/**
 * TooLoo UI Generation Module
 * Enables TooLoo to create, modify, and enhance user interfaces
 */

class ToolooUIGenerator {
    constructor() {
        this.templates = new Map();
        this.componentLibrary = new Map();
        this.setupBaseTemplates();
        this.setupComponents();
    }

    setupBaseTemplates() {
        // Base HTML template
        this.templates.set('base-html', `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>{{styles}}</style>
</head>
<body>
    {{body}}
    <script>{{scripts}}</script>
</body>
</html>`);

        // Modern dashboard template
        this.templates.set('dashboard', `
<div class="container">
    <header class="header">
        <h1>{{title}}</h1>
        <p>{{subtitle}}</p>
    </header>
    <main class="content">
        {{content}}
    </main>
</div>`);

        // Analysis interface template
        this.templates.set('analysis-interface', `
<div class="analysis-container">
    <div class="input-section">
        {{input-area}}
        {{controls}}
    </div>
    <div class="output-section">
        {{visualizations}}
        {{results}}
    </div>
</div>`);
    }

    setupComponents() {
        // Text input components
        this.componentLibrary.set('textbox', {
            html: '<textarea class="{{class}}" placeholder="{{placeholder}}" {{attributes}}>{{value}}</textarea>',
            css: `
.dynamic-textbox {
    width: 100%;
    height: {{height || '300px'}};
    padding: 20px;
    border: 2px solid #3498db;
    border-radius: 10px;
    font-size: 16px;
    line-height: 1.6;
    resize: vertical;
    transition: all 0.3s ease;
    background: #f8f9fa;
}
.dynamic-textbox:focus {
    outline: none;
    border-color: #2980b9;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    background: white;
}`
        });

        // Button components
        this.componentLibrary.set('button', {
            html: '<button class="btn {{type}}" onclick="{{onclick}}">{{text}}</button>',
            css: `
.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s ease;
}
.btn-primary { background: #3498db; color: white; }
.btn-success { background: #27ae60; color: white; }
.btn-tooloo { background: #667eea; color: white; }
.btn:hover { transform: translateY(-2px); }`
        });

        // Statistics panel
        this.componentLibrary.set('stats-panel', {
            html: `
<div class="stats-panel">
    <h3>{{title}}</h3>
    <div class="stats-grid">
        {{stats}}
    </div>
</div>`,
            css: `
.stats-panel {
    background: #ecf0f1;
    padding: 20px;
    border-radius: 10px;
    border-left: 4px solid #3498db;
}
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-top: 15px;
}
.stat-item {
    text-align: center;
    padding: 15px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}`
        });

        // Visualization components
        this.componentLibrary.set('word-cloud', {
            html: `
<div class="visualization">
    <h3>{{title}}</h3>
    <div class="word-cloud" id="{{id}}">
        {{words}}
    </div>
</div>`,
            css: `
.visualization {
    background: #34495e;
    border-radius: 10px;
    padding: 20px;
    color: white;
    min-height: 200px;
}
.word-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    align-items: center;
    min-height: 150px;
}
.word {
    padding: 5px 10px;
    border-radius: 20px;
    background: #3498db;
    color: white;
    font-weight: bold;
    transition: all 0.3s ease;
    cursor: pointer;
}`
        });
    }

    generateInterface(specification) {
        const {
            type = 'dashboard',
            title = 'TooLoo Generated Interface',
            subtitle = 'AI-generated user interface',
            components = [],
            layout = 'grid',
            styling = 'modern'
        } = specification;

        let html = '';
        let css = this.getBaseStyles(styling);
        let js = this.getBaseScripts();

        // Generate components
        components.forEach(comp => {
            const component = this.componentLibrary.get(comp.type);
            if (component) {
                html += this.renderComponent(component, comp.props || {});
                css += component.css || '';
            }
        });

        // Apply template
        const template = this.templates.get(type) || this.templates.get('base-html');
        
        return this.interpolateTemplate(template, {
            title,
            subtitle,
            content: html,
            styles: css,
            scripts: js,
            body: html
        });
    }

    renderComponent(component, props) {
        return this.interpolateTemplate(component.html, props);
    }

    interpolateTemplate(template, values) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return values[key] || match;
        });
    }

    getBaseStyles(theme = 'modern') {
        const themes = {
            modern: `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
}
.container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    border-radius: 15px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    overflow: hidden;
}
.header {
    background: #2c3e50;
    color: white;
    padding: 30px;
    text-align: center;
}`,
            
            minimal: `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui; background: #f5f5f5; padding: 20px; }
.container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }`,
            
            dark: `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Courier New'; background: #1a1a1a; color: #fff; padding: 20px; }
.container { max-width: 1000px; margin: 0 auto; background: #2a2a2a; border: 1px solid #444; }`
        };

        return themes[theme] || themes.modern;
    }

    getBaseScripts() {
        return `
// TooLoo UI Base Scripts
function callTooLoo(prompt) {
    return fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    }).then(res => res.json());
}

function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = content;
}

function addLogEntry(message, containerId = 'log') {
    const container = document.getElementById(containerId);
    if (container) {
        const entry = document.createElement('div');
        entry.innerHTML = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }
}`;
    }

    // Method to analyze existing UI and suggest improvements
    analyzeUI(htmlContent) {
        const analysis = {
            structure: this.analyzeStructure(htmlContent),
            accessibility: this.analyzeAccessibility(htmlContent),
            performance: this.analyzePerformance(htmlContent),
            suggestions: []
        };

        // Generate improvement suggestions
        if (!htmlContent.includes('aria-')) {
            analysis.suggestions.push('Add ARIA labels for better accessibility');
        }
        if (!htmlContent.includes('alt=')) {
            analysis.suggestions.push('Add alt text for images');
        }
        if (htmlContent.includes('onclick=')) {
            analysis.suggestions.push('Consider using event listeners instead of inline onclick');
        }

        return analysis;
    }

    analyzeStructure(html) {
        const hasHeader = html.includes('<header') || html.includes('<h1');
        const hasMain = html.includes('<main') || html.includes('main');
        const hasFooter = html.includes('<footer');
        const hasNav = html.includes('<nav');

        return {
            semanticElements: { header: hasHeader, main: hasMain, footer: hasFooter, nav: hasNav },
            score: [hasHeader, hasMain, hasFooter, hasNav].filter(Boolean).length / 4 * 100
        };
    }

    analyzeAccessibility(html) {
        const hasAltText = html.includes('alt=');
        const hasAriaLabels = html.includes('aria-');
        const hasHeadings = /<h[1-6]/.test(html);
        const hasLabelledInputs = html.includes('<label');

        return {
            features: { altText: hasAltText, ariaLabels: hasAriaLabels, headings: hasHeadings, labels: hasLabelledInputs },
            score: [hasAltText, hasAriaLabels, hasHeadings, hasLabelledInputs].filter(Boolean).length / 4 * 100
        };
    }

    analyzePerformance(html) {
        const inlineStyles = (html.match(/style="/g) || []).length;
        const inlineScripts = (html.match(/<script>/g) || []).length;
        const imageCount = (html.match(/<img/g) || []).length;

        return {
            metrics: { inlineStyles, inlineScripts, imageCount },
            score: Math.max(0, 100 - (inlineStyles * 5 + inlineScripts * 10))
        };
    }

    // Method to enhance existing UI with TooLoo integration
    addToolooIntegration(htmlContent, options = {}) {
        const {
            addAnalysisButton = true,
            addChatInterface = true,
            addPerformanceMonitoring = true
        } = options;

        let enhanced = htmlContent;

        if (addAnalysisButton) {
            const button = '<button class="btn btn-tooloo" onclick="askToolooAnalysis()">🧠 Ask TooLoo</button>';
            enhanced = enhanced.replace('</body>', `${button}</body>`);
        }

        if (addChatInterface) {
            const chatPanel = `
<div id="tooloo-chat" style="position: fixed; bottom: 20px; right: 20px; width: 300px; background: white; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); display: none;">
    <div style="background: #667eea; color: white; padding: 15px; border-radius: 10px 10px 0 0;">
        <strong>🧠 TooLoo Assistant</strong>
        <button onclick="toggleToolooChat()" style="float: right; background: none; border: none; color: white;">✕</button>
    </div>
    <div id="chat-messages" style="height: 200px; overflow-y: auto; padding: 15px;"></div>
    <div style="padding: 15px;">
        <input type="text" id="chat-input" placeholder="Ask TooLoo..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    </div>
</div>
<button onclick="toggleToolooChat()" style="position: fixed; bottom: 20px; right: 20px; background: #667eea; color: white; border: none; border-radius: 50%; width: 50px; height: 50px; font-size: 20px;">🧠</button>`;
            
            enhanced = enhanced.replace('</body>', `${chatPanel}</body>`);
        }

        return enhanced;
    }
}

// Export for use in TooLoo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolooUIGenerator;
}

// Global instance for browser use
if (typeof window !== 'undefined') {
    window.ToolooUIGenerator = ToolooUIGenerator;
}