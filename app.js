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
const PIN_KEY = 'wp_pin_hash';
const SEC_Q_INDEX_KEY = 'wp_sec_q_index';
const SEC_Q_HASH_KEY = 'wp_sec_q_hash';

const SECURITY_QUESTIONS = [
    "What was the name of your first pet?",
    "In what city were you born?",
    "What is your mother's maiden name?",
    "What high school did you attend?",
    "What was the make of your first car?"
];

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

// ── PIN Lock System ──
const PIN_LENGTH = 4;
let pinInput = '';
let pinMode = 'enter'; // 'create', 'confirm', 'enter', 'change-old', 'change-new', 'change-confirm'
let pinTemp = '';       // Temp storage during create/change flows

async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode('wp_salt_' + pin);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hasPinSet() {
    return !!localStorage.getItem(PIN_KEY);
}

function updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < pinInput.length);
        dot.classList.remove('error', 'success');
    });
}

function setPinError(msg) {
    $('pin-error').textContent = msg;
}

function setPinSubtitle(msg) {
    $('lock-subtitle').textContent = msg;
}

function shakePin() {
    const dots = $('pin-dots');
    dots.classList.add('shake');
    document.querySelectorAll('.pin-dot').forEach(d => d.classList.add('error'));
    setTimeout(() => {
        dots.classList.remove('shake');
        document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('error'));
        pinInput = '';
        updatePinDots();
    }, 600);
}

function showPinSuccess() {
    document.querySelectorAll('.pin-dot').forEach(d => {
        d.classList.remove('filled');
        d.classList.add('success');
    });
}

function unlockApp() {
    showPinSuccess();
    setTimeout(() => {
        $('lock-screen').classList.add('hidden');
        setTimeout(() => {
            $('lock-screen').style.display = 'none';
        }, 500);
        initApp();
    }, 400);
}

async function handlePinComplete() {
    const pin = pinInput;
    
    if (pinMode === 'create') {
        pinTemp = pin;
        pinMode = 'confirm';
        pinInput = '';
        updatePinDots();
        setPinSubtitle('Confirm your PIN');
        setPinError('');
    } else if (pinMode === 'confirm') {
        if (pin === pinTemp) {
            const hash = await hashPin(pin);
            localStorage.setItem(PIN_KEY, hash);
            pinTemp = '';
            showSecQSetup();
        } else {
            setPinError('PINs don\'t match. Try again.');
            shakePin();
            pinMode = 'create';
            pinTemp = '';
            setTimeout(() => setPinSubtitle('Create a 4-digit PIN'), 600);
        }
    } else if (pinMode === 'enter') {
        const hash = await hashPin(pin);
        const stored = localStorage.getItem(PIN_KEY);
        if (hash === stored) {
            unlockApp();
        } else {
            setPinError('Wrong PIN. Try again.');
            shakePin();
        }
    } else if (pinMode === 'change-old') {
        const hash = await hashPin(pin);
        const stored = localStorage.getItem(PIN_KEY);
        if (hash === stored) {
            pinMode = 'change-new';
            pinInput = '';
            updatePinDots();
            setPinSubtitle('Enter new PIN');
            setPinError('');
        } else {
            setPinError('Wrong current PIN');
            shakePin();
        }
    } else if (pinMode === 'change-new') {
        pinTemp = pin;
        pinMode = 'change-confirm';
        pinInput = '';
        updatePinDots();
        setPinSubtitle('Confirm new PIN');
        setPinError('');
    } else if (pinMode === 'change-confirm') {
        if (pin === pinTemp) {
            const hash = await hashPin(pin);
            localStorage.setItem(PIN_KEY, hash);
            pinTemp = '';
            unlockApp();
            showToast('✅ PIN changed successfully!', 'success');
        } else {
            setPinError('PINs don\'t match. Try again.');
            shakePin();
            pinMode = 'change-new';
            pinTemp = '';
            setTimeout(() => setPinSubtitle('Enter new PIN'), 600);
        }
    }
}

function addPinDigit(digit) {
    if (pinInput.length >= PIN_LENGTH) return;
    pinInput += digit;
    updatePinDots();
    setPinError('');
    if (pinInput.length === PIN_LENGTH) {
        setTimeout(handlePinComplete, 200);
    }
}

function removePinDigit() {
    if (pinInput.length === 0) return;
    pinInput = pinInput.slice(0, -1);
    updatePinDots();
}

async function hashSecurityAnswer(answer) {
    const normalized = answer.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode('wp_sec_q_salt_' + normalized);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function showSecQSetup() {
    $('pin-dots').style.display = 'none';
    $('pin-keypad').style.display = 'none';
    $('sec-q-setup-container').style.display = 'block';
    setPinSubtitle('Add a recovery method');
    
    const select = $('sec-q-select');
    select.innerHTML = '';
    SECURITY_QUESTIONS.forEach((q, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = q;
        select.appendChild(option);
    });
}

async function saveSecQ() {
    const index = $('sec-q-select').value;
    const answer = $('sec-q-answer-setup').value;
    if (!answer.trim()) {
        setPinError('Please provide an answer');
        return;
    }
    const hash = await hashSecurityAnswer(answer);
    localStorage.setItem(SEC_Q_INDEX_KEY, index);
    localStorage.setItem(SEC_Q_HASH_KEY, hash);
    $('sec-q-setup-container').style.display = 'none';
    $('pin-dots').style.display = 'flex';
    $('pin-keypad').style.display = 'grid';
    unlockApp();
}

function showSecQRecovery() {
    pinMode = 'recovery';
    $('pin-dots').style.display = 'none';
    $('pin-keypad').style.display = 'none';
    $('forgot-pin-link').style.display = 'none';
    $('pin-reset-link').style.display = 'none';
    $('sec-q-recovery-container').style.display = 'block';
    setPinSubtitle('Recover PIN');
    setPinError('');
    
    const index = localStorage.getItem(SEC_Q_INDEX_KEY);
    if (index !== null && SECURITY_QUESTIONS[index]) {
        $('sec-q-display-label').textContent = SECURITY_QUESTIONS[index];
    } else {
        $('sec-q-display-label').textContent = 'No security question set.';
        $('sec-q-answer-recovery').disabled = true;
        $('btn-verify-sec-q').disabled = true;
    }
}

function cancelSecQRecovery() {
    pinMode = 'enter';
    pinInput = '';
    $('sec-q-recovery-container').style.display = 'none';
    $('pin-dots').style.display = 'flex';
    $('pin-keypad').style.display = 'grid';
    $('forgot-pin-link').style.display = 'block';
    $('pin-reset-link').style.display = 'block';
    setPinSubtitle('Enter your PIN to continue');
    updatePinDots();
    setPinError('');
}

async function verifySecQ() {
    const answer = $('sec-q-answer-recovery').value;
    if (!answer.trim()) {
        setPinError('Please provide an answer');
        return;
    }
    const hash = await hashSecurityAnswer(answer);
    const storedHash = localStorage.getItem(SEC_Q_HASH_KEY);
    
    if (hash === storedHash) {
        localStorage.removeItem(PIN_KEY);
        localStorage.removeItem(SEC_Q_INDEX_KEY);
        localStorage.removeItem(SEC_Q_HASH_KEY);
        
        $('sec-q-recovery-container').style.display = 'none';
        $('pin-dots').style.display = 'flex';
        $('pin-keypad').style.display = 'grid';
        $('forgot-pin-link').style.display = 'none';
        $('pin-reset-link').style.display = 'none';
        
        pinMode = 'create';
        pinInput = '';
        pinTemp = '';
        updatePinDots();
        setPinSubtitle('Create a new 4-digit PIN');
        setPinError('');
        $('sec-q-answer-recovery').value = '';
    } else {
        setPinError('Incorrect answer. Try again.');
    }
}

function setupPinEvents() {
    // Keypad buttons
    document.querySelectorAll('.pin-key[data-key]').forEach(btn => {
        btn.addEventListener('click', () => addPinDigit(btn.dataset.key));
    });
    $('pin-backspace').addEventListener('click', removePinDigit);

    // Keyboard support
    document.addEventListener('keydown', e => {
        if ($('lock-screen').classList.contains('hidden')) return;
        if (e.key >= '0' && e.key <= '9') addPinDigit(e.key);
        else if (e.key === 'Backspace') removePinDigit();
    });

    // Change PIN link
    $('pin-reset-link').addEventListener('click', () => {
        showConfirm('Reset your PIN? You\'ll need to create a new one.', () => {
            localStorage.removeItem(PIN_KEY);
            pinMode = 'create';
            pinInput = '';
            updatePinDots();
            setPinSubtitle('Create a 4-digit PIN');
            setPinError('');
            $('pin-reset-link').style.display = 'none';
            $('forgot-pin-link').style.display = 'none';
            $('lock-screen').style.display = '';
            $('lock-screen').classList.remove('hidden');
        });
    });

    $('btn-save-sec-q').addEventListener('click', saveSecQ);
    $('forgot-pin-link').addEventListener('click', showSecQRecovery);
    $('btn-cancel-recovery').addEventListener('click', cancelSecQRecovery);
    $('btn-verify-sec-q').addEventListener('click', verifySecQ);
}

// Initialize PIN screen
function initPinScreen() {
    setupPinEvents();
    if (hasPinSet()) {
        pinMode = 'enter';
        setPinSubtitle('Enter your PIN to continue');
        $('pin-reset-link').style.display = '';
        $('forgot-pin-link').style.display = '';
    } else {
        pinMode = 'create';
        setPinSubtitle('Create a 4-digit PIN');
        $('pin-reset-link').style.display = 'none';
        $('forgot-pin-link').style.display = 'none';
    }
}

// ── App Init (called after PIN unlock) ──
function initApp() {
    setGreeting();
    initDefaultBudgets();
    updateMonthLabels();
    populateCategories();
    setupEvents();
    setupBackButton();
    navigate('dashboard');
}

// Start with PIN screen
initPinScreen();

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
    const fab = $('fab-add');
    if (fab) {
        if (view === 'dashboard' || view === 'transactions') {
            fab.style.display = 'flex';
        } else {
            fab.style.display = 'none';
        }
    }

    if (view === 'dashboard') renderDashboard();
    else if (view === 'transactions') renderTransactions();
    else if (view === 'budgets') renderBudgets();
    else if (view === 'groups') renderGroupsList();
    else if (view === 'people') renderPeopleList();
    else if (view === 'settle-up') renderSettleUpView();
    else if (view === 'group-detail') renderGroupDetail(currentGroupId);
}

