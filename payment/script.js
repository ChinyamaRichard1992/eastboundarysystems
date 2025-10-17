// ==========================
// SMART STUDENT PAYMENT MANAGEMENT SYSTEM
// Complete JavaScript Module with Intelligent Fee Detection
// ==========================

// ---------------------------
// 1. DATA STORAGE SETUP (In-Memory with localStorage persistence)
// ---------------------------

// Load fee structure from localStorage
let feeStructure = (() => {
    try {
        const raw = localStorage.getItem("ebs_fee_structure_flat");
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
})();

// Load payments from localStorage
let payments = (() => {
    try {
        const raw = localStorage.getItem("ebs_payments");
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
})();

// Load registered students from the Student module
const students = (() => {
    try {
        const raw = localStorage.getItem("eastBoundaryStudents");
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
})();

// ---------------------------
// 2. DOM ELEMENTS
// ---------------------------
const recordGradeDisplay = document.getElementById("recordGradeDisplay");
const paymentStudentSelect = document.getElementById("paymentStudentSelect");
const paymentDate = document.getElementById("paymentDate");
const recordTermSelect = document.getElementById("recordTermSelect");
const paymentAmount = document.getElementById("paymentAmount");
const recordPaymentBtn = document.getElementById("recordPaymentBtn");

const feeGradeSelect = document.getElementById("feeGradeSelect");
const feeTermSelect = document.getElementById("feeTermSelect");
const feeAmountInput = document.getElementById("feeAmountInput");
const saveFeeStructureBtn = document.getElementById("saveFeeStructureBtn");
const editFeeStructureBtn = document.getElementById("editFeeStructureBtn");
const deleteFeeStructureBtn = document.getElementById("deleteFeeStructureBtn");

const summaryTotalFee = document.getElementById("summaryTotalFee");
const summaryAmountPaid = document.getElementById("summaryAmountPaid");
const summaryBalance = document.getElementById("summaryBalance");
const summaryStatus = document.getElementById("summaryStatus");

const paymentsHistoryBody = document.getElementById("paymentsHistoryBody");
const notificationContainer = document.getElementById("notificationContainer");
const searchPayment = document.getElementById("searchPayment");
const studentPaymentsDetailBody = document.getElementById("studentPaymentsDetailBody");

const printModal = document.getElementById("printModal");
const receiptContent = document.getElementById("receiptContent");
const printReceiptBtn = document.getElementById("printReceiptBtn");
const closeModalBtn = document.querySelector(".close-modal");

// ---------------------------
// 3. DROPDOWN INITIALIZATION
// ---------------------------
function initSelectOptions() {
    const grades = [
        "Nursery",
        "Grade 1",
        "Grade 2",
        "Grade 3",
        "Grade 4",
        "Grade 5",
        "Grade 6",
        "Grade 7",
        "Grade 8",
        "Grade 9"
    ];
    const terms = ["Term 1", "Term 2", "Term 3"];

    // Initialize Record Payment - Grade Select
    if (recordGradeDisplay) {
        recordGradeDisplay.innerHTML = "<option value=''>--Select Grade--</option>";
        grades.forEach(grade => {
            const opt = document.createElement("option");
            opt.value = grade;
            opt.textContent = grade;
            recordGradeDisplay.appendChild(opt);
        });
    }

    // Initialize Manage Fee Structure - Grade Select
    if (feeGradeSelect) {
        feeGradeSelect.innerHTML = "<option value=''>--Select Grade--</option>";
        grades.forEach(grade => {
            const opt = document.createElement("option");
            opt.value = grade;
            opt.textContent = grade;
            feeGradeSelect.appendChild(opt);
        });
    }

    // Initialize Record Payment - Term Select
    if (recordTermSelect) {
        recordTermSelect.innerHTML = "<option value=''>--Select Term--</option>";
        terms.forEach(term => {
            const opt = document.createElement("option");
            opt.value = term;
            opt.textContent = term;
            recordTermSelect.appendChild(opt);
        });
    }

    // Initialize Manage Fee Structure - Term Select
    if (feeTermSelect) {
        feeTermSelect.innerHTML = "<option value=''>--Select Term--</option>";
        terms.forEach(term => {
            const opt = document.createElement("option");
            opt.value = term;
            opt.textContent = term;
            feeTermSelect.appendChild(opt);
        });
    }

    // Auto-load existing fee when grade/term changes in Manage Fee
    if (feeGradeSelect && feeTermSelect) {
        feeGradeSelect.addEventListener("change", syncFeeFormFromStorage);
        feeTermSelect.addEventListener("change", syncFeeFormFromStorage);
    }
}

// Load fee amount into the form based on current Manage Fee grade/term selection
function syncFeeFormFromStorage() {
    if (!feeGradeSelect || !feeTermSelect || !feeAmountInput) return;
    const grade = feeGradeSelect.value;
    const term = feeTermSelect.value;
    
    if (!grade || !term) {
        feeAmountInput.value = "";
        setFeeActionButtonsEnabled(false);
        return;
    }
    
    const entry = feeStructure.find(f => f.grade === grade && f.term === term);
    if (entry) {
        feeAmountInput.value = parseFloat(entry.amount).toFixed(2);
        setFeeActionButtonsEnabled(true);
    } else {
        feeAmountInput.value = "";
        setFeeActionButtonsEnabled(false);
    }
}

function setFeeActionButtonsEnabled(enabled) {
    if (editFeeStructureBtn) {
        editFeeStructureBtn.disabled = !enabled;
        editFeeStructureBtn.title = enabled ? "Edit fee" : "Select an existing fee to enable";
    }
    if (deleteFeeStructureBtn) {
        deleteFeeStructureBtn.disabled = !enabled;
        deleteFeeStructureBtn.title = enabled ? "Delete fee" : "Select an existing fee to enable";
    }
}

// ---------------------------
// 4. POPULATE STUDENTS BY GRADE (Smart Detection)
// ---------------------------
function populateStudentsByGrade() {
    const selectedGrade = recordGradeDisplay ? recordGradeDisplay.value : "";
    
    if (paymentStudentSelect) {
        paymentStudentSelect.innerHTML = "<option value=''>--Select Student--</option>";
        
        if (!selectedGrade) return;
        
        // Filter students by selected grade
        const filteredStudents = students.filter(s => s.grade === selectedGrade);
        
        if (filteredStudents.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No students in this grade";
            option.disabled = true;
            paymentStudentSelect.appendChild(option);
            return;
        }
        
        filteredStudents.forEach(student => {
            const option = document.createElement("option");
            option.value = student.id; // Use unique student ID
            option.textContent = `${student.name} (ID: ${student.id})`;
            paymentStudentSelect.appendChild(option);
        });
    }
}

// ---------------------------
// 5. INTELLIGENT FEE VERIFICATION
// ---------------------------
function checkFeeStructureExists(studentId, term) {
    if (!studentId || !term) return false;
    
    const student = students.find(s => s.id === studentId);
    if (!student) return false;
    
    const feeEntry = feeStructure.find(f => f.grade === student.grade && f.term === term);
    return !!feeEntry;
}

function getFeeForStudent(studentId, term) {
    const student = students.find(s => s.id === studentId);
    if (!student) return 0;
    
    const feeEntry = feeStructure.find(f => f.grade === student.grade && f.term === term);
    return feeEntry ? parseFloat(feeEntry.amount) : 0;
}

// ---------------------------
// 6. AUTO-CALCULATE REMAINING BALANCE
// ---------------------------
function updateAutoPaymentAmount() {
    if (!paymentAmount) return;
    
    const studentId = paymentStudentSelect ? paymentStudentSelect.value : "";
    const term = recordTermSelect ? recordTermSelect.value : "";
    
    if (!studentId || !term) {
        paymentAmount.value = "";
        paymentAmount.readOnly = true;
        updateRecordPaymentAvailability();
        return;
    }

    const student = students.find(s => s.id === studentId);
    if (!student) {
        paymentAmount.value = "";
        paymentAmount.readOnly = true;
        updateRecordPaymentAvailability();
        return;
    }

    // Check if fee structure exists
    if (!checkFeeStructureExists(studentId, term)) {
        paymentAmount.value = "";
        paymentAmount.readOnly = true;
        updateRecordPaymentAvailability();
        return;
    }

    const totalFee = getFeeForStudent(studentId, term);
    const previousPaid = getTotalPaidByStudent(studentId, term);
    const remaining = Math.max(totalFee - previousPaid, 0);
    
    paymentAmount.value = remaining.toFixed(2);
    paymentAmount.readOnly = false; // Allow user to enter partial payment
    updateRecordPaymentAvailability();
    renderStudentPaymentHistory();
}

function getTotalPaidByStudent(studentId, term) {
    return payments
        .filter(p => p.studentId === studentId && p.term === term)
        .reduce((sum, p) => sum + p.paid, 0);
}

// ---------------------------
// 7. RECORD PAYMENT (Intelligent Logic)
// ---------------------------
function recordPayment() {
    const studentId = paymentStudentSelect ? paymentStudentSelect.value : "";
    const date = paymentDate ? paymentDate.value : "";
    const term = recordTermSelect ? recordTermSelect.value : "";
    const amount = paymentAmount ? parseFloat(paymentAmount.value) : 0;

    // Validation 1: All fields required
    if (!studentId || !date || !term) {
        showNotification("⚠️ All fields are required!", "error");
        return;
    }

    // Validation 2: Valid amount
    if (isNaN(amount) || amount <= 0) {
        showNotification("⚠️ Payment amount must be a valid positive number!", "error");
        return;
    }

    // Validation 3: Student exists
    const student = students.find(s => s.id === studentId);
    if (!student) {
        showNotification("⚠️ Student not found!", "error");
        return;
    }

    // Validation 4: Fee structure exists
    if (!checkFeeStructureExists(studentId, term)) {
        showNotification(
            `⚠️ No fee structure found for ${student.grade} - ${term}.<br>` +
            `Please record the fees in the <strong>Manage Fee Structure</strong> section before recording payments.`,
            "error"
        );
        return;
    }

    const totalFee = getFeeForStudent(studentId, term);
    const previousPaid = getTotalPaidByStudent(studentId, term);
    const newTotalPaid = previousPaid + amount;
    const balance = totalFee - newTotalPaid;

    // Validation 5: Check for overpayment
    if (balance < 0) {
        const overpayment = Math.abs(balance);
        if (!confirm(
            `⚠️ This payment will result in an overpayment of ${formatCurrency(overpayment)}.\n\n` +
            `Do you want to continue?`
        )) {
            return;
        }
    }

    // Determine intelligent status
    let status;
    if (balance < 0) {
        status = "Overpaid";
    } else if (balance === 0) {
        status = "Paid";
    } else {
        status = "Pending";
    }

    // Generate unique receipt number
    const receiptNo = generateReceiptNumber();

    // Create payment record
    const paymentObj = {
        receiptNo,
        studentId,
        studentName: student.name,
        grade: student.grade,
        date,
        term,
        paid: amount,
        amountPayable: totalFee,
        balance,
        status,
        timestamp: Date.now()
    };

    payments.push(paymentObj);
    
    // Persist to localStorage
    savePaymentsToStorage();
    
    showNotification("✓ Payment recorded successfully!", "success");
    
    clearPaymentForm();
    renderPaymentsTable();
    updateFeeSummary(studentId, term);
    renderStudentPaymentHistory();
}

// ---------------------------
// 8. SAVE FEE STRUCTURE (Smart Integration)
// ---------------------------
function saveFeeStructure() {
    const grade = feeGradeSelect ? feeGradeSelect.value : "";
    const term = feeTermSelect ? feeTermSelect.value : "";
    const amount = feeAmountInput ? parseFloat(feeAmountInput.value) : 0;

    // Validation
    if (!grade || !term) {
        showNotification("⚠️ Please select both grade and term!", "error");
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showNotification("⚠️ Fee amount must be a valid positive number!", "error");
        return;
    }

    const existing = feeStructure.find(f => f.grade === grade && f.term === term);
    
    if (existing) {
        existing.amount = amount;
        showNotification("✓ Fee structure updated successfully!", "success");
    } else {
        feeStructure.push({ grade, term, amount });
        showNotification("✓ Fee structure saved successfully!", "success");
    }

    // Persist to localStorage
    saveFeeStructureToStorage();

    // Clear form
    if (feeAmountInput) feeAmountInput.value = "";
    if (feeGradeSelect) feeGradeSelect.value = "";
    if (feeTermSelect) feeTermSelect.value = "";

    // Recalculate all payment statuses
    recalculateAllPaymentStatuses();
    renderPaymentsTable();
    updateAutoPaymentAmount();
}

// ---------------------------
// 9. RENDER PAYMENT HISTORY TABLE
// ---------------------------
function renderPaymentsTable(filter = "") {
    console.log('🔄 renderPaymentsTable called, payments:', payments.length);
    
    if (!paymentsHistoryBody) {
        console.error('❌ paymentsHistoryBody not found!');
        return;
    }

    paymentsHistoryBody.innerHTML = "";

    const filteredPayments = payments.filter(p => {
        const searchTerm = filter.toLowerCase();
        return p.studentName.toLowerCase().includes(searchTerm) ||
               p.receiptNo.toLowerCase().includes(searchTerm) ||
               p.studentId.toLowerCase().includes(searchTerm) ||
               p.term.toLowerCase().includes(searchTerm) ||
               p.grade.toLowerCase().includes(searchTerm);
    });

    console.log('📊 Filtered payments:', filteredPayments.length);

    if (filteredPayments.length === 0) {
        paymentsHistoryBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center; padding:1.5rem; color:#666;">
                    ${filter ? "No payments match your search." : "No payments recorded yet."}
                </td>
            </tr>
        `;
        console.log('ℹ️ No payments to display');
        return;
    }

    // Sort by timestamp (newest first)
    filteredPayments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    console.log('✅ Rendering', filteredPayments.length, 'payment rows with EMAIL buttons');

    filteredPayments.forEach((p, index) => {
        const tr = document.createElement("tr");
        
        // Determine status color
        let statusColor = "#ffc107"; // Pending - yellow
        if (p.status === "Paid") statusColor = "#28a745"; // green
        if (p.status === "Overpaid") statusColor = "#dc3545"; // red

        tr.innerHTML = `
            <td>${p.receiptNo}</td>
            <td>${p.studentId}</td>
            <td>${p.studentName}</td>
            <td>${p.grade}</td>
            <td>${p.date}</td>
            <td>${p.term}</td>
            <td>${formatCurrency(p.paid)}</td>
            <td>${formatCurrency(p.amountPayable)}</td>
            <td>${formatCurrency(Math.abs(p.balance))}</td>
            <td><span style="color:${statusColor}; font-weight:600;">${p.status}</span></td>
            <td style="white-space: nowrap;">
                <button class="btn btn-success" onclick="sendPaymentEmail('${p.studentId}', '${p.term}')" title="Send Email to Guardian" style="background: #28a745; color: white; margin-right: 5px;">
                    <i class="fas fa-envelope"></i>
                </button>
                <button class="btn btn-primary" onclick="editPayment('${p.receiptNo}')" title="Edit" style="margin-right: 5px;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn delete-btn" onclick="deletePayment('${p.receiptNo}')" title="Delete" style="margin-right: 5px;">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn print-btn" onclick="openPrintModal('${p.receiptNo}')" title="Print Receipt">
                    <i class="fas fa-print"></i>
                </button>
            </td>
        `;

        paymentsHistoryBody.appendChild(tr);
        
        if (index === 0) {
            console.log('📧 First row HTML (check for email button):', tr.innerHTML.substring(0, 500));
        }
    });
    
    console.log('✅ Table rendering complete. Check browser for 4 buttons per row.');
}

// ---------------------------
// 10. EDIT PAYMENT
// ---------------------------
function editPayment(receiptNo) {
    const payment = payments.find(p => p.receiptNo === receiptNo);
    if (!payment) {
        showNotification("⚠️ Payment not found!", "error");
        return;
    }

    const student = students.find(s => s.id === payment.studentId);
    if (!student) {
        showNotification("⚠️ Student not found!", "error");
        return;
    }

    // Populate form with existing data
    if (recordGradeDisplay) recordGradeDisplay.value = student.grade;
    populateStudentsByGrade();
    
    if (paymentStudentSelect) paymentStudentSelect.value = payment.studentId;
    if (paymentDate) paymentDate.value = payment.date;
    if (recordTermSelect) recordTermSelect.value = payment.term;
    if (paymentAmount) {
        paymentAmount.value = payment.paid.toFixed(2);
        paymentAmount.readOnly = false;
    }

    // Remove old payment from array
    payments = payments.filter(p => p.receiptNo !== receiptNo);
    savePaymentsToStorage();
    
    renderPaymentsTable();
    
    showNotification("ℹ Payment loaded for editing. Click 'Record Payment' to save changes.", "info");
    renderStudentPaymentHistory();
}

// ---------------------------
// 11. DELETE PAYMENT
// ---------------------------
function deletePayment(receiptNo) {
    if (!confirm("Are you sure you want to delete this payment? This action cannot be undone.")) {
        return;
    }

    const payment = payments.find(p => p.receiptNo === receiptNo);
    if (!payment) {
        showNotification("⚠️ Payment not found!", "error");
        return;
    }

    payments = payments.filter(p => p.receiptNo !== receiptNo);
    savePaymentsToStorage();
    
    showNotification("✓ Payment deleted successfully!", "success");
    
    // Recalculate statuses for affected payments
    recalculatePaymentsForStudent(payment.studentId, payment.term);
    
    renderPaymentsTable();
    
    // Update summary if this student/term is currently selected
    const currentStudentId = paymentStudentSelect ? paymentStudentSelect.value : "";
    const currentTerm = recordTermSelect ? recordTermSelect.value : "";
    if (currentStudentId === payment.studentId && currentTerm === payment.term) {
        updateFeeSummary(payment.studentId, payment.term);
    }
    renderStudentPaymentHistory();
}

// ---------------------------
// 12. SEARCH FILTER
// ---------------------------
if (searchPayment) {
    searchPayment.addEventListener("input", () => {
        renderPaymentsTable(searchPayment.value);
    });
}

// ---------------------------
// 13. NOTIFICATIONS
// ---------------------------
function showNotification(message, type = "info") {
    if (!notificationContainer) return;

    const notif = document.createElement("div");
    notif.className = `notification notification-${type} show`;
    
    // Add icon based on type
    let icon = "ℹ️";
    if (type === "success") icon = "✓";
    if (type === "error") icon = "✕";
    if (type === "info") icon = "ℹ";
    
    notif.innerHTML = `<span style="margin-right:8px;">${icon}</span>${message}`;
    
    notificationContainer.appendChild(notif);

    setTimeout(() => {
        notif.classList.remove("show");
        setTimeout(() => {
            if (notificationContainer.contains(notif)) {
                notificationContainer.removeChild(notif);
            }
        }, 300);
    }, 5000);
}

// ---------------------------
// 15. PRINT RECEIPT
// ---------------------------
function openPrintModal(receiptNo) {
    const payment = payments.find(p => p.receiptNo === receiptNo);
    if (!payment) {
        showNotification("⚠️ Payment not found!", "error");
        return;
    }

    const student = students.find(s => s.id === payment.studentId);
    
    if (receiptContent) {
        receiptContent.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="margin:0; color:#2c3e50;">Payment Receipt</h2>
                <p style="margin:5px 0; color:#666;">East Boundary School Payment System</p>
            </div>
            <hr style="border:1px solid #ddd; margin:15px 0;">
            <div style="line-height:1.8;">
                <p><strong>Receipt Number:</strong> ${payment.receiptNo}</p>
                <p><strong>Date:</strong> ${payment.date}</p>
                <p><strong>Student ID:</strong> ${payment.studentId}</p>
                <p><strong>Student Name:</strong> ${payment.studentName}</p>
                <p><strong>Grade:</strong> ${student ? student.grade : 'N/A'}</p>
                <p><strong>Term:</strong> ${payment.term}</p>
                <hr style="border:1px dashed #ddd; margin:15px 0;">
                <p><strong>Amount Paid:</strong> ${formatCurrency(payment.paid)}</p>
                <p><strong>Total Fee:</strong> ${formatCurrency(payment.amountPayable)}</p>
                <p><strong>Balance:</strong> ${formatCurrency(Math.abs(payment.balance))}</p>
                <p><strong>Status:</strong> <span style="color:${getStatusColor(payment.status)}; font-weight:600;">${payment.status}</span></p>
            </div>
            <hr style="border:1px solid #ddd; margin:15px 0;">
            <p style="text-align:center; font-size:12px; color:#666; margin-top:20px;">
                Thank you for your payment!<br>
                Keep this receipt for your records.
            </p>
        `;
    }
    
    if (printModal) {
        printModal.style.display = "block";
    }
}

// Close modal
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        if (printModal) {
            printModal.style.display = "none";
        }
    });
}

