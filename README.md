# CertFlow — Distributed Certificate Generation & Verification Platform

[![Java](https://img.shields.io/badge/Java-17%2B-ED8B00?style=flat&logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-6DB33F?style=flat&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=flat&logo=postgresql&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**CertFlow** is an enterprise-grade, full-stack certificate infrastructure platform built for colleges, universities, hackathons, and corporate organizers. It enables teams to design templates, validate participant CSVs, generate high-resolution PDF certificates with cryptographic QR verification stamps, deliver them directly via SMTP email, and audit delivery states in real-time.

---

## Highlights & Features

- **2-Step Registration & Password Reset**: Secure 6-digit email OTP verification via Gmail SMTP before account activation and secure password reset workflow.
- **Dynamic Visual Template Designer**: Drag-and-drop or coordinate-based text placeholders (`{{participant_name}}`, `{{event_name}}`, `{{certificate_type}}`, `{{date}}`, `{{certificate_number}}`), custom typography, background upload, and live PDF rendering preview.
- **Bulk CSV Import Engine**: Validates headers, verifies RFC 5322 email syntax, filters in-batch duplicates, and provides real-time row previews before issuing batches.
- **Automated Asynchronous Processing**: Renders personalized vector-quality PDFs using Apache PDFBox 3.x, generates unique 256-bit verification tokens with ZXing QR codes, and uploads to S3/MinIO or local storage.
- **Email Delivery & Failure Auditing**: Delivers emails with attached PDF certificates via Gmail SMTP or Mailpit, captures SMTP error codes (e.g. invalid addresses, 550 bounces, timeouts), and records every attempt in `email_delivery_attempts`.
- **Live Batch Progress Tracking**: Real-time polling dashboard displaying completion percentages, PDFs generated, emails sent, failed deliveries, and individual participant worker logs.
- **Public Instant Verification**: Cryptographically secure URL and QR code verification portal with sub-millisecond Redis caching and instant cache invalidation upon revocation or replacement.
- **Dual Execution Modes**:
  - **Zero-Docker Mode**: Runs on any workstation using Supabase Cloud PostgreSQL / embedded database and direct SMTP delivery.
  - **Distributed Production Mode**: Microservice event pipeline powered by Kafka, Transactional Outbox pattern, Redis, and MinIO S3 object storage.

---

## System Architecture

```
                       Web Browser / Mobile Client
                                   |
                                   v
             +-------------------------------------------+
             | React 18 + TypeScript Dashboard (Port 5173)|
             +-------------------------------------------+
                                   | REST APIs (JWT Auth)
                                   v
             +-------------------------------------------+
             | Spring Boot REST Backend (Port 8081)      |
             |  - Auth, 2FA OTP, Orgs & Events           |
             |  - CSV Validation & Batch Orchestration   |
             |  - PDFBox Engine & QR Code Stamping       |
             |  - SMTP Delivery & Failure Tracking       |
             +-------------------------------------------+
               /              |                        \
              /               |                         \
             v                v                          v
   +------------------+  +-------------------+  +------------------+
   | PostgreSQL DB    |  | S3 / Local Storage|  | SMTP Mail Server |
   | (Supabase/Local) |  | (PDFs & Templates)|  | (Gmail / Mailpit)|
   +------------------+  +-------------------+  +------------------+
```

---

## Project Structure

```
CertFlow/
├── certflow-api/              # Spring Boot REST API (Auth, Batches, Templates, Certificates)
├── certflow-common/           # Shared DTOs, domain models, PDFBox renderer, QR utilities
├── certflow-frontend/         # React 18 + TypeScript + Vite + Tailwind CSS dashboard
├── certflow-worker-pdf/       # Distributed PDF generation worker (Kafka consumer)
├── certflow-worker-email/     # Distributed email delivery worker (Kafka consumer + DLQ)
├── monitoring/                # Prometheus & Grafana dashboard configurations
├── docker-compose.yml         # Full infrastructure stack (Postgres/CockroachDB, Kafka, Redis, MinIO, Mailpit)
├── run-backend-local.ps1      # Zero-Docker backend launcher (PowerShell)
├── run-frontend-local.ps1     # Frontend launcher (PowerShell)
├── pom.xml                    # Root Maven multi-module configuration
└── sample-participants.csv    # Sample CSV for testing batch issuance
```

---

## Quickstart Guide

### Prerequisites
- **Java**: JDK 17 or higher
- **Node.js**: v18+ and npm
- **Database**: Supabase PostgreSQL account (or local PostgreSQL / Docker)
- **SMTP**: Gmail account with App Password (or local Mailpit)

---

### Step 1: Clone and Configure Environment

```bash
git clone https://github.com/Sanjaykj23/CertFlow.git
cd CertFlow
cp .env.example .env
```

Edit `.env` and set your database and email credentials:

```ini
# Supabase PostgreSQL Database
DATABASE_URL=jdbc:postgresql://db.<your-project>.supabase.co:5432/postgres?sslmode=require
DATABASE_USER=postgres
DATABASE_PASSWORD=<your-supabase-db-password>
DATABASE_DRIVER=org.postgresql.Driver

# Gmail SMTP Email Delivery
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=<your-gmail-address>@gmail.com
SMTP_PASSWORD=<your-16-character-app-password>
SMTP_FROM=<your-gmail-address>@gmail.com
SMTP_FROM_NAME=CertFlow Platform
```

---

### Step 2: Build the Modules

```bash
# Windows
.\mvnw.cmd clean install -DskipTests

# Linux / macOS
./mvnw clean install -DskipTests
```

---

### Step 3: Run the Backend

```bash
# Windows (PowerShell)
.\run-backend-local.ps1

# Or via Maven directly
.\mvnw.cmd spring-boot:run -pl certflow-api -Dspring-boot.run.profiles=local
```
*API starts on `http://localhost:8081`*

---

### Step 4: Run the Frontend

```bash
cd certflow-frontend
npm install
npm run dev
```
*Frontend opens at `http://localhost:5173`*

---

## Running in Full Docker Mode (Optional)

To run the complete distributed setup with Kafka, Redis, CockroachDB, MinIO, and Mailpit:

```bash
docker compose up -d
```

| Service | Port | Description |
|---|---|---|
| **Frontend UI** | `http://localhost:5173` | CertFlow Web Application |
| **Backend REST API** | `http://localhost:8081` | Spring Boot API |
| **Mailpit (Local Email)** | `http://localhost:8025` | Web-based email inbox preview |
| **MinIO Console** | `http://localhost:9001` | S3 Storage browser (`minioadmin` / `minioadmin`) |
| **CockroachDB Admin** | `http://localhost:8080` | Distributed database management console |
| **Grafana Dashboards** | `http://localhost:3001` | System metrics & monitoring |

---

## Verification & Workflow Walkthrough

1. **Register**: Navigate to `http://localhost:5173/register`, enter your name and email, and receive a 6-digit OTP in your inbox. Enter the code to activate your organization.
2. **Create Event**: Create an event (e.g., *National AI Summit 2026*). A responsive default certificate template is created automatically.
3. **Customize Template**: Customize typography, organization seals, and placement in the Visual Template Designer.
4. **Upload CSV**: Upload `sample-participants.csv` to validate participant names, emails, and certificate awards.
5. **Launch Batch**: Watch the live processing bar generate PDFs, issue verification tokens, and dispatch certificate emails.
6. **Verify Online**: Scan the QR code on any certificate or visit `http://localhost:5173/verify/<token>` to view the public verification certificate.
7. **Failure Resilience**: If an invalid recipient email is provided, the system flags the delivery attempt as `FAILED`, displays the exact SMTP reason in the dashboard, and allows one-click resending after updating details.

---

## License

This project is licensed under the Apache 2.0 License.
