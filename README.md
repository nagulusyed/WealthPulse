# 💰 WealthPulse — Personal Finance Tracker

A beautiful, feature-rich personal finance application built with vanilla web technologies and packaged as an **Android app** using Capacitor. Track income, expenses, set budgets, and visualize your financial health — all data stays private on your device.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Android App (Capacitor)](#android-app-capacitor)
- [Application Architecture](#application-architecture)
- [Design System](#design-system)
- [Data Storage](#data-storage)
- [Categories](#categories)
- [Screenshots](#screenshots)
- [Browser Compatibility](#browser-compatibility)
- [Performance](#performance)
- [Future Enhancements](#future-enhancements)
- [License](#license)

---

## Overview

WealthPulse is a client-side personal finance management application that helps users track their income and expenses, visualize spending patterns, and manage monthly budgets. It runs entirely in the browser with no backend server, database, or user accounts required — all data is persisted locally using the Web Storage API.

---

## Features

### 📊 Dashboard
- **Summary Cards** — Net balance, total income, total expenses, and savings rate at a glance
- **Month-over-Month Trend** — Compares current month balance against the previous month
- **Spending by Category** — Interactive doughnut chart showing expense distribution
- **Income vs Expenses** — 6-month bar chart tracking financial trends over time
- **Recent Transactions** — Quick view of the 5 most recent transactions

### 💸 Transaction Management
- **Add Transactions** — Log income or expenses with description, amount, category, date, and notes
- **Edit Transactions** — Click any transaction to modify its details
- **Delete Transactions** — Remove transactions with a confirmation dialog
- **Type Toggle** — Switch between income and expense modes with dynamic category loading
- **Search** — Real-time text search across transaction descriptions and category names
- **Filter** — Filter by All, Income, or Expenses with tabbed navigation

### 🎯 Budget Tracking
- **Per-Category Budgets** — Set monthly spending limits for each expense category
- **Progress Bars** — Color-coded visual indicators (green/amber/red) based on spending percentage
- **Month Navigation** — Browse budgets across different months
- **Default Budgets** — Pre-configured budget limits for all categories on first launch
- **Inline Editing** — Click "Edit limit" to adjust any category budget

### 📅 Month Navigation
### 🤝 Groups & Splits (New!)
- **Group Expense Management** — Create groups and track shared expenses with friends or family
- **Flexible Split Methods** — Split expenses equally, by exact amount, or by percentage
- **Dashboard Widgets** — Real-time "My Groups" and "Pending Settlements" cards on the main dashboard
- **Smart Group Selector** — Easily switch groups or add expenses to any group directly from the dashboard

### 🛡️ Privacy & Security
- **Privacy Toggle** — Global eye-toggle button to blur/hide sensitive financial data instantly
- **Persistent Privacy Mode** — Privacy preference is saved and restored automatically
- **PIN Lock Screen** — Secure 4-digit PIN authentication with SHA-256 hashing
- **PIN Recovery** — Security question-based recovery system for forgotten PINs

### 📱 Premium Mobile Experience
- **Interactive FAB Menu** — Multi-action Floating Action Button for quick entry of transactions and expenses
- **Native Navigation** — Intelligent back-button handling (closes modals/menus before navigating/exiting)
- **Mobile-Optimized UI** — Scrollable overlays, touch-friendly dropdowns, and responsive glassmorphism design
- **Android App** — Fully packaged Android application via Capacitor (`WealthPulse_v2.apk`)

- Navigate between months on both Dashboard and Budgets views
- All calculations and charts update dynamically based on the selected month

### 📱 Responsive Design
- Collapsible sidebar with hamburger menu on mobile
- Adaptive grid layouts (4-column → 2-column → 1-column)
- Touch-friendly interface with appropriately sized tap targets
- Overlay backdrop when sidebar is open on mobile

---

## Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|---|---|---|
| **HTML5** | - | Semantic document structure, forms, accessibility attributes (ARIA) |
| **CSS3** | - | Complete design system with custom properties, grid/flexbox layouts, animations |
| **JavaScript (ES6+)** | - | Application logic, DOM manipulation, event handling, state management |
| **Chart.js** | 4.4.4 | Data visualization (doughnut and bar charts) via CDN |

### External Dependencies

| Dependency | Source | Purpose |
|---|---|---|
| **Chart.js** | `cdn.jsdelivr.net` | Renders the spending category doughnut chart and 6-month trend bar chart |
| **Inter Font** | `fonts.googleapis.com` | Modern, clean typography throughout the application |

> **No build tools, frameworks, or package managers required.** The app runs directly from static files.

### APIs & Browser Features Used

| API / Feature | Usage |
|---|---|
| **Web Storage API** (`localStorage`) | Persists transactions and budget data across browser sessions |
| **DOM API** | Dynamic element creation, event delegation, class toggling |
| **Date API** | Month navigation, date formatting, transaction date handling |
| **CSS Custom Properties** | Design token system with 50+ variables for theming |
| **CSS Grid & Flexbox** | Responsive card layouts, sidebar, form grids |
| **CSS Animations** | View transitions, modal entrances, card hover effects, task animations |
| **CSS `backdrop-filter`** | Glassmorphism blur effects on cards and overlays |
| **SVG (inline)** | All icons rendered as inline SVGs — zero icon library dependencies |

---

## Project Structure

```
finance-app/
│
├── index.html                # Main HTML document (15 KB)
├── styles.css                # Complete CSS design system (20 KB)
├── app.js                    # Application logic (18 KB)
├── README.md                 # This documentation file
│
├── capacitor.config.json     # Capacitor configuration (Android theming)
├── package.json              # npm scripts & dependencies
├── package-lock.json         # Dependency lock file
│
├── www/                      # Web assets (copied for Capacitor)
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── android/                  # Native Android project (auto-generated)
│   ├── app/
│   │   └── src/main/
│   │       ├── assets/public/ # Synced web assets
│   │       ├── java/          # Native Android code
│   │       ├── res/           # Icons, splash screens, themes
│   │       └── AndroidManifest.xml
│   ├── build.gradle
│   ├── gradle/
│   ├── gradlew / gradlew.bat
│   └── settings.gradle
│
└── node_modules/             # npm packages
```

**Web app size: ~53 KB** (HTML + CSS + JS) — lightweight enough to load instantly.

---

## Getting Started

### Prerequisites
- **Node.js** (v16+) and **npm** — required for Capacitor
- A modern web browser (Chrome, Firefox, Safari, Edge) — for web version
- **Android Studio** — required only for building the Android APK

### Option 1: Run as Web App
```bash
# Using the npm script
npm run serve

# Or directly
npx http-server www -p 8090 -c-1
```
Then open **http://localhost:8090** in your browser.

### Option 2: Build as Android App
See the [Android App (Capacitor)](#android-app-capacitor) section below.

---

## Android App (Capacitor)

The app is wrapped as a native Android application using **Capacitor** by Ionic. Your existing HTML/CSS/JS runs inside a native Android WebView with access to native device APIs.

### What is Capacitor?

[Capacitor](https://capacitorjs.com/) is a cross-platform native runtime that makes it easy to build web apps that run natively on iOS, Android, and the Web. Unlike Cordova, Capacitor provides a modern, forward-looking approach with first-class support for PWAs.

### Android Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Capacitor Core** | ^8.3.1 | Bridge between web app and native Android |
| **Capacitor CLI** | ^8.3.1 | Command-line tools for build, sync, and open |
| **@capacitor/android** | ^8.3.1 | Native Android project template and runtime |
| **@capacitor/status-bar** | ^8.0.2 | Controls Android status bar color and style |
| **@capacitor/splash-screen** | ^8.0.1 | Native splash screen on app launch |
| **Gradle** | (bundled) | Android build system |
| **Android SDK** | API 22+ (min) | Target Android 5.1 Lollipop and above |

### Capacitor Configuration

The `capacitor.config.json` defines the Android shell behavior:

```json
{
  "appId": "com.wealthpulse.app",
  "appName": "WealthPulse",
  "webDir": "www",
  "backgroundColor": "#0a0a12",
  "android": {
    "backgroundColor": "#0a0a12",
    "allowMixedContent": true,
    "overScrollMode": "never"
  },
  "plugins": {
    "StatusBar": {
      "backgroundColor": "#0a0a12",
      "style": "LIGHT"
    },
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#0a0a12",
      "showSpinner": false,
      "launchAutoHide": true
    }
  }
}
```

| Setting | Value | Purpose |
|---|---|---|
| `appId` | `com.wealthpulse.app` | Unique Android package identifier |
| `appName` | `WealthPulse` | App name shown on home screen |
| `webDir` | `www` | Folder containing web assets to bundle |
| `backgroundColor` | `#0a0a12` | Native background color (matches dark theme) |
| `overScrollMode` | `never` | Disables Android rubber-band scroll effect |
| `StatusBar.style` | `LIGHT` | Light text on dark status bar |
| `SplashScreen.launchShowDuration` | `2000` | Splash screen visible for 2 seconds |

### Building the APK

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Sync Web Assets to Android
```bash
npm run build
```
This copies files from `www/` into `android/app/src/main/assets/public/`.

#### Step 3: Install Android Studio
Download and install from: https://developer.android.com/studio

During setup, ensure you install:
- Android SDK (API 33+)
- Android SDK Build-Tools
- Android Emulator (optional, for testing without a phone)

#### Step 4: Open in Android Studio
```bash
npm run open:android
```

#### Step 5: Build the APK
In Android Studio:
1. Wait for **Gradle sync** to complete (first time takes 2–5 minutes)
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. The debug APK will be generated at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

#### Step 6: Install on Your Phone
- **USB:** Connect phone (enable USB debugging) → click **Run ▶** in Android Studio
- **Manual:** Transfer `app-debug.apk` to your phone → open it → install

### NPM Scripts Reference

| Command | What It Does |
|---|---|
| `npm run serve` | Starts web server at localhost:8090 |
| `npm run build` | Copies web files + syncs to Android project |
| `npm run sync` | Syncs web assets and plugins to Android |
| `npm run copy` | Copies web assets only (no plugin sync) |
| `npm run open:android` | Opens the project in Android Studio |

### Development Workflow

```
┌─────────────────────────────────────────────────┐
│  Edit web files (index.html, styles.css, app.js) │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  npm run build  │  ← Syncs to Android
              └────────┬────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │  Run ▶ in Android     │  ← Deploys to phone
           │  Studio               │     or emulator
           └───────────────────────┘
```

> **Important:** Always run `npm run build` after editing web files. Changes to `index.html`, `styles.css`, or `app.js` in the root are **not** automatically synced — you must also update the copies in `www/` and then sync.

### Android Troubleshooting

| Issue | Solution |
|---|---|
| Gradle sync fails | Ensure Android SDK and build tools are installed via SDK Manager |
| `JAVA_HOME` not set | Install JDK 17+ and set the environment variable |
| App shows blank screen | Run `npm run build` to sync latest web files |
| Charts not loading | Ensure internet access (Chart.js loads from CDN) |
| Status bar wrong color | Clean build: Build → Clean Project → Rebuild |
| APK too large | This is normal (~10-15 MB for debug, ~5 MB for release) |
| Can't install on phone | Enable "Install from unknown sources" in phone settings |

### Releasing to Google Play Store

To create a signed release APK for the Play Store:

1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Create a new keystore (or use existing)
3. Select **release** build variant
4. The signed APK will be at `android/app/release/app-release.apk`
5. Upload to [Google Play Console](https://play.google.com/console)

---

## Application Architecture

### Design Pattern
The application follows an **IIFE (Immediately Invoked Function Expression)** pattern to encapsulate all logic and prevent global namespace pollution:

```javascript
(function () {
    'use strict';
    // All application code lives here
    // No globals are exposed
})();
```

### State Management
Application state is managed through simple JavaScript variables:

```javascript
let transactions = [];      // Array of transaction objects
let budgets = {};            // Object mapping category ID → budget limit
let currentView = 'dashboard';
let selectedMonth = new Date();
let txnFilter = 'all';
let searchQuery = '';
let editingTxnId = null;
```

State changes trigger re-renders of the relevant view via the `refreshView()` function.

### Data Flow

```
User Action → Event Handler → Update State → Save to localStorage → Re-render View
```

### Transaction Object Schema

```javascript
{
    id: "m1abc23",           // Unique ID (timestamp base36 + random)
    type: "expense",         // "income" | "expense"
    description: "Groceries", // User-provided description (max 100 chars)
    amount: 2500,            // Numeric amount in ₹
    category: "food",        // Category ID from CATEGORIES constant
    date: "2026-04-23",      // ISO date string (YYYY-MM-DD)
    notes: "Weekly shopping"  // Optional notes (max 150 chars)
}
```

### Rendering Strategy
- **No virtual DOM** — Direct DOM manipulation with `innerHTML` for list rendering
- **Event delegation** — Click handlers on list items via event listeners on each element
- **XSS protection** — All user input is escaped via `textContent` before rendering
- **Animation** — CSS `@keyframes` with staggered `animationDelay` for list items

---

## Design System

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--bg-body` | `#0a0a12` | Page background |
| `--bg-card` | `rgba(22, 20, 40, 0.75)` | Card backgrounds with transparency |
| `--accent-indigo` | `#6366f1` | Primary accent, buttons, active states |
| `--accent-violet` | `#8b5cf6` | Secondary accent |
| `--accent-purple` | `#a78bfa` | Highlights, gradient endpoints |
| `--accent-green` | `#34d399` | Income indicators, safe budget status |
| `--accent-red` | `#f87171` | Expense indicators, danger budget status |
| `--accent-amber` | `#fbbf24` | Warning budget status, savings alerts |
| `--text-primary` | `#edeaf5` | Main body text |
| `--text-secondary` | `#9d97b5` | Labels, descriptions |
| `--text-muted` | `#5e5880` | Placeholder text, disabled states |

### Typography
- **Font Family:** Inter (Google Fonts), with system font fallbacks
- **Weights Used:** 300 (Light), 400 (Regular), 500 (Medium), 600 (Semi-bold), 700 (Bold), 800 (Extra-bold)
- **Scale:** 0.75rem → 1.75rem across components

### Spacing & Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `10px` | Buttons, inputs, small cards |
| `--radius-md` | `14px` | Transaction items, form elements |
| `--radius-lg` | `20px` | Summary cards, chart cards, modals |
| `--radius-full` | `50px` | Pills, filter tabs, search bar |

### Responsive Breakpoints

| Breakpoint | Layout Changes |
|---|---|
| `> 1024px` | Full sidebar, 4-column summary grid, 2-column chart layout |
| `768px – 1024px` | Full sidebar, 2-column summary grid, single chart column |
| `< 768px` | Collapsible sidebar, mobile header, 2-column summary grid |
| `< 480px` | Single-column everything, compact cards |

### Visual Effects
- **Glassmorphism** — `backdrop-filter: blur()` on cards and modals
- **Gradient accents** — Top border indicators on summary cards
- **Animated background** — Subtle radial gradient orbs
- **Micro-animations** — View transitions (`fadeSlideIn`), modal entrance (`modalIn`), staggered list items

---

## Data Storage

### localStorage Keys

| Key | Type | Description |
|---|---|---|
| `wp_transactions` | `JSON Array` | All transaction records |
| `wp_budgets` | `JSON Object` | Budget limits keyed by category ID |
| `wp_pin_hash` | `String` | SHA-256 hash of the user's 4-digit PIN |

### Data Persistence
- Data is saved to `localStorage` after every add, edit, or delete operation
- Data is loaded once on app initialization
- The "Reset Data" button in the sidebar clears all data and reinitializes defaults
- **No data leaves the browser** — fully offline-capable after initial page load

### Storage Limits
- `localStorage` typically provides 5–10 MB per origin
- Each transaction is ~200 bytes, supporting approximately 25,000–50,000 transactions

---

## Categories

### Expense Categories (9)

| Emoji | Category | Color | Default Budget |
|---|---|---|---|
| 🍽️ | Food & Dining | `#f87171` | ₹8,000 |
| 🚗 | Transport | `#60a5fa` | ₹3,000 |
| 🛍️ | Shopping | `#f472b6` | ₹5,000 |
| 💡 | Bills & Utilities | `#fbbf24` | ₹4,000 |
| 🏥 | Health | `#34d399` | ₹2,000 |
| 🎬 | Entertainment | `#a78bfa` | ₹3,000 |
| 📚 | Education | `#22d3ee` | ₹2,000 |
| 🏠 | Rent & Housing | `#fb923c` | ₹15,000 |
| 📦 | Other | `#94a3b8` | ₹2,000 |

### Income Categories (5)

| Emoji | Category | Color |
|---|---|---|
| 💰 | Salary | `#34d399` |
| 💻 | Freelance | `#60a5fa` |
| 📈 | Investment | `#fbbf24` |
| 🎁 | Gift | `#f472b6` |
| ✨ | Other | `#a78bfa` |

---

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---|---|---|
| Chrome | 80+ | Full support |
| Firefox | 78+ | Full support |
| Safari | 14+ | Full support |
| Edge | 80+ | Full support (Chromium-based) |
| Opera | 67+ | Full support |

### Required Browser Features
- `localStorage` — data persistence
- `CSS Grid` & `Flexbox` — layout system
- `CSS Custom Properties` — design tokens
- `backdrop-filter` — glassmorphism effects (graceful degradation)
- `ES6+ JavaScript` — arrow functions, template literals, destructuring

---

## Performance

| Metric | Value |
|---|---|
| **Total file size** | ~53 KB (HTML + CSS + JS) |
| **External assets** | Chart.js (~200 KB gzipped via CDN), Inter font (~100 KB) |
| **First paint** | < 500ms on broadband |
| **No build step** | Zero compilation, bundling, or transpilation |
| **No framework overhead** | Vanilla JS with direct DOM manipulation |
| **Render strategy** | Full re-render per view change (performant for typical data volumes) |

---

## Future Enhancements

- [x] **Export/Import** — Download data as JSON and import from backup files
- [ ] **Recurring Transactions** — Auto-generate monthly bills and salary entries
- [ ] **Multi-Currency** — Support for currencies beyond ₹ (INR)
- [ ] **Dark/Light Theme Toggle** — User-selectable color scheme
- [ ] **Yearly Overview** — Annual summary with month-by-month breakdown
- [ ] **Transaction Tags** — Custom tags for flexible filtering
- [ ] **PWA Support** — Service worker for full offline capability and home screen install
- [x] **PIN Lock** — 4-digit PIN authentication with SHA-256 hashing
- [x] **Android App** — Native Android wrapper via Capacitor
- [ ] **iOS App** — Add iOS platform via Capacitor (`npx cap add ios`)
- [ ] **Push Notifications** — Budget alerts when nearing spending limits
- [ ] **Biometric Lock** — Fingerprint/face unlock for app access on mobile

---

## Changelog

### v2.0.0 — Privacy Toggle, FAB Menu & Real-time Dashboard (2026-04-26)

**New Features:**
- 🛡️ **Privacy Hide Toggle** — Global eye-toggle in header to instantly blur sensitive financial amounts.
- ➕ **Interactive FAB Menu** — Multi-action Floating Action Button with a sleek slide-out menu.
- 🤝 **Dashboard Groups Widget** — Real-time "My Groups" and "Pending Settlements" integrated into the dashboard.
- 🎯 **Smart Group Selection** — Intelligent dropdown in Add Expense modal for on-the-fly group switching.
- 📱 **Native Android Navigation** — Intelligent back-button handling for closing modals and menus.

**UI/UX Improvements:**
- 🎨 **Ultra-Premium Design** — V2 refinements with glass gradients, soft shadows, and smooth transitions.
- 📱 **Mobile Optimizations** — Compact layouts, touch-optimized dropdowns, and fixed modal scrolling for mobile view.
- 🔄 **Real-time Sync** — Dashboard widgets now refresh instantly after adding or editing expenses.

**Technical:**
- 🏗️ **Updated Android Build** — New `WealthPulse_v2.apk` includes all latest features and optimizations.
- 🧹 **Code Cleanup** — Unified modal handling and fixed critical ID duplication bugs.


### v1.2.0 — Security Question Recovery (2026-04-26)

**New Features:**
- 🛡️ **Security Question PIN Recovery** — Users can now recover their forgotten PIN.
  - Users select a security question and provide an answer during PIN setup.
  - "Forgot PIN?" link on the lock screen allows users to answer their security question.
  - Security answers are hashed using SHA-256 for privacy and security.
  - Seamlessly resets the PIN if answered correctly.

**UI/UX Improvements:**
- 🎨 Updated the lock screen UI with premium glassmorphism input fields and buttons to match the rest of the application.

### v1.1.0 — PIN Lock & Navigation Fix (2026-04-26)

**New Features:**
- 🔒 **PIN Lock Screen** — App now requires a 4-digit PIN to access
  - First-time users create a PIN, returning users enter their PIN
  - PIN stored as SHA-256 hash (not plain text) in localStorage
  - Animated purple dot indicators with fill/shake/success states
  - Full numeric keypad with backspace support
  - Keyboard input support (desktop)
- 🔑 **Change PIN** — New sidebar button to update PIN (requires current PIN first)
- 🔙 **Back Button Fix** — Android hardware back button now navigates to Dashboard instead of closing the app
  - Uses History API (`pushState`/`popState`) for proper navigation stack
  - Dashboard set as the home/root state

**Files Changed:**
- `index.html` — Added PIN lock screen overlay + Change PIN sidebar button
- `styles.css` — Added 160+ lines of lock screen styles (keypad, dots, animations)
- `app.js` — Added PIN system (~200 lines) + History API navigation
- `package.json` — Version bump to 1.1.0

### v1.0.0 — Initial Release (2026-04-24)

- 📊 Dashboard with summary cards, charts, and recent transactions
- 💸 Transaction management (add, edit, delete, search, filter)
- 🎯 Budget tracking with per-category limits and progress bars
- 📱 Responsive design with mobile sidebar
- 📤 Export/Import data as JSON backup
- 📱 Android app via Capacitor

---

## License

This project is open source and available for personal and educational use.

---

<p align="center">
  Built with ❤️ using vanilla HTML, CSS, JavaScript & Capacitor
</p>