// ── Back Button Handler (Capacitor native + browser fallback) ──
function setupBackButton() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        const CapApp = window.Capacitor.Plugins.App;
        CapApp.addListener('backButton', () => {
            // 1. Check Lock Screen
            if (!$('lock-screen').classList.contains('hidden')) return;

            // 2. Check Modals
            const openModal = document.querySelector('.modal-overlay.visible');
            if (openModal) {
                closeModal(openModal.id);
                return;
            }

            // 3. Check FAB Menu
            const fabMenu = $('fab-menu');
            if (fabMenu && fabMenu.classList.contains('active')) {
                $('fab-add').classList.remove('active');
                fabMenu.classList.remove('active');
                return;
            }

            // 4. Check Sidebar
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                toggleOverlay(false);
                return;
            }

            // 5. Navigation Back
            if (currentView === 'group-detail') {
                navigateTo('groups');
                return;
            }
            if (currentView !== 'dashboard') {
                navigate('dashboard');
                return;
            }

            // 6. Exit App
            CapApp.exitApp();
        });
    }

    // Browser fallback: use History API for web testing
    if (!window.Capacitor) {
        history.replaceState({ view: 'dashboard' }, '', '');
        const _origNavigate = navigate;
        window._wpNavigate = function(view) {
            if (view !== 'dashboard') history.pushState({ view: view }, '', '');
            else history.replaceState({ view: 'dashboard' }, '', '');
            _origNavigate(view);
        };
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) _origNavigate(e.state.view);
            else _origNavigate('dashboard');
        });
    }
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
        $('fab-add').addEventListener('click', () => {
        $('fab-add').classList.toggle('active');
        $('fab-menu').classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
        const fab = $('fab-add');
        const menu = $('fab-menu');
        if (fab && menu) {
            if (!fab.contains(e.target) && !menu.contains(e.target) && menu.classList.contains('active')) {
                fab.classList.remove('active');
                menu.classList.remove('active');
            }
        }
    });
    $('fab-add-txn').addEventListener('click', () => {
        $('fab-add').classList.remove('active');
        $('fab-menu').classList.remove('active');
        openTxnModal();
    });
    $('fab-add-exp').addEventListener('click', () => {
        $('fab-add').classList.remove('active');
        $('fab-menu').classList.remove('active');
        openAddExpenseModal(); // no param = select group
    });
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
    // Change PIN
    $('change-pin-btn').addEventListener('click', () => {
        closeSidebar();
    const fab = $('fab-add');
    if (fab) {
        if (view === 'dashboard' || view === 'transactions') {
            fab.style.display = 'flex';
        } else {
            fab.style.display = 'none';
        }
    }
        pinMode = 'change-old';
        pinInput = '';
        updatePinDots();
        setPinSubtitle('Enter current PIN');
        setPinError('');
        $('pin-reset-link').style.display = 'none';
        $('lock-screen').style.display = '';
        $('lock-screen').classList.remove('hidden');
    });
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
    renderDashboardGroupsWidget();
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
        budgets: budgets,
        wp_people: getPeople(),
        wp_groups: getGroups(),
        wp_group_expenses: getGroupExpenses()
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
    const fab = $('fab-add');
    if (fab) {
        if (view === 'dashboard' || view === 'transactions') {
            fab.style.display = 'flex';
        } else {
            fab.style.display = 'none';
        }
    }
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
                    if (data.wp_people) savePeople(data.wp_people);
                    if (data.wp_groups) saveGroups(data.wp_groups);
                    if (data.wp_group_expenses) saveGroupExpenses(data.wp_group_expenses);
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
    const fab = $('fab-add');
    if (fab) {
        if (view === 'dashboard' || view === 'transactions') {
            fab.style.display = 'flex';
        } else {
            fab.style.display = 'none';
        }
    }
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

// =============================================
// Splitwise Feature Logic
// =============================================

// A - Data Access
function getPeople() { return JSON.parse(localStorage.getItem('wp_people') || '[]'); }
function savePeople(arr) { localStorage.setItem('wp_people', JSON.stringify(arr)); }
function getGroups() { return JSON.parse(localStorage.getItem('wp_groups') || '[]'); }
function saveGroups(arr) { localStorage.setItem('wp_groups', JSON.stringify(arr)); }
function getGroupExpenses() { return JSON.parse(localStorage.getItem('wp_group_expenses') || '[]'); }
function saveGroupExpenses(arr) { localStorage.setItem('wp_group_expenses', JSON.stringify(arr)); }

