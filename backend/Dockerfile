FROM gradle:8.5-jdk21-alpine AS builder

WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src

RUN gradle build -x test --no-daemon

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -g 1000 pim && adduser -u 1000 -G pim -D pim

COPY --from=builder /app/build/libs/*.jar app.jar

RUN chown -R pim:pim /app

USER pim

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
