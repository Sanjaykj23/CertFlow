# Run CertFlow on your PC (Windows)

Needs: Java 17+, Node 18+ (check with `java -version`, `node -v`). No Docker, no database install.

1. Open `.env` in Notepad. Fill `SMTP_USERNAME`, `SMTP_FROM` (your Gmail) and `SMTP_PASSWORD`
   (a Gmail App Password: https://myaccount.google.com/apppasswords, needs 2-Step Verification).
2. Double-click `start-certflow.bat`. First start downloads packages (a few minutes).
3. Open http://localhost:5173, create an account (a 6-digit code is emailed to you), then:
   Events > create event > Template builder > design > Save > Import CSV (see `sample-participants.csv`) > launch batch.
   Each participant gets their certificate PDF by email from your Gmail account.

Gmail limit: about 500 emails a day for a normal account. Test with your own address first.
Data lives in `data/` and generated PDFs in `certflow-api/storage-data/`.
