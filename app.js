(function () {
'use strict';

// ── Categories ──
const CATEGORIES = {
    expense: [
        { id: 'food', name: 'Food & Dining', emoji: '🍽️', color: '#f87171' },
        { id: 'transport', name: 'Transport', emoji: '🚗', color: '#60a5fa' },
        { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#f472b6' },
        { id: 'bills', name: 'Bills & Utilities', emoji: '💡', color: '#fbbf24' },
        { id: 'health', name: 'Health', emoji: '🏥', color: '#34d399' },
        { id: 'entertainment', name: 'Entertainment', emoji: '🎬', color: '#a78bfa' },
        { id: 'education', name: 'Education', emoji: '📚', color: '#22d3ee' },
        { id: 'rent', name: 'Rent & Housing', emoji: '🏠', color: '#fb923c' },
        { id: 'other_exp', name: 'Other', emoji: '📦', color: '#94a3b8' }
    ],
    income: [
        { id: 'salary', name: 'Salary', emoji: '💰', color: '#34d399' },
        { id: 'freelance', name: 'Freelance', emoji: '💻', color: '#60a5fa' },
        { id: 'investment', name: 'Investment', emoji: '📈', color: '#fbbf24' },
        { id: 'gift', name: 'Gift', emoji: '🎁', color: '#f472b6' },
        { id: 'other_inc', name: 'Other', emoji: '✨', color: '#a78bfa' }
    ]
};

const STORAGE_KEY = 'wp_transactions';
const BUDGET_KEY = 'wp_budgets';

// ── State ──
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let budgets = JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}');
let currentView = 'dashboard';
let selectedMonth = new Date();
let txnFilter = 'all';
let searchQuery = '';
let editingTxnId = null;
let modalType = 'expense';
let confirmCallback = null;
let categoryChart = null;
let trendChart = null;

// ── DOM ──
const $ = id => document.getElementById(id);
const sidebar = $('sidebar');
const menuBtn = $('menu-btn');

// Init
setGreeting();
initDefaultBudgets();
updateMonthLabels();
populateCategories();
setupEvents();
navigate('dashboard');

// ── Greeting ──
function setGreeting() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning ☀️' : h < 17 ? 'Good afternoon 🚀' : 'Good evening 🌙';
    $('dashboard-greeting').textContent = g;
}

// ── Default Budgets ──
function initDefaultBudgets() {
    if (Object.keys(budgets).length > 0) return;
    const defaults = { food: 8000, transport: 3000, shopping: 5000, bills: 4000, health: 2000, entertainment: 3000, education: 2000, rent: 15000, other_exp: 2000 };
    budgets = defaults;
    saveBudgets();
}

// ── Navigation ──
function navigate(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.remove('active'));
    $('view-' + view).classList.add('active');
    const navBtn = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navBtn) navBtn.classList.add('active');
    closeSidebar();
    if (view === 'dashboard') renderDashboard();
    else if (view === 'transactions') renderTransactions();
    else if (view === 'budgets') renderBudgets();
}

