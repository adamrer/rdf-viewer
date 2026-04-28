# RDF Viewer

RDF visualisation tool running in browser, expandable with plugins
You can try RDF Viewer [here](https://adamrer.github.io/rdf-viewer/).
Our plugins are available [here](https://adamrer.github.io/rdf-viewer-plugins/).

## Build

You will need `git`, `npm` and `make`.

Clone the repository:

```bash
git clone git@github.com:adamrer/rdf-viewer.git
cd rdf-viewer
```

Build the application:

```bash
make build
```

Build of the application will be in the `/dist` folder.

## Run with Docker

Clone the repository:

```bash
git clone git@github.com:adamrer/rdf-viewer.git
cd rdf-viewer
```

Create the Docker image:

```bash
make docker
```

Run the Docker container:

```bash
docker run -d -p [PORT]:80 rdf-viewer
```

where `[PORT]` is the port number on which the application will be available.
For example for a port `8080` it is going to be:

```bash
docker run -d -p 8080:80 rdf-viewer
```
