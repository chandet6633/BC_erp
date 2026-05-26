# Siri Pattana Warranty

Multi-brand warranty web app for Glassify, iDash, and KENSHO Beam.

The app follows the physical-card flow from the UV Gard warranty reference:

- Staff generates pending physical warranty cards in Admin.
- Each card has a serial and QR scan URL like `/v?id=<uniqueId>`.
- Customer scans the physical card for the first time and registers product, vehicle, install center, and contact details.
- Later scans of the same card show warranty details instead of the registration form.
- Staff can view pending and registered records in the admin area.
- The browser never receives the NocoDB API token.

## Run Locally

```powershell
node server.js
```

Open:

```text
http://localhost:3000
```

Without NocoDB env vars, the app stores development data in `data/warranties.json`.

## Docker

```powershell
docker compose up -d --build
```

## Production Docker Deploy

On the server, clone or pull this repo, then create the production env file once:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set at minimum:

```text
PORT=3001
APP_BASE_URL=https://your-public-domain.example
SESSION_SECRET=<strong-random-secret>
NOCODB_URL=<your-nocodb-url>
NOCODB_TOKEN=<your-nocodb-token>
```

Generate a strong session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Deploy after each `git pull`:

```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
curl -fsS http://localhost:3001/api/health
```

Or use the tracked deploy helper:

```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

Production notes:

- `APP_BASE_URL` is used when generating QR scan links, so set it to the public HTTPS URL customers will open.
- `PORT` is the host port Cloudflare Tunnel should point to, for example `http://localhost:3001`.
- `SESSION_SECRET` is required when `NODE_ENV=production`; the container exits if it is missing or left as `change-me`.
- Warranty JSON fallback data is stored in the Docker volume `siri-pattana-warranty_warranty-data`. NocoDB is recommended for production.
- `.env`, `.env.production`, and local `data/*.json` are intentionally ignored by git.

## NocoDB Setup

Create one table for warranty records. Suggested fields:

```text
serial
uniqueId
brandId
brandName
product
variant
warrantyYears
customerName
phone
email
vehicleBrand
vehicleModel
plateNo
province
chassisNo
installCenter
installDate
expiryDate
status
notes
createdAt
updatedAt
```

Set these environment variables:

```text
NOCODB_URL=http://your-nocodb-host:8080
NOCODB_TOKEN=your-api-token
NOCODB_WARRANTIES_TABLE=your_table_id_or_name
```

## Routes

```text
/                  Brand selection
/glassify          Glassify warranty page
/idash             iDash warranty page
/kensho            KENSHO Beam warranty page
/v?id=...          QR scan router: pending goes to register, registered goes to details
/register?id=...   One-time customer registration for pending physical card
/details?id=...    Registered warranty detail view
/admin             Staff dashboard
/api/warranties    Backend warranty API
```
