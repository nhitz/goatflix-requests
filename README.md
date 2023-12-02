## Getting Started

forked from https://github.com/sct/overseerr

https://docs.overseerr.dev/getting-started/installation

Get commit tag:
```
git rev-parse --short HEAD
```
Build image using the commit tag as a --build-arg
```
docker build --platform linux/amd64 --build-arg COMMIT_TAG=6c2aff11 -t repo/image:tag .
```

## API Documentation

Our documentation is built on every commit and hosted at https://api-docs.overseerr.dev

You can also access the API documentation from your local Overseerr install at http://localhost:5055/api-docs
