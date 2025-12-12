// @version 2.2.411
// TooLoo.ai Skin Primitive: Panel
// Collapsible, resizable container for content sections

import React, { useState, useRef, useEffect } from 'react';
import { IconButton } from './Button';

// Chevron icons
const ChevronDown = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUp = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const variants = {
  default: 'bg-[#0f1117] border-white/5',
  elevated: 'bg-[#151820] border-white/10 shadow-lg shadow-black/20',
  transparent: 'bg-transparent border-white/5',
  accent: 'bg-cyan-500/5 border-cyan-500/20',
};

export const Panel = ({
  title,
  icon: Icon,
  children,
  variant = 'default',
  defaultCollapsed = false,
  collapsible = true,
  actions,
  badge,
  className = '',
  headerClassName = '',
  contentClassName = '',
  ...props
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState('auto');

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isCollapsed ? 0 : contentRef.current.scrollHeight);
    }
  }, [isCollapsed, children]);

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div
      className={`
        rounded-xl border overflow-hidden
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {/* Header */}
      <div
        onClick={collapsible ? toggleCollapse : undefined}
        className={`
          flex items-center justify-between
          px-4 py-3
          ${collapsible ? 'cursor-pointer hover:bg-white/5' : ''}
          ${isCollapsed ? '' : 'border-b border-white/5'}
          transition-colors duration-200
          ${headerClassName}
        `}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-gray-400" />}
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions && (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
              {actions}
            </div>
          )}
          {collapsible && (
            <div className="text-gray-500">
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content with animation */}
      <div
        ref={contentRef}
        style={{
          height: collapsible ? (isCollapsed ? 0 : contentHeight) : 'auto',
          overflow: isCollapsed ? 'hidden' : 'visible',
        }}
        className={`
          transition-all duration-300 ease-out
          ${isCollapsed ? 'opacity-0' : 'opacity-100'}
        `}
      >
        <div className={`p-4 ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
};

// Simplified panel without collapse functionality
export const SimplePanel = ({
  title,
  icon: Icon,
  children,
  variant = 'default',
  actions,
  badge,
  className = '',
  ...props
}) => (
  <Panel
    title={title}
    icon={Icon}
    variant={variant}
    collapsible={false}
    actions={actions}
    badge={badge}
    className={className}
    {...props}
  >
    {children}
  </Panel>
);

export default Panel;