function generateId(prefix) { return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2,3); }

function getPersonById(id) {
    if (id === 'self') return { id: 'self', name: 'You', initials: 'You', color: '#8b5cf6' };
    return getPeople().find(p => p.id === id) || null;
}

function getGroupById(id) { return getGroups().find(g => g.id === id) || null; }

const AVATAR_PALETTE = ['#6366f1','#8b5cf6','#34d399','#f87171','#fbbf24','#60a5fa','#f472b6','#fb923c'];
let currentGroupId = null;
let currentExpenseId = null;

// B - People CRUD
function addPerson(name) {
    const people = getPeople();
    const words = name.trim().split(' ');
    let initials = words[0][0];
    if (words.length > 1) initials += words[words.length - 1][0];
    initials = initials.toUpperCase();
    
    const color = AVATAR_PALETTE[people.length % AVATAR_PALETTE.length];
    const newPerson = { id: generateId('p'), name: name.trim(), initials, color, createdAt: new Date().toISOString().split('T')[0] };
    people.push(newPerson);
    savePeople(people);
    showToast('Person added', 'success');
    return newPerson;
}

function editPerson(id, newName) {
    const people = getPeople();
    const p = people.find(x => x.id === id);
    if (p) {
        p.name = newName.trim();
        const words = p.name.split(' ');
        let initials = words[0][0];
        if (words.length > 1) initials += words[words.length - 1][0];
        p.initials = initials.toUpperCase();
        savePeople(people);
        renderPeopleList();
    }
}

function deletePerson(id) {
    const groups = getGroups();
    const inGroup = groups.some(g => !g.isArchived && g.memberIds.includes(id));
    if (inGroup) {
        $('ap-name-err').textContent = 'Remove this person from all groups first';
        $('ap-name-err').style.display = 'block';
        return;
    }
    let people = getPeople();
    people = people.filter(p => p.id !== id);
    savePeople(people);
    closeModal('modal-add-person');
    closeModal('modal-edit-person');
    renderPeopleList();
}

// C - Groups CRUD
function addGroup(name, memberIds) {
    if (!memberIds.includes('self')) memberIds.push('self');
    const groups = getGroups();
    const newGroup = { id: generateId('g'), name: name.trim(), memberIds, createdAt: new Date().toISOString().split('T')[0], isArchived: false };
    groups.push(newGroup);
    saveGroups(groups);
    showToast('Group created', 'success');
    navigateTo('group-detail', newGroup.id);
    return newGroup;
}

function editGroup(id, newName, newMemberIds) {
    const groups = getGroups();
    const g = groups.find(x => x.id === id);
    if (g) {
        g.name = newName.trim();
        if (!newMemberIds.includes('self')) newMemberIds.push('self');
        g.memberIds = newMemberIds;
        saveGroups(groups);
        renderGroupDetail(id);
        closeModal('modal-edit-group');
    }
}

function archiveGroup(id) {
    const groups = getGroups();
    const g = groups.find(x => x.id === id);
    if (g) {
        g.isArchived = true;
        saveGroups(groups);
        navigateTo('groups');
    }
}

function deleteGroup(id) {
    showConfirmDialog("Delete group and all its expenses? This cannot be undone.", () => {
        let expenses = getGroupExpenses();
        expenses = expenses.filter(e => e.groupId !== id);
        saveGroupExpenses(expenses);
        let groups = getGroups();
        groups = groups.filter(g => g.id !== id);
        saveGroups(groups);
        closeModal('modal-edit-group');
        navigateTo('groups');
    });
}

// D - Group Expenses CRUD
function addGroupExpense(groupId, description, amount, paidBy, date, splitMethod, splits, category) {
    if (!description.trim() || amount <= 0 || splits.length === 0) return false;
    const sum = splits.reduce((acc, s) => acc + s.share, 0);
    if (Math.abs(sum - amount) > 0.05) return false;
    
    const exps = getGroupExpenses();
    const newExp = {
        id: generateId('ge'),
        groupId, description: description.trim(), amount, paidBy, date, category, splitMethod, splits,
        linkedTransactionId: null,
        createdAt: new Date().toISOString()
    };
    exps.push(newExp);
    saveGroupExpenses(exps);
    showToast('Expense added', 'success');
    return newExp;
}

function editGroupExpense(id, description, amount, paidBy, date, splitMethod, splits, category) {
    if (!description.trim() || amount <= 0 || splits.length === 0) return false;
    const sum = splits.reduce((acc, s) => acc + s.share, 0);
    if (Math.abs(sum - amount) > 0.05) return false;
    
    const exps = getGroupExpenses();
    const exp = exps.find(e => e.id === id);
    if (exp) {
        exp.description = description.trim(); exp.amount = amount; exp.paidBy = paidBy;
        exp.date = date; exp.splitMethod = splitMethod; exp.splits = splits; exp.category = category;
        if (exp.linkedTransactionId) {
            const t = transactions.find(x => x.id === exp.linkedTransactionId);
            if (t) { t.amount = amount; t.description = exp.description + ' (Group: ' + getGroupById(exp.groupId).name + ')'; t.date = date; t.category = category; saveTransactions(); }
        }
        saveGroupExpenses(exps);
    }
    return true;
}

function deleteGroupExpense(id) {
    showConfirmDialog("Delete this expense?", () => {
        let exps = getGroupExpenses();
        const exp = exps.find(e => e.id === id);
        if (exp && exp.linkedTransactionId) unsyncExpenseFromPersonalTransactions(id);
        exps = exps.filter(e => e.id !== id);
        saveGroupExpenses(exps);
        closeModal('modal-expense-detail');
        renderGroupDetail(currentGroupId);
        showToast('Expense deleted', 'success');
    });
}

// E - Split Calculation
function calculateEqualSplits(memberIds, totalAmount) {
    const count = memberIds.length;
    const base = Math.floor((totalAmount / count) * 100) / 100;
    let remainder = Math.round((totalAmount - (base * count)) * 100);
    return memberIds.map((id, index) => {
        let share = base;
        if (remainder > 0) { share += 0.01; remainder -= 1; }
        return { personId: id, share: Math.round(share * 100) / 100, settled: false };
    });
}

function calculateAmountSplits(memberIds, amounts) {
    return memberIds.map(id => ({ personId: id, share: amounts[id] || 0, settled: false }));
}

function calculatePercentSplits(memberIds, percents, totalAmount) {
    let remainder = totalAmount;
    const res = memberIds.map(id => {
        let pct = percents[id] || 0;
        let s = Math.floor((totalAmount * pct / 100) * 100) / 100;
        remainder -= s;
        return { personId: id, share: s, settled: false };
    });
    if (remainder > 0 && res.length > 0) {
        res[0].share = Math.round((res[0].share + remainder) * 100) / 100;
    }
    return res;
}

// F - Balance Calculation
function getNetBalancesForGroup(groupId) {
    const exps = getGroupExpenses().filter(e => e.groupId === groupId);
    const net = {};
    const g = getGroupById(groupId);
    if (!g) return net;
    g.memberIds.forEach(id => net[id] = 0);
    
    exps.forEach(exp => {
        net[exp.paidBy] = (net[exp.paidBy] || 0) + exp.amount;
        exp.splits.forEach(s => {
            if (!s.settled) {
                net[s.personId] = (net[s.personId] || 0) - s.share;
            } else if (s.settled && exp.paidBy !== s.personId) {
                net[exp.paidBy] -= s.share;
            }
        });
    });
    return net;
}

