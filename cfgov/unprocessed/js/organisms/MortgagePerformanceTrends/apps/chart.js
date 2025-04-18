import * as ccb from '../../../../apps/cfpb-chart-builder/js/';
import LineChartStore from '../stores/chart';
import actions from '../actions/chart';
import utils from '../utils';

const store = new LineChartStore([
  utils.thunkMiddleware,
  utils.loggerMiddleware,
]);

class MortgagePerformanceLineChart {
  constructor({ container }) {
    // TODO: Make these selections less verbose.
    this.$container = document.getElementById(container);
    this.$form = this.$container.querySelector('#mp-line-chart-controls');
    this.$geo = this.$container.querySelector('#mp-line-chart-geo');
    this.$state = this.$container.querySelector('#mp-line-chart-state');
    this.$metro = this.$container.querySelector('#mp-line-chart-metro');
    this.$county = this.$container.querySelector('#mp-line-chart-county');
    this.$compareContainer = this.$container.querySelector(
      '#mp-line-chart-compare-container',
    );
    this.$compare = this.$container.querySelector('#mp-line-chart-compare');
    this.$chart = this.$container.querySelector('#mp-line-chart');
    this.$chartTitle = document.querySelector('#mp-line-chart-title-status');
    this.$chartTitleGeo = document.querySelector(
      '#mp-line-chart-title-status-geo',
    );
    this.$chartTitleComparison = document.querySelector(
      '#mp-line-chart-title-status-comparison',
    );
    this.$loadingSpinner = document.querySelector('#mp-chart-loading');
    this.timespan = this.$container.getAttribute('data-chart-time-span');
    this.chart = ccb.createChart({
      el: this.$chart,
      source: `time-series/${this.timespan}/national`,
      type: 'line-comparison',
    });
    this.$chart.setAttribute('data-chart-ignore', 'true');
    this.eventListeners();
    utils.hideEl(this.$chartTitleComparison);
    utils.hideEl(this.$loadingSpinner);
    utils.hideEl(this.$compareContainer);
  }
}

MortgagePerformanceLineChart.prototype.eventListeners = function () {
  this.$form.addEventListener('change', this.onChange.bind(this));
  store.subscribe(this.renderChart.bind(this));
  store.subscribe(this.renderChartTitle.bind(this));
  store.subscribe(this.renderChartForm.bind(this));
  store.subscribe(this.renderCounties.bind(this));
  store.subscribe(this.renderMetros.bind(this));
  store.subscribe(this.renderStates.bind(this));
};

MortgagePerformanceLineChart.prototype.onClick = function (event) {
  const change = new Event('change');
  this.$container.querySelector(
    'input[name="mp-line-chart_geo"]:checked',
  ).checked = false;
  this.$form.dispatchEvent(change);
  event.preventDefault();
};

