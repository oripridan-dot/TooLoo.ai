// @version 3.3.64
// TooLoo.ai Visual Examples Library
// High-quality SVG examples for LLM reference
// These serve as quality benchmarks for visual generation

/**
 * Data Visualization Example
 * A beautiful multi-layered chart with gradients, animations, and professional styling
 */
export const DATA_VISUALIZATION_EXAMPLE = `
<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient definitions for bars -->
    <linearGradient id="barGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="barGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4facfe" />
      <stop offset="100%" style="stop-color:#00f2fe" />
    </linearGradient>
    <!-- Glow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Shadow filter -->
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="4" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="500" fill="#0f0f1a" rx="20"/>
  
  <!-- Grid lines with fade effect -->
  <g stroke="#ffffff" stroke-opacity="0.1" stroke-width="1">
    <line x1="100" y1="400" x2="750" y2="400"/>
    <line x1="100" y1="320" x2="750" y2="320"/>
    <line x1="100" y1="240" x2="750" y2="240"/>
    <line x1="100" y1="160" x2="750" y2="160"/>
    <line x1="100" y1="80" x2="750" y2="80"/>
  </g>
  
  <!-- Animated bars -->
  <g filter="url(#dropShadow)">
    <rect x="130" y="280" width="60" height="120" fill="url(#barGradient1)" rx="4">
      <animate attributeName="height" from="0" to="120" dur="0.8s" fill="freeze"/>
      <animate attributeName="y" from="400" to="280" dur="0.8s" fill="freeze"/>
    </rect>
    <rect x="230" y="200" width="60" height="200" fill="url(#barGradient2)" rx="4">
      <animate attributeName="height" from="0" to="200" dur="0.8s" begin="0.1s" fill="freeze"/>
      <animate attributeName="y" from="400" to="200" dur="0.8s" begin="0.1s" fill="freeze"/>
    </rect>
    <rect x="330" y="140" width="60" height="260" fill="url(#barGradient1)" rx="4">
      <animate attributeName="height" from="0" to="260" dur="0.8s" begin="0.2s" fill="freeze"/>
      <animate attributeName="y" from="400" to="140" dur="0.8s" begin="0.2s" fill="freeze"/>
    </rect>
    <rect x="430" y="180" width="60" height="220" fill="url(#barGradient2)" rx="4">
      <animate attributeName="height" from="0" to="220" dur="0.8s" begin="0.3s" fill="freeze"/>
      <animate attributeName="y" from="400" to="180" dur="0.8s" begin="0.3s" fill="freeze"/>
    </rect>
    <rect x="530" y="100" width="60" height="300" fill="url(#barGradient1)" rx="4">
      <animate attributeName="height" from="0" to="300" dur="0.8s" begin="0.4s" fill="freeze"/>
      <animate attributeName="y" from="400" to="100" dur="0.8s" begin="0.4s" fill="freeze"/>
    </rect>
    <rect x="630" y="160" width="60" height="240" fill="url(#barGradient2)" rx="4">
      <animate attributeName="height" from="0" to="240" dur="0.8s" begin="0.5s" fill="freeze"/>
      <animate attributeName="y" from="400" to="160" dur="0.8s" begin="0.5s" fill="freeze"/>
    </rect>
  </g>
  
  <!-- Trend line with glow -->
  <path d="M160,320 Q260,250 360,180 T560,120 T690,180" 
        stroke="url(#lineGradient)" stroke-width="3" fill="none" 
        stroke-linecap="round" filter="url(#glow)">
    <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0" dur="2s" fill="freeze"/>
  </path>
  
  <!-- Data points -->
  <g fill="#00f2fe" filter="url(#glow)">
    <circle cx="160" cy="320" r="6"><animate attributeName="r" from="0" to="6" dur="0.3s" begin="0.8s" fill="freeze"/></circle>
    <circle cx="260" cy="250" r="6"><animate attributeName="r" from="0" to="6" dur="0.3s" begin="1s" fill="freeze"/></circle>
    <circle cx="360" cy="180" r="6"><animate attributeName="r" from="0" to="6" dur="0.3s" begin="1.2s" fill="freeze"/></circle>
    <circle cx="460" cy="140" r="6"><animate attributeName="r" from="0" to="6" dur="0.3s" begin="1.4s" fill="freeze"/></circle>
    <circle cx="560" cy="120" r="6"><animate attributeName="r" from="0" to="6" dur="0.3s" begin="1.6s" fill="freeze"/></circle>
    <circle cx="690" cy="180" r="6"><animate attributeName="r" from="0" to="6" dur="0.3s" begin="1.8s" fill="freeze"/></circle>
  </g>
  
  <!-- Labels -->
  <g fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="12" text-anchor="middle">
    <text x="160" y="430">Jan</text>
    <text x="260" y="430">Feb</text>
    <text x="360" y="430">Mar</text>
    <text x="460" y="430">Apr</text>
    <text x="560" y="430">May</text>
    <text x="660" y="430">Jun</text>
  </g>
  
  <!-- Title -->
  <text x="400" y="50" fill="#ffffff" font-family="system-ui" font-size="24" font-weight="bold" text-anchor="middle">
    Performance Analytics
  </text>
</svg>`.trim();

