// Payments Overview Module for Student Folder (no edits to existing files)
// Builds its own UI dynamically and integrates with Payment System via localStorage

(function () {
    // ---------------------------
    // CONFIG / CONSTANTS
    // ---------------------------
    const LS_KEYS = {
        students: 'eastBoundaryStudents',
        fees: 'ebs_fee_structure_flat',
        payments: 'ebs_payments'
    };

    const TERMS = ['Term 1', 'Term 2', 'Term 3'];
    const GRADES = ['Nursery','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'];

    // ---------------------------
    // STATE
    // ---------------------------
    let students = [];
    let fees = [];
    let payments = [];

    let filters = {
        grade: 'all',
        term: 'all',
        year: 'all',
        status: 'all'
    };
    let hasSearched = false;

    let lastDataSignature = '';

    // ---------------------------
    // UTILITIES
    // ---------------------------
    function loadLocalStorageJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            const parsed = JSON.parse(raw || JSON.stringify(fallback));
            return parsed ?? fallback;
        } catch (_) {
            return fallback;
        }
    }

    function formatCurrency(amount) {
        const n = Number(amount) || 0;
        return `${n.toFixed(2)} ZMW`;
    }

    function getYearFromDate(iso) {
        if (!iso) return '';
        const y = String(iso).split('-')[0];
        return y && /^(19|20)\d{2}$/.test(y) ? y : '';
    }

    function computeDataSignature() {
        return JSON.stringify({
            s: (students || []).length,
            f: (fees || []).length,
            p: (payments || []).length,
            // Light-weight change detection
            pc: payments.reduce((a, p) => a + (p.timestamp || 0), 0)
        });
    }

    function getFeeForGradeTerm(grade, term) {
        const entry = (fees || []).find(f => f.grade === grade && f.term === term);
        return entry ? Number(entry.amount) || 0 : 0;
    }

    function getAllYears() {
        // Fixed range as requested: 2025 to 2030 inclusive
        const years = [];
        for (let y = 2025; y <= 2030; y++) years.push(String(y));
        return years;
    }

    function getUniqueGradesFromStudents() {
        const set = new Set();
        (students || []).forEach(s => { if (s && s.grade) set.add(s.grade); });
        // Ensure standard grade list ordering
        const list = GRADES.filter(g => set.has(g));
        // Include any non-standard grades that might exist
        Array.from(set).forEach(g => { if (!list.includes(g)) list.push(g); });
        return list;
    }

    // Aggregation: per student per (term, year)
    function aggregateStudentPayments() {
        const results = [];
        const studentById = new Map((students || []).map(s => [s.id, s]));

        // Build index of payments per student per term/year
        const grouped = new Map(); // key: studentId|term|year => { payments:[], totalPaid }
        (payments || []).forEach(p => {
            const year = getYearFromDate(p.date) || '';
            const key = `${p.studentId}|${p.term}|${year}`;
            if (!grouped.has(key)) grouped.set(key, { payments: [], totalPaid: 0 });
            const bucket = grouped.get(key);
            bucket.payments.push(p);
            bucket.totalPaid += Number(p.paid) || 0;
        });

        const candidateTerms = filters.term === 'all' ? TERMS : [filters.term];
        const includeNoPayment = (filters.status === 'No Payment' && filters.year !== 'all' && filters.term !== 'all');

        (students || []).forEach(s => {
            const grade = s.grade;

            candidateTerms.forEach(term => {
                const baseTotalFee = getFeeForGradeTerm(grade, term);

                // 1) Rows with payments (always)
                // Iterate existing payment groups for this student+term (any year or filtered year)
                Object.keys(Object.fromEntries(grouped)).forEach(() => {}); // no-op to satisfy lints if needed
                grouped.forEach((bucket, key) => {
                    const [sid, kTerm, kYear] = key.split('|');
                    if (sid !== s.id || kTerm !== term) return;
                    if (filters.year !== 'all' && kYear !== filters.year) return;
                    const amountPaid = bucket.totalPaid;
                    const totalFee = baseTotalFee;
                    const balance = totalFee - amountPaid;
                    let status = 'No Payment';
                    if (amountPaid > 0 && amountPaid < totalFee) status = 'Partly Paid';
                    if (totalFee > 0 && amountPaid === totalFee) status = 'Fully Paid';
                    if (amountPaid > totalFee) status = 'Overpaid';
                    results.push({
                        studentId: s.id,
                        studentName: s.name,
                        grade: grade,
                        term: term,
                        year: kYear,
                        totalFee,
                        amountPaid,
                        balance,
                        status,
                        payments: bucket.payments.slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
                    });
                });

                // 2) Optionally include explicit No Payment rows only when user filters for them with a specific year+term
                if (includeNoPayment) {
                    const year = filters.year;
                    const key = `${s.id}|${term}|${year}`;
                    if (!grouped.has(key)) {
                        const totalFee = baseTotalFee;
                        const amountPaid = 0;
                        const balance = totalFee - amountPaid;
                        const status = 'No Payment';
                        results.push({
                            studentId: s.id,
                            studentName: s.name,
                            grade: grade,
                            term: term,
                            year: year,
                            totalFee,
                            amountPaid,
                            balance,
                            status,
                            payments: []
                        });
                    }
                }
            });
        });

        return results;
    }

    function applyFilters(rows) {
        return rows.filter(r => {
            if (filters.grade !== 'all' && r.grade !== filters.grade) return false;
            if (filters.term !== 'all' && r.term !== filters.term) return false;
            if (filters.year !== 'all' && r.year !== filters.year) return false;
            if (filters.status !== 'all') {
                // Map filter label to internal status values
                const want = filters.status.toLowerCase();
                const have = r.status.toLowerCase();
                if (want !== have) return false;
            }
            return true;
        });
    }

    function computeKPIs(rows) {
        let fully = 0, partly = 0, none = 0;
        rows.forEach(r => {
            if (r.status === 'Fully Paid') fully++;
            else if (r.status === 'Partly Paid') partly++;
            else if (r.status === 'No Payment') none++;
        });
        return { fully, partly, none };
    }

