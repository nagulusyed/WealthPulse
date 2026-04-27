# WealthPulse - Notifications & Settings Update Plan

## 🎯 Features to Implement

### 1. 🔔 Notifications System
**Core Components:**
- Notification storage structure
- Badge counter in sidebar/mobile nav
- Notification center modal
- Auto-generation logic for various triggers

**Notification Types:**
- ✅ Budget Alerts (80% warning, exceeded)
- ✅ Settlement Reminders (pending dues every 3-7 days)
- ✅ Savings Milestones (monthly achievements)
- ✅ Spending Anomalies (unusual spending detection)
- ✅ Monthly Summary (income vs expense snapshot)

**Actions:**
- View notification
- Settle (for settlement reminders)
- Remind later (snooze)
- Mark as read
- Clear all

### 2. ⚙️ Settings Page
**Sections:**

**Security**
- PIN management (change PIN)
- Biometric toggle (placeholder for future)
- Auto-lock timer (immediate, 1min, 5min, never)

**Preferences**
- Theme selector (light, dark, auto)
- Privacy mode toggle
- Default view on app launch
- Currency symbol
- Date format

**Data Management**
- Export data (JSON backup)
- Import data (restore from backup)
- Clear all data
- Reset app to defaults

**Notifications**
- Toggle budget alerts
- Budget alert threshold (70%, 80%, 90%)
- Settlement reminder frequency (3, 5, 7 days)
- Monthly summary toggle
- Anomaly detection toggle

**Groups**
- Auto-sync toggle
- Default split method (equal, amount, percent)
- Show settled transactions

**About**
- App version
- Privacy policy
- Help & FAQ
- Send feedback
- Rate app

### 3. Implementation Files

**Files to Modify:**
1. `index.html` - Add settings view, notification center
2. `app.js` - Add notification logic, settings functions
3. `styles.css` - Add notification and settings styles

**New Storage Keys:**
```javascript
NOTIFICATIONS_KEY = 'wp_notifications';
SETTINGS_KEY = 'wp_settings';
LAST_SUMMARY_KEY = 'wp_last_summary';
```

**Default Settings Object:**
```javascript
{
  security: {
    pinEnabled: true,
    biometric: false,
    autoLock: '1min'
  },
  preferences: {
    theme: 'auto',
    privacyMode: false,
    defaultView: 'dashboard',
    currency: '₹',
    dateFormat: 'DD/MM/YYYY'
  },
  notifications: {
    budgetAlerts: true,
    budgetThreshold: 80,
    settlementReminders: true,
    reminderFrequency: 5,
    monthlySummary: true,
    anomalyDetection: true
  },
  groups: {
    autoSync: true,
    defaultSplitMethod: 'equal',
    showSettled: true
  }
}
```

## 📝 Priority Implementation Order

### Phase 1: Must-Have (Current Sprint)
1. ✅ Settings page structure
2. ✅ Notification storage system
3. ✅ Settings data persistence
4. ✅ Badge counter display
5. ✅ Basic notification center UI
6. ✅ PIN change functionality
7. ✅ Theme switcher

### Phase 2: Next Sprint
1. Budget alerts (80%, exceeded)
2. Settlement reminders
3. Notification actions (View/Settle/Snooze)
4. Monthly summary generator
5. Data export/import

### Phase 3: Later
1. Spending anomaly detection
2. Savings milestones
3. Advanced analytics for insights
4. Cloud backup integration

## 🔧 Technical Details

### Notification Object Structure
```javascript
{
  id: 'notif_timestamp',
  type: 'budget_alert' | 'settlement' | 'milestone' | 'anomaly' | 'summary',
  title: 'Budget Alert',
  message: 'Food & Dining budget is at 85%',
  timestamp: Date.now(),
  read: false,
  category: 'food', // for budget alerts
  actionable: true,
  actions: ['view', 'settle', 'remind_later'],
  data: { /* contextual data */ }
}
```

### Budget Alert Logic
```javascript
// Check on every transaction addition
function checkBudgetAlerts(categoryId, currentSpent) {
  const budget = budgets[categoryId];
  if (!budget) return;
  
  const percentage = (currentSpent / budget) * 100;
  const threshold = settings.notifications.budgetThreshold;
  
  if (percentage >= threshold && percentage < 100) {
    createNotification({
      type: 'budget_alert',
      title: '⚠️ Budget Warning',
      message: `${categoryName} is at ${percentage.toFixed(0)}% of budget`,
      category: categoryId,
      actionable: false
    });
  } else if (percentage >= 100) {
    createNotification({
      type: 'budget_alert',
      title: '🚨 Budget Exceeded',
      message: `${categoryName} budget exceeded by ${(percentage - 100).toFixed(0)}%`,
      category: categoryId,
      actionable: false
    });
  }
}
```

### Settlement Reminder Logic
```javascript
// Run daily check (can use setInterval or on app launch)
function checkSettlementReminders() {
  const frequency = settings.notifications.reminderFrequency;
  const balances = calculateGroupBalances();
  
  balances.forEach(balance => {
    if (balance.youOwe > 0) {
      const lastReminder = localStorage.getItem(`last_reminder_${balance.personId}`);
      const daysSince = lastReminder ? 
        (Date.now() - parseInt(lastReminder)) / (1000 * 60 * 60 * 24) : 
        frequency + 1;
      
      if (daysSince >= frequency) {
        createNotification({
          type: 'settlement',
          title: '💸 Settlement Due',
          message: `You owe ₹${balance.youOwe.toFixed(2)} to ${balance.name}`,
          actionable: true,
          actions: ['settle', 'remind_later'],
          data: { personId: balance.personId, amount: balance.youOwe }
        });
        localStorage.setItem(`last_reminder_${balance.personId}`, Date.now().toString());
      }
    }
  });
}
```

## 🎨 UI Components to Add

### 1. Notification Badge
```html
<!-- In sidebar navigation -->
<button class="nav-item" data-view="notifications">
  <svg>...</svg>
  Notifications
  <span class="notif-badge" id="notif-badge">3</span>
</button>
```

### 2. Notification Center
```html
<div class="modal" id="modal-notifications">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Notifications</h2>
      <button onclick="markAllRead()">Mark all read</button>
    </div>
    <div class="notif-list" id="notif-list">
      <!-- Notification items -->
    </div>
  </div>
</div>
```

### 3. Settings Page Structure
```html
<main class="main-content" id="view-settings">
  <header class="page-header">
    <h1>Settings</h1>
  </header>
  
  <div class="settings-container">
    <section class="settings-section">
      <h2>🔒 Security</h2>
      <!-- Security options -->
    </section>
    
    <section class="settings-section">
      <h2>⚙️ Preferences</h2>
      <!-- Preference options -->
    </section>
    
    <!-- More sections... -->
  </div>
</main>
```

---

This plan outlines all the features and implementation details for the Notifications and Settings update to WealthPulse.