/**
 * Flow Diagram Example
 * A modern system architecture diagram with connections and animations
 */
export const FLOW_DIAGRAM_EXAMPLE = `
<svg viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="nodeGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="nodeGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ec4899"/>
      <stop offset="100%" style="stop-color:#f43f5e"/>
    </linearGradient>
    <linearGradient id="nodeGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14b8a6"/>
      <stop offset="100%" style="stop-color:#22c55e"/>
    </linearGradient>
    <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
    </marker>
    <!-- Animated dash pattern -->
    <pattern id="flowPattern" patternUnits="userSpaceOnUse" width="20" height="1">
      <line x1="0" y1="0" x2="10" y2="0" stroke="#64748b" stroke-width="2">
        <animate attributeName="x1" from="0" to="20" dur="0.5s" repeatCount="indefinite"/>
        <animate attributeName="x2" from="10" to="30" dur="0.5s" repeatCount="indefinite"/>
      </line>
    </pattern>
  </defs>
  
  <!-- Background with subtle pattern -->
  <rect width="900" height="600" fill="#0a0a14"/>
  <g fill="#ffffff" fill-opacity="0.02">
    <circle cx="100" cy="100" r="200"/>
    <circle cx="800" cy="500" r="250"/>
    <circle cx="450" cy="300" r="300"/>
  </g>
  
  <!-- Connection lines with animation -->
  <g stroke="#64748b" stroke-width="2" fill="none" stroke-dasharray="8,4">
    <!-- Top to middle connections -->
    <path d="M200,140 Q300,200 350,250">
      <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite"/>
    </path>
    <path d="M450,140 L450,230">
      <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1s" repeatCount="indefinite"/>
    </path>
    <path d="M700,140 Q600,200 550,250">
      <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite"/>
    </path>
    
    <!-- Middle to bottom connections -->
    <path d="M350,330 Q300,400 250,450">
      <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite"/>
    </path>
    <path d="M450,350 L450,430">
      <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1s" repeatCount="indefinite"/>
    </path>
    <path d="M550,330 Q600,400 650,450">
      <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite"/>
    </path>
  </g>
  
  <!-- Top row nodes -->
  <g filter="url(#nodeShadow)">
    <!-- User Interface -->
    <g transform="translate(100,60)">
      <rect width="200" height="80" rx="16" fill="url(#nodeGradient1)"/>
      <text x="100" y="35" fill="white" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">🖥️ User Interface</text>
      <text x="100" y="55" fill="white" fill-opacity="0.8" font-family="system-ui" font-size="11" text-anchor="middle">React + TypeScript</text>
    </g>
    
    <!-- API Gateway -->
    <g transform="translate(350,60)">
      <rect width="200" height="80" rx="16" fill="url(#nodeGradient2)"/>
      <text x="100" y="35" fill="white" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">🚀 API Gateway</text>
      <text x="100" y="55" fill="white" fill-opacity="0.8" font-family="system-ui" font-size="11" text-anchor="middle">Express + REST</text>
    </g>
    
    <!-- Auth Service -->
    <g transform="translate(600,60)">
      <rect width="200" height="80" rx="16" fill="url(#nodeGradient3)"/>
      <text x="100" y="35" fill="white" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">🔐 Auth Service</text>
      <text x="100" y="55" fill="white" fill-opacity="0.8" font-family="system-ui" font-size="11" text-anchor="middle">JWT + OAuth</text>
    </g>
  </g>
  
  <!-- Middle row - Core -->
  <g filter="url(#nodeShadow)">
    <g transform="translate(300,250)">
      <rect width="300" height="100" rx="20" fill="url(#nodeGradient1)"/>
      <text x="150" y="40" fill="white" font-family="system-ui" font-size="18" font-weight="bold" text-anchor="middle">⚡ Core Engine</text>
      <text x="150" y="65" fill="white" fill-opacity="0.8" font-family="system-ui" font-size="12" text-anchor="middle">Business Logic & Orchestration</text>
      <text x="150" y="85" fill="white" fill-opacity="0.6" font-family="system-ui" font-size="10" text-anchor="middle">Node.js • TypeScript • Event-Driven</text>
    </g>
  </g>
  
  <!-- Bottom row nodes -->
  <g filter="url(#nodeShadow)">
    <!-- Database -->
    <g transform="translate(100,450)">
      <rect width="200" height="80" rx="16" fill="url(#nodeGradient3)"/>
      <text x="100" y="35" fill="white" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">🗄️ Database</text>
      <text x="100" y="55" fill="white" fill-opacity="0.8" font-family="system-ui" font-size="11" text-anchor="middle">PostgreSQL + Redis</text>
    </g>
    
    <!-- AI Services -->
    <g transform="translate(350,450)">
      <rect width="200" height="80" rx="16" fill="url(#nodeGradient2)"/>
      <text x="100" y="35" fill="white" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">🧠 AI Services</text>
      <text x="100" y="55" fill="white" fill-opacity="0.8" font-family="system-ui" font-size="11" text-anchor="middle">Multi-Provider LLM</text>
    </g>
    
    <!-- Storage -->
    <g transform="translate(600,450)">
      <rect width="200" height="80" rx="16" fill="url(#nodeGradient1)"/>
      <text x="100" y="35" fill="white" font-family="system-ui" font-size="14" font-weight="bold" text-anchor="middle">📦 Storage</text>
      <text x="100" y="55" fill="white" fill-opacity="0.8" font-family="system-ui" font-size="11" text-anchor="middle">S3 Compatible</text>
    </g>
  </g>
  
  <!-- Floating particles animation -->
  <g fill="#6366f1" fill-opacity="0.4">
    <circle r="3"><animateMotion dur="8s" repeatCount="indefinite" path="M100,100 Q450,50 800,100 T100,100"/></circle>
    <circle r="2"><animateMotion dur="6s" repeatCount="indefinite" path="M50,300 Q450,250 850,300 T50,300"/></circle>
    <circle r="4"><animateMotion dur="10s" repeatCount="indefinite" path="M200,500 Q450,450 700,500 T200,500"/></circle>
  </g>
</svg>`.trim();

