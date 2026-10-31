# API-only Gauge runner; no Chromium or browser sandbox bypass is needed.
FROM node:26.13.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/*
RUN set -eu; case "$(dpkg --print-architecture)" in \
      amd64) gauge_arch=x86_64; gauge_sha=673b70751d1c6e5e6eee0c233ef7eb5760a1f7eb61007742c688e62b58297b43 ;; \
      arm64) gauge_arch=arm64; gauge_sha=5fa84641048583b00794fa757c22a9e9ba12007232a97d38722a22267d9d5db7 ;; \
      *) exit 1 ;; esac; \
    curl -fsSL "https://github.com/getgauge/gauge/releases/download/v1.6.42/gauge-1.6.42-linux.${gauge_arch}.zip" -o /tmp/gauge.zip; \
    echo "${gauge_sha}  /tmp/gauge.zip" | sha256sum -c -; \
    unzip /tmp/gauge.zip -d /tmp/gauge; install /tmp/gauge/gauge /usr/local/bin/gauge; \
    rm -rf /tmp/gauge /tmp/gauge.zip
RUN groupadd -r gauge && useradd -m -r -g gauge gauge
WORKDIR /gauge
COPY --chown=gauge:gauge . .
USER gauge
RUN npm ci --ignore-scripts \
    && gauge install js --version 5.0.8 \
    && gauge install html-report --version 4.4.8 \
    && gauge install xml-report --version 1.0.1 \
    && gauge config check_updates false
ENTRYPOINT ["npm", "test"]