// Close modal when clicking outside
if (printModal) {
    window.addEventListener("click", (e) => {
        if (e.target === printModal) {
            printModal.style.display = "none";
        }
    });
}

// Print receipt
if (printReceiptBtn) {
    printReceiptBtn.addEventListener("click", () => {
        window.print();
    });
}

// ---------------------------
// 16. FEE SUMMARY AUTO-UPDATE
// ---------------------------
function updateFeeSummary(studentId, term) {
    if (!studentId || !term) {
        // Clear summary if no selection
        if (summaryTotalFee) summaryTotalFee.textContent = "0.00 ZMW";
        if (summaryAmountPaid) summaryAmountPaid.textContent = "0.00 ZMW";
        if (summaryBalance) summaryBalance.textContent = "0.00 ZMW";
        if (summaryStatus) {
            summaryStatus.textContent = "N/A";
            summaryStatus.style.color = "#666";
        }
        return;
    }

    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const totalFee = getFeeForStudent(studentId, term);
    const paidAmount = getTotalPaidByStudent(studentId, term);
    const balance = totalFee - paidAmount;
    
    let status;
    let statusColor;
    if (balance < 0) {
        status = "Overpaid";
        statusColor = "#dc3545";
    } else if (balance === 0) {
        status = "Paid";
        statusColor = "#28a745";
    } else {
        status = "Pending";
        statusColor = "#ffc107";
    }

    if (summaryTotalFee) summaryTotalFee.textContent = formatCurrency(totalFee);
    if (summaryAmountPaid) summaryAmountPaid.textContent = formatCurrency(paidAmount);
    if (summaryBalance) summaryBalance.textContent = formatCurrency(Math.abs(balance));
    if (summaryStatus) {
        summaryStatus.textContent = status;
        summaryStatus.style.color = statusColor;
        summaryStatus.style.fontWeight = "600";
    }
}