function getSimplifiedSettlements(groupId) {
    const net = getNetBalancesForGroup(groupId);
    const creditors = [], debtors = [];
    for (const [id, bal] of Object.entries(net)) {
        if (bal > 0.01) creditors.push({ id, bal });
        else if (bal < -0.01) debtors.push({ id, bal: Math.abs(bal) });
    }
    creditors.sort((a,b) => b.bal - a.bal);
    debtors.sort((a,b) => b.bal - a.bal);
    
    const trans = [];
    let i = 0, j = 0;
    while(i < debtors.length && j < creditors.length) {
        const d = debtors[i], c = creditors[j];
        const amt = Math.min(d.bal, c.bal);
        if (amt > 0.01) trans.push({ from: d.id, to: c.id, amount: amt });
        d.bal -= amt; c.bal -= amt;
        if (d.bal < 0.01) i++;
        if (c.bal < 0.01) j++;
    }
    return trans;
}

function getSelfBalanceInGroup(groupId) {
    const exps = getGroupExpenses().filter(e => e.groupId === groupId);
    let owes = 0, getsBack = 0;
    exps.forEach(exp => {
        if (exp.paidBy === 'self') {
            exp.splits.forEach(s => { if (s.personId !== 'self' && !s.settled) getsBack += s.share; });
        } else {
            exp.splits.forEach(s => { if (s.personId === 'self' && !s.settled) owes += s.share; });
        }
    });
    return { owes, getsBack };
}

function getGlobalSelfBalance() {
    let to = 0, tg = 0;
    getGroups().filter(g => !g.isArchived).forEach(g => {
        const { owes, getsBack } = getSelfBalanceInGroup(g.id);
        to += owes; tg += getsBack;
    });
    return { totalOwes: to, totalGetsBack: tg, netBalance: tg - to };
}

function getAllPendingSettlements() {
    let arr = [];
    getGroups().filter(g => !g.isArchived).forEach(g => {
        const st = getSimplifiedSettlements(g.id);
        st.forEach(t => {
            if (t.from === 'self' || t.to === 'self') {
                t.groupId = g.id; t.groupName = g.name; arr.push(t);
            }
        });
    });
    return arr;
}

// G - Settle Up
function settleExpenseSplit(expenseId, personId) {
    const exps = getGroupExpenses();
    const e = exps.find(x => x.id === expenseId);
    if (e) {
        const s = e.splits.find(x => x.personId === personId);
        if (s) s.settled = true;
        saveGroupExpenses(exps);
    }
}

function settleAllWithPerson(personId, groupId) {
    const exps = getGroupExpenses();
    exps.filter(e => e.groupId === groupId).forEach(e => {
        if (e.paidBy === 'self' || e.paidBy === personId) {
            const targetId = e.paidBy === 'self' ? personId : 'self';
            const s = e.splits.find(x => x.personId === targetId);
            if (s) s.settled = true;
        }
    });
    saveGroupExpenses(exps);
    renderSettleUpView();
    if (currentView === 'group-detail') renderGroupDetail(groupId);
    
    if($('sm-form')) {
        document.querySelectorAll('#sm-method-btns .type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#sm-method-btns .type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        $('sm-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const from = $('sm-from').value;
            const to = $('sm-to').value;
            const group = $('sm-group').value;
            const method = document.querySelector('#sm-method-btns .type-btn.active').dataset.method;
            const amt = $('sm-amount').value;
            markSettlementPaid(from, to, group, method, amt);
            closeModal('modal-settle-payment');
        });
    }
    
    renderDashboardGroupsWidget();
}


function openSettleModal(from, to, groupId, amount) {
    if (!$('modal-settle-payment')) return;
    const fromP = getPersonById(from);
    const toP = getPersonById(to);
    $('sm-from').value = from;
    $('sm-to').value = to;
    $('sm-group').value = groupId;
    $('sm-amount').value = amount;
    
    const isReceiving = to === 'self';
    const text = isReceiving 
        ? `Mark ₹${amount} as received from ${fromP.name}?` 
        : `Record ₹${amount} payment to ${toP.name}?`;
    $('sm-subtitle').textContent = text;
    
    document.querySelectorAll('#sm-method-btns .type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#sm-method-btns .type-btn[data-method="Cash"]').classList.add('active');
    
    $('modal-settle-payment').classList.add('visible');
}

function markSettlementPaid(from, to, groupId, method, amount) {
    const otherId = from === 'self' ? to : from;
    settleAllWithPerson(otherId, groupId);
    
    // Create a payment record to show in expenses
    const exps = getGroupExpenses();
    const newExp = {
        id: generateId('ge'),
        groupId: groupId,
        description: 'Payment - ' + method,
        amount: parseFloat(amount),
        paidBy: from,
        date: new Date().toISOString().split('T')[0],
        category: 'other_exp',
        splitMethod: 'amount',
        splits: [{ personId: to, share: parseFloat(amount), settled: true }],
        linkedTransactionId: null,
        createdAt: new Date().toISOString()
    };
    exps.push(newExp);
    saveGroupExpenses(exps);
    
    showToast(`Settlement marked as paid via ${method}`, 'success');
}


// H - Personal Finance Sync
function syncExpenseToPersonalTransactions(expenseId) {
    const exps = getGroupExpenses();
    const exp = exps.find(e => e.id === expenseId);
    if (exp && exp.paidBy === 'self' && !exp.linkedTransactionId) {
        const g = getGroupById(exp.groupId);
        const myShare = exp.splits.find(s => s.personId === 'self')?.share || 0;
        const amtToTrack = exp.amount - myShare;
        if (amtToTrack > 0) {
            const tId = generateId('t');
            transactions.push({
                id: tId, type: 'expense', description: exp.description + ' (Group: ' + g.name + ')',
                amount: amtToTrack, category: exp.category || 'other_exp', date: exp.date, notes: 'Auto-synced from group expense'
            });
            saveTransactions();
            exp.linkedTransactionId = tId;
            saveGroupExpenses(exps);
            showToast('Synced to personal transactions', 'success');
        }
    }
}

function unsyncExpenseFromPersonalTransactions(expenseId) {
    const exps = getGroupExpenses();
    const exp = exps.find(e => e.id === expenseId);
    if (exp && exp.linkedTransactionId) {
        transactions = transactions.filter(t => t.id !== exp.linkedTransactionId);
        saveTransactions();
        exp.linkedTransactionId = null;
        saveGroupExpenses(exps);
    }
}

