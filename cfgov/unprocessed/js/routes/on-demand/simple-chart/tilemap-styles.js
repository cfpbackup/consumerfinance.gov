import styles from './common-styles.js';

const tilemap = {
  ...styles,
  accessibility: {},
  navigator: {
    enabled: false,
  },
  plotOptions: {
    tilemap: {
      tileShape: 'square',
      pointRange: 0.8,
      pointPadding: 3,
      states: {
        hover: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: function () {
          return `<span style="font-weight:500">${
            this.point.name
          }</span><br/><span style="font-weight:300">${Math.round(
            this.point.value,
          )}</span>`;
        },
        style: {
          textOutline: false,
          fontSize: '13px',
        },
      },
    },
  },
  xAxis: {
    visible: false,
    tickAmount: 15,
    title: {},
  },
  yAxis: {
    visible: false,
    tickAmount: 15,
    title: {},
  },
  tooltip: {
    style: {
      fontFamily: 'Source Sans 3 Variable',
      fontSize: '16px',
      lineHeight: '24px',
    },
  },
  legend: {
    enabled: false,
  },
  chart: {
    animation: false,
    maxWidth: 670,
    height: 450,
    marginLeft: -48,
    marginRight: 0,
    marginTop: -1,
    spacingBottom: -290,
    type: 'tilemap',
  },
  responsive: {
    rules: [
      {
        condition: {
          maxWidth: 600,
        },
        chartOptions: {
          chart: {
            animation: false,
            height: 350,
            marginLeft: -19,
            spacingBottom: -240,
          },

          plotOptions: {
            tilemap: {
              pointRange: 0,
            },
          },
        },
      },
    ],
  },
};

export default tilemap;
