// @version 2.2.417
// TooLoo.ai Skin Primitive: Tabs
// Tabbed navigation component

import React, { useState, useRef, useEffect } from 'react';

const variants = {
  default: {
    container: 'border-b border-white/10',
    tab: 'text-gray-500 hover:text-white',
    active: 'text-white border-b-2 border-cyan-500',
  },
  pills: {
    container: 'bg-white/5 rounded-lg p-1 gap-1',
    tab: 'text-gray-500 hover:text-white rounded-md',
    active: 'text-white bg-cyan-500/20 rounded-md',
  },
  underline: {
    container: '',
    tab: 'text-gray-500 hover:text-cyan-400',
    active: 'text-cyan-400 border-b-2 border-cyan-500',
  },
  cards: {
    container: 'gap-2',
    tab: 'text-gray-500 bg-white/5 rounded-lg border border-transparent hover:border-white/10',
    active: 'text-cyan-400 bg-cyan-500/10 rounded-lg border border-cyan-500/30',
  },
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
};

export const Tabs = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  const v = variants[variant];

  return (
    <div className={`flex ${v.container} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const isDisabled = tab.disabled;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => !isDisabled && onChange?.(tab.id)}
            disabled={isDisabled}
            className={`
              flex items-center gap-2 font-medium
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:ring-offset-0
              ${sizes[size]}
              ${isActive ? v.active : v.tab}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${fullWidth ? 'flex-1 justify-center' : ''}
            `}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
            {tab.badge && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// Tab panels container
export const TabPanels = ({ children, activeTab }) => {
  const panels = React.Children.toArray(children);
  const activePanel = panels.find(
    (panel) => React.isValidElement(panel) && panel.props.id === activeTab
  );

  return <div className="mt-4">{activePanel}</div>;
};

// Individual tab panel
export const TabPanel = ({ id, children, className = '' }) => (
  <div className={className}>{children}</div>
);

// Controlled tabs wrapper (convenience component)
export const TabsController = ({
  tabs,
  defaultTab,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  tabsClassName = '',
  panelsClassName = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={className}>
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        className={tabsClassName}
      />
      <TabPanels activeTab={activeTab} className={panelsClassName}>
        {children}
      </TabPanels>
    </div>
  );
};

export default Tabs;