// I - View Rendering
function fmtINR(amount) {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function renderGroupsList() {
    const groups = getGroups().filter(g => !g.isArchived).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const archived = getGroups().filter(g => g.isArchived);
    const list = $('groups-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (groups.length === 0 && archived.length === 0) {
        list.innerHTML = '<p class="empty-title">No groups yet. Tap "New Group" to create one.</p>';
        $('archived-groups-section').style.display = 'none';
        return;
    }
    
    groups.forEach(g => {
        const { netBalance } = getGlobalSelfBalance();
        const { owes, getsBack } = getSelfBalanceInGroup(g.id);
        const net = getsBack - owes;
        let badge = '<div class="balance-badge neutral">All settled</div>';
        if (net > 0.01) badge = `<div class="balance-badge positive">You get ${fmtINR(net)}</div>`;
        else if (net < -0.01) badge = `<div class="balance-badge negative">You owe ${fmtINR(Math.abs(net))}</div>`;
        
        const exps = getGroupExpenses().filter(e => e.groupId === g.id);
        
        const div = document.createElement('div');
        div.className = 'group-card';
        div.innerHTML = `
            <div class="avatar avatar-lg" style="background:var(--accent-indigo)">${g.name[0].toUpperCase()}</div>
            <div class="group-details">
                <div class="group-name">${g.name}</div>
                <div class="group-meta">${g.memberIds.length} members • ${exps.length} expenses</div>
            </div>
            ${badge}
        `;
        div.onclick = () => navigateTo('group-detail', g.id);
        list.appendChild(div);
    });
    
    if (archived.length > 0) {
        $('archived-groups-section').style.display = 'block';
        const aList = $('archived-groups-list');
        aList.innerHTML = '';
        archived.forEach(g => {
            const div = document.createElement('div');
            div.className = 'group-card';
            div.innerHTML = `
                <div class="avatar avatar-lg" style="background:var(--text-muted)">${g.name[0].toUpperCase()}</div>
                <div class="group-details">
                    <div class="group-name">${g.name}</div>
                    <div class="group-meta">Archived</div>
                </div>
            `;
            div.onclick = () => navigateTo('group-detail', g.id);
            aList.appendChild(div);
        });
    } else {
        $('archived-groups-section').style.display = 'none';
    }
}

function renderGroupDetail(groupId) {
    currentGroupId = groupId;
    const g = getGroupById(groupId);
    if (!g) return navigateTo('groups');
    
    $('gd-title').textContent = g.name;
    const exps = getGroupExpenses().filter(e => e.groupId === groupId);
    const totalSpent = exps.reduce((acc, e) => acc + e.amount, 0);
    $('gd-total-spent').textContent = fmtINR(totalSpent);
    
    let myShare = 0;
    exps.forEach(e => {
        const s = e.splits.find(x => x.personId === 'self');
        if (s) myShare += s.share;
    });
    $('gd-your-share').textContent = fmtINR(myShare);
    
    const mRow = $('gd-members-row');
    mRow.innerHTML = '';
    g.memberIds.forEach(id => {
        const p = getPersonById(id);
        const div = document.createElement('div');
        div.className = 'avatar avatar-sm';
        div.style.background = p.color;
        div.textContent = p.initials;
        div.title = p.name;
        mRow.appendChild(div);
    });
    

        const addBtn = document.createElement('div');
    addBtn.className = 'avatar avatar-sm';
    addBtn.style.background = 'transparent';
    addBtn.style.border = '1px dashed var(--text-muted)';
    addBtn.style.color = 'var(--text-muted)';
    addBtn.style.cursor = 'pointer';
    addBtn.innerHTML = '+';
    addBtn.onclick = () => openEditGroupModal(groupId);
    mRow.appendChild(addBtn);
    
    renderGroupExpenses(groupId);
    renderGroupBalances(groupId);
}

function renderGroupExpenses(groupId) {
    const list = $('gd-expenses-list');
    const exps = getGroupExpenses().filter(e => e.groupId === groupId).sort((a,b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = '';
    if (exps.length === 0) {
        list.innerHTML = '<p class="empty-title" style="text-align:center; padding:2rem 0; color:var(--text-muted);">No expenses yet.</p>';
        return;
    }
    exps.forEach(e => {
        const p = getPersonById(e.paidBy);
        const mySplit = e.splits.find(s => s.personId === 'self');
        let badge = '';
        if (e.paidBy === 'self') {
            const amtToGet = e.amount - (mySplit ? mySplit.share : 0);
            if (amtToGet > 0) badge = `<div class="txn-amount income">lent ${fmtINR(amtToGet)}</div>`;
        } else if (mySplit) {
            badge = `<div class="txn-amount expense">borrowed ${fmtINR(mySplit.share)}</div>`;
        } else {
            badge = `<div class="txn-amount" style="color:var(--text-muted); font-size:0.75rem;">not involved</div>`;
        }
        
        const card = document.createElement('div');
        card.className = 'txn-item';
        card.innerHTML = `
            <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
            <div class="txn-details">
                <div class="txn-desc">${e.description}</div>
                <div class="txn-meta">${p.name} paid ${fmtINR(e.amount)} • ${new Date(e.date).toLocaleDateString()}</div>
            </div>
            ${badge}
        `;
        card.onclick = () => openExpenseDetailModal(e.id);
        list.appendChild(card);
    });
}

function renderGroupBalances(groupId) {
    const g = getGroupById(groupId);
    const list = $('gd-balances-list');
    const net = getNetBalancesForGroup(groupId);
    list.innerHTML = '';
    g.memberIds.forEach(id => {
        const p = getPersonById(id);
        const bal = net[id];
        let badge = '<div class="balance-badge neutral">Settled</div>';
        if (bal > 0.01) badge = `<div class="balance-badge positive">Gets ${fmtINR(bal)}</div>`;
        else if (bal < -0.01) badge = `<div class="balance-badge negative">Owes ${fmtINR(Math.abs(bal))}</div>`;
        
        const card = document.createElement('div');
        card.className = 'person-card';
        card.innerHTML = `
            <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
            <div class="person-details"><div class="person-name">${p.name}</div></div>
            ${badge}
        `;
        list.appendChild(card);
    });
    
    const setList = $('gd-settlements-list');
    setList.innerHTML = '';
    const trans = getSimplifiedSettlements(groupId);
    if (trans.length === 0) {
        setList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1rem;">All settled up!</p>';
        return;
    }
    trans.forEach(t => {
        const fr = getPersonById(t.from);
        const to = getPersonById(t.to);
        const card = document.createElement('div');
        card.className = 'settle-item';
        card.innerHTML = `
            <div class="avatar avatar-sm" style="background:${fr.color}">${fr.initials}</div>
            <div style="flex:1; font-size:0.875rem;"><strong>${fr.name}</strong> pays <strong>${to.name}</strong></div>
            <div style="font-weight:600;">${fmtINR(t.amount)}</div>
            ${t.from === 'self' || t.to === 'self' ? `<button class="settle-btn" onclick="openSettleModal('${t.from}', '${t.to}', '${groupId}', ${t.amount})">Settle</button>` : ''}
        `;
        setList.appendChild(card);
    });
}

function renderPeopleList() {
    const list = $('people-list');
    if(!list) return;
    const people = getPeople();
    list.innerHTML = '';
    if (people.length === 0) {
        list.innerHTML = '<p class="empty-title">No people added yet.</p>';
        return;
    }
    people.forEach(p => {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.innerHTML = `
            <div class="avatar" style="background:${p.color}">${p.initials}</div>
            <div class="person-details">
                <div class="person-name">${p.name}</div>
            </div>
            <button class="menu-btn" onclick="openEditPersonModal('${p.id}')">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 3a2 2 0 112.8 2.8L5 14H2v-3L11 3z"></path></svg>
            </button>
        `;
        list.appendChild(card);
    });
}

function renderSettleUpView() {
    const gb = getGlobalSelfBalance();
    $('su-global-balance').textContent = fmtINR(Math.abs(gb.netBalance));
    $('su-global-balance').style.color = gb.netBalance > 0.01 ? 'var(--accent-green)' : gb.netBalance < -0.01 ? 'var(--accent-red)' : 'var(--text-primary)';
    
    const oweList = $('su-you-owe-list');
    const owedList = $('su-owed-to-you-list');
    oweList.innerHTML = ''; owedList.innerHTML = '';
    
    const trans = getAllPendingSettlements();
    const youOwe = trans.filter(t => t.from === 'self');
    const owedYou = trans.filter(t => t.to === 'self');
    
    if (youOwe.length === 0) oweList.innerHTML = '<p class="empty-title" style="font-size:0.875rem;">You owe nothing!</p>';
    youOwe.forEach(t => {
        const to = getPersonById(t.to);
        const card = document.createElement('div');
        card.className = 'settle-item';
        card.innerHTML = `
            <div class="avatar avatar-sm" style="background:${to.color}">${to.initials}</div>
            <div style="flex:1;">
                <div style="font-weight:500; font-size:0.875rem;">${to.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${t.groupName}</div>
            </div>
            <div style="color:var(--accent-red); font-weight:600;">${fmtINR(t.amount)}</div>
            <button class="settle-btn" onclick="openSettleModal('self', '${t.to}', '${t.groupId}', ${t.amount})">Settle</button>
        `;
        oweList.appendChild(card);
    });
    
    if (owedYou.length === 0) owedList.innerHTML = '<p class="empty-title" style="font-size:0.875rem;">Nobody owes you.</p>';
    owedYou.forEach(t => {
        const fr = getPersonById(t.from);
        const card = document.createElement('div');
        card.className = 'settle-item';
        card.innerHTML = `
            <div class="avatar avatar-sm" style="background:${fr.color}">${fr.initials}</div>
            <div style="flex:1;">
                <div style="font-weight:500; font-size:0.875rem;">${fr.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${t.groupName}</div>
            </div>
            <div style="color:var(--accent-green); font-weight:600;">${fmtINR(t.amount)}</div>
            <button class="settle-btn" style="background:var(--accent-green);" onclick="openSettleModal('${t.from}', 'self', '${t.groupId}', ${t.amount})">Mark Paid</button>
        `;
        owedList.appendChild(card);
    });
}

function renderDashboardGroupsWidget() {
    const list = $('dash-groups-list');
    const slist = $('dash-settlements-list');
    if (!list || !slist) return;
    
    const gb = getGlobalSelfBalance();
    $('dash-bal-amt').textContent = fmtINR(Math.abs(gb.netBalance));
    $('dash-bal-amt').style.color = gb.netBalance > 0.01 ? 'var(--accent-green)' : gb.netBalance < -0.01 ? 'var(--accent-red)' : 'var(--text-primary)';
    $('dash-bal-sub').textContent = gb.netBalance > 0.01 ? 'Owed to you' : gb.netBalance < -0.01 ? 'You owe' : 'All settled';
    
    const groups = getGroups().filter(g => !g.isArchived).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,3);
    list.innerHTML = '';
    if(groups.length === 0) list.innerHTML = '<p class="empty-title" style="font-size:0.875rem;">No groups yet.</p>';
    groups.forEach(g => {
        const { owes, getsBack } = getSelfBalanceInGroup(g.id);
        const netBalance = getsBack - owes;
        const div = document.createElement('div');
        div.className = 'group-card';
        div.innerHTML = `
            <div class="avatar avatar-sm" style="background:var(--accent-indigo)">${g.name[0].toUpperCase()}</div>
            <div class="group-details"><div class="group-name">${g.name}</div></div>
            <div class="balance-badge ${netBalance > 0.01 ? 'positive' : netBalance < -0.01 ? 'negative' : 'neutral'}">${netBalance > 0.01 ? 'Get '+fmtINR(netBalance) : netBalance < -0.01 ? 'Owe '+fmtINR(Math.abs(netBalance)) : 'Settled'}</div>
        `;
        div.onclick = () => navigateTo('group-detail', g.id);
        list.appendChild(div);
    });
    
    const trans = getAllPendingSettlements().slice(0,3);
    slist.innerHTML = '';
    if(trans.length === 0) slist.innerHTML = '<p class="empty-title" style="font-size:0.875rem;">No pending settlements.</p>';
    trans.forEach(t => {
        const p = getPersonById(t.from === 'self' ? t.to : t.from);
        const isOwe = t.from === 'self';
        const div = document.createElement('div');
        div.className = 'settle-item';
        div.innerHTML = `
            <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
            <div style="flex:1; font-size:0.875rem;">${isOwe ? 'You owe '+p.name : p.name+' owes you'}</div>
            <div style="font-weight:600; color:var(--accent-${isOwe ? 'red' : 'green'});">${fmtINR(t.amount)}</div>
        `;
        slist.appendChild(div);
    });
}

// J - Modal Handlers
function openAddGroupModal() {
    if(!$('modal-add-group')) return;
    $('ag-form').reset();
    $('ag-name-err').style.display = 'none';
    $('ag-members-err').style.display = 'none';
    const ml = $('ag-members-list');
    ml.innerHTML = '';
    const people = getPeople();
    people.forEach(p => {
        const div = document.createElement('label');
        div.className = 'member-checkbox';
        div.innerHTML = `<input type="checkbox" value="${p.id}"> <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div> <span>${p.name}</span>`;
        ml.appendChild(div);
    });
    $('modal-add-group').classList.add('visible');
    $('ag-name').focus();
}

function openEditGroupModal(id) {
    const g = getGroupById(id);
    if (!g) return;
    $('eg-id').value = id;
    $('eg-name').value = g.name;
    const ml = $('eg-members-list');
    ml.innerHTML = '';
    const people = getPeople();
    people.forEach(p => {
        const div = document.createElement('label');
        div.className = 'member-checkbox';
        const checked = g.memberIds.includes(p.id) ? 'checked' : '';
        div.innerHTML = `<input type="checkbox" value="${p.id}" ${checked}> <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div> <span>${p.name}</span>`;
        ml.appendChild(div);
    });
    $('modal-edit-group').classList.add('visible');
}

function openAddExpenseModal(groupId) {
    const groups = getGroups();
    if (groups.length === 0) {
        showToast('Please create a group first.', 'error');
        return;
    }

    $('ae-form').reset();
    $('ae-id').value = '';
    $('ae-date').value = new Date().toISOString().split('T')[0];
    
    // populate categories
    const catSelect = $('ae-category');
    catSelect.innerHTML = '';
    CATEGORIES.expense.forEach(c => {
        catSelect.innerHTML += `<option value="${c.id}">${c.emoji} ${c.name}</option>`;
    });

    const groupSelect = $('ae-group');
    const groupContainer = $('ae-group-container');
    
    let targetGroup = groupId;
    if (groupId) {
        groupContainer.style.display = 'none';
        groupSelect.innerHTML = `<option value="${groupId}">Group</option>`;
    } else {
        groupContainer.style.display = 'block';
        groupSelect.innerHTML = '';
        groups.forEach(g => {
            groupSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
        });
        targetGroup = groups[0].id; // default to first
    }
    
    const populateGroupData = (gId) => {
        const pb = $('ae-paidby');
        pb.innerHTML = '';
        const g = getGroupById(gId);
        if (!g) return;
        g.memberIds.forEach(id => {
            const p = getPersonById(id);
            pb.innerHTML += `<option value="${id}">${p.name}</option>`;
        });
        pb.value = 'self';
    };

    populateGroupData(targetGroup);

    // If dropdown changes, repopulate
    groupSelect.onchange = (e) => {
        populateGroupData(e.target.value);
        $('ae-amount').value = '';
        renderSplitRows();
    };

    document.querySelectorAll('#modal-add-expense .type-btn').forEach(b => b.classList.remove('active'));
    $('ae-split-equal').classList.add('active');
    $('modal-add-expense').classList.add('visible');
    $('ae-desc').focus();
    renderSplitRows();
}

function openEditExpenseModal(id) {
    const exps = getGroupExpenses();
    const exp = exps.find(e => e.id === id);
    if (!exp) return;
    
    openAddExpenseModal(exp.groupId); // Prepares dropdowns
    $('ae-id').value = exp.id;
    $('ae-desc').value = exp.description;
    $('ae-amount').value = exp.amount;
    $('ae-paidby').value = exp.paidBy;
    $('ae-date').value = exp.date;
    $('ae-category').value = exp.category || 'other_exp';
    
    document.querySelectorAll('#modal-add-expense .type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`#ae-split-${exp.splitMethod}`).classList.add('active');
    
    // Populate specific shares
    renderSplitRows(exp.splits);
}

function openExpenseDetailModal(id) {
    const exps = getGroupExpenses();
    const exp = exps.find(e => e.id === id);
    if (!exp) return;
    currentExpenseId = id;
    
    $('ed-title').textContent = exp.description;
    $('ed-meta').textContent = `Paid by ${getPersonById(exp.paidBy).name} on ${new Date(exp.date).toLocaleDateString()}`;
    $('ed-amount').textContent = fmtINR(exp.amount);
    $('ed-method').textContent = exp.splitMethod === 'equal' ? 'Equally' : exp.splitMethod === 'amount' ? 'By Exact Amount' : 'By Percentage';
    
    const splitsList = $('ed-splits');
    splitsList.innerHTML = '';
    exp.splits.forEach(s => {
        const p = getPersonById(s.personId);
        const div = document.createElement('div');
        div.className = 'split-breakdown-row';
        div.innerHTML = `
            <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
            <div style="flex:1; font-size:0.875rem;">${p.name}</div>
            <div style="font-weight:600;">${fmtINR(s.share)}</div>
        `;
        splitsList.appendChild(div);
    });
    
    if (exp.paidBy === 'self') {
        $('ed-sync-container').style.display = 'block';
        $('ed-sync-check').checked = !!exp.linkedTransactionId;
        $('ed-sync-check').onchange = (e) => {
            if (e.target.checked) syncExpenseToPersonalTransactions(exp.id);
            else unsyncExpenseFromPersonalTransactions(exp.id);
        };
    } else {
        $('ed-sync-container').style.display = 'none';
    }
    
    $('modal-expense-detail').classList.add('visible');
}

function openAddPersonModal() {
    if(!$('modal-add-person')) return;
    $('ap-form').reset();
    $('ap-id').value = '';
    $('ap-name-err').style.display = 'none';
    $('ap-delete-btn').style.display = 'none';
    $('ap-title').textContent = 'Add Person';
    $('modal-add-person').classList.add('visible');
    $('ap-name').focus();
}

function openEditPersonModal(id) {
    if(!$('modal-add-person')) return;
    const p = getPersonById(id);
    if (!p) return;
    $('ap-form').reset();
    $('ap-id').value = id;
    $('ap-name').value = p.name;
    $('ap-name-err').style.display = 'none';
    $('ap-delete-btn').style.display = 'block';
    $('ap-title').textContent = 'Edit Person';
    $('modal-add-person').classList.add('visible');
}

function closeModal(id) {
    if($(id)) $(id).classList.remove('visible');
}

function showConfirmDialog(msg, cb) { showConfirm(msg, cb); }

// K - Navigation & Init
function navigateTo(viewId, param) {
    if (viewId === 'group-detail') currentGroupId = param;
    navigate(viewId);
}

function initGroupsFeature() {
    if (!localStorage.getItem('wp_people')) savePeople([{ id: 'self', name: 'You', initials: 'You', color: '#8b5cf6', createdAt: new Date().toISOString() }]);
    if (!localStorage.getItem('wp_groups')) saveGroups([]);
    if (!localStorage.getItem('wp_group_expenses')) saveGroupExpenses([]);
    
    // Wire up events
    if($('nav-groups')) $('nav-groups').addEventListener('click', () => navigateTo('groups'));
    if($('nav-people')) $('nav-people').addEventListener('click', () => navigateTo('people'));
    if($('nav-settle-up')) $('nav-settle-up').addEventListener('click', () => navigateTo('settle-up'));
    
    if($('btn-create-group')) $('btn-create-group').addEventListener('click', openAddGroupModal);
    if($('btn-add-person')) $('btn-add-person').addEventListener('click', openAddPersonModal);
    if($('btn-back-from-group')) $('btn-back-from-group').addEventListener('click', () => navigateTo('groups'));
    if($('btn-edit-group')) $('btn-edit-group').addEventListener('click', () => openEditGroupModal(currentGroupId));
    if($('btn-add-expense')) $('btn-add-expense').addEventListener('click', () => openAddExpenseModal(currentGroupId));
    
    if($('tab-gd-expenses')) $('tab-gd-expenses').addEventListener('click', () => {
        $('tab-gd-expenses').classList.add('active'); $('tab-gd-balances').classList.remove('active');
        $('gd-content-expenses').style.display = 'block'; $('gd-content-balances').style.display = 'none';
    });
    if($('tab-gd-balances')) $('tab-gd-balances').addEventListener('click', () => {
        $('tab-gd-balances').classList.add('active'); $('tab-gd-expenses').classList.remove('active');
        $('gd-content-balances').style.display = 'block'; $('gd-content-expenses').style.display = 'none';
    });
    
    // Forms
    if($('ag-form')) $('ag-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('ag-name').value;
        const checks = Array.from(document.querySelectorAll('#ag-members-list input:checked')).map(c => c.value);
        
        // Validation rule: 1-50 chars, no duplicates
        const groups = getGroups();
        if (groups.some(g => g.name.toLowerCase() === name.trim().toLowerCase())) {
            $('ag-name-err').textContent = 'Group name must be unique';
            $('ag-name-err').style.display = 'block';
            return;
        }
        
        addGroup(name, checks);
        closeModal('modal-add-group');
        if (currentView === 'groups') renderGroupsList();
        else if (currentView === 'dashboard') renderDashboard();
    });
    
    if($('eg-form')) $('eg-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = $('eg-id').value;
        const name = $('eg-name').value;
        const checks = Array.from(document.querySelectorAll('#eg-members-list input:checked')).map(c => c.value);
        editGroup(id, name, checks);
    });
    
    if($('eg-delete-btn')) $('eg-delete-btn').addEventListener('click', () => {
        deleteGroup($('eg-id').value);
    });
    
    if($('ap-form')) $('ap-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = $('ap-id').value;
        const name = $('ap-name').value;
        const people = getPeople();
        if (people.some(p => p.id !== id && p.name.toLowerCase() === name.trim().toLowerCase())) {
            $('ap-name-err').textContent = 'Person name must be unique';
            $('ap-name-err').style.display = 'block';
            return;
        }
        if (id) editPerson(id, name);
        else addPerson(name);
        closeModal('modal-add-person');
    });
    
    if($('ap-delete-btn')) $('ap-delete-btn').addEventListener('click', () => {
        deletePerson($('ap-id').value);
    });
    
    if($('ae-form')) {
        $('ae-amount').addEventListener('input', () => renderSplitRows());
        document.querySelectorAll('#modal-add-expense .type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#modal-add-expense .type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderSplitRows();
            });
        });
        
        $('ae-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const id = $('ae-id').value;
            const desc = $('ae-desc').value;
            const amt = parseFloat($('ae-amount').value);
            const pb = $('ae-paidby').value;
            const date = $('ae-date').value;
            const cat = $('ae-category').value;
            const method = document.querySelector('#modal-add-expense .type-btn.active').dataset.method;
            
            const gId = ($('ae-group') && $('ae-group').value) ? $('ae-group').value : currentGroupId;
            if (!gId) return showToast('No group selected', 'error');

            const splits = [];
            document.querySelectorAll('#ae-split-rows .split-breakdown-row').forEach(row => {
                const pId = row.dataset.pid;
                let share = 0;
                if (method === 'amount') share = parseFloat(row.querySelector('input').value) || 0;
                else if (method === 'percent') share = (amt * (parseFloat(row.querySelector('input').value) || 0) / 100);
                if (method !== 'equal') splits.push({ personId: pId, share, settled: false });
            });
            
            let finalSplits = splits;
            if (method === 'equal') {
                const mIds = Array.from(document.querySelectorAll('#ae-split-rows .split-breakdown-row')).map(r => r.dataset.pid);
                finalSplits = calculateEqualSplits(mIds, amt);
            }
            
            if (id) editGroupExpense(id, desc, amt, pb, date, method, finalSplits, cat);
            else addGroupExpense(gId, desc, amt, pb, date, method, finalSplits, cat);
            
            closeModal('modal-add-expense');
            
            if (currentView === 'dashboard') {
                renderDashboard();
            } else if (currentView === 'group-detail') {
                renderGroupDetail(currentGroupId);
            } else if (currentView === 'groups') {
                renderGroupsList();
            }
        });
    }
    
    if($('ed-delete-btn')) $('ed-delete-btn').addEventListener('click', () => deleteGroupExpense(currentExpenseId));
    if($('ed-edit-btn')) $('ed-edit-btn').addEventListener('click', () => {
        closeModal('modal-expense-detail');
        openEditExpenseModal(currentExpenseId);
    });

    
    if($('sm-form')) {
        document.querySelectorAll('#sm-method-btns .type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#sm-method-btns .type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        $('sm-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const from = $('sm-from').value;
            const to = $('sm-to').value;
            const group = $('sm-group').value;
            const method = document.querySelector('#sm-method-btns .type-btn.active').dataset.method;
            const amt = $('sm-amount').value;
            markSettlementPaid(from, to, group, method, amt);
            closeModal('modal-settle-payment');
        });
    }
    
    renderDashboardGroupsWidget();
}

