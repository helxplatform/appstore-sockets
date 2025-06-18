FROM python:3.9.23-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /usr/src/app
COPY . /usr/src/app

RUN pip install -r requirements.txt

CMD ["python", "-u", "monitor.py"]
