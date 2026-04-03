import { MortgagePerformanceTrends } from './mortgage-performance-trends-helpers.cy.js';

const trends = new MortgagePerformanceTrends();
const env = Cypress.expose('ENVIRONMENT');

/* TODO: enable tests on github when test data has been created
   and enable tests on staging when CI/CD issues have been resolved */
if (env === 'local-machine') {
  describe('Mortgage Performance Trends', () => {
    it('should display delinquency trends chart for a given state', () => {
      trends.open();
      trends.selectLocationType('State');
      trends.selectStateForDelinquencyTrends('Virginia');
    });

    it('should display delinquency rates by month for a given state', () => {
      trends.open();
      cy.get('#mp-map').should('be.visible');
      trends.selectStateForDelinquencyRatesPerMonth('Virginia');
      trends.selectMonth('January');
      trends.selectYear('2017');
      trends.mapTitle().should('contain', 'Virginia');
      trends.mapTitle().should('contain', 'January');
      trends.mapTitle().should('contain', '2017');
    });
  });
}
