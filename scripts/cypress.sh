#!/bin/sh

if [ "$1" = "fast" ]; then
    ./scripts/cypress-fast-specs.sh && ./node_modules/.bin/cypress run
elif [ "$1" = "open" ]; then
    ./node_modules/.bin/cypress open
else
    ./node_modules/.bin/cypress run $@
fi