// ── Events ──
function setupEvents() {
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.view));
    });
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        toggleOverlay(sidebar.classList.contains('open'));
    });
    $('month-prev').addEventListener('click', () => { selectedMonth.setMonth(selectedMonth.getMonth() - 1); updateMonthLabels(); renderDashboard(); });
    $('month-next').addEventListener('click', () => { selectedMonth.setMonth(selectedMonth.getMonth() + 1); updateMonthLabels(); renderDashboard(); });
    $('budget-month-prev').addEventListener('click', () => { selectedMonth.setMonth(selectedMonth.getMonth() - 1); updateMonthLabels(); renderBudgets(); });
    $('budget-month-next').addEventListener('click', () => { selectedMonth.setMonth(selectedMonth.getMonth() + 1); updateMonthLabels(); renderBudgets(); });
    $('see-all-btn').addEventListener('click', () => navigate('transactions'));
    $('add-transaction-btn').addEventListener('click', () => openTxnModal());
    $('fab-add').addEventListener('click', () => openTxnModal());
    // Txn filters
    document.querySelectorAll('#view-transactions .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            txnFilter = tab.dataset.type;
            document.querySelectorAll('#view-transactions .filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderTransactions();
        });
    });
    $('search-input').addEventListener('input', e => { searchQuery = e.target.value.toLowerCase(); renderTransactions(); });
    // Modal
    $('type-expense').addEventListener('click', () => setModalType('expense'));
    $('type-income').addEventListener('click', () => setModalType('income'));
    $('txn-cancel').addEventListener('click', closeTxnModal);
    $('txn-delete').addEventListener('click', () => {
        if (!editingTxnId) return;
        showConfirm('Delete this transaction?', () => { transactions = transactions.filter(t => t.id !== editingTxnId); save(); closeTxnModal(); refreshView(); });
    });
    $('txn-form').addEventListener('submit', e => { e.preventDefault(); saveTxn(); });
    $('txn-modal').addEventListener('click', e => { if (e.target === $('txn-modal')) closeTxnModal(); });
    $('confirm-cancel').addEventListener('click', closeConfirm);
    $('confirm-ok').addEventListener('click', () => { if (confirmCallback) confirmCallback(); closeConfirm(); });
    $('confirm-modal').addEventListener('click', e => { if (e.target === $('confirm-modal')) closeConfirm(); });
    $('clear-data-btn').addEventListener('click', () => {
        showConfirm('Reset all data? This cannot be undone.', () => { transactions = []; budgets = {}; initDefaultBudgets(); save(); refreshView(); });
    });
    // Export / Import
    $('export-btn').addEventListener('click', exportData);
    $('import-btn').addEventListener('click', () => $('import-file').click());
    $('import-file').addEventListener('change', importData);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeTxnModal(); closeConfirm(); }
    });
}

// ── Sidebar mobile ──
function closeSidebar() { sidebar.classList.remove('open'); toggleOverlay(false); }
function toggleOverlay(show) {
    let ov = document.querySelector('.sidebar-overlay');
    if (show && !ov) { ov = document.createElement('div'); ov.className = 'sidebar-overlay visible'; ov.addEventListener('click', closeSidebar); document.body.appendChild(ov); }
    else if (!show && ov) ov.remove();
}

// ── Month ──
function updateMonthLabels() {
    const label = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    $('month-label').textContent = label;
    $('budget-month-label').textContent = label;
}
function getMonthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function getMonthTxns(date) { const key = getMonthKey(date || selectedMonth); return transactions.filter(t => t.date.startsWith(key)); }

// ── Storage ──
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
function saveBudgets() { localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets)); }

// ── Categories ──
function getCat(type, catId) { return (CATEGORIES[type] || []).find(c => c.id === catId) || { name: 'Other', emoji: '📦', color: '#94a3b8' }; }
function populateCategories() {
    const sel = $('txn-category');
    sel.innerHTML = '';
    (CATEGORIES[modalType] || []).forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.emoji + ' ' + c.name; sel.appendChild(o); });
}

// ── Format ──
function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtDate(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }

// ── Modal ──
function setModalType(type) {
    modalType = type;
    $('type-expense').classList.toggle('active', type === 'expense');
    $('type-income').classList.toggle('active', type === 'income');
    populateCategories();
}
function openTxnModal(txn) {
    editingTxnId = txn ? txn.id : null;
    $('modal-title').textContent = txn ? 'Edit Transaction' : 'Add Transaction';
    $('txn-save').textContent = txn ? 'Save Changes' : 'Add Transaction';
    $('txn-delete').style.display = txn ? 'inline-flex' : 'none';
    setModalType(txn ? txn.type : 'expense');
    $('txn-description').value = txn ? txn.description : '';
    $('txn-amount').value = txn ? txn.amount : '';
    $('txn-date').value = txn ? txn.date : new Date().toISOString().split('T')[0];
    $('txn-notes').value = txn ? (txn.notes || '') : '';
    if (txn) $('txn-category').value = txn.category;
    $('txn-modal').classList.add('visible');
    setTimeout(() => $('txn-description').focus(), 100);
}
function closeTxnModal() { $('txn-modal').classList.remove('visible'); editingTxnId = null; }
function saveTxn() {
    const data = {
        id: editingTxnId || Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        type: modalType,
        description: $('txn-description').value.trim(),
        amount: parseFloat($('txn-amount').value),
        category: $('txn-category').value,
        date: $('txn-date').value,
        notes: $('txn-notes').value.trim()
    };
    if (!data.description || !data.amount || !data.date) return;
    if (editingTxnId) { const idx = transactions.findIndex(t => t.id === editingTxnId); if (idx !== -1) transactions[idx] = data; }
    else transactions.unshift(data);
    save(); closeTxnModal(); refreshView();
}