// ---------------------------
// UTILITY FUNCTIONS
// ---------------------------

// Save payments to localStorage
function savePaymentsToStorage() {
    try {
        localStorage.setItem("ebs_payments", JSON.stringify(payments));
    } catch (e) {
        console.error("Failed to save payments:", e);
    }
}

// Save fee structure to localStorage
function saveFeeStructureToStorage() {
    try {
        localStorage.setItem("ebs_fee_structure_flat", JSON.stringify(feeStructure));
    } catch (e) {
        console.error("Failed to save fee structure:", e);
    }
}

// Clear payment form
function clearPaymentForm() {
    if (paymentStudentSelect) paymentStudentSelect.value = "";
    if (paymentDate) paymentDate.value = getCurrentDate();
    if (recordTermSelect) recordTermSelect.value = "";
    if (paymentAmount) {
        paymentAmount.value = "";
        paymentAmount.readOnly = true;
    }
    if (recordGradeDisplay) recordGradeDisplay.value = "";
    
    updateFeeSummary("", "");
    updateRecordPaymentAvailability();
}

// Generate unique receipt number
function generateReceiptNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `REC${timestamp}${random}`;
}

// Format currency (ZMW)
function formatCurrency(amount) {
    return `${amount.toFixed(2)} ZMW`;
}

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get status color
function getStatusColor(status) {
    if (status === "Paid") return "#28a745";
    if (status === "Overpaid") return "#dc3545";
    return "#ffc107";
}