MortgagePerformanceLineChart.prototype.onChange = function (event) {
  let action;
  let geoType;
  let geoId;
  let geoName;
  const includeComparison = this.$compare.checked;
  const abbr =
    this.$state.options[this.$state.selectedIndex].getAttribute('data-abbr');

  switch (event.target.id) {
    case 'mp-line-chart_geo-state':
      // Reset the metro, non-metro and county dropdowns to the first item if we're no longer using it
      this.$county.selectedIndex = 0;
      this.$metro.selectedIndex = 0;
      action = actions.fetchStates(abbr);
      break;
    case 'mp-line-chart_geo-metro':
      this.$metro.selectedIndex = 0;
      action = actions.fetchMetroStates(abbr);
      break;
    case 'mp-line-chart_geo-non-metro':
      action = actions.fetchNonMetroStates(abbr);
      break;
    case 'mp-line-chart_geo-county':
      this.$county.selectedIndex = 0;
      action = actions.fetchCountyStates(abbr);
      break;
    case 'mp-line-chart-state':
      geoType = this.$container
        .querySelector('input[name="mp-line-chart_geo"]:checked')
        .id.replace('mp-line-chart_geo-', '');
      // TODO: Waaaaay too much code repetition here.
      if (geoType === 'state') {
        geoId = this.$state.value;
        geoName = this.$state.options[this.$state.selectedIndex].text;
        action = actions.updateChart(
          geoId,
          geoName,
          'state',
          includeComparison,
        );
      }
      if (geoType === 'metro') {
        geoId = this.$metro.value;
        geoName = this.$metro.options[this.$metro.selectedIndex].text;
        action = actions.fetchMetros(abbr, includeComparison);
      }
      if (geoType === 'non-metro') {
        geoId = this.$state.value;
        geoName = this.$state.options[this.$state.selectedIndex].text;
        action = actions.fetchNonMetros(abbr, includeComparison);
        action = actions.updateChart(
          geoId,
          geoName,
          'non-metro',
          includeComparison,
        );
      }
      if (geoType === 'county') {
        geoId = this.$county.value;
        geoName = this.$county.options[this.$county.selectedIndex].text;
        action = actions.fetchCounties(abbr, includeComparison);
      }
      break;
    case 'mp-line-chart-metro':
      geoId = this.$metro.value;
      geoName = this.$metro.options[this.$metro.selectedIndex].text;
      action = actions.updateChart(geoId, geoName, 'metro', includeComparison);
      break;
    case 'mp-line-chart-non-metro':
      geoId = this.$state.value;
      geoName = this.$state.options[this.$state.selectedIndex].text;
      action = actions.updateChart(
        geoId,
        geoName,
        'non-metro',
        includeComparison,
      );
      break;
    case 'mp-line-chart-county':
      geoId = this.$county.value;
      geoName = this.$county.options[this.$county.selectedIndex].text;
      action = actions.updateChart(geoId, geoName, 'county', includeComparison);
      break;
    case 'mp-line-chart-compare':
      utils.hideEl(this.$chartTitleComparison);
      action = actions.updateNational(includeComparison);
      break;
    default:
      action = actions.clearGeo();
  }

  store.dispatch(action);
};

MortgagePerformanceLineChart.prototype.renderChart = function (
  prevState,
  state,
) {
  let source;
  const baseSource = `time-series/${this.timespan}/national`;
  // If the geo hasn't changed, don't re-render the chart.
  if (
    prevState.geo.id === state.geo.id &&
    prevState.includeComparison === state.includeComparison
  ) {
    return;
  }

  // If no geo is provided, default to national data
  if (!state.geo.id || !state.geo.type) {
    this.chart
      .update({
        source: baseSource,
      })
      .then(() => {
        store.dispatch(actions.stopLoading());
      });
    return;
  }

  // Otherwise, load the geo and optionally national data
  source = `time-series/${this.timespan}/${state.geo.id}`;
  if (state.includeComparison) {
    source = `${source};${baseSource}`;
  }
  this.chart
    .update({
      source: source,
    })
    .then(() => {
      store.dispatch(actions.stopLoading());
    });
};