// ── Confirm Modal ──
function showConfirm(text, cb) { $('confirm-text').textContent = text; confirmCallback = cb; $('confirm-modal').classList.add('visible'); }
function closeConfirm() { $('confirm-modal').classList.remove('visible'); confirmCallback = null; }

function refreshView() { if (currentView === 'dashboard') renderDashboard(); else if (currentView === 'transactions') renderTransactions(); else renderBudgets(); }

// ── DASHBOARD ──
function renderDashboard() {
    const txns = getMonthTxns();
    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    $('balance-amount').textContent = fmt(balance);
    $('balance-amount').style.color = balance >= 0 ? '#a78bfa' : '#f87171';
    $('income-amount').textContent = fmt(income);
    $('expense-amount').textContent = fmt(expense);
    $('income-count').textContent = txns.filter(t => t.type === 'income').length + ' transactions';
    $('expense-count').textContent = txns.filter(t => t.type === 'expense').length + ' transactions';
    $('savings-rate').textContent = savingsRate + '%';
    $('savings-rate').style.color = savingsRate >= 20 ? '#34d399' : savingsRate >= 0 ? '#fbbf24' : '#f87171';

    // Trend
    const prevMonth = new Date(selectedMonth); prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevTxns = getMonthTxns(prevMonth);
    const prevBalance = prevTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) - prevTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const diff = balance - prevBalance;
    const trendEl = $('balance-trend');
    if (prevTxns.length > 0) {
        trendEl.textContent = (diff >= 0 ? '↑ ' : '↓ ') + fmt(Math.abs(diff)) + ' vs last month';
        trendEl.className = 'card-trend ' + (diff >= 0 ? 'positive' : 'negative');
    } else trendEl.textContent = '';

    renderCategoryChart(txns);
    renderTrendChart();
    renderRecentList(txns);
}

function renderCategoryChart(txns) {
    const expenses = txns.filter(t => t.type === 'expense');
    const catData = {};
    expenses.forEach(t => { catData[t.category] = (catData[t.category] || 0) + t.amount; });
    const cats = Object.keys(catData);
    const empty = $('category-empty');
    if (cats.length === 0) { empty.classList.add('visible'); if (categoryChart) { categoryChart.destroy(); categoryChart = null; } return; }
    empty.classList.remove('visible');
    const labels = cats.map(c => getCat('expense', c).name);
    const data = cats.map(c => catData[c]);
    const colors = cats.map(c => getCat('expense', c).color);
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart($('category-chart'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
        options: {
            responsive: true, cutout: '70%',
            plugins: { legend: { position: 'bottom', labels: { color: '#9d97b5', padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } } }
        }
    });
}

function renderTrendChart() {
    const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(selectedMonth); d.setMonth(d.getMonth() - i); months.push(d); }
    const labels = months.map(m => m.toLocaleDateString('en-US', { month: 'short' }));
    const incomeData = months.map(m => getMonthTxns(m).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
    const expenseData = months.map(m => getMonthTxns(m).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    if (trendChart) trendChart.destroy();
    trendChart = new Chart($('trend-chart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Income', data: incomeData, backgroundColor: 'rgba(52, 211, 153, 0.7)', borderRadius: 6, barPercentage: 0.4 },
                { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(248, 113, 113, 0.7)', borderRadius: 6, barPercentage: 0.4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#5e5880', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#5e5880', font: { size: 11 }, callback: v => '₹' + (v / 1000) + 'k' } }
            },
            plugins: { legend: { labels: { color: '#9d97b5', usePointStyle: true, pointStyleWidth: 8, padding: 16, font: { size: 11 } } } }
        }
    });
}

function renderRecentList(txns) {
    const recent = txns.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const list = $('recent-list');
    const empty = $('recent-empty');
    list.innerHTML = '';
    if (recent.length === 0) { empty.classList.add('visible'); return; }
    empty.classList.remove('visible');
    recent.forEach(t => list.appendChild(createTxnEl(t)));
}

