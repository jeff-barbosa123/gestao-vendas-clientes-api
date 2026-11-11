const fs = require('fs');
const path = require('path');
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports',
    reportFilename: '[name]-report',
    html: true,
    json: false,
    overwrite: true,
    embeddedScreenshots: true,
    inlineAssets: true,
  },
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:4000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    setupNodeEvents(on) {
      require('cypress-mochawesome-reporter/plugin')(on);
      on('task', {
        writeAxeReport(violations) {
          const reportDir = path.join(__dirname, 'cypress', 'reports');
          if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
          }
          const reportPath = path.join(reportDir, 'axe-violations.json');
          fs.writeFileSync(reportPath, JSON.stringify(violations, null, 2));
          return null;
        },
      });
    },
  },
});
