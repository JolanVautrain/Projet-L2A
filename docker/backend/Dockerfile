FROM python:3-alpine

# Argument pour choisir l'environnement (dev ou prod)
ARG BUILD_ENV=dev

# Install pip requirements selon l'environnement
COPY ./requirements-${BUILD_ENV}.txt ./requirements.txt
RUN python -m pip install -r requirements.txt

WORKDIR /app
COPY . /app

CMD ["python", "app.py"]
