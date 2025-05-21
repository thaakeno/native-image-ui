# This is a Dockerfile that defines the instructions to build a Docker image for the web application.
# It uses a multi-stage build to create a small final image.

FROM nginx:latest

COPY src/ /usr/share/nginx/html/

EXPOSE 80