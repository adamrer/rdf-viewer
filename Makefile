.PHONY: build docker

# build for a static web server to /dist folder
build:
	npm ci
	npm run build


# build a docker image
docker:
	docker build -t rdf-viewer .