/**
 * Abstract Art / Logo Example
 * A stunning animated abstract visual with multiple effects
 */
export const ABSTRACT_ART_EXAMPLE = `
<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:0.8"/>
      <stop offset="50%" style="stop-color:#6366f1;stop-opacity:0.4"/>
      <stop offset="100%" style="stop-color:#0f0f1a;stop-opacity:0"/>
    </radialGradient>
    
    <linearGradient id="ringGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f472b6"/>
      <stop offset="50%" style="stop-color:#c084fc"/>
      <stop offset="100%" style="stop-color:#60a5fa"/>
    </linearGradient>
    
    <linearGradient id="ringGradient2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4ade80"/>
      <stop offset="50%" style="stop-color:#22d3d1"/>
      <stop offset="100%" style="stop-color:#818cf8"/>
    </linearGradient>
    
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8"/>
    </filter>
    
    <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="15" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    
    <clipPath id="circleClip">
      <circle cx="300" cy="300" r="250"/>
    </clipPath>
  </defs>
  
  <!-- Background -->
  <rect width="600" height="600" fill="#0a0a14"/>
  
  <!-- Ambient glow -->
  <circle cx="300" cy="300" r="280" fill="url(#centerGlow)"/>
  
  <!-- Rotating outer rings -->
  <g transform-origin="300 300">
    <animateTransform attributeName="transform" type="rotate" from="0 300 300" to="360 300 300" dur="30s" repeatCount="indefinite"/>
    <circle cx="300" cy="300" r="240" fill="none" stroke="url(#ringGradient1)" stroke-width="2" stroke-dasharray="40,20,10,20"/>
  </g>
  
  <g transform-origin="300 300">
    <animateTransform attributeName="transform" type="rotate" from="360 300 300" to="0 300 300" dur="25s" repeatCount="indefinite"/>
    <circle cx="300" cy="300" r="200" fill="none" stroke="url(#ringGradient2)" stroke-width="3" stroke-dasharray="30,15,5,15"/>
  </g>
  
  <g transform-origin="300 300">
    <animateTransform attributeName="transform" type="rotate" from="0 300 300" to="360 300 300" dur="20s" repeatCount="indefinite"/>
    <circle cx="300" cy="300" r="160" fill="none" stroke="#f472b6" stroke-opacity="0.6" stroke-width="1" stroke-dasharray="50,10"/>
  </g>
  
  <!-- Inner geometric shapes -->
  <g clip-path="url(#circleClip)" filter="url(#softGlow)">
    <!-- Pulsing hexagon -->
    <polygon points="300,180 380,230 380,330 300,380 220,330 220,230" fill="none" stroke="url(#ringGradient1)" stroke-width="2">
      <animate attributeName="stroke-width" values="2;4;2" dur="3s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="scale" values="1;1.1;1" dur="3s" repeatCount="indefinite" additive="sum"/>
    </polygon>
    
    <!-- Inner rotating triangle -->
    <g transform-origin="300 300">
      <animateTransform attributeName="transform" type="rotate" from="0 300 300" to="360 300 300" dur="15s" repeatCount="indefinite"/>
      <polygon points="300,220 350,320 250,320" fill="none" stroke="url(#ringGradient2)" stroke-width="2"/>
    </g>
    
    <!-- Inverted triangle -->
    <g transform-origin="300 300">
      <animateTransform attributeName="transform" type="rotate" from="360 300 300" to="0 300 300" dur="12s" repeatCount="indefinite"/>
      <polygon points="300,340 350,240 250,240" fill="none" stroke="#60a5fa" stroke-opacity="0.8" stroke-width="1.5"/>
    </g>
  </g>
  
  <!-- Center core -->
  <g filter="url(#softGlow)">
    <circle cx="300" cy="300" r="40" fill="url(#ringGradient1)">
      <animate attributeName="r" values="40;50;40" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="300" cy="300" r="25" fill="#0a0a14"/>
    <circle cx="300" cy="300" r="15" fill="#c084fc">
      <animate attributeName="fill-opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </g>
  
  <!-- Orbiting particles -->
  <g fill="#f472b6">
    <circle r="4">
      <animateMotion dur="8s" repeatCount="indefinite" path="M300,150 A150,150 0 1,1 299,150 A150,150 0 1,1 300,150"/>
      <animate attributeName="fill-opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g fill="#4ade80">
    <circle r="3">
      <animateMotion dur="6s" repeatCount="indefinite" path="M300,180 A120,120 0 1,0 301,180 A120,120 0 1,0 300,180"/>
      <animate attributeName="fill-opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </g>
  <g fill="#60a5fa">
    <circle r="5">
      <animateMotion dur="10s" repeatCount="indefinite" path="M300,100 A200,200 0 1,1 299,100 A200,200 0 1,1 300,100"/>
      <animate attributeName="fill-opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/>
    </circle>
  </g>
  
  <!-- Small accent dots -->
  <g fill="white" fill-opacity="0.6">
    <circle cx="300" cy="300" r="2"/>
    <circle cx="340" cy="280" r="1.5"/>
    <circle cx="260" cy="320" r="1.5"/>
    <circle cx="280" cy="260" r="1"/>
    <circle cx="320" cy="340" r="1"/>
  </g>
</svg>`.trim();

