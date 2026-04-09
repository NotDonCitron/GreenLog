module.exports = {
  ci: {
    collect: {
      // Wir testen gegen den Produktions-Build (Best Practice)
      startServerCommand: 'npm run start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/strains',
        'http://localhost:3000/discover',
      ],
      numberOfRuns: 3,
    },
    assert: {
      // Performance Budgets basierend auf deinem Bericht
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
