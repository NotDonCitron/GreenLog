'use client';

import { useState } from 'react';

const themes = {
  green: {
    name: '🌿 Green',
    primary: 'oklch(0.50 0.22 145)',
    accent: 'oklch(0.60 0.20 165)',
  },
  purple: {
    name: '🌸 Purple',
    primary: 'oklch(0.55 0.22 290)',
    accent: 'oklch(0.65 0.18 300)',
  },
  amber: {
    name: '🍯 Amber',
    primary: 'oklch(0.65 0.18 70)',
    accent: 'oklch(0.70 0.15 50)',
  },
  teal: {
    name: '🌿 Teal',
    primary: 'oklch(0.55 0.15 200)',
    accent: 'oklch(0.60 0.20 180)',
  },
  coral: {
    name: '🔥 Coral',
    primary: 'oklch(0.60 0.20 45)',
    accent: 'oklch(0.55 0.18 30)',
  },
};

export default function ThemeSwitcher() {
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const applyTheme = (key: string) => {
    const theme = themes[key as keyof typeof themes];
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--accent', theme.accent);
    setActiveTheme(key);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      background: 'white',
      padding: '16px',
      borderRadius: '12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#666' }}>
        Theme wählen:
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '200px' }}>
        {(Object.keys(themes) as Array<keyof typeof themes>).map((key) => (
          <button
            key={key}
            onClick={() => applyTheme(key)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: activeTheme === key ? '2px solid #333' : '1px solid #ddd',
              background: themes[key].primary,
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {themes[key].name}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          document.documentElement.style.removeProperty('--primary');
          document.documentElement.style.removeProperty('--accent');
          setActiveTheme(null);
        }}
        style={{
          marginTop: '8px',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid #ddd',
          background: '#f5f5f5',
          fontSize: '11px',
          cursor: 'pointer',
        }}
      >
        Reset
      </button>
    </div>
  );
}
