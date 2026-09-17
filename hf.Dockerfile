# Hugging Face Docker-SDK Space image (published as ./Dockerfile).
#
# The Space tree is minimal (README.md, Dockerfile, app.py, requirements.txt,
# src/): assemble it with scripts/publish_space.sh, never by hand. The
# repo-root Dockerfile is the Docker Hub image and is NOT used here (it
# needs DHI registry enrollment, unavailable to the Spaces builder).
#
# Runtime contract: listen on 7860 (HF routes here; app.py honors $PORT with
# a 7860 default and binds 0.0.0.0). Caches (ephemeris, fonts, geocoding,
# renders) live under /tmp and $HOME: both writable for uid 1000.
FROM python:3.14-slim

RUN useradd -m -u 1000 user

WORKDIR /app

COPY --chown=user requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user app.py app.py
COPY --chown=user src/ src/

USER user

ENV HOME=/home/user
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["python", "app.py"]
