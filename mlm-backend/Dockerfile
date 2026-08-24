# ---- Build aşaması ----
FROM golang:1.26-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -p 2 -o /out/api ./cmd/api \
 && CGO_ENABLED=0 go build -p 2 -o /out/cron ./cmd/cron \
 && CGO_ENABLED=0 go build -p 2 -o /out/createadmin ./cmd/createadmin \
 && CGO_ENABLED=0 go build -p 2 -o /out/migrate ./cmd/migrate

# ---- Çalışma aşaması ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/api /app/api
COPY --from=build /out/cron /app/cron
COPY --from=build /out/createadmin /app/createadmin
COPY --from=build /out/migrate /app/migrate
COPY --from=build /app/migrations /app/migrations
RUN mkdir -p /app/uploads
EXPOSE 8080
CMD ["/app/api"]