// Recalculate payment statuses for a specific student and term
function recalculatePaymentsForStudent(studentId, term) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const totalFee = getFeeForStudent(studentId, term);
    const studentPayments = payments.filter(p => p.studentId === studentId && p.term === term);
    
    let runningTotal = 0;
    studentPayments.forEach(payment => {
        runningTotal += payment.paid;
        const balance = totalFee - runningTotal;
        
        payment.amountPayable = totalFee;
        payment.balance = balance;
        
        if (balance < 0) {
            payment.status = "Overpaid";
        } else if (balance === 0) {
            payment.status = "Paid";
        } else {
            payment.status = "Pending";
        }
    });
    
    savePaymentsToStorage();
}

// Recalculate all payment statuses (used when fee structure changes)
function recalculateAllPaymentStatuses() {
    const processedCombos = new Set();
    
    payments.forEach(payment => {
        const key = `${payment.studentId}-${payment.term}`;
        if (!processedCombos.has(key)) {
            recalculatePaymentsForStudent(payment.studentId, payment.term);
            processedCombos.add(key);
        }
    });
}

// Enable/Disable Record Payment button based on fee structure availability
function updateRecordPaymentAvailability() {
    if (!recordPaymentBtn) return;
    
    const studentId = paymentStudentSelect ? paymentStudentSelect.value : "";
    const term = recordTermSelect ? recordTermSelect.value : "";
    
    if (!studentId || !term) {
        recordPaymentBtn.disabled = true;
        recordPaymentBtn.title = "Select student and term";
        return;
    }
    
    const student = students.find(s => s.id === studentId);
    if (!student) {
        recordPaymentBtn.disabled = true;
        recordPaymentBtn.title = "Student not found";
        return;
    }
    
    const hasFee = checkFeeStructureExists(studentId, term);
    recordPaymentBtn.disabled = !hasFee;
    recordPaymentBtn.title = hasFee 
        ? "Record payment" 
        : `⚠️ Define fee in Manage Fee Structure for ${student.grade} - ${term} first`;
}