MortgagePerformanceLineChart.prototype.renderChartForm = function (
  prevState,
  state,
) {
  const geoType = state.geo.type;
  const title = this.$container.querySelector('#mp-state-dropdown-title');
  const geo = this.$container.querySelector(
    `#mp-line-chart-${geoType}-container`,
  );
  const containers = this.$container.querySelectorAll(
    '.mp-line-chart-select-container',
  );
  for (let i = 0; i < containers.length; ++i) {
    utils.hideEl(containers[i]);
  }
  utils.hideEl(this.$container.querySelector('#mp-state-county-helper-text'));
  utils.hideEl(this.$container.querySelector('#mp-state-metro-helper-text'));
  utils.hideEl(
    this.$container.querySelector('#mp-state-non-metro-helper-text'),
  );
  if (geoType === 'county') {
    utils.showEl(this.$container.querySelector('#mp-state-county-helper-text'));
    utils.showEl(
      this.$container.querySelector('#mp-line-chart-state-container'),
    );
  }
  if (geoType === 'metro') {
    utils.showEl(this.$container.querySelector('#mp-state-metro-helper-text'));
    utils.showEl(
      this.$container.querySelector('#mp-line-chart-state-container'),
    );
  }
  if (geoType === 'non-metro') {
    utils.showEl(
      this.$container.querySelector('#mp-state-non-metro-helper-text'),
    );
    utils.showEl(
      this.$container.querySelector('#mp-line-chart-state-container'),
    );
  }
  if (geoType) {
    utils.showEl(this.$compareContainer);
  } else {
    utils.hideEl(this.$compareContainer);
  }
  if (geo) {
    utils.showEl(geo);
  }
  if (state.geo.type === 'non-metro') {
    title.innerText = 'Select non-metro area by state';
  } else {
    title.innerText = 'Select state';
  }
};

MortgagePerformanceLineChart.prototype.renderChartTitle = function (
  prevState,
  state,
) {
  let geoName = state.geo.name;
  // Append the U.S. state if it's a county
  if (state.geo.type === 'county') {
    geoName = `${geoName}, ${utils.getCountyState(state.geo.id)}`;
  }
  const includeComparison = state.includeComparison;
  if (geoName) {
    utils.showEl(this.$chartTitle);
    this.$chartTitleGeo.innerText = geoName;
  } else {
    this.$chartTitleGeo.innerText = 'national average';
  }
  // Only show comparison text if a location type is selected
  if (geoName && includeComparison) {
    utils.showEl(this.$chartTitleComparison);
  } else {
    utils.hideEl(this.$chartTitleComparison);
  }
};

MortgagePerformanceLineChart.prototype.renderCounties = function (
  prevState,
  state,
) {
  this.$county.disabled = state.isLoadingCounties;
  if (JSON.stringify(prevState.counties) === JSON.stringify(state.counties)) {
    return;
  }
  state.counties.sort((a, b) => (a.name < b.name ? -1 : 1));
  const fragment = document.createDocumentFragment();
  state.counties.forEach((county) => {
    const option = document.createElement('option');
    option.value = county.fips;
    option.text = county.name;
    fragment.appendChild(option);
  });
  this.$county.innerHTML = '';
  this.$county.appendChild(fragment);
};

MortgagePerformanceLineChart.prototype.renderMetros = function (
  prevState,
  state,
) {
  this.$metro.disabled = state.isLoadingMetros;
  if (JSON.stringify(prevState.metros) === JSON.stringify(state.metros)) {
    return;
  }
  state.metros.sort((a, b) => (a.name < b.name ? -1 : 1));
  const fragment = document.createDocumentFragment();
  state.metros.forEach((metro) => {
    // Remove non-metros (locations with fips ending in -non)
    if (utils.isNonMetro(metro.fips)) {
      return;
    }
    const option = document.createElement('option');
    option.value = metro.fips;
    option.text = metro.name;
    fragment.appendChild(option);
  });
  this.$metro.innerHTML = '';
  this.$metro.appendChild(fragment);
};

MortgagePerformanceLineChart.prototype.renderStates = function (
  prevState,
  state,
) {
  this.$state.disabled = state.isLoadingStates;
  if (JSON.stringify(prevState.states) === JSON.stringify(state.states)) {
    return;
  }
  const fragment = document.createDocumentFragment();
  state.states.forEach((s) => {
    const option = document.createElement('option');
    option.value = s.fips;
    option.text = s.text || s.name;
    option.selected = s.selected;
    option.label = s.name;
    option.setAttribute('data-abbr', s.abbr);
    fragment.appendChild(option);
  });
  this.$state.innerHTML = '';
  this.$state.appendChild(fragment);
};

export default MortgagePerformanceLineChart;
