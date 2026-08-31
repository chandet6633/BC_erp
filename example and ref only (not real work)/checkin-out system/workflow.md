# Bancha HR System - Workflow & Reference

This document outlines the architecture, development workflows, and deployment procedures for the Bancha HR System.

## Project Overview

The system consists of two main parts:
1.  **Frontend**: Static HTML/CSS/JS files hosted on Netlify (or similar).
2.  **Backend**: Google Apps Script (GAS) exposing a Web App API, interacting with Google Sheets and Telegram.

### Tech Stack
-   **Frontend**: HTML5, Vanilla CSS (with CSS variables), Vanilla JavaScript.
-   **Backend**: Google Apps Script (.gs).
-   **Database**: Google Sheets.
-   **Notifications**: Telegram Bot API.

## Directory Structure

```
/
├── Google script/          # Backend code
│   ├── attendance api.gs   # Main API logic (Attendance, Leave, Stats)
│   └── config.gs           # Configuration (Sheet IDs, Telegram Tokens)
├── attendance.html         # Check-in/out Interface
├── leave.html              # Leave Request Interface
├── history.html            # User History Interface
├── index.html              # Main Dashboard (Ranking, Stats)
└── images/                 # Static assets
```

## Workflows

### 1. Frontend Development

The frontend relies on the Google Apps Script Web App being published.
-   **Local Development**: You can open `index.html` or other files directly in your browser.
-   **API Connection**: The frontend connects to the backend via `const API` URL defined in the scripts. Ensure this URL is up-to-date with the deployed GAS Web App URL.

### 2. Backend Development (Google Apps Script)

The backend logic resides in `Google script/`.
-   **Editing**: Changes made to `.gs` files locally must be effectively synchronized with the Google Apps Script editor.
-   **Configuration**: `config.gs` contains sensitive/environment-specific variables:
    -   `SHEET_ID`: The Google Sheet ID acting as the database.
    -   `TELEGRAM_TOKEN`: Bot token for notifications.
    -   `TELEGRAM_CHAT`: Mapping of Department names to Chat IDs and Thread IDs.

### 3. Deployment

#### Backend (Google Apps Script)
1.  Copy the contents of `attendance api.gs` and `config.gs` to the Google Apps Script project.
2.  **Deploy as Web App**:
    -   Click **Deploy** > **New deployment**.
    -   Select **Web app**.
    -   **Execute as**: `Me` (your account).
    -   **Who has access**: `Anyone` (allows frontend to call it without auth headers).
3.  **Update Config**: If you redeploy and get a new URL (usually stays same if using "Manage deployments" > "Edit" > "New version"), update `const API` in all HTML files.

#### Frontend
1.  Deploy the root directory to your static hosting provider (e.g., Netlify, Vercel).
2.  Ensure `images/` folder is included.

### 4. Adding a New Department
1.  **Google Sheets**: Add the department name to the `Namelist` sheet in the Google Sheet.
2.  **Config**: Update `TELEGRAM_CHAT` in `config.gs` with the new department's Telegram Chat ID and Topic ID (Thread ID).
3.  **Deploy**: Redeploy the Google Apps Script to apply changes.

## API Reference

The GAS Web App accepts `GET` and `POST` requests with an `action` parameter.

| Action | Method | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `getTopPerformers` | GET | Get monthly top performers | `limit` (default 5) |
| `getDeptRanking` | GET | Get department attendance rankings | None |
| `getDepartments` | GET | Get list of departments | None (Cached) |
| `handleLog` | POST | Log Check-in/Check-out | `department`, `name`, `type` (IN/OUT), `lat`, `lon` |
| `handleLeave` | POST | Submit Leave Request | `department`, `fullName`, `startDate`, `endDate`, `leaveType` |

## Key Features
-   **Geo-fencing**: `findStore()` checks if user `lat/lon` is within radius of a store defined in `Stores` sheet.
-   **Gamification**: Leaderboards and scores based on punctuality (+10 on time, -5 late).
-   **Notifications**: Automated Telegram messages for daily summaries and leave requests.
