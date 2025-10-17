// Payroll Engine - Handles payroll calculations, NAPSA, and processing

class PayrollEngine {
    constructor(payrollSystem) {
        this.system = payrollSystem;
        this.currentPayroll = null;
        this.init();
    }

    init() {
        console.log('🔧 PayrollEngine initializing...');
        
        // Set current month as default
        const now = new Date();
        const monthInput = document.getElementById('payrollMonth');
        if (monthInput) {
            monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        // Event listeners with logging
        const buttons = {
            'runPayrollBtn': () => this.runPayroll(),
            'loadPayrollBtn': () => this.loadPayroll(),
            'approvePayrollBtn': () => this.approvePayroll(),
            'generatePayslipsBtn': () => this.generateAllPayslips(),
            'sendPayslipsBtn': () => this.sendAllPayslips(),
            'deletePayrollBtn': () => this.deletePayroll(),
            'deleteEmployeeBtn': () => this.openDeleteEmployeeModal()
        };

        Object.entries(buttons).forEach(([id, handler]) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', handler);
                console.log(`✅ ${id} event listener attached`);
            } else {
                console.warn(`⚠️ ${id} button not found!`);
            }
        });

        // Delete Employee Modal handlers
        const modalHandlers = {
            'closeDeleteEmployeeModal': () => this.closeDeleteEmployeeModal(),
            'cancelDeleteEmployee': () => this.closeDeleteEmployeeModal(),
            'confirmDeleteEmployee': () => this.confirmDeleteEmployee()
        };

