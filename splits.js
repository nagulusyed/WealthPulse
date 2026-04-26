// =============================================
// Splitwise Feature Logic
// =============================================

function savePeople() { localStorage.setItem(PEOPLE_KEY, JSON.stringify(people)); }
function saveGroups() { localStorage.setItem(GROUPS_KEY, JSON.stringify(groups)); }
function saveGroupExpenses() { localStorage.setItem(EXPENSES_KEY, JSON.stringify(groupExpenses)); }

const AVATAR_COLORS = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee', '#fb923c'];

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}
function getPerson(id) {
    return people.find(p => p.id === id);
}
function getGroup(id) {
    return groups.find(g => g.id === id);
}

// ── Balance Calculation Logic ──

// Positive = owed money (gets money back), Negative = owes money (needs to pay)
function getPersonBalanceInGroup(personId, groupId) {
    const expenses = groupExpenses.filter(e => e.groupId === groupId);
    let balance = 0;
    expenses.forEach(exp => {
        // Did they pay?
        if (exp.paidBy === personId) {
            balance += exp.amount;
        }
        // Were they part of the split?
        const mySplit = exp.splits.find(s => s.personId === personId);
        if (mySplit) {
            balance -= mySplit.share;
        }
        
        // Handle settlements
        exp.settledBy.forEach(settlement => {
            if (settlement.from === personId) balance += settlement.amount;
            if (settlement.to === personId) balance -= settlement.amount;
        });
    });
    return balance;
}

function getGlobalBalance(personId = 'self') {
    let balance = 0;
    groups.forEach(g => {
        balance += getPersonBalanceInGroup(personId, g.id);
    });
    return balance;
}

// Simplifies debts within a group to minimize transactions
function getSimplifiedSettlements(groupId) {
    const group = getGroup(groupId);
    if (!group) return [];
    
    // 1. Calculate net balances for each member
    const balances = group.memberIds.map(id => ({
        id,
        balance: getPersonBalanceInGroup(id, groupId)
    }));
    
    // 2. Separate into debtors (balance < 0) and creditors (balance > 0)
    const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance); // most negative first
    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance); // most positive first
    
    const transactions = [];
    let d = 0, c = 0;
    
    // 3. Greedily settle debts
    while (d < debtors.length && c < creditors.length) {
        const debtor = debtors[d];
        const creditor = creditors[c];
        
        const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
        if (amount > 0.01) {
            transactions.push({
                from: debtor.id,
                to: creditor.id,
                amount: amount,
                groupId: groupId
            });
        }
        
        debtor.balance += amount;
        creditor.balance -= amount;
        
        if (Math.abs(debtor.balance) < 0.01) d++;
        if (creditor.balance < 0.01) c++;
    }
    
    return transactions;
}

function getAllSettlements() {
    let allTransactions = [];
    groups.forEach(g => {
        allTransactions.push(...getSimplifiedSettlements(g.id));
    });
    return allTransactions;
}

function settleDebt(fromId, toId, groupId, amount) {
    // Add a settlement record to the group
    // We treat settlements as special expenses where fromId pays toId
    const exp = {
        id: 'set_' + Date.now(),
        groupId: groupId,
        description: 'Settlement',
        amount: amount,
        paidBy: fromId,
        date: new Date().toISOString().split('T')[0],
        splitMethod: 'equal',
        splits: [
            { personId: toId, share: amount }
        ],
        settledBy: [], // Not used for settlements themselves
        createdAt: new Date().toISOString()
    };
    groupExpenses.push(exp);
    saveGroupExpenses();
    renderSettleUp();
}

// ── Views ──