// ---------------------------
// EVENT LISTENERS
// ---------------------------

// Grade selection changed - populate students
if (recordGradeDisplay) {
    recordGradeDisplay.addEventListener("change", () => {
        populateStudentsByGrade();
        // Clear student selection and summary when grade changes
        if (paymentStudentSelect) paymentStudentSelect.value = "";
        if (paymentAmount) {
            paymentAmount.value = "";
            paymentAmount.readOnly = true;
        }
        updateFeeSummary("", "");
        updateRecordPaymentAvailability();
    });
}

// Student selection changed
if (paymentStudentSelect) {
    paymentStudentSelect.addEventListener("change", () => {
        const studentId = paymentStudentSelect.value;
        const term = recordTermSelect ? recordTermSelect.value : "";
        updateFeeSummary(studentId, term);
        updateAutoPaymentAmount();
        renderStudentPaymentHistory();
    });
}

// Term selection changed
if (recordTermSelect) {
    recordTermSelect.addEventListener("change", () => {
        const studentId = paymentStudentSelect ? paymentStudentSelect.value : "";
        const term = recordTermSelect.value;
        updateFeeSummary(studentId, term);
        updateAutoPaymentAmount();
        renderStudentPaymentHistory();
    });
}

// Record Payment button
if (recordPaymentBtn) {
    recordPaymentBtn.addEventListener("click", recordPayment);
}

