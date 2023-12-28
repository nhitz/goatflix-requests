## Getting Started

Forked from https://github.com/sct/overseerr

https://docs.overseerr.dev/getting-started/installation

## Installation:

In a project directory, create a docker-compose.yml:
```
version: "3.8"

services:
  goatflix-requests:
    image: liquidgoat/goatflix-requests:latest
    container_name: goatflix-requests
    environment:
      - LOG_LEVEL=info
      - TZ=America/Los_Angeles
    ports:
      - 5055:5055
    volumes:
      - ./config/:/app/config
    restart: unless-stopped
```
Start the service:
```
docker compose up --detach
```

## Building from scratch:

Get commit tag:

```
git rev-parse --short HEAD
```

Build image using the commit tag as --build-arg

```
docker build --platform linux/amd64 --build-arg COMMIT_TAG=6c2aff11 -t repo/image:tag .
```

## API Documentation

Auto-generated api docs are hosted at https://api-docs.overseerr.dev

You can also access the API documentation from your local Overseerr install at http://localhost:5055/api-docs