/**
 * Dashboard Widget Example
 * A modern stats card with smooth design
 */
export const DASHBOARD_WIDGET_EXAMPLE = `
<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e1e2f"/>
      <stop offset="100%" style="stop-color:#0f0f1a"/>
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4ade80;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#4ade80;stop-opacity:0"/>
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  
  <!-- Card background -->
  <rect width="400" height="250" rx="24" fill="url(#cardGradient)" filter="url(#cardShadow)"/>
  
  <!-- Accent bar at top -->
  <rect x="0" y="0" width="400" height="6" rx="3" fill="url(#accentGradient)"/>
  
  <!-- Icon circle -->
  <circle cx="55" cy="55" r="24" fill="url(#accentGradient)" fill-opacity="0.2"/>
  <text x="55" y="62" fill="#8b5cf6" font-size="20" text-anchor="middle">📈</text>
  
  <!-- Title -->
  <text x="95" y="48" fill="#94a3b8" font-family="system-ui" font-size="12" font-weight="500">REVENUE</text>
  <text x="95" y="70" fill="white" font-family="system-ui" font-size="22" font-weight="bold">$48,294</text>
  
  <!-- Trend indicator -->
  <g transform="translate(290, 45)">
    <rect width="80" height="30" rx="15" fill="#4ade80" fill-opacity="0.15"/>
    <text x="40" y="20" fill="#4ade80" font-family="system-ui" font-size="12" font-weight="600" text-anchor="middle">↑ 12.5%</text>
  </g>
  
  <!-- Sparkline chart -->
  <g transform="translate(30, 100)">
    <!-- Fill area -->
    <path d="M0,80 L0,60 Q30,40 60,50 T120,30 T180,45 T240,25 T300,40 T340,20 L340,80 Z" 
          fill="url(#sparklineGradient)"/>
    <!-- Line -->
    <path d="M0,60 Q30,40 60,50 T120,30 T180,45 T240,25 T300,40 T340,20" 
          stroke="#4ade80" stroke-width="3" fill="none" stroke-linecap="round">
      <animate attributeName="stroke-dasharray" from="0,500" to="500,0" dur="2s" fill="freeze"/>
    </path>
    <!-- End dot -->
    <circle cx="340" cy="20" r="6" fill="#4ade80">
      <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  
  <!-- Bottom stats -->
  <g transform="translate(30, 210)">
    <text x="0" y="0" fill="#64748b" font-family="system-ui" font-size="11">This Month</text>
    <text x="0" y="18" fill="white" font-family="system-ui" font-size="14" font-weight="600">$38,420</text>
    
    <text x="120" y="0" fill="#64748b" font-family="system-ui" font-size="11">Last Month</text>
    <text x="120" y="18" fill="white" font-family="system-ui" font-size="14" font-weight="600">$34,100</text>
    
    <text x="240" y="0" fill="#64748b" font-family="system-ui" font-size="11">Avg. Daily</text>
    <text x="240" y="18" fill="white" font-family="system-ui" font-size="14" font-weight="600">$1,609</text>
  </g>
</svg>`.trim();

/**
 * Get example by type
 */
export function getVisualExample(type: string): string {
  const lowerType = type.toLowerCase();

  if (lowerType.includes('chart') || lowerType.includes('graph') || lowerType.includes('data')) {
    return DATA_VISUALIZATION_EXAMPLE;
  }
  if (
    lowerType.includes('flow') ||
    lowerType.includes('diagram') ||
    lowerType.includes('architecture')
  ) {
    return FLOW_DIAGRAM_EXAMPLE;
  }
  if (lowerType.includes('abstract') || lowerType.includes('art') || lowerType.includes('logo')) {
    return ABSTRACT_ART_EXAMPLE;
  }
  if (
    lowerType.includes('dashboard') ||
    lowerType.includes('widget') ||
    lowerType.includes('card')
  ) {
    return DASHBOARD_WIDGET_EXAMPLE;
  }

  // Default to chart example
  return DATA_VISUALIZATION_EXAMPLE;
}

/**
 * Get all example names
 */
export function getAvailableExamples(): string[] {
  return ['data-visualization', 'flow-diagram', 'abstract-art', 'dashboard-widget'];
}