function renderSplitRows(existingSplits = null) {
    const rows = $('ae-split-rows');
    const err = $('ae-split-validation');
    if (!rows) return;
    
    const amt = parseFloat($('ae-amount').value) || 0;
    const method = document.querySelector('#modal-add-expense .type-btn.active').dataset.method;
    const gId = ($('ae-group') && $('ae-group').value) ? $('ae-group').value : currentGroupId;
    const g = getGroupById(gId);
    if (!g) return;
    
    rows.innerHTML = '';
    g.memberIds.forEach(id => {
        const p = getPersonById(id);
        const div = document.createElement('div');
        div.className = 'split-breakdown-row';
        div.dataset.pid = id;
        
        let inputHTML = '';
        if (method === 'equal') {
            inputHTML = `<div style="margin-left:auto; font-size:0.875rem; color:var(--text-secondary);">Auto</div>`;
        } else {
            let val = '';
            if (existingSplits) {
                const s = existingSplits.find(x => x.personId === id);
                if (s) val = method === 'amount' ? s.share : (s.share / amt * 100);
            }
            inputHTML = `<input type="number" step="0.01" min="0" placeholder="${method === 'amount' ? '0.00' : '0%'}" value="${val}" style="margin-left:auto; width:100px;">`;
        }
        
        div.innerHTML = `
            <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
            <div style="font-size:0.875rem; font-weight:500;">${p.name}</div>
            ${inputHTML}
        `;
        if (method !== 'equal') {
            div.querySelector('input').addEventListener('input', validateSplitRows);
        }
        rows.appendChild(div);
    });
    validateSplitRows();
}

