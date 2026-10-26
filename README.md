# CertFlow

**Certificate generation and verification for events.** Design a certificate, upload a list of participants, and CertFlow creates a PDF for each person with a QR code, emails it from your own Gmail account, and gives anyone a public page to check that the certificate is real.

Built with Java 17, Spring Boot 3.3, Apache PDFBox, React 18, TypeScript, Vite and Tailwind CSS.

---

## What it does

- **Sign-up with email codes.** A 6-digit code is emailed to confirm your address. Password reset works the same way.
- **Organizations and roles.** Owner, Admin, Operator and Viewer, with an audit log of what happened.
- **Template editor.** A Canva-style editor: drag, resize and rotate text, shapes, lines, images and QR codes. It has layers, undo/redo, 45 fonts, colors and gradients, backgrounds, 8 starter designs, and fields like `{{participant_name}}` that fill in per person.
- **CSV import.** Checks headers and email addresses, skips duplicates and previews rows before you send.
- **Batch sending.** Makes a PDF per participant with a unique verification QR code, emails it as an attachment, and shows live progress. A failed email shows the exact reason and can be resent.
- **Public verification.** Anyone can scan the QR code or open `/verify/<token>` to confirm a certificate. Revoked certificates stop verifying.

---

## Quick start (Windows, no Docker)

You need **Java 17 or newer** and **Node.js 18 or newer**. Check with `java -version` and `node -v`.

1. **Create your settings file.** Copy `.env.example` to `.env` in the project folder.
2. **Add your Gmail.** Open `.env` in Notepad and set `SMTP_USERNAME`, `SMTP_FROM` (your Gmail address) and `SMTP_PASSWORD` (a Gmail App Password; see below).
3. **Start everything.** Double-click `start-certflow.bat`. It opens a backend window and a frontend window, so keep both open. The first start downloads Maven and takes a few minutes. Wait for `Started CertFlowApiApplication` in the backend window.
4. **Open the app** at http://localhost:5173.

The simple setup stores data in a built-in H2 database (`certflow-api/data/`) and PDFs in `certflow-api/storage-data/`. You don't need to install a database, Kafka, Redis or MinIO.

### Get a Gmail App Password

Gmail doesn't accept your normal password for apps.

1. Turn on **2-Step Verification**: https://myaccount.google.com/security
2. Create an **App Password**: https://myaccount.google.com/apppasswords
3. Paste the 16 characters into `SMTP_PASSWORD` in `.env`.

A normal Gmail account can send about **500 emails a day**. Certificates are sent from your address, so recipients see you as the sender.

### Try it end to end

1. Create an account. The code arrives by email. If email isn't working, the code is also printed in the backend window as `[DEV / FALLBACK] Verification OTP`.
2. Create an event, then open **Template builder**, design a certificate and save.
3. Upload a CSV with the headers shown in `sample-participants.csv`. **Use your own email address first** to test.
4. Launch the batch and watch the progress. The certificate PDF arrives by email.

---

## Configuration (`.env`)

Every setting has an explanation in [`.env.example`](.env.example). The main ones:

| Setting | What it does |
|---|---|
| `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_DRIVER` | Database. Default: embedded H2. PostgreSQL / Supabase also works. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | Mail server. Default: Gmail on port 587. |
| `SMTP_FROM`, `SMTP_FROM_NAME` | Sender address (same as `SMTP_USERNAME` for Gmail) and display name. |
| `JWT_SECRET` | Secret that signs login tokens. Set a long random value. |
| `APP_BASE_URL`, `PUBLIC_VERIFY_BASE_URL` | Public addresses used in links and QR codes. Change them when you deploy. |

Write each value as `NAME=value`, with no quotes and no comment after it. **`.env` is ignored by git. Never commit it or share it.** Restart the backend after changing it.

---

## Run the parts yourself

```bash
# Backend (API on http://localhost:8081)
./mvnw install -pl certflow-common -am -DskipTests
./mvnw spring-boot:run -pl certflow-api -Dspring-boot.run.profiles=local

# Frontend (http://localhost:5173)
cd certflow-frontend && npm install && npm run dev
```

On Windows, `run-backend-local.bat` and `run-frontend-local.bat` do the same and also load `.env`. Spring doesn't read `.env` by itself, so on macOS/Linux export the variables first (`set -a; source .env; set +a`).

### Demo mode (no backend)

The UI can run entirely in the browser with fake data and a simulated pipeline. Nothing is sent and nothing is saved on a server.

```bash
cd certflow-frontend
VITE_DEMO=true npm run dev    # PowerShell: $env:VITE_DEMO="true"; npm run dev
```

Demo account: `demo@certflow.dev` / `Demo@1234`.

---

## Distributed mode (optional)

For production-style scale there is an event pipeline: Transactional Outbox, Kafka, separate PDF and email workers, a dead-letter queue, Redis caching for verification and S3/MinIO storage. Start the infrastructure with:

```bash
docker compose up -d
```

| Service | URL |
|---|---|
| Mailpit (test inbox) | http://localhost:8025 |
| MinIO console | http://localhost:9001 (`minioadmin` / `minioadmin`) |
| CockroachDB console | http://localhost:8080 |
| Grafana | http://localhost:3001 |

The simple local run skips all of this.

---

## Architecture

```
 Browser (React, port 5173)
        |  REST /api/v1 + JWT
        v
 Spring Boot API (port 8081)
   auth and OTP · organizations · events · templates
   CSV validation · batches · PDF + QR rendering · SMTP delivery
        |                 |                    |
        v                 v                    v
   Database          File storage         Gmail / SMTP
 (H2 or Postgres)  (local or S3/MinIO)
```

```
certflow-api/            Spring Boot REST API
certflow-common/         Shared models, PDF renderer (PDFBox), QR codes, fonts
certflow-frontend/       React + TypeScript + Vite + Tailwind app
certflow-worker-pdf/     PDF worker (distributed mode)
certflow-worker-email/   Email worker (distributed mode)
monitoring/              Prometheus and Grafana config
docker-compose.yml       Infrastructure for distributed mode
sample-participants.csv  Example roster
```

---

## Troubleshooting

| Problem | What to check |
|---|---|
| Sign-up email never arrives | Read the backend window for `Failed to send verification email` and the reason. Check `.env`: no `FILL ME` text left, no quotes, App Password not your normal password, 2-Step Verification on. Restart the backend after any change. Check Spam. |
| `535 Username and Password not accepted` | Wrong App Password, or `SMTP_USERNAME` isn't the account that made it. |
| `http://localhost:5173` won't open | The frontend window must be running and show `Local: http://localhost:5173`. |
| Frontend shows network errors | The backend is still starting, or its window shows an error. Wait for `Started CertFlowApiApplication`. |
| Port 8081 or 5173 already in use | Close the old CertFlow windows and start again. |
| Build fails with a Java error | Use JDK 17 or newer. Delete `~/.m2/wrapper` and retry if the Maven download was interrupted. |
| Want a clean start | Stop the app and delete `certflow-api/data/` (this erases all accounts and events). |

---

## Security notes

- Set your own `JWT_SECRET` before deploying anywhere public.
- Never commit `.env`. If a password was shared in chat or committed by mistake, revoke the App Password and reset the database password.
- The certificate PDF download link is public to anyone who has the certificate ID. Add access control before real-world use.

---

## License

Apache 2.0.
