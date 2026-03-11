import cache from '../../../../js/modules/util/web-storage-proxy';
import getData from './get-data';

const DATA_SOURCE_BASE = 'https://files.consumerfinance.gov/data/';

const shapes = {
  states: `${DATA_SOURCE_BASE}mortgage-performance/meta/us-states.geo.json`,
  metros: `${DATA_SOURCE_BASE}mortgage-performance/meta/us-metros.geo.json`,
  counties: `${DATA_SOURCE_BASE}mortgage-performance/meta/us-counties.geo.json`,
};

const fetchMapShapes = (geoType) => {
  // If the shapes have already been downloaded resolve the promise immediately.
  const cacheItem = JSON.parse(cache.getItem(`shapes-${geoType}`));
  if (cacheItem) {
    return Promise.resolve(cacheItem);
  }

  // Otherwise, download the shapes and cache them for future requests.
  const promise = getData(shapes[geoType]);

  promise.then((data) => {
    cache.setItem(`shapes-${geoType}`, JSON.stringify(data));
  });

  return promise;
};

export default fetchMapShapes;