// Save Fee Structure button
if (saveFeeStructureBtn) {
    saveFeeStructureBtn.addEventListener("click", saveFeeStructure);
}

// Edit Fee Structure button
if (editFeeStructureBtn) {
    editFeeStructureBtn.addEventListener("click", () => {
        if (!feeGradeSelect || !feeTermSelect || !feeAmountInput) return;
        
        const grade = feeGradeSelect.value;
        const term = feeTermSelect.value;
        const amount = parseFloat(feeAmountInput.value);
        
        if (!grade || !term) {
            showNotification("⚠️ Please select both grade and term!", "error");
            return;
        }
        
        if (isNaN(amount) || amount <= 0) {
            showNotification("⚠️ Fee amount must be a valid positive number!", "error");
            return;
        }
        
        const existing = feeStructure.find(f => f.grade === grade && f.term === term);
        if (!existing) {
            showNotification("⚠️ No saved fee to edit for this grade and term!", "error");
            return;
        }
        
        existing.amount = amount;
        saveFeeStructureToStorage();
        
        showNotification("✓ Fee updated successfully!", "success");
        
        recalculateAllPaymentStatuses();
        renderPaymentsTable();
        updateAutoPaymentAmount();
    });
}

// Delete Fee Structure button
if (deleteFeeStructureBtn) {
    deleteFeeStructureBtn.addEventListener("click", () => {
        if (!feeGradeSelect || !feeTermSelect) return;
        
        const grade = feeGradeSelect.value;
        const term = feeTermSelect.value;
        
        if (!grade || !term) {
            showNotification("⚠️ Please select both grade and term!", "error");
            return;
        }
        
        const idx = feeStructure.findIndex(f => f.grade === grade && f.term === term);
        if (idx === -1) {
            showNotification("⚠️ No saved fee to delete for this grade and term!", "error");
            return;
        }
        
        // Check if there are payments linked to this fee
        const linkedPayments = payments.filter(p => {
            const student = students.find(s => s.id === p.studentId);
            return student && student.grade === grade && p.term === term;
        });
        
        if (linkedPayments.length > 0) {
            if (!confirm(
                `⚠️ Warning: There are ${linkedPayments.length} payment(s) linked to this fee.\n\n` +
                `Deleting this fee will affect those payment records.\n\n` +
                `Are you sure you want to continue?`
            )) {
                return;
            }
        } else {
            if (!confirm("Delete this fee? This action cannot be undone.")) {
                return;
            }
        }
        
        feeStructure.splice(idx, 1);
        saveFeeStructureToStorage();
        
        if (feeAmountInput) feeAmountInput.value = "";
        setFeeActionButtonsEnabled(false);
        
        showNotification("✓ Fee deleted successfully!", "success");
        
        recalculateAllPaymentStatuses();
        renderPaymentsTable();
        updateAutoPaymentAmount();
    });
}