function validateSplitRows() {
    const err = $('ae-split-validation');
    const saveBtn = $('ae-save-btn');
    const amt = parseFloat($('ae-amount').value) || 0;
    const method = document.querySelector('#modal-add-expense .type-btn.active').dataset.method;
    
    if (method === 'equal' || amt <= 0) {
        err.style.display = 'none';
        saveBtn.disabled = false;
        return;
    }
    
    let sum = 0;
    document.querySelectorAll('#ae-split-rows input').forEach(inp => sum += parseFloat(inp.value) || 0);
    
    if (method === 'amount') {
        const diff = amt - sum;
        if (Math.abs(diff) < 0.01) {
            err.style.display = 'none';
            saveBtn.disabled = false;
        } else {
            err.style.display = 'block';
            err.textContent = diff > 0 ? `₹${diff.toFixed(2)} remaining` : `Over by ₹${Math.abs(diff).toFixed(2)}`;
            err.style.color = diff > 0 ? 'var(--text-primary)' : 'var(--accent-red)';
            saveBtn.disabled = true;
        }
    } else if (method === 'percent') {
        const diff = 100 - sum;
        if (Math.abs(diff) < 0.1) {
            err.style.display = 'none';
            saveBtn.disabled = false;
        } else {
            err.style.display = 'block';
            err.textContent = diff > 0 ? `${diff.toFixed(1)}% remaining` : `Over by ${Math.abs(diff).toFixed(1)}%`;
            err.style.color = diff > 0 ? 'var(--text-primary)' : 'var(--accent-red)';
            saveBtn.disabled = true;
        }
    }
}

