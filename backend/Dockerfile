FROM python:3.11-slim

ARG REQUIREMENTS=prod
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# system deps for building some python packages (psycopg2, Pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    libjpeg-dev \
    zlib1g-dev \
 && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker cache
COPY requirements.txt ./requirements.txt
COPY requirements.prod.txt ./requirements.prod.txt

RUN pip install --upgrade pip setuptools wheel

RUN if [ "$REQUIREMENTS" = "prod" ]; then \
      pip install --no-cache-dir -r requirements.prod.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

# copy project files
COPY . ./

# copy entrypoint and give permission BEFORE switching user
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# create non-root user
RUN addgroup --gid 1000 app && adduser --disabled-password --gecos '' --uid 1000 --gid 1000 app || true
RUN chown -R app:app /app /entrypoint.sh

USER app

EXPOSE 8000

CMD ["/entrypoint.sh"]
