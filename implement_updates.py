"""
WealthPulse v3.0 - Automated Implementation Script
This script automatically integrates Notifications & Settings features
"""

import os
import shutil
from datetime import datetime

# Paths
BASE_DIR = r"C:\Users\nagul\Documents\Claude Projects\finance-app"
APP_JS = os.path.join(BASE_DIR, "app.js")
INDEX_HTML = os.path.join(BASE_DIR, "index.html")
STYLES_CSS = os.path.join(BASE_DIR, "styles.css")
ADDON_JS = os.path.join(BASE_DIR, "notifications-settings-addon.js") 
ADDON_CSS = os.path.join(BASE_DIR, "notifications-settings-styles.css")

# Create backups
def create_backups():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(BASE_DIR, f"backup_{timestamp}")
    os.makedirs(backup_dir, exist_ok=True)
    
    shutil.copy2(APP_JS, os.path.join(backup_dir, "app.js.backup"))
    shutil.copy2(INDEX_HTML, os.path.join(backup_dir, "index.html.backup"))
    shutil.copy2(STYLES_CSS, os.path.join(backup_dir, "styles.css.backup"))
    
    print(f"✅ Backups created in: {backup_dir}")
    return backup_dir

# Step 1: Update index.html
def update_html():
    print("\n📝 Updating index.html...")
    
    with open(INDEX_HTML, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Add sidebar buttons after Reports
    sidebar_addition = '''
            <button class="nav-item" data-view="notifications" id="nav-notifications">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2a6 6 0 00-6 6v3.6L2.7 13c-.4.5-.1 1 .5 1h13.6c.6 0 .9-.5.5-1L16 11.6V8a6 6 0 00-6-6z" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M9 17a1 1 0 102 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Notifications
                <span class="notif-badge" id="notif-badge-sidebar" style="display:none;">0</span>
            </button>

            <button class="nav-item" data-view="settings" id="nav-settings">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M10 2v1.5M10 16.5V18M18 10h-1.5M3.5 10H2M15.5 15.5L14.4 14.4M5.6 5.6L4.5 4.5M15.5 4.5L14.4 5.6M5.6 14.4L4.5 15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Settings
            </button>
'''
    
    # Find Reports button and add after it
    reports_marker = '<button class="nav-item" data-view="reports" id="nav-reports">'
    reports_end = '</button>'
    
    if reports_marker in html:
        # Find the closing </button> after Reports
        idx = html.find(reports_marker)
        idx_end = html.find(reports_end, idx) + len(reports_end)
        html = html[:idx_end] + sidebar_addition + html[idx_end:]
        print("  ✓ Added Notifications & Settings buttons to sidebar")
    
    # Add view containers before mobile navigation
    views_addition = '''
        <!-- ========== NOTIFICATIONS VIEW ========== -->
        <section class="view" id="view-notifications">
            <div class="view-header">
                <h1 class="view-title">Notifications</h1>
                <div class="page-actions">
                    <button class="btn-icon" onclick="markAllNotificationsRead()" title="Mark all as read">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="clearAllNotifications()" title="Clear all">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="notifications-content">
                <div class="notif-list" id="notif-list"></div>
            </div>
        </section>

'''
    
    mobile_nav_marker = '<nav class="mobile-nav" id="mobile-nav">'
    if mobile_nav_marker in html:
        idx = html.find(mobile_nav_marker)
        html = html[:idx] + views_addition + html[idx:]
        print("  ✓ Added Notifications view container")
    
    with open(INDEX_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print("✅ index.html updated successfully")

# Step 2: Update styles.css
def update_css():
    print("\n🎨 Updating styles.css...")
    
    if not os.path.exists(ADDON_CSS):
        print("  ⚠️  notifications-settings-styles.css not found - please download it first")
        return False
    
    with open(STYLES_CSS, 'r', encoding='utf-8') as f:
        css = f.read()
    
    with open(ADDON_CSS, 'r', encoding='utf-8') as f:
        addon_css = f.read()
    
    # Append addon CSS to end
    css += "\n\n/* ========== NOTIFICATIONS & SETTINGS STYLES ========== */\n"
    css += addon_css
    
    with open(STYLES_CSS, 'w', encoding='utf-8') as f:
        f.write(css)
    
    print("✅ styles.css updated successfully")
    return True

# Step 3: Update app.js
def update_js():
    print("\n⚙️  Updating app.js...")
    
    if not os.path.exists(ADDON_JS):
        print("  ⚠️  notifications-settings-addon.js not found - please download it first")
        return False
    
    with open(APP_JS, 'r', encoding='utf-8') as f:
        js = f.read()
    
    with open(ADDON_JS, 'r', encoding='utf-8') as f:
        addon_js = f.read()
    
    # Part A: Add constants after SECURITY_QUESTIONS
    constants_addition = '''
// ── Notifications & Settings Storage Keys ──
const NOTIFICATIONS_KEY = 'wp_notifications';
const SETTINGS_KEY = 'wp_settings';
const LAST_SUMMARY_KEY = 'wp_last_summary';
const LAST_REMINDER_PREFIX = 'wp_last_reminder_';

// ── Default Settings ──
const DEFAULT_SETTINGS = {
    security: { pinEnabled: true, biometric: false, autoLock: '1min' },
    preferences: { theme: 'auto', privacyMode: false, defaultView: 'dashboard', currency: '₹', dateFormat: 'DD/MM/YYYY' },
    notifications: { budgetAlerts: true, budgetThreshold: 80, settlementReminders: true, reminderFrequency: 5, monthlySummary: true, anomalyDetection: true },
    groups: { autoSync: true, defaultSplitMethod: 'equal', showSettled: true }
};
'''
    
    security_q_marker = '    "What was the make of your first car?"\n];'
    if security_q_marker in js:
        idx = js.find(security_q_marker) + len(security_q_marker)
        js = js[:idx] + "\n" + constants_addition + js[idx:]
        print("  ✓ Added notification constants")
    
    # Part B: Add state variables
    state_addition = '''
let appSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS));
let notifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]');
'''
    
    trend_chart_marker = 'let trendChart = null;'
    if trend_chart_marker in js:
        idx = js.find(trend_chart_marker) + len(trend_chart_marker)
        js = js[:idx] + "\n" + state_addition + js[idx:]
        print("  ✓ Added state variables")
    
    # Part C: Update navigate() function
    navigate_marker = "if (view === 'dashboard') renderDashboard();"
    if navigate_marker in js:
        navigate_replacement = '''if (view === 'notifications') {
        renderNotificationsList();
    } else if (view === 'settings') {
        renderSettings();
    } else if (view === 'dashboard') renderDashboard();'''
        js = js.replace("if (view === 'dashboard') renderDashboard();", navigate_replacement)
        print("  ✓ Updated navigate() function")
    
    # Part D: Update initApp() function
    init_marker = "navigate('dashboard');"
    init_count = js.count(init_marker)
    if init_count > 0:
        # Find the one inside initApp
        init_replacement = "initNotificationsAndSettings();\n    navigate('dashboard');"
        js = js.replace("navigate('dashboard');", init_replacement, 1)  # Replace first occurrence
        print("  ✓ Updated initApp() function")
    
    # Part E: Update saveTxn() function
    save_txn_marker = "save(); closeTxnModal(); refreshView();\n}"
    if save_txn_marker in js:
        save_txn_replacement = '''save(); 
    
    // Check budget alerts for expenses
    if (data.type === 'expense') {
        const monthlySpending = transactions
            .filter(t => {
                const tDate = new Date(t.date);
                const now = new Date();
                return t.type === 'expense' && 
                       t.category === data.category &&
                       tDate.getMonth() === now.getMonth() && 
                       tDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        checkBudgetAlerts(data.category, monthlySpending);
    }
    
    closeTxnModal(); refreshView();
}'''
        js = js.replace(save_txn_marker, save_txn_replacement)
        print("  ✓ Added budget alert check to saveTxn()")
    
    # Part F: Add all addon functions before closing })();
    closing_marker = '\n\n\n})();'
    if closing_marker in js:
        js = js.replace(closing_marker, '\n\n// ========== NOTIFICATIONS & SETTINGS FUNCTIONS ==========\n' + addon_js + closing_marker)
        print("  ✓ Added all notification & settings functions")
    
    with open(APP_JS, 'w', encoding='utf-8') as f:
        f.write(js)
    
    print("✅ app.js updated successfully")
    return True

# Main execution
def main():
    print("╔════════════════════════════════════════════════════════════╗")
    print("║   WealthPulse v3.0 - Automated Implementation Script      ║")
    print("╚════════════════════════════════════════════════════════════╝\n")
    
    # Check if addon files exist
    if not os.path.exists(ADDON_JS):
        print("❌ ERROR: notifications-settings-addon.js not found!")
        print(f"   Please download it and place in: {BASE_DIR}")
        return
    
    if not os.path.exists(ADDON_CSS):
        print("❌ ERROR: notifications-settings-styles.css not found!")
        print(f"   Please download it and place in: {BASE_DIR}")
        return
    
    # Create backups
    backup_dir = create_backups()
    
    # Update files
    update_html()
    
    if not update_css():
        print("\n⚠️  CSS update failed - see errors above")
    
    if not update_js():
        print("\n⚠️  JavaScript update failed - see errors above")
    
    print("\n" + "="*60)
    print("✅ IMPLEMENTATION COMPLETE!")
    print("="*60)
    print(f"\n📁 Backups saved in: {backup_dir}")
    print("\n🧪 Next Steps:")
    print("  1. Open your app in a browser")
    print("  2. Check browser console for errors (F12)")
    print("  3. Click 'Notifications' → should see empty state")
    print("  4. Click 'Settings' → should see all sections")
    print("  5. Add a transaction > 80% budget → badge should appear")
    print("\n🎉 Enjoy your upgraded WealthPulse v3.0!")

if __name__ == "__main__":
    main()
