// Helper functions to generate code/data background patterns
function generateCodeBg(canvas, ctx) {
  ctx.fillStyle = '#0a192f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.font = '12px Courier';
  ctx.fillStyle = '#64ffda';
  
  // Generate random code-like lines
  const lines = Math.floor(canvas.height / 15);
  for (let i = 0; i < lines; i++) {
    const lineLength = Math.random() * 80 + 20;
    let line = '';
    
    // Add random indentation
    const indent = Math.floor(Math.random() * 8) * 2;
    for (let j = 0; j < indent; j++) {
      line += ' ';
    }
    
    // Add some code-like patterns
    const patterns = [
      'function', 'const', 'let', 'if (', 'for (', 'while (', 
      'return', 'await', 'async', '() => {', '});', '{'
    ];
    
    if (Math.random() > 0.7) {
      line += patterns[Math.floor(Math.random() * patterns.length)];
      line += ' ';
    }
    
    // Fill with random chars to desired length
    const chars = 'abcdefghijklmnopqrstuvwxyz_.$(){}[];';
    for (let j = line.length; j < lineLength; j++) {
      line += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    ctx.fillText(line, 10, 15 + i * 15);
  }
  
  return canvas.toDataURL();
}

function generateDataBg(canvas, ctx) {
  ctx.fillStyle = '#0a192f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Generate grid
  ctx.strokeStyle = '#1a365d';
  ctx.lineWidth = 1;
  
  const gridSize = 20;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  // Generate random data points
  ctx.fillStyle = '#64ffda';
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 3 + 1;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw a few lines connecting points
  ctx.strokeStyle = '#64ffda';
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.7);
  
  for (let x = 0; x < canvas.width; x += canvas.width / 20) {
    const height = Math.sin(x / 30) * 50 + canvas.height * 0.5;
    ctx.lineTo(x, height);
  }
  
  ctx.stroke();
  
  return canvas.toDataURL();
}

function generateMetricsBg(canvas, ctx) {
  ctx.fillStyle = '#0a192f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Generate a few bar charts
  const barWidth = 15;
  const gap = 5;
  const startY = canvas.height - 50;
  
  ctx.fillStyle = '#64ffda';
  
  for (let i = 0; i < 15; i++) {
    const height = Math.random() * 100 + 20;
    const x = 20 + i * (barWidth + gap);
    ctx.fillRect(x, startY - height, barWidth, height);
  }
  
  // Generate circular progress indicators
  ctx.strokeStyle = '#64ffda';
  ctx.lineWidth = 3;
  
  for (let i = 0; i < 3; i++) {
    const x = 50 + i * 100;
    const y = 70;
    const radius = 30;
    
    // Background circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#1a365d';
    ctx.stroke();
    
    // Progress arc
    const progress = Math.random();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2 * progress);
    ctx.strokeStyle = '#64ffda';
    ctx.stroke();
    
    // Percentage text
    ctx.fillStyle = '#64ffda';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(progress * 100)}%`, x, y + 5);
  }
  
  return canvas.toDataURL();
}

// Generate and set up the background images when document is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  
  // Generate background images
  const codeBg = generateCodeBg(canvas, ctx);
  const dataBg = generateDataBg(canvas, ctx);
  const metricsBg = generateMetricsBg(canvas, ctx);
  
  // Apply background images to elements
  const codeElements = document.querySelectorAll('.code-visualization');
  const dataElements = document.querySelectorAll('.data-visualization');
  const metricsElements = document.querySelectorAll('.metrics-visualization');
  
  codeElements.forEach(el => {
    el.style.backgroundImage = `url(${codeBg})`;
  });
  
  dataElements.forEach(el => {
    el.style.backgroundImage = `url(${dataBg})`;
  });
  
  metricsElements.forEach(el => {
    el.style.backgroundImage = `url(${metricsBg})`;
  });
});