// Hook into existing init
const _origInitApp = initApp;
initApp = function() {
    _origInitApp();
    initGroupsFeature();
    initPrivacy();
};
window.closeModal = closeModal;
window.openSettleModal = openSettleModal;


let isPrivate = false;
const PRIVATE_TARGETS = [
  'summaryCards',
  'chartCard',
  'donutCard',
  'budgetAmounts'
];

function togglePrivacy() {
  isPrivate = !isPrivate;

  const btn = document.getElementById('eyeToggleBtn');
  const label = document.getElementById('eyeLabel');
  const banner = document.getElementById('privacyBanner');
  const icon = document.getElementById('eyeIcon');

  PRIVATE_TARGETS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        if (isPrivate) el.classList.add('private-blur');
        else el.classList.remove('private-blur');
    }
  });

  document.querySelectorAll('.budget-amounts, .budget-percent').forEach(el => {
      if (isPrivate) el.classList.add('private-blur');
      else el.classList.remove('private-blur');
  });
  
  const recentList = document.getElementById('recent-list');
  if (recentList) {
      if (isPrivate) recentList.classList.add('private-blur');
      else recentList.classList.remove('private-blur');
  }

  if (isPrivate) {
    if(btn) btn.classList.add('eye-active');
    if(label) label.textContent = 'Show';
    if(banner) banner.style.display = 'flex';
    if(icon) {
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        icon.setAttribute('stroke', '#a5b4fc');
    }
    const donutText = document.getElementById('donutCenterAmount');
    if (donutText) donutText.style.filter = 'blur(5px)';
  } else {
    if(btn) btn.classList.remove('eye-active');
    if(label) label.textContent = 'Hide';
    if(banner) banner.style.display = 'none';
    if(icon) {
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        icon.setAttribute('stroke', '#9d97b5');
    }
    const donutText = document.getElementById('donutCenterAmount');
    if (donutText) donutText.style.filter = 'none';
  }

  localStorage.setItem('wp_privacy_mode', isPrivate ? '1' : '0');
}

function initPrivacy() {
  if (localStorage.getItem('wp_privacy_mode') === '1') {
    togglePrivacy();
  }
}
window.togglePrivacy = togglePrivacy;

})();
