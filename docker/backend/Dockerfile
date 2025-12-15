FROM python:3-alpine

# Install pip requirements
COPY ./requirements.txt .
RUN python -m pip install -r requirements.txt

WORKDIR /app
COPY . /app

CMD ["python", "app.py"]