// ── TRANSACTIONS VIEW ──
function renderTransactions() {
    let filtered = [...transactions];
    if (txnFilter !== 'all') filtered = filtered.filter(t => t.type === txnFilter);
    if (searchQuery) filtered = filtered.filter(t => t.description.toLowerCase().includes(searchQuery) || getCat(t.type, t.category).name.toLowerCase().includes(searchQuery));
    filtered.sort((a, b) => b.date.localeCompare(a.date));
    const list = $('full-transaction-list');
    const empty = $('transactions-empty');
    list.innerHTML = '';
    if (filtered.length === 0) { empty.classList.add('visible'); return; }
    empty.classList.remove('visible');
    filtered.forEach((t, i) => { const el = createTxnEl(t); el.style.animationDelay = `${i * 0.03}s`; list.appendChild(el); });
}

function createTxnEl(t) {
    const cat = getCat(t.type, t.category);
    const el = document.createElement('div');
    el.className = 'txn-item';
    el.innerHTML = `
        <div class="txn-icon" style="background:${cat.color}15; color:${cat.color}">${cat.emoji}</div>
        <div class="txn-details">
            <div class="txn-desc">${esc(t.description)}</div>
            <div class="txn-meta"><span>${cat.name}</span><span>·</span><span>${fmtDate(t.date)}</span></div>
        </div>
        <div class="txn-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</div>`;
    el.addEventListener('click', () => openTxnModal(t));
    return el;
}

// ── BUDGETS VIEW ──
function renderBudgets() {
    const grid = $('budget-grid');
    grid.innerHTML = '';
    const monthTxns = getMonthTxns();
    CATEGORIES.expense.forEach(cat => {
        const spent = monthTxns.filter(t => t.type === 'expense' && t.category === cat.id).reduce((s, t) => s + t.amount, 0);
        const limit = budgets[cat.id] || 0;
        const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
        const status = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'safe';
        const card = document.createElement('div');
        card.className = 'budget-card';
        card.innerHTML = `
            <div class="budget-header">
                <span class="budget-emoji">${cat.emoji}</span>
                <div><div class="budget-cat-name">${cat.name}</div>
                <div class="budget-amounts">${fmt(spent)} of ${fmt(limit)}</div></div>
            </div>
            <div class="budget-bar-bg"><div class="budget-bar-fill ${status}" style="width:${pct}%"></div></div>
            <div class="budget-footer">
                <span class="budget-percent ${status}">${pct}% used</span>
                <button class="budget-edit-btn">Edit limit</button>
            </div>`;
        card.querySelector('.budget-edit-btn').addEventListener('click', () => {
            const newLimit = prompt(`Set monthly budget for ${cat.name} (₹):`, limit || '');
            if (newLimit !== null && !isNaN(parseFloat(newLimit)) && parseFloat(newLimit) >= 0) {
                budgets[cat.id] = parseFloat(newLimit);
                saveBudgets(); renderBudgets();
            }
        });
        grid.appendChild(card);
    });
}

// ── Helpers ──
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ── Export Data ──
function exportData() {
    const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        transactions: transactions,
        budgets: budgets
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `wealthpulse-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Data exported successfully!', 'success');
    closeSidebar();
}

// ── Import Data ──
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            // Validate structure
            if (!data.transactions || !Array.isArray(data.transactions)) {
                showToast('❌ Invalid file: missing transactions array', 'error');
                return;
            }
            // Validate each transaction has required fields
            const valid = data.transactions.every(t =>
                t.id && t.type && t.description && t.amount && t.category && t.date
            );
            if (!valid) {
                showToast('❌ Invalid file: corrupted transaction data', 'error');
                return;
            }
            showConfirm(
                `Import ${data.transactions.length} transactions? This will replace all current data.`,
                () => {
                    transactions = data.transactions;
                    if (data.budgets && typeof data.budgets === 'object') {
                        budgets = data.budgets;
                        saveBudgets();
                    }
                    save();
                    refreshView();
                    showToast(`✅ Imported ${transactions.length} transactions!`, 'success');
                }
            );
        } catch (err) {
            showToast('❌ Could not read file. Make sure it\'s a valid JSON backup.', 'error');
        }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = '';
    closeSidebar();
}

// ── Toast Notification ──
function showToast(message, type) {
    const toast = $('toast');
    toast.textContent = message;
    toast.className = 'toast visible ' + (type || '');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

})();
