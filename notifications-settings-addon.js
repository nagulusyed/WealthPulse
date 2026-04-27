// ============================================================================
// NOTIFICATIONS & SETTINGS SYSTEM FOR WEALTHPULSE
// Add this code to app.js after the existing constants section
// ============================================================================

// ── New Storage Keys ──
const NOTIFICATIONS_KEY = 'wp_notifications';
const SETTINGS_KEY = 'wp_settings';
const LAST_SUMMARY_KEY = 'wp_last_summary';
const LAST_REMINDER_PREFIX = 'wp_last_reminder_';

// ── Default Settings ──
const DEFAULT_SETTINGS = {
    security: {
        pinEnabled: true,
        biometric: false,
        autoLock: '1min' // 'immediate', '1min', '5min', 'never'
    },
    preferences: {
        theme: 'auto', // 'light', 'dark', 'auto'
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
};

// ── State Variables ──
let appSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS));
let notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');

// ── Save Settings ──
function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
}

// ── Save Notifications ──
function saveNotifications() {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    updateNotificationBadge();
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Create a new notification
 */
function createNotification(config) {
    const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: config.type || 'info',
        title: config.title,
        message: config.message,
        timestamp: Date.now(),
        read: false,
        actionable: config.actionable || false,
        actions: config.actions || [],
        data: config.data || {},
        category: config.category || null
    };
    
    notifications.unshift(notification); // Add to beginning
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
        notifications = notifications.slice(0, 50);
    }
    
    saveNotifications();
    return notification;
}

/**
 * Mark notification as read
 */
function markNotificationRead(notifId) {
    const notif = notifications.find(n => n.id === notifId);
    if (notif) {
        notif.read = true;
        saveNotifications();
    }
}

/**
 * Mark all notifications as read
 */
function markAllNotificationsRead() {
    notifications.forEach(n => n.read = true);
    saveNotifications();
    showToast('All notifications marked as read', 'success');
}

/**
 * Delete a notification
 */
function deleteNotification(notifId) {
    notifications = notifications.filter(n => n.id !== notifId);
    saveNotifications();
}

/**
 * Clear all notifications
 */
function clearAllNotifications() {
    confirmAction(
        'Clear all notifications?',
        'This will remove all your notifications.',
        () => {
            notifications = [];
            saveNotifications();
            renderNotificationsList();
            showToast('All notifications cleared', 'success');
        }
    );
}

/**
 * Get unread notification count
 */
function getUnreadCount() {
    return notifications.filter(n => !n.read).length;
}

/**
 * Update notification badge
 */
