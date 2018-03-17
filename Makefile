all: build

build:
	./node_modules/.bin/grunt build

test:
	./node_modules/.bin/grunt test

watch_build:
	./node_modules/.bin/grunt watch:build

watch_test:
	./node_modules/.bin/grunt watch:test
