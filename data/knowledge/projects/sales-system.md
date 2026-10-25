---
title: Sales system
type: project
role: Author
technologies: [Node.js, TypeScript, Express, PostgreSQL, Drizzle ORM, Docker, Jest, Zod, Winston, JWT]
url: https://github.com/elik56a/sales-system
language: en
visibility: public
---

# Sales system

## What the sales system is

The sales system is an event-driven order processing backend that Eliyahu built in November 2025. It takes orders through a REST API and moves each order through its delivery lifecycle (Pending Shipment, then Shipped, then Delivered) with the reliability patterns that distributed systems need: a transactional outbox, idempotency, a circuit breaker, retries with exponential backoff and a dead-letter queue.

## Architecture of the sales system

The sales system is a modular monolith with event-driven components. A sales API creates orders. An outbox publisher sends events from the database to a message queue. A delivery service processes orders and simulates shipping and delivery. A status consumer updates each order's status from the delivery events. The message queue is a mock that behaves like Kafka, and the inventory service is a mock with a configurable failure rate. Eliyahu documented each of these choices and how the system would split into separate services, each with its own database, in production.

## Reliability patterns in the sales system

In the sales system, an order and its outbox event are written in the same database transaction, so an event is never lost and never sent for an order that was not saved. Several outbox workers can run at once, because each one claims events with SELECT FOR UPDATE SKIP LOCKED. A failed event is retried up to five times with exponential backoff, then moved to a dead-letter queue. Idempotency keys on the API and on messages stop a repeated request from creating a duplicate order. A circuit breaker protects calls to the inventory service: after five failures it opens and tries again after 30 seconds. SQL guards allow status changes only forward, so an order cannot go back from Delivered to Shipped.

## Operations and testing of the sales system

The sales system runs in Docker with PostgreSQL. The API checks JWT tokens, validates input with Zod and has rate limiting and a request queue that controls traffic under load. Every request gets a correlation ID that appears in structured JSON logs written with Winston, and the system exposes a health check and a metrics endpoint. A load-test script simulates peak hours with 5,000 order requests to show the circuit breaker opening and recovering. The order service, the outbox publisher and the status consumer are covered by Jest tests.