function countStudentsWithoutAnyPayments() {
    const all = Array.isArray(students) ? students : [];
    const pays = Array.isArray(payments) ? payments : [];
    if (all.length === 0) return 0;
    // If there are absolutely no payments recorded, everyone is No Payment
    if (pays.length === 0) return all.length;
    const allIds = new Set(all.map(s => s.id));
    const paidIds = new Set(pays.map(p => p.studentId));
    let count = 0;
    allIds.forEach(id => { if (!paidIds.has(id)) count++; });
    return count;
}

    // ---------------------------
    // UI CONSTRUCTION
    // ---------------------------
    const container = document.createElement('section');
    container.id = 'paymentsOverviewContainer';
    container.style.marginTop = '16px';

    container.innerHTML = `
        <div class="section-title">Payments Overview</div>
        <div class="form-row" id="po-reveal-row" style="gap:12px; align-items:center; margin-bottom:8px;">
            <button class="btn btn-primary" id="po-reveal-search">Search</button>
        </div>
        <div class="form-row" id="po-filters-row" style="gap:16px; align-items:flex-start; display:none; flex-wrap: nowrap; overflow-x: auto; display:flex;">
            <div class="form-group" style="display:inline-flex; flex-direction:column; align-items:flex-start; gap:4px;">
                <label style="margin:0; display:inline-block;">Year</label>
                <select id="po-year" style="min-width: 140px; width: 140px;"></select>
            </div>
            <div class="form-group" style="display:inline-flex; flex-direction:column; align-items:flex-start; gap:4px;">
                <label style="margin:0; display:inline-block;">Grade</label>
                <select id="po-grade" style="min-width: 140px; width: 140px;"></select>
            </div>
            <div class="form-group" style="display:inline-flex; flex-direction:column; align-items:flex-start; gap:4px;">
                <label style="margin:0; display:inline-block;">Term</label>
                <select id="po-term" style="min-width: 140px; width: 140px;"></select>
            </div>
            <div class="form-group" style="display:inline-flex; flex-direction:column; align-items:flex-start; gap:4px;">
                <label style="margin:0; display:inline-block;">Status</label>
                <select id="po-status" style="min-width: 150px; width: 150px;">
                    <option value="all">-- All Statuses --</option>
                    <option value="Fully Paid">Fully Paid</option>
                    <option value="Partly Paid">Partly Paid</option>
                    <option value="No Payment">No Payment</option>
                    <option value="Overpaid">Overpaid</option>
                </select>
            </div>
            <div class="form-group" style="display:inline-flex; align-items:center; gap:6px; padding-top: 20px;">
                <button class="btn btn-primary" id="po-search" style="padding: 6px 10px; white-space:nowrap;">Search</button>
                <button class="btn btn-secondary" id="po-reset" style="padding: 6px 10px; white-space:nowrap;">Reset</button>
            </div>
        </div>

        <div class="summary-card" id="po-kpis" style="margin-top:12px; display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
            <div class="summary-item" style="padding:12px 16px; border-radius:8px; background:#f5f7fb;">
                <span class="summary-label" style="font-weight:600; color:#2c3e50;">Fully Paid:</span>
                <span class="summary-value" id="po-fully" style="font-size:28px; font-weight:800; margin-left:8px; color:#28a745;">0</span>
            </div>
            <div class="summary-item" style="padding:12px 16px; border-radius:8px; background:#f5f7fb;">
                <span class="summary-label" style="font-weight:600; color:#2c3e50;">Partly Paid:</span>
                <span class="summary-value" id="po-partly" style="font-size:28px; font-weight:800; margin-left:8px; color:#ffc107;">0</span>
            </div>
            <div class="summary-item" style="padding:12px 16px; border-radius:8px; background:#f5f7fb;">
                <span class="summary-label" style="font-weight:600; color:#2c3e50;">No Payment:</span>
                <span class="summary-value" id="po-none" style="font-size:28px; font-weight:800; margin-left:8px; color:#dc3545;">0</span>
            </div>
        </div>

        <div class="form-row" id="po-results-wrap" style="margin-top:16px; display:none;">
            <div class="form-group" style="width:100%">
                <table class="students-table">
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Student Name</th>
                            <th>Grade</th>
                            <th>Term</th>
                            <th>Year</th>
                            <th>Total Fee</th>
                            <th>Amount Paid</th>
                            <th>Balance</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="po-table-body">
                        <tr><td colspan="9" style="text-align:center; padding:1rem; color:#666;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.addEventListener('DOMContentLoaded', () => {
        // Append container near top of page, below any header if exists
        const main = document.querySelector('.main-content') || document.body;
        main.insertBefore(container, main.firstChild);
        initializeModule();
    });

    // ---------------------------
    // RENDERING
    // ---------------------------
    function initializeFiltersUI() {
        const gradeSel = document.getElementById('po-grade');
        const termSel = document.getElementById('po-term');
        const yearSel = document.getElementById('po-year');
        const statusSel = document.getElementById('po-status');
        const revealBtn = document.getElementById('po-reveal-search');
        const searchBtn = document.getElementById('po-search');
        const resetBtn = document.getElementById('po-reset');

        // Grade (fixed list Nursery to Grade 9)
        gradeSel.innerHTML = '<option value="all">-- All Grades --</option>' + GRADES.map(g => `<option value="${g}">${g}</option>`).join('');

        // Term
        termSel.innerHTML = '<option value="all">-- All Terms --</option>' + TERMS.map(t => `<option value="${t}">${t}</option>`).join('');

        // Year
        const years = getAllYears();
        yearSel.innerHTML = '<option value="all">-- All Years --</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');

        // Status already has options
        statusSel.value = 'all';

        gradeSel.addEventListener('change', () => { filters.grade = gradeSel.value; /* KPIs auto-update in renderAll */ renderAll(); });
        termSel.addEventListener('change', () => { filters.term = termSel.value; renderAll(); });
        yearSel.addEventListener('change', () => { filters.year = yearSel.value; renderAll(); });
        statusSel.addEventListener('change', () => { filters.status = statusSel.value; renderAll(); });
        if (revealBtn) {
            revealBtn.addEventListener('click', () => {
                hasSearched = true;
                const revealRow = document.getElementById('po-reveal-row');
                const filtersRow = document.getElementById('po-filters-row');
                const wrap = document.getElementById('po-results-wrap');
                if (revealRow) revealRow.style.display = 'none';
                if (filtersRow) filtersRow.style.display = '';
                if (wrap) wrap.style.display = '';
                renderAll();
            });
        }
        searchBtn.addEventListener('click', () => {
            hasSearched = true;
            const wrap = document.getElementById('po-results-wrap');
            if (wrap) wrap.style.display = '';
            renderAll();
        });
        resetBtn.addEventListener('click', () => {
            filters = { grade: 'all', term: 'all', year: 'all', status: 'all' };
            gradeSel.value = 'all';
            termSel.value = 'all';
            yearSel.value = 'all';
            statusSel.value = 'all';
            hasSearched = false;
            const wrap = document.getElementById('po-results-wrap');
            const revealRow = document.getElementById('po-reveal-row');
            const filtersRow = document.getElementById('po-filters-row');
            if (wrap) wrap.style.display = 'none';
            if (filtersRow) filtersRow.style.display = 'none';
            if (revealRow) revealRow.style.display = '';
            renderAll();
        });
    }

    function renderTable(rows) {
        const tbody = document.getElementById('po-table-body');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:1rem; color:#666;">No matching records.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(r => `
            <tr class="po-row" data-student-id="${r.studentId}" data-term="${r.term}" data-year="${r.year}">
                <td><strong>${r.studentId}</strong></td>
                <td>${r.studentName}</td>
                <td>${r.grade}</td>
                <td>${r.term}</td>
                <td>${r.year}</td>
                <td>${formatCurrency(r.totalFee)}</td>
                <td>${formatCurrency(r.amountPaid)}</td>
                <td>${formatCurrency(Math.abs(r.balance))}</td>
                <td>${r.status}</td>
            </tr>
        `).join('');

        // no per-row click history rendering (removed per request)
    }

    function renderKPIs(rows) {
        let { fully, partly, none } = computeKPIs(rows);
        
        // Always calculate the correct "No Payment" count by checking all students
        // against payment records, respecting current filters
        if (filters.year !== 'all' && filters.term !== 'all') {
            // When specific year+term selected, count students with no payment for that combination
            const filteredGrades = filters.grade === 'all' ? GRADES : [filters.grade];
            const studentsInScope = students.filter(s => filteredGrades.includes(s.grade));
            
            let noPaymentCount = 0;
            studentsInScope.forEach(student => {
                const key = `${student.id}|${filters.term}|${filters.year}`;
                const hasPaymentForTermYear = payments.some(p => 
                    p.studentId === student.id && 
                    p.term === filters.term && 
                    getYearFromDate(p.date) === filters.year
                );
                if (!hasPaymentForTermYear) {
                    noPaymentCount++;
                }
            });
            none = noPaymentCount;
        } else {
            // For broader filters (all years/terms), count students with absolutely no payments
            none = countStudentsWithoutAnyPayments();
        }
        
        const elFully = document.getElementById('po-fully');
        const elPartly = document.getElementById('po-partly');
        const elNone = document.getElementById('po-none');
        if (elFully) elFully.textContent = String(fully);
        if (elPartly) elPartly.textContent = String(partly);
        if (elNone) elNone.textContent = String(none);
    }

    // History table removed per request

    function renderAll() {
        const rows = aggregateStudentPayments();
        const filtered = applyFilters(rows);
        // KPIs always visible and reflect current filtered scope (defaults are All)
        renderKPIs(filtered);
        // Detailed results only after explicit search
        if (hasSearched) {
            renderTable(filtered);
        }
    }

    // ---------------------------
    // INITIALIZATION & AUTO-REFRESH
    // ---------------------------
    function initializeModule() {
        // Load datasets
        students = loadLocalStorageJSON(LS_KEYS.students, []);
        fees = loadLocalStorageJSON(LS_KEYS.fees, []);
        payments = loadLocalStorageJSON(LS_KEYS.payments, []);

        initializeFiltersUI();
        renderAll();

        lastDataSignature = computeDataSignature();

        // Listen for storage changes from other tabs/windows
        window.addEventListener('storage', handleDataMaybeChanged);
        // Also poll periodically to catch in-tab changes
        setInterval(handleDataMaybeChanged, 2000);
    }

    function handleDataMaybeChanged() {
        const newStudents = loadLocalStorageJSON(LS_KEYS.students, []);
        const newFees = loadLocalStorageJSON(LS_KEYS.fees, []);
        const newPayments = loadLocalStorageJSON(LS_KEYS.payments, []);

        students = newStudents;
        fees = newFees;
        payments = newPayments;

        const sig = computeDataSignature();
        if (sig !== lastDataSignature) {
            // Rebuild filters that depend on data (years/grades)
            initializeFiltersUI();
            renderAll();
            lastDataSignature = sig;
        }
    }
})();


