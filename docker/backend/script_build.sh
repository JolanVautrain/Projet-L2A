# !/bin/bash

# comme le contexte et le Dockerfile ne sont pas au même endroit
# il faut lui préciser le chemin du Dockerfile avec -f
# il faut lui donner le contexte du build ici ../../api
# -t permet de nommer l'image mon-backend
docker build -f ./Dockerfile -t mon-backend ../../api