        Object.entries(modalHandlers).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
                console.log(`✅ ${id} event listener attached`);
            }
        });

        // Employee select change handler
        const empSelect = document.getElementById('deleteEmployeeSelect');
        if (empSelect) {
            empSelect.addEventListener('change', (e) => this.showEmployeeDeleteInfo(e.target.value));
            console.log('✅ deleteEmployeeSelect change listener attached');
        }

        console.log('✅ PayrollEngine initialized successfully');
    }

    runPayroll() {
        const monthInput = document.getElementById('payrollMonth').value;
        if (!monthInput) {
            this.system.showNotification('Please select a month and year.', 'warning');
            return;
        }

        const [year, month] = monthInput.split('-');
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

        // Check if payroll already exists
        const existing = this.system.payrolls.find(p => p.month === monthInput);
        if (existing) {
            if (!confirm(`Payroll for ${monthName} ${year} already exists. Do you want to regenerate it?`)) {
                return;
            }
            // Remove existing payroll
            this.system.payrolls = this.system.payrolls.filter(p => p.month !== monthInput);
        }

        // Get active employees
        const activeEmployees = this.system.employees.filter(e => e.status === 'Active');
        
        if (activeEmployees.length === 0) {
            this.system.showNotification('No active employees found.', 'warning');
            return;
        }

        // Calculate payroll for each employee
        const payrollRecords = activeEmployees.map(emp => this.calculateEmployeePayroll(emp, monthInput));

        // Create payroll entry
        const payroll = {
            payroll_id: this.generatePayrollId(),
            month: monthInput,
            monthName: monthName,
            year: year,
            records: payrollRecords,
            status: 'Pending',
            total_gross: payrollRecords.reduce((sum, r) => sum + r.gross_salary, 0),
            total_net: payrollRecords.reduce((sum, r) => sum + r.net_pay, 0),
            total_napsa_employee: payrollRecords.reduce((sum, r) => sum + r.napsa_employee, 0),
            total_napsa_employer: payrollRecords.reduce((sum, r) => sum + r.napsa_employer, 0),
            employee_count: payrollRecords.length,
            created_at: new Date().toISOString(),
            created_by: this.system.currentUser.name
        };

        this.system.payrolls.push(payroll);
        this.system.saveToStorage('ebs_payrolls', this.system.payrolls);

        this.currentPayroll = payroll;
        this.renderPayrollTable(payroll);
        this.updatePayrollSummary(payroll);
        this.showPayrollActions();

        this.system.showNotification(`Payroll for ${monthName} ${year} generated successfully.`, 'success');
        this.system.logActivity(`Generated payroll for ${monthName} ${year}`, 'Payroll Processing');
    }

    calculateEmployeePayroll(employee, month) {
        const basicSalary = employee.basic_salary || 0;
        const allowances = employee.allowances || 0;
        const grossSalary = basicSalary + allowances;

        // Calculate NAPSA
        const napsaRate = this.system.settings.napsaEmployeeRate / 100;
        const napsaEmployerRate = this.system.settings.napsaEmployerRate / 100;
        const maxNapsa = this.system.settings.napsaMaxContribution;

        const napsaEmployee = Math.min(grossSalary * napsaRate, maxNapsa);
        const napsaEmployer = Math.min(grossSalary * napsaEmployerRate, maxNapsa);

        // Get active loans for this employee
        const activeLoans = this.system.loans.filter(l => 
            l.employee_id === employee.employee_id && 
            l.status === 'Active' &&
            l.remaining_balance > 0
        );

        let loanDeductions = 0;
        const loanDetails = activeLoans.map(loan => {
            const deduction = Math.min(loan.monthly_deduction, loan.remaining_balance);
            loanDeductions += deduction;
            
            // Update loan balance
            loan.remaining_balance -= deduction;
            if (loan.remaining_balance <= 0) {
                loan.status = 'Cleared';
            }
            
            return {
                loan_id: loan.loan_id,
                type: loan.type,
                deduction: deduction
            };
        });

        // Save updated loans
        this.system.saveToStorage('ebs_loans', this.system.loans);

        // Calculate total deductions and net pay
        const totalDeductions = napsaEmployee + loanDeductions;
        const netPay = grossSalary - totalDeductions;

        return {
            employee_id: employee.employee_id,
            employee_name: employee.full_name,
            nrc_number: employee.nrc_number,
            email: employee.email,
            grade_taught: employee.grade_taught,
            basic_salary: basicSalary,
            allowances: allowances,
            gross_salary: grossSalary,
            napsa_employee: napsaEmployee,
            napsa_employer: napsaEmployer,
            loan_deductions: loanDeductions,
            loan_details: loanDetails,
            total_deductions: totalDeductions,
            net_pay: netPay
        };
    }

    loadPayroll() {
        const monthInput = document.getElementById('payrollMonth').value;
        if (!monthInput) {
            this.system.showNotification('Please select a month and year.', 'warning');
            return;
        }

        const payroll = this.system.payrolls.find(p => p.month === monthInput);
        
        if (!payroll) {
            this.system.showNotification('No payroll found for this month.', 'warning');
            this.hidePayrollActions();
            document.getElementById('payrollTableBody').innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-calculator"></i>
                        <p>No payroll data for this month. Click "Run Monthly Payroll" to generate.</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.currentPayroll = payroll;
        this.renderPayrollTable(payroll);
        this.updatePayrollSummary(payroll);
        this.showPayrollActions();
    }

    renderPayrollTable(payroll) {
        const tbody = document.getElementById('payrollTableBody');
        
        tbody.innerHTML = payroll.records.map(record => `
            <tr>
                <td>
                    <strong>${record.employee_name}</strong><br>
                    <small>${record.employee_id}</small>
                </td>
                <td>K ${record.basic_salary.toFixed(2)}</td>
                <td>K ${record.allowances.toFixed(2)}</td>
                <td><strong>K ${record.gross_salary.toFixed(2)}</strong></td>
                <td>K ${record.napsa_employee.toFixed(2)}</td>
                <td>K ${record.napsa_employer.toFixed(2)}</td>
                <td>K ${record.loan_deductions.toFixed(2)}</td>
                <td>K ${record.total_deductions.toFixed(2)}</td>
                <td><strong style="color: #28a745;">K ${record.net_pay.toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="payrollEngine.viewPayslip('${record.employee_id}')" title="View Payslip">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updatePayrollSummary(payroll) {
        const statusBadge = document.getElementById('payrollStatus');
        statusBadge.textContent = payroll.status;
        statusBadge.className = `status-badge ${payroll.status.toLowerCase()}`;

        document.getElementById('payrollEmployeeCount').textContent = payroll.employee_count;
        document.getElementById('payrollTotalGross').textContent = `K ${payroll.total_gross.toFixed(2)}`;
        document.getElementById('payrollTotalNet').textContent = `K ${payroll.total_net.toFixed(2)}`;
    }

    showPayrollActions() {
        const actionsBar = document.getElementById('payrollActionsBar');
        actionsBar.style.display = 'flex';

        const approveBtn = document.getElementById('approvePayrollBtn');
        const generateBtn = document.getElementById('generatePayslipsBtn');
        const sendBtn = document.getElementById('sendPayslipsBtn');

        if (this.currentPayroll.status === 'Pending') {
            approveBtn.disabled = false;
            generateBtn.disabled = true;
            sendBtn.disabled = true;
        } else if (this.currentPayroll.status === 'Approved') {
            approveBtn.disabled = true;
            generateBtn.disabled = false;
            
            // Check if payslips are already generated
            const hasPayslips = this.system.payslips.some(p => p.payroll_id === this.currentPayroll.payroll_id);
            sendBtn.disabled = !hasPayslips;
        } else {
            approveBtn.disabled = true;
            generateBtn.disabled = true;
            sendBtn.disabled = false;
        }
    }

    hidePayrollActions() {
        document.getElementById('payrollActionsBar').style.display = 'none';
    }

    approvePayroll() {
        if (!this.currentPayroll) return;

        if (this.system.settings.requireApproval) {
            const userRole = this.system.currentUser.role;
            if (userRole !== 'CEO' && userRole !== 'Assistant CEO') {
                this.system.showNotification('Only CEO or Assistant CEO can approve payroll.', 'error');
                return;
            }
        }

        if (!confirm(`Approve payroll for ${this.currentPayroll.monthName} ${this.currentPayroll.year}?`)) {
            return;
        }

        this.currentPayroll.status = 'Approved';
        this.currentPayroll.approved_at = new Date().toISOString();
        this.currentPayroll.approved_by = this.system.currentUser.name;

        this.system.saveToStorage('ebs_payrolls', this.system.payrolls);
        this.updatePayrollSummary(this.currentPayroll);
        this.showPayrollActions();

        this.system.showNotification('Payroll approved successfully.', 'success');
        this.system.logActivity(`Approved payroll for ${this.currentPayroll.monthName} ${this.currentPayroll.year}`, 'Payroll Processing');
    }

    generateAllPayslips() {
        console.log('📄 Generate Payslips button clicked');
        console.log('Current payroll:', this.currentPayroll);
        console.log('Payroll status:', this.currentPayroll?.status);
        
        if (!this.currentPayroll) {
            alert('ERROR: No payroll loaded!\n\nPlease run or load a payroll first.');
            this.system.showNotification('No payroll loaded. Run or load a payroll first.', 'error');
            return;
        }
        
        if (this.currentPayroll.status !== 'Approved') {
            alert('ERROR: Payroll must be approved first!\n\nCurrent status: ' + this.currentPayroll.status + '\n\nClick "Approve Payroll" button first.');
            this.system.showNotification('Payroll must be approved before generating payslips.', 'warning');
            return;
        }

        if (typeof PayslipGenerator === 'undefined') {
            alert('ERROR: PayslipGenerator not loaded!\n\nCheck if payslip-generator.js is loaded.');
            this.system.showNotification('Payslip generator not loaded.', 'error');
            return;
        }

        console.log('✅ All checks passed, generating payslips...');
        const generator = window.payslipGenerator || new PayslipGenerator(this.system);
        generator.generateBulkPayslips(this.currentPayroll);
    }

    sendAllPayslips() {
        if (!this.currentPayroll) return;

        if (typeof EmailHandler === 'undefined') {
            this.system.showNotification('Email handler not loaded.', 'error');
            return;
        }

        const emailHandler = window.emailHandler || new EmailHandler(this.system);
        emailHandler.sendBulkPayslips(this.currentPayroll);
    }

    deletePayroll() {
        console.log('🗑️ Delete Payroll button clicked');
        console.log('Current payroll:', this.currentPayroll);
        
        if (!this.currentPayroll) {
            this.system.showNotification('No payroll loaded. Please load or run a payroll first.', 'warning');
            return;
        }

        if (!confirm(`Delete payroll for ${this.currentPayroll.monthName} ${this.currentPayroll.year}? This cannot be undone.`)) {
            return;
        }

        // Delete associated payslips
        this.system.payslips = this.system.payslips.filter(p => p.payroll_id !== this.currentPayroll.payroll_id);
        this.system.saveToStorage('ebs_payslips', this.system.payslips);

        // Delete payroll
        this.system.payrolls = this.system.payrolls.filter(p => p.payroll_id !== this.currentPayroll.payroll_id);
        this.system.saveToStorage('ebs_payrolls', this.system.payrolls);

        this.system.showNotification('Payroll deleted successfully.', 'success');
        this.system.logActivity(`Deleted payroll for ${this.currentPayroll.monthName} ${this.currentPayroll.year}`, 'Payroll Processing');

        this.currentPayroll = null;
        this.hidePayrollActions();
        document.getElementById('payrollTableBody').innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <i class="fas fa-calculator"></i>
                    <p>Select a month and run payroll to see results.</p>
                </td>
            </tr>
        `;
    }

    viewPayslip(employeeId) {
        if (!this.currentPayroll) return;

        const record = this.currentPayroll.records.find(r => r.employee_id === employeeId);
        if (!record) return;

        if (typeof PayslipGenerator !== 'undefined') {
            const generator = window.payslipGenerator || new PayslipGenerator(this.system);
            generator.previewPayslip(record, this.currentPayroll);
        }
    }

    generatePayrollId() {
        return `PAYROLL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    openDeleteEmployeeModal() {
        console.log('👤 Delete Employee button clicked');
        
        const modal = document.getElementById('deleteEmployeeModal');
        const select = document.getElementById('deleteEmployeeSelect');
        
        if (!modal) {
            alert('ERROR: Delete Employee modal not found!\n\nCheck if deleteEmployeeModal exists in index.html');
            console.error('deleteEmployeeModal element not found');
            return;
        }
        
        if (!select) {
            alert('ERROR: Employee select dropdown not found!');
            console.error('deleteEmployeeSelect element not found');
            return;
        }
        
        if (!this.system.employees || this.system.employees.length === 0) {
            alert('ERROR: No employees found!\n\nPlease sync employees first from the Employees tab.');
            this.system.showNotification('No employees to delete.', 'warning');
            return;
        }
        
        console.log(`Found ${this.system.employees.length} employees`);
        
        // Populate employee dropdown
        select.innerHTML = '<option value="">-- Select Employee --</option>';
        this.system.employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.employee_id;
            option.textContent = `${emp.full_name} (${emp.employee_id})`;
            select.appendChild(option);
        });
        
        // Reset state
        document.getElementById('deleteEmployeeInfo').style.display = 'none';
        document.getElementById('confirmDeleteEmployee').disabled = true;
        
        console.log('✅ Opening delete employee modal');
        modal.classList.add('active');
    }

    closeDeleteEmployeeModal() {
        const modal = document.getElementById('deleteEmployeeModal');
        modal.classList.remove('active');
        document.getElementById('deleteEmployeeSelect').value = '';
        document.getElementById('deleteEmployeeInfo').style.display = 'none';
    }

    showEmployeeDeleteInfo(employeeId) {
        const infoDiv = document.getElementById('deleteEmployeeInfo');
        const detailsDiv = document.getElementById('deleteEmployeeDetails');
        const confirmBtn = document.getElementById('confirmDeleteEmployee');
        
        if (!employeeId) {
            infoDiv.style.display = 'none';
            confirmBtn.disabled = true;
            return;
        }
        
        const employee = this.system.employees.find(e => e.employee_id === employeeId);
        if (!employee) return;
        
        // Count related records
        const payrollCount = this.system.payrolls.filter(p => 
            p.records.some(r => r.employee_id === employeeId)
        ).length;
        const payslipCount = this.system.payslips.filter(p => p.employee_id === employeeId).length;
        const loanCount = this.system.loans.filter(l => l.employee_id === employeeId).length;
        
        detailsDiv.innerHTML = `
            <p><strong>Name:</strong> ${employee.full_name}</p>
            <p><strong>Employee ID:</strong> ${employee.employee_id}</p>
            <p><strong>Type:</strong> ${employee.employee_type}</p>
            <p><strong>NRC:</strong> ${employee.nrc_number}</p>
            <p><strong>Related Records:</strong></p>
            <ul>
                <li>${payrollCount} payroll record(s)</li>
                <li>${payslipCount} payslip(s)</li>
                <li>${loanCount} loan(s)/advance(s)</li>
            </ul>
        `;
        
        infoDiv.style.display = 'block';
        confirmBtn.disabled = false;
    }

    confirmDeleteEmployee() {
        const employeeId = document.getElementById('deleteEmployeeSelect').value;
        if (!employeeId) return;
        
        const employee = this.system.employees.find(e => e.employee_id === employeeId);
        if (!employee) return;
        
        if (!confirm(`Are you absolutely sure you want to permanently delete ${employee.full_name}?\n\nThis will remove ALL related data and CANNOT be undone!`)) {
            return;
        }
        
        // Delete employee from all systems
        // 1. Remove from payroll records
        this.system.payrolls.forEach(payroll => {
            payroll.records = payroll.records.filter(r => r.employee_id !== employeeId);
        });
        this.system.saveToStorage('ebs_payrolls', this.system.payrolls);
        
        // 2. Remove payslips
        this.system.payslips = this.system.payslips.filter(p => p.employee_id !== employeeId);
        this.system.saveToStorage('ebs_payslips', this.system.payslips);
        
        // 3. Remove loans
        this.system.loans = this.system.loans.filter(l => l.employee_id !== employeeId);
        this.system.saveToStorage('ebs_loans', this.system.loans);
        
        // 4. Remove employee
        this.system.employees = this.system.employees.filter(e => e.employee_id !== employeeId);
        this.system.saveToStorage('ebs_employees', this.system.employees);
        
        // Update UI
        this.system.renderEmployees();
        this.system.updateDashboard();
        this.closeDeleteEmployeeModal();
        
        this.system.showNotification(`Employee ${employee.full_name} has been permanently deleted.`, 'success');
        this.system.logActivity(`Deleted employee: ${employee.full_name} (${employeeId})`, 'Employee Management');
        
        // Reload current payroll if it exists and recalculate totals
        if (this.currentPayroll) {
            // Recalculate payroll totals after employee deletion
            const updatedPayroll = this.system.payrolls.find(p => p.payroll_id === this.currentPayroll.payroll_id);
            
            if (updatedPayroll && updatedPayroll.records.length > 0) {
                // Recalculate totals
                updatedPayroll.employee_count = updatedPayroll.records.length;
                updatedPayroll.total_gross = updatedPayroll.records.reduce((sum, r) => sum + r.gross_salary, 0);
                updatedPayroll.total_deductions = updatedPayroll.records.reduce((sum, r) => sum + r.total_deductions, 0);
                updatedPayroll.total_net = updatedPayroll.records.reduce((sum, r) => sum + r.net_pay, 0);
                updatedPayroll.total_napsa_employee = updatedPayroll.records.reduce((sum, r) => sum + r.napsa_employee, 0);
                updatedPayroll.total_napsa_employer = updatedPayroll.records.reduce((sum, r) => sum + r.napsa_employer, 0);
                
                // Save updated payroll
                this.system.saveToStorage('ebs_payrolls', this.system.payrolls);
                
                // Update current payroll reference
                this.currentPayroll = updatedPayroll;
                
                // Update UI with new totals
                this.updatePayrollSummary(updatedPayroll);
                this.renderPayrollTable(updatedPayroll);
            } else {
                // No employees left in payroll - clear everything
                this.currentPayroll = null;
                this.hidePayrollActions();
                document.getElementById('payrollTableBody').innerHTML = `
                    <tr>
                        <td colspan="10" class="empty-state">
                            <i class="fas fa-calculator"></i>
                            <p>All employees removed. Run payroll again to generate new records.</p>
                        </td>
                    </tr>
                `;
                
                // Clear payroll summary
                document.getElementById('payrollStatus').textContent = 'N/A';
                document.getElementById('payrollEmployeeCount').textContent = '0';
                document.getElementById('payrollTotalGross').textContent = 'K 0.00';
                document.getElementById('payrollTotalNet').textContent = 'K 0.00';
            }
        }
    }
}
