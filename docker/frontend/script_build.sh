#!/bin/bash

# comme le contexte et le Dockerfile ne sont pas au même endroit
# il faut lui préciser le chemin du Dockerfile avec -f
# il faut lui donner le contexte du build ici ../../frontend
# -t permet de nommer l'image mon-frontend
docker build -f ./Dockerfile -t mon-frontend ../../frontend