function updateNotificationBadge() {
    const count = getUnreadCount();
    const badges = document.querySelectorAll('.notif-badge');
    
    badges.forEach(badge => {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

/**
 * Check budget alerts for a category
 */
function checkBudgetAlerts(categoryId, currentSpent) {
    if (!appSettings.notifications.budgetAlerts) return;
    
    const budget = budgets[categoryId];
    if (!budget || budget <= 0) return;
    
    const percentage = (currentSpent / budget) * 100;
    const threshold = appSettings.notifications.budgetThreshold;
    
    const cat = [...CATEGORIES.expense, ...CATEGORIES.income].find(c => c.id === categoryId);
    const categoryName = cat ? cat.name : categoryId;
    
    // Check if we already have a recent alert for this category
    const recentAlert = notifications.find(n => 
        n.type === 'budget_alert' && 
        n.category === categoryId && 
        (Date.now() - n.timestamp) < 24 * 60 * 60 * 1000 // Within last 24 hours
    );
    
    if (recentAlert) return; // Don't spam alerts
    
    if (percentage >= 100) {
        createNotification({
            type: 'budget_alert',
            title: '🚨 Budget Exceeded',
            message: `${categoryName} budget exceeded by ${(percentage - 100).toFixed(0)}%`,
            category: categoryId,
            actionable: false
        });
    } else if (percentage >= threshold) {
        createNotification({
            type: 'budget_alert',
            title: '⚠️ Budget Warning',
            message: `${categoryName} is at ${percentage.toFixed(0)}% of budget`,
            category: categoryId,
            actionable: false
        });
    }
}

/**
 * Check settlement reminders
 */
function checkSettlementReminders() {
    if (!appSettings.notifications.settlementReminders) return;
    
    const frequency = appSettings.notifications.reminderFrequency;
    const balances = calculateGroupBalances();
    
    balances.forEach(balance => {
        if (balance.youOwe > 0) {
            const lastReminderKey = LAST_REMINDER_PREFIX + balance.personId;
            const lastReminder = localStorage.getItem(lastReminderKey);
            const daysSince = lastReminder ? 
                (Date.now() - parseInt(lastReminder)) / (1000 * 60 * 60 * 24) : 
                frequency + 1;
            
            if (daysSince >= frequency) {
                createNotification({
                    type: 'settlement',
                    title: '💸 Settlement Due',
                    message: `You owe ${appSettings.preferences.currency}${balance.youOwe.toFixed(2)} to ${balance.name}`,
                    actionable: true,
                    actions: ['settle', 'remind_later'],
                    data: { personId: balance.personId, amount: balance.youOwe }
                });
                localStorage.setItem(lastReminderKey, Date.now().toString());
            }
        }
    });
}

/**
 * Detect spending anomalies
 */
function detectSpendingAnomalies() {
    if (!appSettings.notifications.anomalyDetection) return;
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get current month spending by category
    const currentSpending = {};
    const filtered = transactions.filter(t => {
        const tDate = new Date(t.date);
        const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        return tMonth === currentMonth && t.type === 'expense';
    });
    
    filtered.forEach(t => {
        if (!currentSpending[t.category]) currentSpending[t.category] = 0;
        currentSpending[t.category] += t.amount;
    });
    
    // Get previous 3 months average
    const avgSpending = {};
    for (let i = 1; i <= 3; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const monthTxns = transactions.filter(t => {
            const tDate = new Date(t.date);
            const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
            return tMonth === month && t.type === 'expense';
        });
        
        monthTxns.forEach(t => {
            if (!avgSpending[t.category]) avgSpending[t.category] = 0;
            avgSpending[t.category] += t.amount;
        });
    }
    
    // Calculate averages
    Object.keys(avgSpending).forEach(cat => {
        avgSpending[cat] = avgSpending[cat] / 3;
    });
    
    // Check for anomalies (50% higher than average)
    Object.keys(currentSpending).forEach(catId => {
        const current = currentSpending[catId];
        const avg = avgSpending[catId] || 0;
        
        if (avg > 0 && current > avg * 1.5) {
            const cat = CATEGORIES.expense.find(c => c.id === catId);
            const categoryName = cat ? cat.name : catId;
            const increase = ((current - avg) / avg * 100).toFixed(0);
            
            // Check if we already have a recent anomaly alert
            const recentAnomaly = notifications.find(n => 
                n.type === 'anomaly' && 
                n.category === catId && 
                (Date.now() - n.timestamp) < 7 * 24 * 60 * 60 * 1000 // Within last week
            );
            
            if (!recentAnomaly) {
                createNotification({
                    type: 'anomaly',
                    title: '📊 Unusual Spending',
                    message: `${categoryName} spending is ${increase}% higher than usual`,
                    category: catId,
                    actionable: false
                });
            }
        }
    });
}

/**
 * Generate monthly summary
 */
function generateMonthlySummary() {
    if (!appSettings.notifications.monthlySummary) return;
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastSummary = localStorage.getItem(LAST_SUMMARY_KEY);
    
    // Only generate once per month
    if (lastSummary === currentMonth) return;
    
    const filtered = transactions.filter(t => {
        const tDate = new Date(t.date);
        const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        return tMonth === currentMonth;
    });
    
    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expense;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(0) : 0;
    
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    
    createNotification({
        type: 'summary',
        title: `📅 ${monthName} Summary`,
        message: `Income: ${appSettings.preferences.currency}${income.toFixed(2)} | Expenses: ${appSettings.preferences.currency}${expense.toFixed(2)} | Savings: ${savingsRate}%`,
        actionable: false,
        data: { income, expense, savings, savingsRate }
    });
    
    localStorage.setItem(LAST_SUMMARY_KEY, currentMonth);
}

/**
 * Check for savings milestones
 */
function checkSavingsMilestones() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const filtered = transactions.filter(t => {
        const tDate = new Date(t.date);
        const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        return tMonth === currentMonth;
    });
    
    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expense;
    const savingsRate = income > 0 ? ((savings / income) * 100) : 0;
    
    const milestones = [
        { threshold: 10000, message: 'Saved ₹10,000+! Great start!' },
        { threshold: 25000, message: 'Saved ₹25,000! Keep it up!' },
        { threshold: 50000, message: 'Saved ₹50,000! Excellent work!' },
        { threshold: 100000, message: 'Saved ₹1 Lakh! Outstanding!' }
    ];
    
    milestones.forEach(milestone => {
        if (savings >= milestone.threshold) {
            const recentMilestone = notifications.find(n => 
                n.type === 'milestone' && 
                n.data.threshold === milestone.threshold &&
                (Date.now() - n.timestamp) < 30 * 24 * 60 * 60 * 1000 // Within last month
            );
            
            if (!recentMilestone) {
                createNotification({
                    type: 'milestone',
                    title: '🎉 Savings Milestone',
                    message: milestone.message,
                    actionable: false,
                    data: { threshold: milestone.threshold, savings }
                });
            }
        }
    });
}

/**
 * Handle notification action (Settle, Remind Later)
 */
function handleNotificationAction(notifId, action) {
    const notif = notifications.find(n => n.id === notifId);
    if (!notif) return;
    
    if (action === 'settle' && notif.type === 'settlement') {
        markNotificationRead(notifId);
        closeModal('modal-notifications');
        openSettleModal(notif.data.personId);
    } else if (action === 'remind_later') {
        markNotificationRead(notifId);
        // Reset reminder timer (3 days from now)
        const lastReminderKey = LAST_REMINDER_PREFIX + notif.data.personId;
        localStorage.setItem(lastReminderKey, (Date.now() - (appSettings.notifications.reminderFrequency - 3) * 24 * 60 * 60 * 1000).toString());
        showToast('Reminder snoozed for 3 days', 'success');
    } else if (action === 'view') {
        markNotificationRead(notifId);
        // Navigate to relevant view based on notification type
        if (notif.type === 'budget_alert' && notif.category) {
            navigate('budgets');
        }
    }
    
    renderNotificationsList();
}

/**
 * Render notifications list
 */
function renderNotificationsList() {
    const container = $('notif-list');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state">📭<p>No notifications yet</p></div>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => {
        const date = new Date(notif.timestamp);
        const timeAgo = formatTimeAgo(date);
        const icon = getNotificationIcon(notif.type);
        
        return `
            <div class="notif-item ${notif.read ? 'read' : ''}" data-id="${notif.id}">
                <div class="notif-icon">${icon}</div>
                <div class="notif-content">
                    <div class="notif-header">
                        <h3 class="notif-title">${notif.title}</h3>
                        <span class="notif-time">${timeAgo}</span>
                    </div>
                    <p class="notif-message">${notif.message}</p>
                    ${notif.actionable && notif.actions.length > 0 ? `
                        <div class="notif-actions">
                            ${notif.actions.map(action => `
                                <button class="notif-action-btn" onclick="handleNotificationAction('${notif.id}', '${action}')">
                                    ${formatActionLabel(action)}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <button class="notif-delete" onclick="deleteNotification('${notif.id}'); renderNotificationsList();" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

function getNotificationIcon(type) {
    const icons = {
        'budget_alert': '⚠️',
        'settlement': '💸',
        'milestone': '🎉',
        'anomaly': '📊',
        'summary': '📅',
        'info': 'ℹ️'
    };
    return icons[type] || '🔔';
}

function formatActionLabel(action) {
    const labels = {
        'settle': 'Settle Now',
        'remind_later': 'Remind Later',
        'view': 'View Details'
    };
    return labels[action] || action;
}

function formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

// ============================================================================
// SETTINGS FUNCTIONS
// ============================================================================

/**
 * Render settings page
 */
function renderSettings() {
    const container = $('settings-container');
    if (!container) return;
    
    container.innerHTML = `
        <!-- Security Section -->
        <section class="settings-section">
            <h2 class="settings-section-title">🔒 Security</h2>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>PIN Protection</h3>
                    <p>Secure your app with a PIN</p>
                </div>
                <label class="toggle">
                    <input type="checkbox" ${appSettings.security.pinEnabled ? 'checked' : ''} 
                           onchange="togglePinEnabled(this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="settings-item settings-item-clickable" onclick="changePinFromSettings()">
                <div class="settings-item-info">
                    <h3>Change PIN</h3>
                    <p>Update your security PIN</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            </div>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Auto-Lock</h3>
                    <p>Lock app after inactivity</p>
                </div>
                <select class="settings-select" onchange="updateAutoLock(this.value)">
                    <option value="immediate" ${appSettings.security.autoLock === 'immediate' ? 'selected' : ''}>Immediately</option>
                    <option value="1min" ${appSettings.security.autoLock === '1min' ? 'selected' : ''}>1 minute</option>
                    <option value="5min" ${appSettings.security.autoLock === '5min' ? 'selected' : ''}>5 minutes</option>
                    <option value="never" ${appSettings.security.autoLock === 'never' ? 'selected' : ''}>Never</option>
                </select>
            </div>
        </section>
        
        <!-- Preferences Section -->
        <section class="settings-section">
            <h2 class="settings-section-title">⚙️ Preferences</h2>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Theme</h3>
                    <p>Choose app appearance</p>
                </div>
                <select class="settings-select" onchange="updateTheme(this.value)">
                    <option value="light" ${appSettings.preferences.theme === 'light' ? 'selected' : ''}>Light</option>
                    <option value="dark" ${appSettings.preferences.theme === 'dark' ? 'selected' : ''}>Dark</option>
                    <option value="auto" ${appSettings.preferences.theme === 'auto' ? 'selected' : ''}>Auto</option>
                </select>
            </div>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Privacy Mode</h3>
                    <p>Hide amounts in overview</p>
                </div>
                <label class="toggle">
                    <input type="checkbox" ${appSettings.preferences.privacyMode ? 'checked' : ''} 
                           onchange="updatePrivacyMode(this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Default View</h3>
                    <p>Starting screen on app launch</p>
                </div>
                <select class="settings-select" onchange="updateDefaultView(this.value)">
                    <option value="dashboard" ${appSettings.preferences.defaultView === 'dashboard' ? 'selected' : ''}>Dashboard</option>
                    <option value="transactions" ${appSettings.preferences.defaultView === 'transactions' ? 'selected' : ''}>Transactions</option>
                    <option value="budgets" ${appSettings.preferences.defaultView === 'budgets' ? 'selected' : ''}>Budgets</option>
                    <option value="groups" ${appSettings.preferences.defaultView === 'groups' ? 'selected' : ''}>Groups</option>
                </select>
            </div>
        </section>
        
        <!-- Notifications Section -->
        <section class="settings-section">
            <h2 class="settings-section-title">🔔 Notifications</h2>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Budget Alerts</h3>
                    <p>Get notified when budget limits are reached</p>
                </div>
                <label class="toggle">
                    <input type="checkbox" ${appSettings.notifications.budgetAlerts ? 'checked' : ''} 
                           onchange="updateBudgetAlerts(this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            ${appSettings.notifications.budgetAlerts ? `
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Alert Threshold</h3>
                    <p>Warning at ${appSettings.notifications.budgetThreshold}% of budget</p>
                </div>
                <select class="settings-select" onchange="updateBudgetThreshold(this.value)">
                    <option value="70" ${appSettings.notifications.budgetThreshold === 70 ? 'selected' : ''}>70%</option>
                    <option value="80" ${appSettings.notifications.budgetThreshold === 80 ? 'selected' : ''}>80%</option>
                    <option value="90" ${appSettings.notifications.budgetThreshold === 90 ? 'selected' : ''}>90%</option>
                </select>
            </div>
            ` : ''}
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Settlement Reminders</h3>
                    <p>Get reminded of pending settlements</p>
                </div>
                <label class="toggle">
                    <input type="checkbox" ${appSettings.notifications.settlementReminders ? 'checked' : ''} 
                           onchange="updateSettlementReminders(this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            ${appSettings.notifications.settlementReminders ? `
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Reminder Frequency</h3>
                    <p>Every ${appSettings.notifications.reminderFrequency} days</p>
                </div>
                <select class="settings-select" onchange="updateReminderFrequency(this.value)">
                    <option value="3" ${appSettings.notifications.reminderFrequency === 3 ? 'selected' : ''}>Every 3 days</option>
                    <option value="5" ${appSettings.notifications.reminderFrequency === 5 ? 'selected' : ''}>Every 5 days</option>
                    <option value="7" ${appSettings.notifications.reminderFrequency === 7 ? 'selected' : ''}>Every 7 days</option>
                </select>
            </div>
            ` : ''}
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Monthly Summary</h3>
                    <p>Monthly income vs expense report</p>
                </div>
                <label class="toggle">
                    <input type="checkbox" ${appSettings.notifications.monthlySummary ? 'checked' : ''} 
                           onchange="updateMonthlySummary(this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Anomaly Detection</h3>
                    <p>Alert on unusual spending patterns</p>
                </div>
                <label class="toggle">
                    <input type="checkbox" ${appSettings.notifications.anomalyDetection ? 'checked' : ''} 
                           onchange="updateAnomalyDetection(this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </section>
        
        <!-- Groups Section -->
        <section class="settings-section">
            <h2 class="settings-section-title">👥 Groups</h2>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Default Split Method</h3>
                    <p>How expenses are divided by default</p>
                </div>
                <select class="settings-select" onchange="updateDefaultSplitMethod(this.value)">
                    <option value="equal" ${appSettings.groups.defaultSplitMethod === 'equal' ? 'selected' : ''}>Equal</option>
                    <option value="amount" ${appSettings.groups.defaultSplitMethod === 'amount' ? 'selected' : ''}>By Amount</option>
                    <option value="percent" ${appSettings.groups.defaultSplitMethod === 'percent' ? 'selected' : ''}>By Percentage</option>
                </select>
            </div>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Show Settled Transactions</h3>
                    <p>Display settled expenses in groups</p>
                </div>
                <label class="toggle">
                    <input type="checkbox" ${appSettings.groups.showSettled ? 'checked' : ''} 
                           onchange="updateShowSettled(this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </section>
        
        <!-- Data Management Section -->
        <section class="settings-section">
            <h2 class="settings-section-title">💾 Data Management</h2>
            
            <div class="settings-item settings-item-clickable" onclick="exportData()">
                <div class="settings-item-info">
                    <h3>Export Data</h3>
                    <p>Download backup of all your data</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
            </div>
            
            <div class="settings-item settings-item-clickable" onclick="importData()">
                <div class="settings-item-info">
                    <h3>Import Data</h3>
                    <p>Restore from backup file</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
            </div>
            
            <div class="settings-item settings-item-clickable settings-danger" onclick="clearAllData()">
                <div class="settings-item-info">
                    <h3>Clear All Data</h3>
                    <p>Delete all transactions and budgets</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </div>
        </section>
        
        <!-- About Section -->
        <section class="settings-section">
            <h2 class="settings-section-title">ℹ️ About</h2>
            
            <div class="settings-item">
                <div class="settings-item-info">
                    <h3>Version</h3>
                    <p>WealthPulse v3.0.0</p>
                </div>
            </div>
            
            <div class="settings-item settings-item-clickable" onclick="showToast('Privacy policy coming soon!', 'info')">
                <div class="settings-item-info">
                    <h3>Privacy Policy</h3>
                    <p>View our privacy policy</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            </div>
            
            <div class="settings-item settings-item-clickable" onclick="showToast('Help center coming soon!', 'info')">
                <div class="settings-item-info">
                    <h3>Help & FAQ</h3>
                    <p>Get help with WealthPulse</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            </div>
            
            <div class="settings-item settings-item-clickable" onclick="showToast('Thank you for your feedback!', 'success')">
                <div class="settings-item-info">
                    <h3>Send Feedback</h3>
                    <p>Help us improve WealthPulse</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            </div>
        </section>
    `;
}

// Settings update functions
function togglePinEnabled(enabled) {
    appSettings.security.pinEnabled = enabled;
    saveSettings();
    showToast(enabled ? 'PIN protection enabled' : 'PIN protection disabled', 'success');
}

function changePinFromSettings() {
    navigate('dashboard');
    setTimeout(() => {
        $('lock-screen').style.display = 'flex';
        $('lock-screen').classList.remove('hidden');
        pinMode = 'change-old';
        pinInput = '';
        updatePinDots();
        setPinSubtitle('Enter current PIN');
        setPinError('');
    }, 300);
}

function updateAutoLock(value) {
    appSettings.security.autoLock = value;
    saveSettings();
    showToast('Auto-lock updated', 'success');
}

function updateTheme(theme) {
    appSettings.preferences.theme = theme;
    saveSettings();
    applyTheme();
    showToast('Theme updated', 'success');
}

function applyTheme() {
    const theme = appSettings.preferences.theme;
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-theme', prefersDark);
    } else {
        document.body.classList.toggle('dark-theme', theme === 'dark');
    }
}

function updatePrivacyMode(enabled) {
    appSettings.preferences.privacyMode = enabled;
    saveSettings();
    if (enabled) {
        togglePrivacy();
    }
    showToast(enabled ? 'Privacy mode enabled' : 'Privacy mode disabled', 'success');
}

function updateDefaultView(view) {
    appSettings.preferences.defaultView = view;
    saveSettings();
    showToast('Default view updated', 'success');
}

function updateBudgetAlerts(enabled) {
    appSettings.notifications.budgetAlerts = enabled;
    saveSettings();
    renderSettings(); // Re-render to show/hide threshold option
    showToast(enabled ? 'Budget alerts enabled' : 'Budget alerts disabled', 'success');
}

function updateBudgetThreshold(value) {
    appSettings.notifications.budgetThreshold = parseInt(value);
    saveSettings();
    showToast(`Alert threshold set to ${value}%`, 'success');
}

function updateSettlementReminders(enabled) {
    appSettings.notifications.settlementReminders = enabled;
    saveSettings();
    renderSettings(); // Re-render to show/hide frequency option
    showToast(enabled ? 'Settlement reminders enabled' : 'Settlement reminders disabled', 'success');
}

function updateReminderFrequency(value) {
    appSettings.notifications.reminderFrequency = parseInt(value);
    saveSettings();
    showToast(`Reminder frequency set to every ${value} days`, 'success');
}

function updateMonthlySummary(enabled) {
    appSettings.notifications.monthlySummary = enabled;
    saveSettings();
    showToast(enabled ? 'Monthly summary enabled' : 'Monthly summary disabled', 'success');
}

function updateAnomalyDetection(enabled) {
    appSettings.notifications.anomalyDetection = enabled;
    saveSettings();
    showToast(enabled ? 'Anomaly detection enabled' : 'Anomaly detection disabled', 'success');
}

function updateDefaultSplitMethod(method) {
    appSettings.groups.defaultSplitMethod = method;
    saveSettings();
    showToast('Default split method updated', 'success');
}

function updateShowSettled(enabled) {
    appSettings.groups.showSettled = enabled;
    saveSettings();
    showToast(enabled ? 'Showing settled transactions' : 'Hiding settled transactions', 'success');
}

// Data management functions
function exportData() {
    const data = {
        version: '3.0.0',
        exportDate: new Date().toISOString(),
        transactions,
        budgets,
        settings: appSettings,
        notifications,
        people: JSON.parse(localStorage.getItem('wp_people') || '[]'),
        groups: JSON.parse(localStorage.getItem('wp_groups') || '[]'),
        groupExpenses: JSON.parse(localStorage.getItem('wp_group_expenses') || '[]')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealthpulse-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (data.transactions) transactions = data.transactions;
                if (data.budgets) budgets = data.budgets;
                if (data.settings) appSettings = data.settings;
                if (data.notifications) notifications = data.notifications;
                if (data.people) localStorage.setItem('wp_people', JSON.stringify(data.people));
                if (data.groups) localStorage.setItem('wp_groups', JSON.stringify(data.groups));
                if (data.groupExpenses) localStorage.setItem('wp_group_expenses', JSON.stringify(data.groupExpenses));
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
                localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
                saveSettings();
                saveNotifications();
                
                showToast('Data imported successfully. Reloading...', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch (err) {
                showToast('Invalid backup file', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    confirmAction(
        'Clear All Data?',
        'This will permanently delete all your transactions, budgets, and settings. This action cannot be undone.',
        () => {
            localStorage.clear();
            showToast('All data cleared. Reloading...', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    );
}

// ============================================================================
// INITIALIZATION - Call these on app start
// ============================================================================

function initNotificationsAndSettings() {
    // Apply theme on load
    applyTheme();
    
    // Update badge
    updateNotificationBadge();
    
    // Run checks on app launch
    checkSettlementReminders();
    detectSpendingAnomalies();
    generateMonthlySummary();
    checkSavingsMilestones();
    
    // Set up daily checks (run once per day)
    const lastCheck = localStorage.getItem('wp_last_daily_check');
    const today = new Date().toDateString();
    
    if (lastCheck !== today) {
        checkSettlementReminders();
        detectSpendingAnomalies();
        generateMonthlySummary();
        checkSavingsMilestones();
        localStorage.setItem('wp_last_daily_check', today);
    }
}

// Expose functions to window for onclick handlers
window.markAllNotificationsRead = markAllNotificationsRead;
window.clearAllNotifications = clearAllNotifications;
window.handleNotificationAction = handleNotificationAction;
window.deleteNotification = deleteNotification;
window.renderNotificationsList = renderNotificationsList;
window.renderSettings = renderSettings;
window.togglePinEnabled = togglePinEnabled;
window.changePinFromSettings = changePinFromSettings;
window.updateAutoLock = updateAutoLock;
window.updateTheme = updateTheme;
window.updatePrivacyMode = updatePrivacyMode;
window.updateDefaultView = updateDefaultView;
window.updateBudgetAlerts = updateBudgetAlerts;
window.updateBudgetThreshold = updateBudgetThreshold;
window.updateSettlementReminders = updateSettlementReminders;
window.updateReminderFrequency = updateReminderFrequency;
window.updateMonthlySummary = updateMonthlySummary;
window.updateAnomalyDetection = updateAnomalyDetection;
window.updateDefaultSplitMethod = updateDefaultSplitMethod;
window.updateShowSettled = updateShowSettled;
window.exportData = exportData;
window.importData = importData;
window.clearAllData = clearAllData;
