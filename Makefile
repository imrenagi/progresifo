.PHONY: install dev test lint build verify

install:
	npm install

dev:
	npm run dev

test:
	npm test

lint:
	npm run lint

build:
	npm run build

verify: test lint build
