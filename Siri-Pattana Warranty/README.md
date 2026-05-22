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
