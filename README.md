EcoGuardian

AI-Powered Smart Waste Management & Environmental Monitoring Platform

EcoGuardian is a Ghana-focused digital platform designed to connect citizens, government authorities, waste collectors, recycling centers, and communities to create a smarter, more coordinated approach to waste management.

The platform combines citizen reporting, AI-assisted waste analysis, digital dispatch, collector coordination, environmental rewards, and community engagement to help turn environmental reports into real-world action.

The Problem
Waste management remains a major environmental challenge in many communities.

Some of the key challenges include:

- Illegal dumping and littering
- Waste hotspots that may remain unnoticed or unresolved
- Difficulty reporting environmental problems
- Limited coordination between citizens, authorities, and waste collectors
- Lack of real-time visibility into waste collection activities
- Limited incentives for citizens to participate in environmental action
- Communication barriers for people who may prefer voice-based reporting

A waste report should not end with simply submitting a complaint.

There needs to be a clear path from:

Report → Action → Collection → Completion

 Our Solution

EcoGuardian creates a connected digital ecosystem that brings citizens, authorities, and waste collectors together.

The platform allows citizens to report environmental issues, use AI-assisted waste scanning, provide location information, and track the progress of their reports.

Authorities can review reports, manage environmental cases, and dispatch collection assignments.

Waste collectors can receive assignments, accept jobs, update collection progress, and complete assigned tasks.

This creates a more transparent and coordinated environmental response system.



 How EcoGuardian Works

 TSET: https://ecoguardian.ai.studio
Citizen Reports Waste
        ↓
AI-Assisted Waste Analysis
        ↓
Report Stored Digitally
        ↓
Authority Reviews Report
        ↓
Collection Assignment Created
        ↓
Collector Accepts Assignment
        ↓
Waste Is Collected
        ↓
Status Is Updated
        ↓
Citizen Receives Progress / Reward

Key Features

Citizen Reporting

Citizens can report environmental and waste-related problems using the EcoGuardian platform.

Reports can include:

Waste descriptions
Photos
Location information
Report status tracking

AI Waste Scanner

EcoGuardian includes an AI-assisted waste scanning feature that helps analyze uploaded images and identify waste categories.

This can support:

Faster understanding of reported waste
Better categorization
Smarter environmental monitoring
Improved prioritization of reports

Voice Reporting

EcoGuardian is designed to make environmental reporting more accessible.

The voice reporting feature allows users who may have difficulty typing to submit information through voice.

The platform is designed with the potential to support Ghanaian languages and local communication preferences.

Government / Admin Dashboard

The administrative dashboard provides tools for managing environmental reports and coordinating collection activities.

Administrators can:

View reports
Review environmental complaints
Monitor report statuses
Assign collection tasks
Manage environmental activities
Monitor platform data

Collector Dashboard

Waste collectors receive digital assignments through their dashboard.

Collectors can:

View assigned jobs
Accept collection assignments
Update job progress
Mark tasks as completed

This helps create a clearer connection between environmental reports and actual collection activities.

EcoPoints & Rewards

EcoGuardian encourages citizen participation through environmental rewards.

Citizens can be encouraged to actively participate in:

Reporting environmental problems
Responsible waste practices
Recycling activities
Community environmental initiatives

Recycling Centers

The platform can help connect users with recycling-related resources and recycling centers.

This encourages responsible disposal and supports the development of a circular economy.

Notifications

Users can receive important updates about:

Reports
Assignments
Collection progress
Announcements
Environmental activities

Community & Announcements

EcoGuardian provides community engagement features that can support:

Environmental awareness
Community campaigns
Public announcements
Sustainability education
🇬🇭 Built for Ghana

EcoGuardian is designed with Ghanaian communities in mind.

The platform focuses on:

Ghana-based environmental challenges
Local community participation
Accessible digital reporting
Voice-based interaction
Potential support for Ghanaian languages
Collaboration between citizens, authorities, and waste collectors

Our goal is to build technology that is not only innovative but also relevant to the communities it serves.

Potential Economic Impact

EcoGuardian is designed to go beyond waste reporting.

As the platform grows, it has the potential to support employment and economic opportunities within the environmental sector.

Potential opportunities include:

Waste collection jobs
Recycling activities
Environmental services
Collection logistics
Recycling center partnerships
Technology and platform support roles

By connecting waste reports with collection assignments, EcoGuardian can help create a more organized demand system for waste collection services.

Potential Impact Metrics

EcoGuardian can measure its environmental and social impact through indicators such as:

Number of waste reports submitted
Number of reports resolved
Average response time
Number of completed collections
Amount of waste directed toward recycling
Number of active citizens
Number of active collectors
Number of environmental campaigns
Citizen participation through EcoPoints

