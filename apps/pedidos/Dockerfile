# Pedidos (Spring Boot) - build multi-stage

FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/target/pedidos-*.jar app.jar

EXPOSE 4003
CMD ["java", "-jar", "app.jar"]
