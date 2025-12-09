// @version 3.3.482
/**
 * Ambient Particles
 * 
 * Floating neural-inspired particles that respond to 
 * the AI's emotional state and mouse position.
 * 
 * Features:
 * - Configurable particle count based on performance budget
 * - Particles attract/repel from mouse cursor
 * - Color and behavior shift with emotion
 * - Synaptic connections between nearby particles
 * 
 * @module skin/canvas/AmbientParticles
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';

// ============================================================================
// PARTICLE CLASS
// ============================================================================

class Particle {
  constructor(width, height, emotion) {
    this.reset(width, height, emotion);
  }
  
  reset(width, height, emotion) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.radius = Math.random() * 2 + 1;
    this.baseRadius = this.radius;
    this.alpha = Math.random() * 0.5 + 0.2;
    this.baseAlpha = this.alpha;
    this.hueOffset = (Math.random() - 0.5) * 30;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.02 + Math.random() * 0.02;
    this.life = 1;
    this.maxLife = 1;
  }
  
  update(width, height, emotion, mouse, deltaTime) {
    const speed = emotion.waveSpeed * 0.5;
    const intensity = emotion.intensity;
    
    // Base movement
    this.x += this.vx * speed * deltaTime * 0.1;
    this.y += this.vy * speed * deltaTime * 0.1;
    
    // Mouse influence
    const mouseX = mouse.x * width;
    const mouseY = mouse.y * height;
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 200;
    
    if (dist < maxDist && dist > 0) {
      const force = (1 - dist / maxDist) * 0.5 * intensity;
      // Gentle attraction
      this.vx += (dx / dist) * force * 0.1;
      this.vy += (dy / dist) * force * 0.1;
    }
    
    // Damping
    this.vx *= 0.99;
    this.vy *= 0.99;
    
    // Pulse effect
    this.pulsePhase += this.pulseSpeed * deltaTime * 0.1;
    const pulse = Math.sin(this.pulsePhase) * 0.3 + 1;
    this.radius = this.baseRadius * pulse * (0.8 + intensity * 0.4);
    this.alpha = this.baseAlpha * (0.5 + intensity * 0.5);
    
    // Wrap around edges with padding
    const pad = 50;
    if (this.x < -pad) this.x = width + pad;
    if (this.x > width + pad) this.x = -pad;
    if (this.y < -pad) this.y = height + pad;
    if (this.y > height + pad) this.y = -pad;
  }
  
  draw(ctx, emotion) {
    const hue = emotion.primaryHue + this.hueOffset;
    const sat = 60 + emotion.intensity * 20;
    const light = 50 + emotion.intensity * 20;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${this.alpha})`;
    ctx.fill();
    
    // Glow effect
    if (emotion.glowRadius > 0.3) {
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius * 3
      );
      gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${this.alpha * 0.5})`);
      gradient.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }
}

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================

class ParticleSystem {
  constructor(canvas, maxParticles, emotion) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.maxParticles = maxParticles;
    this.connectionDistance = 100;
    
    this.init(emotion);
  }
  
  init(emotion) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(new Particle(width, height, emotion));
    }
  }
  
  setMaxParticles(count, emotion) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    if (count > this.particles.length) {
      // Add particles
      for (let i = this.particles.length; i < count; i++) {
        this.particles.push(new Particle(width, height, emotion));
      }
    } else if (count < this.particles.length) {
      // Remove particles
      this.particles = this.particles.slice(0, count);
    }
    
    this.maxParticles = count;
  }
  
  update(emotion, mouse, deltaTime) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    for (const particle of this.particles) {
      particle.update(width, height, emotion, mouse, deltaTime);
    }
  }
  
  draw(emotion) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw connections first (behind particles)
    if (emotion.intensity > 0.3 && this.particles.length < 100) {
      this.drawConnections(emotion);
    }
    
    // Draw particles
    for (const particle of this.particles) {
      particle.draw(ctx, emotion);
    }
  }
  
  drawConnections(emotion) {
    const ctx = this.ctx;
    const maxDist = this.connectionDistance * emotion.intensity;
    
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.15 * emotion.intensity;
          const hue = emotion.secondaryHue;
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `hsla(${hue}, 50%, 50%, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }
  
  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

export default function AmbientParticles({ emotion, maxParticles, mousePosition }) {
  const canvasRef = useRef(null);
  const systemRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  
  // Initialize particle system
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    systemRef.current = new ParticleSystem(canvas, maxParticles, emotion);
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (systemRef.current) {
        systemRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Update max particles when budget changes
  useEffect(() => {
    if (systemRef.current) {
      systemRef.current.setMaxParticles(maxParticles, emotion);
    }
  }, [maxParticles, emotion]);
  
  // Animation loop
  useEffect(() => {
    if (!systemRef.current) return;
    
    const animate = (timestamp) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      systemRef.current.update(emotion, mousePosition, deltaTime);
      systemRef.current.draw(emotion);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [emotion, mousePosition]);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