Technology Stack

EcoGuardian is built using modern web technologies and cloud services.

Frontend
React
TypeScript
Vite
Modern responsive UI
Backend & Cloud
Firebase Authentication
Cloud Firestore
Firebase Storage
Firebase services
AI
AI-assisted waste image analysis
Voice-based interaction and recognition
Development
Google AI Studio
GitHub
Security

EcoGuardian uses Firebase Authentication and Firestore security rules to manage access to platform data.

The platform is designed around role-based experiences for different stakeholders, including:

Citizens
Waste Collectors
Administrators / Authorities

Security rules help control access to data and prevent unauthorized operations.

Vision

Our vision is to build a cleaner and smarter Ghana where:

Citizens can easily participate in environmental protection.
Waste problems can be reported quickly.
Authorities have better visibility into environmental challenges.
Waste collectors receive clear and trackable assignments.
Recycling is encouraged.
Environmental participation creates economic opportunities.

Our Mission

To turn environmental problems into coordinated action through technology, community participation, and intelligent waste management.

Future Development

Future versions of EcoGuardian could include:

Advanced AI waste classification
Real-time waste hotspot mapping
Expanded Ghanaian language voice support
Smart waste collection route optimization
Integration with more recycling centers
Advanced environmental analytics
Partnerships with local governments
Partnerships with waste management companies
Expanded EcoPoints reward ecosystem
Mobile applications for Android and iOS


PROJECT LINKS

**GITHUB REPOSITORY

https://github.com/Ayisha987Issaka/EcoGuardian?utm_source=chatgpt.com
**lIVE DEMO**
https://ecoguardian.ai.studio

---

EcoGuard Ghana Website (merged satellite monitoring view)
==========

This repository also contains the full **EcoGuard Ghana** satellite-monitoring
web app (previously its own React + Vite project), merged in so both products
live in one codebase:

- **EcoGuardian portal** — the citizen / collector / admin waste-management
  platform described above (default view).
- **EcoGuard Ghana website** — the public satellite-monitoring dashboard with a
  live map (Esri World Imagery + NASA GIBS daily MODIS mosaics), before/after
  change detection (EOX Sentinel-2 mosaics), an alert centre with a demo
  field-verification flow, and an Earth Engine bring-your-own-account gate.

View switching
--------------
- Open the site, then click **Satellite Website** in the top navigation bar, or
  visit the URL with the hash `#/web` (for example `https://host/#/web`).
- The web app's menu includes a **Citizen Portal** link to switch back.
- The chosen view is driven by the URL hash, so either view can be deep-linked.

Demo API (merged backend)
-------------------------
`server.ts` (Express) powers both products on one port:

- Portal API: `/api/auth/*`, `/api/reports`, `/api/notifications`,
  `/api/rewards`, `/api/communities`, `/api/recycling_centers`,
  `/api/collector_assignments`, `/api/ai-chat`, `/api/analyze-image`, …
- Web-app API: `/api/health`, `/api/alerts`, `/api/agencies`,
  `/api/monitoring/summary`, `POST /api/alerts/:id/verify`.

All data persists to `database.json` (collections auto-upgrade on first read if
missing, so existing files keep working). The demo alert `status` persists
across server restarts.

PWA
---
- `public/manifest.webmanifest`, icons (`icon-192.png`, `icon-512.png`,
  `icon-180.png`) and `public/sw.js` make the app installable.
- The service worker is registered **only in production builds**
  (`import.meta.env.PROD`). Bump the `CACHE` name in `sw.js` when releasing
  new builds so old caches are purged.

Run locally
-----------
```
npm install
npm run dev        # http://localhost:3000 (Vite + Express, one port)
```

Firebase
--------
The portal uses optional Firebase (Auth + Firestore + Storage) when the
`VITE_FIREBASE_*` env vars are configured; without them it runs fully on the
local Express API. The web app likewise falls back to the demo API when
Firebase is not configured. Google Earth Engine is always bring-your-own-account
(each user stores their own Client ID in browser localStorage).

Sources
-------
- Oda River: Abugre et al. (2025) published research.
- Apamprama Forest Reserve: Mantey & Otoo (UMaT) UAV/Google Earth assessment.
- Tano Offin, Upper Wassaw, custom: prototype estimates from real Sentinel-2
  annual mosaics (vegetation + bare-soil proxies) — indicative, not field-validated.
- Imagery: EOX Sentinel-2 cloudless mosaics (contains modified Copernicus
  Sentinel data); Esri World Imagery; NASA EOSDIS GIBS (MODIS Terra).