// Set default date to today
if (paymentDate) {
    paymentDate.value = getCurrentDate();
}

// ---------------------------
// INITIALIZE APP
// ---------------------------
function initializeApp() {
    // Initialize all dropdowns
    initSelectOptions();
    
    // Populate students based on initial grade (if any)
    populateStudentsByGrade();
    
    // Render existing payments
    renderPaymentsTable();
    
    // Clear summary on load
    updateFeeSummary("", "");
    
    // Update button availability
    updateRecordPaymentAvailability();
    
    // Show welcome notification
    showNotification("✓ Payment system loaded successfully!", "success");
    renderStudentPaymentHistory();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
} else {
    initializeApp();
}

// Make functions globally accessible for inline onclick handlers
window.editPayment = editPayment;
window.deletePayment = deletePayment;
window.openPrintModal = openPrintModal;

// Render detailed payment history for selected student+term with running balance
function renderStudentPaymentHistory() {
    if (!studentPaymentsDetailBody) return;
    const studentId = paymentStudentSelect ? paymentStudentSelect.value : "";
    const term = recordTermSelect ? recordTermSelect.value : "";
    if (!studentId || !term) {
        studentPaymentsDetailBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:1rem; color:#666;">Select a student and term to view payment history.</td>
            </tr>
        `;
        return;
    }
    const totalFee = getFeeForStudent(studentId, term);
    const student = students.find(s => s.id === studentId);
    if (!student || totalFee === 0) {
        studentPaymentsDetailBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:1rem; color:#666;">No fee set for this grade/term or student not found.</td>
            </tr>
        `;
        return;
    }
    const records = payments
        .filter(p => p.studentId === studentId && p.term === term)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    if (records.length === 0) {
        const remaining = totalFee - 0;
        studentPaymentsDetailBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:1rem; color:#666;">No payments recorded yet.</td>
            </tr>
        `;
        return;
    }
    let cumulative = 0;
    const rowsHtml = records.map(r => {
        cumulative += r.paid;
        const runningBalance = totalFee - cumulative;
        return `
            <tr>
                <td>${r.date}</td>
                <td>${r.receiptNo}</td>
                <td>${formatCurrency(r.paid)}</td>
                <td>${formatCurrency(Math.max(cumulative, 0))}</td>
                <td>${formatCurrency(Math.abs(runningBalance))}</td>
            </tr>
        `;
    }).join("");
    studentPaymentsDetailBody.innerHTML = rowsHtml;
}

// ---------------------------
// SEND PAYMENT EMAIL TO GUARDIAN
// ---------------------------
async function sendPaymentEmail(studentId, term) {
    try {
        // Get student data
        const student = students.find(s => s.id === studentId);
        if (!student) {
            showNotification('Student not found', 'error');
            return;
        }

        // Check if guardian email exists
        if (!student.guardianEmail || student.guardianEmail.trim() === '') {
            showNotification('Guardian email not provided for this student. Please update student information.', 'error');
            return;
        }

        // Get Gmail SMTP credentials from localStorage
        const gmailAddress = localStorage.getItem('ebs_gmail_address');
        const gmailPassword = localStorage.getItem('ebs_gmail_password');
        const senderName = localStorage.getItem('ebs_sender_name') || 'East Boundary School';

        if (!gmailAddress || !gmailPassword) {
            showNotification('Gmail SMTP not configured. Please configure Gmail settings in the payroll system first.', 'error');
            return;
        }

        // Calculate payment data for this student and term
        const totalFee = getFeeForStudent(studentId, term);
        const studentPayments = payments.filter(p => p.studentId === studentId && p.term === term);
        const totalPaid = studentPayments.reduce((sum, p) => sum + (parseFloat(p.paid) || 0), 0);
        const balance = totalFee - totalPaid;

        // Determine status
        let status = 'Pending';
        if (totalPaid >= totalFee && totalFee > 0) {
            status = 'Paid';
        } else if (totalPaid > totalFee) {
            status = 'Overpaid';
        }

        const paymentData = {
            term: term,
            totalFee: totalFee,
            amountPaid: totalPaid,
            balance: balance,
            status: status,
            payments: studentPayments.map(p => ({
                receiptNo: p.receiptNo,
                date: p.date,
                paid: p.paid,
                description: p.description || 'School Fees Payment'
            }))
        };

        // Show loading notification
        showNotification('Sending email...', 'info');

        const response = await fetch('send-student-email.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student: student,
                paymentData: paymentData,
                gmailAddress: gmailAddress,
                gmailPassword: gmailPassword,
                senderName: senderName
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`✅ Email sent successfully to ${student.guardianEmail}`, 'success');
        } else {
            throw new Error(result.error || 'Failed to send email');
        }

    } catch (error) {
        console.error('Email send error:', error);
        showNotification('❌ Failed to send email: ' + error.message, 'error');
    }
}