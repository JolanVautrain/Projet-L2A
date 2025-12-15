#!/bin/bash

#
docker run --name frontend-dev -p 5173:5173 -v "$(pwd)/../../frontend":/app -v /app/node_modules mon-frontend