import csv
import itertools
import logging
import time

from django.conf import settings

import requests


logger = logging.getLogger(__name__)


def geocode_counselors(counselors, **kwargs):
    """Fill in missing latitude/longitude data for housing counselors."""
    return ZipCodeBasedCounselorGeocoder(**kwargs).geocode(counselors)


class ZipCodeBasedCounselorGeocoder:
    """Fill in missing latitude/longitude data using zipcode locations.

    This "geocoder" just takes a housing counselor zipcode and uses it to set
    its latitude/longitude coordinates, if not already set.

    The zipcodes object passed to the constructor must be a dictionary with
    5-digit zipcode string lookup and keys of float (latitude, longitude).
    """

    def __init__(self, zipcodes):
        self.zipcodes = zipcodes

    def geocode(self, counselors):
        return list(
            map(
                self.geocode_counselor,
                filter(
                    self.filter_zipcodes, map(lambda c: dict(c), counselors)
                ),
            )
        )

    def filter_zipcodes(self, counselor):
        zipcode = counselor["zipcd"][:5]

        if zipcode not in self.zipcodes:
            logger.warning(f"{zipcode} not in zipcodes")
            return False

        return True

    def geocode_counselor(self, counselor):
        lat_lng_keys = ("agc_ADDR_LATITUDE", "agc_ADDR_LONGITUDE")
        if all(counselor.get(k) for k in lat_lng_keys):
            return counselor

        zipcode = counselor["zipcd"][:5]
        logger.warning("need to geocode counselor with zipcode %s", zipcode)

        coordinates = self.zipcodes[zipcode]
        counselor.update(zip(lat_lng_keys, coordinates))

        return counselor


class BulkZipCodeGeocoder:
    """Generate latitude/longitude pairs for all possible zipcodes.

    Uses an external Mapbox geocoder (license key required) to lookup location
    for all possible 5-digit zipcodes.
    """

    def __init__(self):
        self.access_token = settings.MAPBOX_ACCESS_TOKEN
        self.mapbox_bulk_geocode_chunk_size = 50

    def geocode_zipcodes(self, start=None):
        """Returns iterator of lat/lng coordinates for all possible zipcodes.

        Provide the optional start parameter to begin geocoding at a particular
        zipcode.

        Data is returned as (zipcode, (latitude, longitude)) where the
        coordinates are floats in degrees.
        """
        return self.chunk_geocode_zipcodes(
            self.generate_possible_zipcodes(start=start),
            chunk_size=self.mapbox_bulk_geocode_chunk_size,
        )

    def chunk_geocode_zipcodes(self, zipcodes, chunk_size):
        """Geocodes a set of zipcodes, a chunk at a time.

        Takes an iterable list of string zipcodes and generates a series of
        (zipcode, coordinates) pairs for each zipcode that can be successfully
        geocoded. Coordinates are returned as a tuple of float (latitude,
        longitude) in degrees.
        """
        for chunk in self.chunker(zipcodes, chunk_size):
            yield from self.mapbox_geocode_zipcodes(chunk)

    @staticmethod
    def chunker(it, n):
        """Splits an iterator up into chunks that have at most n elements."""
        it = iter(it)
        while True:
            chunk = tuple(itertools.islice(it, n))

            if not chunk:
                return

            yield chunk

    @staticmethod
    def generate_possible_zipcodes(start=0):
        for n in range(start, 100000):
            yield f"{n:05d}"

    def mapbox_geocode_zipcodes(self, zipcodes):
        """Geocode an iterable list of string zipcodes using Mapbox.

        Returns only those zipcodes that can be successfully geocoded as a list
        of (zipcode, coordinates) tuples, where coordinates are float
        (latitude, longitude) in degrees.
        """
        url = self.mapbox_geocode_url(*zipcodes)
        logger.debug("making request to %s", url)

        request_start_time = time.time()
        rate_limit_timeout = 10 * 60

        while True:
            time_now = time.time()
            if time_now - request_start_time > rate_limit_timeout:
                raise RuntimeError(
                    f"rate limit timeout {rate_limit_timeout} exceeded"
                )

            response = requests.get(url)

            # Handle rate limiting
            if response.status_code == 429:
                logger.info(
                    "rate limited, url %s, headers: %s", url, response.headers
                )

                sleep_for = 10
                logger.info("sleeping for %s seconds", sleep_for)
                time.sleep(sleep_for)
                continue

            response.raise_for_status()
            result = response.json()
            break

        # Mapbox API returns a single dict for a single query or a list for
        # a bulk query of multiple zipcodes at once.
        if isinstance(result, dict):
            result = [result]

        for item in response.json():
            zipcode = item["query"][0]

            if not item["features"]:
                logger.debug("could not geocode %s", zipcode)
                continue

            feature = item["features"][0]
            if feature.get("place_type") != ["postcode"]:
                logger.warning("zipcode %s geocoded to non-postcode", zipcode)
                continue

            geometry = feature.get("geometry")
            if geometry.get("type") != "Point":
                logger.warning("zipcode %s geocoded to non-point", zipcode)
                continue

            longitude, latitude = geometry["coordinates"]
            logger.debug("geocoded %s to %s, %s", zipcode, latitude, longitude)

            yield zipcode, (latitude, longitude)

    def mapbox_geocode_url(self, *zipcodes):
        # Country codes now refer to the US and all major territories. See
        # https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements
        return (
            "https://api.mapbox.com"
            "/geocoding/v5/mapbox.places-permanent/{zipcodes}.json"
            "?country=us,pr,mp,as,gu,vi&types=postcode&autocomplete=false&limit=1"
            "&access_token={access_token}"
        ).format(zipcodes=";".join(zipcodes), access_token=self.access_token)


class GeocodedZipCodeCsv:
    """Helper class for storage of geocoded zipcode data in a CSV file.

    Each line in the file is: zipcode,latitude_degrees,longitude_degrees
    """

    DELIMITER = ","

    @classmethod
    def read(cls, filename):
        """Returns dictionary of zipcode, (latitude, longitude) pairs."""
        logger.info("Reading zipcodes from %s", filename)
        with open(filename) as f:
            reader = csv.reader(f, delimiter=cls.DELIMITER)
            zipcodes = dict(
                (zipcode, (float(latitude), float(longitude)))
                for zipcode, latitude, longitude in reader
            )

        logger.info("Loaded %d zipcodes", len(zipcodes))
        return zipcodes

    @classmethod
    def write(cls, f, data):
        """Writes series of zipcode, (latitude, longitude) pairs to file."""
        logger.info("Writing zipcodes to %s", f.name)
        count = 0

        writer = csv.writer(f, delimiter=cls.DELIMITER)
        for zipcode, (latitude, longitude) in data:
            writer.writerow([zipcode, latitude, longitude])
            count += 1

        logger.info("Wrote %d zipcodes to file", count)


class GazetteerZipCodeFile:
    """Helper class for loading of zipcode data from Census Gazetteer files.

    See https://www.census.gov/geo/maps-data/data/gazetteer2016.html
    """

    DELIMITER = "\t"

    @classmethod
    def read(cls, filename):
        """Returns dictionary of zipcode, (latitude, longitude) pairs."""
        logger.info("Reading zipcodes from %s", filename)
        with open(filename) as f:
            reader = csv.reader(f, delimiter=cls.DELIMITER)
            next(reader)

            zipcodes = dict(
                (row[0], (float(row[5].strip()), float(row[6].strip())))
                for row in reader
            )

        logger.info("Loaded %d zipcodes", len(zipcodes))
        return zipcodes