function renderGroups() {
    const list = $('groups-list');
    const empty = $('groups-empty');
    list.innerHTML = '';
    
    if (groups.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    groups.forEach(g => {
        const bal = getPersonBalanceInGroup('self', g.id);
        const card = document.createElement('div');
        card.className = 'group-card';
        card.innerHTML = `
            <div class="avatar avatar-lg" style="background: var(--accent-indigo)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div class="group-details">
                <div class="group-name">${g.name}</div>
                <div class="group-meta">${g.memberIds.length} members</div>
            </div>
            <div class="balance-badge ${bal > 0.01 ? 'positive' : bal < -0.01 ? 'negative' : 'neutral'}">
                ${bal > 0.01 ? 'You get ₹' + bal.toLocaleString('en-IN') : bal < -0.01 ? 'You owe ₹' + Math.abs(bal).toLocaleString('en-IN') : 'Settled'}
            </div>
        `;
        card.onclick = () => {
            currentGroupId = g.id;
            navigate('group-detail');
        };
        list.appendChild(card);
    });
}

function renderPeople() {
    const list = $('people-list');
    const empty = $('people-empty');
    list.innerHTML = '';
    
    const others = people.filter(p => p.id !== 'self');
    if (others.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    others.forEach(p => {
        const bal = getGlobalBalance(p.id);
        const card = document.createElement('div');
        card.className = 'person-card';
        card.innerHTML = `
            <div class="avatar" style="background: ${p.color}">${p.initials}</div>
            <div class="person-details">
                <div class="person-name">${p.name}</div>
                <div class="person-meta">Added ${new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="balance-badge ${bal > 0.01 ? 'positive' : bal < -0.01 ? 'negative' : 'neutral'}">
                ${bal > 0.01 ? 'Gets ₹' + bal.toLocaleString('en-IN') : bal < -0.01 ? 'Owes ₹' + Math.abs(bal).toLocaleString('en-IN') : 'Settled'}
            </div>
        `;
        list.appendChild(card);
    });
}

function renderSettleUp() {
    const all = getAllSettlements();
    const youOwe = all.filter(t => t.from === 'self');
    const owedToYou = all.filter(t => t.to === 'self');
    
    const totalBal = getGlobalBalance('self');
    $('total-settle-amt').textContent = '₹' + Math.abs(totalBal).toLocaleString('en-IN');
    $('settle-overall-balance').style.borderLeft = '4px solid ' + (totalBal > 0.01 ? 'var(--accent-green)' : totalBal < -0.01 ? 'var(--accent-red)' : 'var(--text-muted)');
    
    const oweList = $('you-owe-list');
    oweList.innerHTML = '';
    if (youOwe.length === 0) oweList.innerHTML = '<p class="empty-sub" style="padding:1rem 0">You owe nothing!</p>';
    
    youOwe.forEach(t => {
        const p = getPerson(t.to);
        const g = getGroup(t.groupId);
        const div = document.createElement('div');
        div.className = 'settle-item';
        div.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${p.color}">${p.initials}</div>
            <div style="flex:1; min-width:0">
                <div style="font-weight:500; font-size:0.9rem">${p.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted)">in ${g.name}</div>
            </div>
            <div style="font-weight:600; color:var(--accent-red)">₹${t.amount.toLocaleString('en-IN')}</div>
            <button class="settle-btn" onclick="settleDebt('self', '${t.to}', '${t.groupId}', ${t.amount})">Settle</button>
        `;
        oweList.appendChild(div);
    });
    
    const owedList = $('owed-to-you-list');
    owedList.innerHTML = '';
    if (owedToYou.length === 0) owedList.innerHTML = '<p class="empty-sub" style="padding:1rem 0">Nobody owes you!</p>';
    
    owedToYou.forEach(t => {
        const p = getPerson(t.from);
        const g = getGroup(t.groupId);
        const div = document.createElement('div');
        div.className = 'settle-item';
        div.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${p.color}">${p.initials}</div>
            <div style="flex:1; min-width:0">
                <div style="font-weight:500; font-size:0.9rem">${p.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted)">in ${g.name}</div>
            </div>
            <div style="font-weight:600; color:var(--accent-green)">₹${t.amount.toLocaleString('en-IN')}</div>
            <button class="settle-btn" style="background:var(--accent-green)" onclick="settleDebt('${t.from}', 'self', '${t.groupId}', ${t.amount})">Mark Paid</button>
        `;
        owedList.appendChild(div);
    });
}

function renderGroupDetail(groupId) {
    if (!groupId) return;
    const group = getGroup(groupId);
    if (!group) return navigate('groups');
    
    $('gd-title').textContent = group.name;
    
    // Members row
    const mRow = $('gd-members-row');
    mRow.innerHTML = '';
    group.memberIds.forEach(mId => {
        const p = getPerson(mId);
        const div = document.createElement('div');
        div.className = 'avatar';
        div.style.background = p.color;
        div.title = p.name;
        div.textContent = p.initials;
        mRow.appendChild(div);
    });
    
    const expenses = groupExpenses.filter(e => e.groupId === groupId && e.description !== 'Settlement');
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    $('gd-total-spent').textContent = '₹' + totalSpent.toLocaleString('en-IN');
    
    const myBal = getPersonBalanceInGroup('self', groupId);
    $('gd-your-balance').textContent = (myBal < 0 ? '-' : '') + '₹' + Math.abs(myBal).toLocaleString('en-IN');
    $('gd-your-balance').style.color = myBal > 0.01 ? 'var(--accent-green)' : myBal < -0.01 ? 'var(--accent-red)' : 'var(--text-primary)';
    
    renderGroupExpenses(groupId, expenses);
    renderGroupBalances(groupId);
}

function renderGroupExpenses(groupId, expenses) {
    const list = $('gd-expenses-list');
    const empty = $('gd-expenses-empty');
    list.innerHTML = '';
    
    if (expenses.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    // Sort by date desc
    expenses.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    expenses.forEach(exp => {
        const p = getPerson(exp.paidBy);
        const mySplit = exp.splits.find(s => s.personId === 'self');
        let myText = '';
        let myClass = '';
        if (exp.paidBy === 'self') {
            myText = 'you lent ₹' + (exp.amount - (mySplit ? mySplit.share : 0)).toLocaleString('en-IN');
            myClass = 'income';
        } else if (mySplit) {
            myText = 'you borrowed ₹' + mySplit.share.toLocaleString('en-IN');
            myClass = 'expense';
        } else {
            myText = 'not involved';
        }
        
        const card = document.createElement('div');
        card.className = 'txn-item';
        card.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${p.color}">${p.initials}</div>
            <div class="txn-details">
                <div class="txn-desc">${exp.description}</div>
                <div class="txn-meta">${p.name} paid ₹${exp.amount.toLocaleString('en-IN')}</div>
            </div>
            <div class="txn-amount ${myClass}" style="font-size:0.8rem">${myText}</div>
        `;
        card.onclick = () => showExpenseDetail(exp.id);
        list.appendChild(card);
    });
}

function renderGroupBalances(groupId) {
    const list = $('gd-balances-list');
    const group = getGroup(groupId);
    list.innerHTML = '';
    
    group.memberIds.forEach(mId => {
        const p = getPerson(mId);
        const bal = getPersonBalanceInGroup(mId, groupId);
        
        const card = document.createElement('div');
        card.className = 'txn-item';
        card.innerHTML = `
            <div class="avatar avatar-sm" style="background: ${p.color}">${p.initials}</div>
            <div class="txn-details">
                <div class="txn-desc">${p.name}</div>
            </div>
            <div class="txn-amount ${bal > 0.01 ? 'income' : bal < -0.01 ? 'expense' : ''}">
                ${bal > 0.01 ? 'Gets ₹' + bal.toLocaleString('en-IN') : bal < -0.01 ? 'Owes ₹' + Math.abs(bal).toLocaleString('en-IN') : 'Settled'}
            </div>
        `;
        list.appendChild(card);
    });
    
    const setList = $('gd-settlements-list');
    setList.innerHTML = '';
    const settlements = getSimplifiedSettlements(groupId);
    if (settlements.length === 0) {
        setList.innerHTML = '<p class="empty-sub" style="padding:1rem; text-align:center;">All settled up!</p>';
    } else {
        settlements.forEach(t => {
            const fromP = getPerson(t.from);
            const toP = getPerson(t.to);
            const div = document.createElement('div');
            div.className = 'settle-item';
            div.innerHTML = `
                <div class="avatar avatar-sm" style="background: ${fromP.color}">${fromP.initials}</div>
                <div style="flex:1; font-size:0.875rem">
                    <strong>${fromP.name}</strong> pays <strong>${toP.name}</strong>
                </div>
                <div style="font-weight:600; color:var(--text-primary)">₹${t.amount.toLocaleString('en-IN')}</div>
                ${t.from === 'self' || t.to === 'self' ? `<button class="settle-btn" onclick="settleDebt('${t.from}', '${t.to}', '${t.groupId}', ${t.amount}); renderGroupDetail('${t.groupId}')">Settle</button>` : ''}
            `;
            setList.appendChild(div);
        });
    }
}

// ── Modals ──

function showAddPersonModal() {
    $('person-form').reset();
    $('person-modal').classList.add('visible');
    $('person-name').focus();
}

$('person-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('person-name').value.trim();
    if (!name) return;
    const color = AVATAR_COLORS[people.length % AVATAR_COLORS.length];
    people.push({
        id: 'p_' + Date.now(),
        name,
        initials: getInitials(name),
        color,
        createdAt: new Date().toISOString()
    });
    savePeople();
    $('person-modal').classList.remove('visible');
    renderPeople();
    showToast('Person added successfully');
});
$('person-cancel').addEventListener('click', () => $('person-modal').classList.remove('visible'));

function showAddGroupModal() {
    $('group-form').reset();
    
    const ms = $('group-members-select');
    ms.innerHTML = '';
    people.forEach(p => {
        if (p.id === 'self') return;
        const label = document.createElement('label');
        label.className = 'member-checkbox';
        label.innerHTML = `
            <input type="checkbox" value="${p.id}">
            <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
            <span style="font-size:0.875rem; font-weight:500">${p.name}</span>
        `;
        ms.appendChild(label);
    });
    
    $('group-modal').classList.add('visible');
    $('group-name').focus();
}

$('group-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('group-name').value.trim();
    if (!name) return;
    
    const checkboxes = document.querySelectorAll('#group-members-select input:checked');
    const memberIds = ['self'];
    checkboxes.forEach(c => memberIds.push(c.value));
    
    groups.push({
        id: 'g_' + Date.now(),
        name,
        memberIds,
        createdAt: new Date().toISOString(),
        isActive: true
    });
    saveGroups();
    $('group-modal').classList.remove('visible');
    renderGroups();
    showToast('Group created');
});
$('group-cancel').addEventListener('click', () => $('group-modal').classList.remove('visible'));

function showAddGroupExpenseModal() {
    if (!currentGroupId) return;
    $('g-exp-form').reset();
    currentExpenseId = null;
    splitMethod = 'equal';
    document.querySelectorAll('#g-exp-form .type-btn').forEach(b => b.classList.remove('active'));
    $('split-equal').classList.add('active');
    
    const group = getGroup(currentGroupId);
    const pb = $('g-exp-paidby');
    pb.innerHTML = '';
    group.memberIds.forEach(mId => {
        const p = getPerson(mId);
        const opt = document.createElement('option');
        opt.value = mId;
        opt.textContent = p.name;
        if (mId === 'self') opt.selected = true;
        pb.appendChild(opt);
    });
    
    $('g-exp-date').value = new Date().toISOString().split('T')[0];
    $('g-exp-add-personal').checked = true;
    
    renderSplitBreakdown();
    $('group-expense-modal').classList.add('visible');
    $('g-exp-desc').focus();
}

$('g-exp-amount').addEventListener('input', renderSplitBreakdown);
document.querySelectorAll('#g-exp-form .type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#g-exp-form .type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        splitMethod = btn.dataset.split;
        renderSplitBreakdown();
    });
});

function renderSplitBreakdown() {
    const group = getGroup(currentGroupId);
    const container = $('split-breakdown-container');
    container.innerHTML = '';
    
    const totalRaw = parseFloat($('g-exp-amount').value) || 0;
    const memberCount = group.memberIds.length;
    
    group.memberIds.forEach(mId => {
        const p = getPerson(mId);
        const row = document.createElement('div');
        row.className = 'split-breakdown-row';
        row.dataset.personId = mId;
        
        let inputHtml = '';
        if (splitMethod === 'equal') {
            const share = (totalRaw / memberCount).toFixed(2);
            inputHtml = `<div class="split-share-text">₹${share}</div>`;
        } else if (splitMethod === 'amount') {
            inputHtml = `<input type="number" class="split-input-val" step="0.01" min="0" placeholder="0.00" oninput="validateSplits()">`;
        } else if (splitMethod === 'percent') {
            inputHtml = `<input type="number" class="split-input-val" step="0.1" min="0" max="100" placeholder="0%" oninput="validateSplits()">`;
        }
        
        row.innerHTML = `
            <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
            <span style="font-size:0.875rem; font-weight:500">${p.name}</span>
            <div style="margin-left:auto">${inputHtml}</div>
        `;
        container.appendChild(row);
    });
    validateSplits();
}

function validateSplits() {
    const total = parseFloat($('g-exp-amount').value) || 0;
    const msg = $('split-validation-msg');
    const saveBtn = document.querySelector('#g-exp-form .save-btn');
    
    if (splitMethod === 'equal') {
        msg.style.display = 'none';
        saveBtn.disabled = false;
        return;
    }
    
    let sum = 0;
    document.querySelectorAll('.split-input-val').forEach(inp => {
        sum += parseFloat(inp.value) || 0;
    });
    
    if (splitMethod === 'amount') {
        const diff = total - sum;
        if (Math.abs(diff) < 0.01) {
            msg.style.display = 'none';
            saveBtn.disabled = false;
        } else {
            msg.style.display = 'block';
            msg.textContent = diff > 0 ? `₹${diff.toFixed(2)} remaining` : `Over by ₹${Math.abs(diff).toFixed(2)}`;
            saveBtn.disabled = true;
        }
    } else if (splitMethod === 'percent') {
        const diff = 100 - sum;
        if (Math.abs(diff) < 0.1) {
            msg.style.display = 'none';
            saveBtn.disabled = false;
        } else {
            msg.style.display = 'block';
            msg.textContent = diff > 0 ? `${diff.toFixed(1)}% remaining` : `Over by ${Math.abs(diff).toFixed(1)}%`;
            saveBtn.disabled = true;
        }
    }
}

$('g-exp-form').addEventListener('submit', e => {
    e.preventDefault();
    const amount = parseFloat($('g-exp-amount').value);
    if (!amount) return;
    
    const splits = [];
    const memberCount = getGroup(currentGroupId).memberIds.length;
    
    document.querySelectorAll('.split-breakdown-row').forEach(row => {
        const pId = row.dataset.personId;
        let share = 0;
        if (splitMethod === 'equal') {
            share = amount / memberCount;
        } else {
            const val = parseFloat(row.querySelector('input').value) || 0;
            if (splitMethod === 'amount') share = val;
            else if (splitMethod === 'percent') share = amount * (val / 100);
        }
        splits.push({ personId: pId, share });
    });
    
    const desc = $('g-exp-desc').value.trim();
    const paidBy = $('g-exp-paidby').value;
    const date = $('g-exp-date').value;
    
    if (currentExpenseId) {
        const idx = groupExpenses.findIndex(e => e.id === currentExpenseId);
        if (idx !== -1) {
            groupExpenses[idx] = { ...groupExpenses[idx], description: desc, amount, paidBy, date, splitMethod, splits };
        }
    } else {
        groupExpenses.push({
            id: 'e_' + Date.now(),
            groupId: currentGroupId,
            description: desc,
            amount,
            paidBy,
            date,
            splitMethod,
            splits,
            settledBy: [],
            createdAt: new Date().toISOString()
        });
        
        // Add to personal?
        if (paidBy === 'self' && $('g-exp-add-personal').checked) {
            // How much did *they* owe you from this? (Your total paid minus your share)
            const myShare = splits.find(s => s.personId === 'self')?.share || 0;
            const personalAmt = amount - myShare;
            if (personalAmt > 0) {
                transactions.push({
                    id: 't_' + Date.now(),
                    type: 'expense',
                    amount: amount, // record the full amount paid as expense, you can adjust logic
                    category: 'other_exp',
                    date: date,
                    description: `Group: ${getGroup(currentGroupId).name} - ${desc}`,
                    notes: 'Splitwise sync'
                });
                saveTransactions();
            }
        }
    }
    
    saveGroupExpenses();
    $('group-expense-modal').classList.remove('visible');
    renderGroupDetail(currentGroupId);
    showToast('Expense saved');
});

$('g-exp-cancel').addEventListener('click', () => $('group-expense-modal').classList.remove('visible'));

function showExpenseDetail(expId) {
    const exp = groupExpenses.find(e => e.id === expId);
    if (!exp) return;
    
    currentExpenseId = exp.id;
    $('exp-det-amount').textContent = '₹' + exp.amount.toLocaleString('en-IN');
    $('exp-det-title').textContent = exp.description;
    $('exp-det-meta').textContent = `Paid by ${getPerson(exp.paidBy).name} on ${new Date(exp.date).toLocaleDateString()}`;
    $('exp-det-method').textContent = exp.splitMethod === 'equal' ? 'Equally' : exp.splitMethod === 'amount' ? 'By amount' : 'By percent';
    
    const splitsContainer = $('exp-det-splits');
    splitsContainer.innerHTML = '';
    exp.splits.forEach(s => {
        const p = getPerson(s.personId);
        const div = document.createElement('div');
        div.className = 'split-breakdown-row';
        div.innerHTML = `
            <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
            <span style="font-size:0.875rem; font-weight:500">${p.name}</span>
            <div class="split-share-text">₹${s.share.toFixed(2)}</div>
        `;
        splitsContainer.appendChild(div);
    });
    
    // Hide edit/delete if it's a settlement
    if (exp.description === 'Settlement') {
        $('exp-det-edit').style.display = 'none';
        $('exp-det-delete').style.display = 'none';
    } else {
        $('exp-det-edit').style.display = 'inline-block';
        $('exp-det-delete').style.display = 'inline-block';
    }
    
    $('expense-detail-modal').classList.add('visible');
}

$('exp-det-close').addEventListener('click', () => $('expense-detail-modal').classList.remove('visible'));

$('exp-det-edit').addEventListener('click', () => {
    $('expense-detail-modal').classList.remove('visible');
    const exp = groupExpenses.find(e => e.id === currentExpenseId);
    if (!exp) return;
    showAddGroupExpenseModal();
    // populate form
    $('g-exp-desc').value = exp.description;
    $('g-exp-amount').value = exp.amount;
    $('g-exp-paidby').value = exp.paidBy;
    $('g-exp-date').value = exp.date;
    document.querySelectorAll('#g-exp-form .type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`#split-${exp.splitMethod}`).classList.add('active');
    splitMethod = exp.splitMethod;
    renderSplitBreakdown();
    
    // populate splits if not equal
    if (splitMethod !== 'equal') {
        document.querySelectorAll('.split-breakdown-row').forEach(row => {
            const pId = row.dataset.personId;
            const myS = exp.splits.find(s => s.personId === pId);
            if (myS) {
                if (splitMethod === 'amount') row.querySelector('input').value = myS.share;
                else if (splitMethod === 'percent') row.querySelector('input').value = (myS.share / exp.amount) * 100;
            }
        });
        validateSplits();
    }
});

$('exp-det-delete').addEventListener('click', () => {
    showConfirm('Delete this expense? This affects group balances.', () => {
        groupExpenses = groupExpenses.filter(e => e.id !== currentExpenseId);
        saveGroupExpenses();
        $('expense-detail-modal').classList.remove('visible');
        renderGroupDetail(currentGroupId);
        showToast('Expense deleted');
    });
});

// Wire up events
$('nav-groups').addEventListener('click', () => navigate('groups'));
$('nav-people').addEventListener('click', () => navigate('people'));
$('nav-settle-up').addEventListener('click', () => navigate('settle-up'));

$('add-group-btn').addEventListener('click', showAddGroupModal);
$('add-person-btn').addEventListener('click', showAddPersonModal);
$('gd-add-expense-btn').addEventListener('click', showAddGroupExpenseModal);

$('btn-back-to-groups').addEventListener('click', () => navigate('groups'));

$('gd-tab-expenses').addEventListener('click', () => {
    $('gd-tab-expenses').classList.add('active');
    $('gd-tab-balances').classList.remove('active');
    $('gd-expenses-content').style.display = 'block';
    $('gd-balances-content').style.display = 'none';
});
$('gd-tab-balances').addEventListener('click', () => {
    $('gd-tab-balances').classList.add('active');
    $('gd-tab-expenses').classList.remove('active');
    $('gd-balances-content').style.display = 'block';
    $('gd-expenses-content').style.display = 'none';
});

// =============================================
