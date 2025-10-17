// East Boundary School - Payroll Management System
// Main Script - Core functionality, Employee Management, Navigation

class PayrollManagementSystem {
    constructor() {
        this.employees = this.loadFromStorage('ebs_employees') || [];
        this.payrolls = this.loadFromStorage('ebs_payrolls') || [];
        this.payslips = this.loadFromStorage('ebs_payslips') || [];
        this.loans = this.loadFromStorage('ebs_loans') || [];
        this.settings = this.loadFromStorage('ebs_payroll_settings') || this.getDefaultSettings();
        this.activityLog = this.loadFromStorage('ebs_activity_log') || [];
        this.currentUser = { name: 'Administrator', role: 'CEO' };
        this.currentEmployeeId = null;
        
        this.init();
    }

    init() {
        this.initNavigation();
        this.initTabs();
        this.initEmployeeManagement();
        this.updateDashboard();
        
        // Initialize PayrollEngine and PayslipGenerator on page load
        this.initPayrollTab();
        this.initPayslipsTab();
        
        this.logActivity('System initialized', 'System');
    }

    // ============================================
    // STORAGE MANAGEMENT
    // ============================================
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return null;
        }
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            this.showNotification('Storage error. Please check your browser settings.', 'error');
        }
    }

    getDefaultSettings() {
        return {
            napsaEmployeeRate: 5,
            napsaEmployerRate: 5,
            napsaMaxContribution: 1708.20,
            companyEmail: 'payroll@eastboundary.com',
            emailSubject: 'Your Payslip for {month} {year}',
            emailTemplate: 'Dear {employee_name},\n\nPlease find attached your payslip for {month} {year}.\nThe PDF is password-protected with your NRC number.\n\nBest regards,\nEast Boundary School',
            requireApproval: true
        };
    }

    // ============================================
    // NAVIGATION
    // ============================================
    initNavigation() {
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const closeBtn = document.getElementById('closeBtn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        hamburgerBtn?.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });

        closeBtn?.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // ============================================
    // TAB MANAGEMENT
    // ============================================
    initTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`${targetTab}Tab`)?.classList.add('active');
                
                // Load data when switching tabs
                if (targetTab === 'payroll') {
                    this.initPayrollTab();
                } else if (targetTab === 'payslips') {
                    this.initPayslipsTab();
                } else if (targetTab === 'reports') {
                    this.initReportsTab();
                } else if (targetTab === 'settings') {
                    this.loadSettings();
                }
            });
        });
    }

    // ============================================
    // EMPLOYEE MANAGEMENT
    // ============================================
    initEmployeeManagement() {
        // Sync All Employees Button (Teachers + Support Staff)
        document.getElementById('syncAllEmployeesBtn')?.addEventListener('click', () => {
            this.syncAllEmployees();
        });

        // Update Salaries Button
        document.getElementById('updateSalariesBtn')?.addEventListener('click', () => {
            this.bulkUpdateSalaries();
        });

        // Salary Form Submit
        document.getElementById('salaryForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateEmployeeSalary(e.target);
        });

        // Close Modal Buttons
        document.getElementById('closeSalaryModal')?.addEventListener('click', () => {
            this.closeSalaryModal();
        });
        document.getElementById('cancelSalaryBtn')?.addEventListener('click', () => {
            this.closeSalaryModal();
        });

        // Salary calculation preview
        document.getElementById('salaryBasicAmount')?.addEventListener('input', () => this.updateSalaryPreview());
        document.getElementById('salaryAllowances')?.addEventListener('input', () => this.updateSalaryPreview());

        // Search and Filter
        document.getElementById('employeeSearch')?.addEventListener('input', (e) => {
            this.filterEmployees(e.target.value);
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filterEmployees(document.getElementById('employeeSearch').value);
        });

        // Render initial employee list
        this.renderEmployees();
    }

    syncAllEmployees() {
        const teachers = this.loadFromStorage('eastBoundaryTeachers') || [];
        const supportStaff = this.loadFromStorage('eastBoundarySupportStaff') || [];
        
        if (teachers.length === 0 && supportStaff.length === 0) {
            this.showNotification('No teachers or support staff found in the system.', 'warning');
            return;
        }

        let syncedCount = 0;
        let updatedCount = 0;

        // Sync Teachers
        teachers.forEach(teacher => {
            if (teacher.status === 'Active') {
                const existing = this.employees.find(e => e.nrc_number === teacher.nrc_id);
                
                if (existing) {
                    // Update existing employee info (keep salary data)
                    existing.full_name = teacher.full_name;
                    existing.email = teacher.email || existing.email;
                    existing.phone = teacher.contact_number || existing.phone;
                    existing.department_grade = teacher.grade_level || existing.department_grade;
                    existing.status = teacher.status;
                    existing.employee_type = 'Teacher';
                    updatedCount++;
                } else {
                    // Add new employee
                    const employee = {
                        employee_id: this.generateEmployeeId(),
                        employee_type: 'Teacher',
                        full_name: teacher.full_name,
                        date_of_birth: teacher.date_of_birth || '',
                        nrc_number: teacher.nrc_id,
                        email: teacher.email || '',
                        phone: teacher.contact_number || '',
                        department_grade: teacher.grade_level || '',
                        basic_salary: 0, // To be set in salary update
                        allowances: 0,
                        napsa_number: '',
                        date_employed: teacher.employment_date || '',
                        bank_details: '',
                        status: 'Active',
                        created_at: new Date().toISOString(),
                        source_id: teacher.id
                    };
                    
                    this.employees.push(employee);
                    syncedCount++;
                }
            }
        });

        // Sync Support Staff
        supportStaff.forEach(staff => {
            if (staff.status === 'Active') {
                const existing = this.employees.find(e => e.nrc_number === staff.nrc_id);
                
                if (existing) {
                    // Update existing employee info (keep salary data)
                    existing.full_name = staff.full_name;
                    existing.email = staff.email || existing.email;
                    existing.phone = staff.contact_number || existing.phone;
                    existing.department_grade = staff.department || existing.department_grade;
                    existing.status = staff.status;
                    existing.employee_type = 'Support Staff';
                    updatedCount++;
                } else {
                    // Add new employee
                    const employee = {
                        employee_id: this.generateEmployeeId(),
                        employee_type: 'Support Staff',
                        full_name: staff.full_name,
                        date_of_birth: staff.date_of_birth || '',
                        nrc_number: staff.nrc_id,
                        email: staff.email || '',
                        phone: staff.contact_number || '',
                        department_grade: staff.department || '',
                        basic_salary: 0, // To be set in salary update
                        allowances: 0,
                        napsa_number: '',
                        date_employed: staff.employment_date || '',
                        bank_details: '',
                        status: 'Active',
                        created_at: new Date().toISOString(),
                        source_id: staff.id
                    };
                    
                    this.employees.push(employee);
                    syncedCount++;
                }
            }
        });

        this.saveToStorage('ebs_employees', this.employees);
        this.renderEmployees();
        this.updateDashboard();
        
        const message = `Synced ${syncedCount} new employee(s) and updated ${updatedCount} existing employee(s).`;
        this.showNotification(message, 'success');
        this.logActivity(`Synced employees: ${syncedCount} new, ${updatedCount} updated`, 'Employee Management');
    }

    generateEmployeeId() {
        const year = new Date().getFullYear();
        const prefix = 'EMP';
        let counter = 1;
        let newId;

        do {
            newId = `${prefix}-${year}-${String(counter).padStart(4, '0')}`;
            counter++;
        } while (this.employees.some(e => e.employee_id === newId));

        return newId;
    }

    openSalaryModal(employee) {
        const modal = document.getElementById('salaryModal');
        this.currentEmployeeId = employee.employee_id;
        
        document.getElementById('salaryEmployeeId').value = employee.employee_id;
        document.getElementById('salaryEmployeeName').value = employee.full_name;
        document.getElementById('salaryEmployeeType').value = employee.employee_type || 'Unknown';
        document.getElementById('salaryBasicAmount').value = employee.basic_salary || 0;
        document.getElementById('salaryAllowances').value = employee.allowances || 0;
        document.getElementById('salaryNapsaNumber').value = employee.napsa_number || '';
        document.getElementById('salaryBankDetails').value = employee.bank_details || '';
        
        this.updateSalaryPreview();
        modal.classList.add('active');
    }

    closeSalaryModal() {
        document.getElementById('salaryModal').classList.remove('active');
        this.currentEmployeeId = null;
    }

    updateSalaryPreview() {
        const basic = parseFloat(document.getElementById('salaryBasicAmount').value) || 0;
        const allowances = parseFloat(document.getElementById('salaryAllowances').value) || 0;
        const gross = basic + allowances;
        
        document.getElementById('salaryGrossPreview').textContent = `K ${gross.toFixed(2)}`;
    }

    updateEmployeeSalary(form) {
        const formData = new FormData(form);
        const employeeId = formData.get('employee_id');
        const basicSalary = parseFloat(formData.get('basic_salary')) || 0;
        const allowances = parseFloat(formData.get('allowances')) || 0;
        const napsaNumber = formData.get('napsa_number').trim();
        const bankDetails = formData.get('bank_details').trim();

        const index = this.employees.findIndex(e => e.employee_id === employeeId);
        if (index !== -1) {
            this.employees[index].basic_salary = basicSalary;
            this.employees[index].allowances = allowances;
            this.employees[index].napsa_number = napsaNumber;
            this.employees[index].bank_details = bankDetails;
            this.employees[index].updated_at = new Date().toISOString();

            this.saveToStorage('ebs_employees', this.employees);
            this.renderEmployees();
            this.updateDashboard();
            this.showNotification('Salary information updated successfully.', 'success');
            this.logActivity(`Updated salary for ${this.employees[index].full_name}`, 'Salary Management');
            this.closeSalaryModal();
        }
    }

    bulkUpdateSalaries() {
        // Open a simple interface to update all salaries at once
        const employees = this.employees.filter(e => e.basic_salary === 0);
        if (employees.length === 0) {
            this.showNotification('All employees have salary information set.', 'info');
            return;
        }
        
        this.showNotification(`${employees.length} employee(s) need salary information. Use the edit button for each employee.`, 'info');
    }

    deleteEmployee(employeeId) {
        if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
            return;
        }

        const employee = this.employees.find(e => e.employee_id === employeeId);
        this.employees = this.employees.filter(e => e.employee_id !== employeeId);
        this.saveToStorage('ebs_employees', this.employees);
        this.renderEmployees();
        this.updateDashboard();
        this.showNotification('Employee deleted successfully.', 'success');
        this.logActivity(`Deleted employee: ${employee?.full_name}`, 'Employee Management');
    }

    editEmployee(employeeId) {
        const employee = this.employees.find(e => e.employee_id === employeeId);
        if (employee) {
            this.openSalaryModal(employee);
        }
    }

    filterEmployees(searchTerm = '') {
        const statusFilter = document.getElementById('statusFilter').value;
        let filtered = this.employees;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(e => e.status === statusFilter);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(e =>
                e.full_name.toLowerCase().includes(term) ||
                e.employee_id.toLowerCase().includes(term) ||
                e.nrc_number.toLowerCase().includes(term) ||
                e.email.toLowerCase().includes(term)
            );
        }

        this.renderEmployees(filtered);
    }

    renderEmployees(employeeList = null) {
        const tbody = document.getElementById('employeesTableBody');
        const employees = employeeList || this.employees;

        if (employees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No employees found. Click "Sync All Employees" to import teachers and support staff.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = employees.map(emp => {
            const typeColor = emp.employee_type === 'Teacher' ? '#4a90e2' : '#28a745';
            const salaryStatus = emp.basic_salary === 0 ? 
                '<span style="color: #dc3545; font-size: 0.85rem;">⚠ Not Set</span>' : 
                `K ${emp.basic_salary.toFixed(2)}`;
            
            return `
                <tr>
                    <td><strong>${emp.employee_id}</strong></td>
                    <td>${emp.full_name}</td>
                    <td><span style="color: ${typeColor}; font-weight: 600;">${emp.employee_type || 'Unknown'}</span></td>
                    <td>${emp.nrc_number}</td>
                    <td>${emp.email || 'N/A'}</td>
                    <td>${emp.phone || 'N/A'}</td>
                    <td>${emp.department_grade || 'N/A'}</td>
                    <td>${salaryStatus}</td>
                    <td><span class="status-badge ${emp.status.toLowerCase()}">${emp.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="payrollSystem.editEmployee('${emp.employee_id}')" title="Update Salary">
                            <i class="fas fa-dollar-sign"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="payrollSystem.manageLoan('${emp.employee_id}')" title="Manage Loan">
                            <i class="fas fa-money-bill"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============================================
    // LOAN MANAGEMENT
    // ============================================
    manageLoan(employeeId) {
        const employee = this.employees.find(e => e.employee_id === employeeId);
        if (!employee) return;

        const modal = document.getElementById('loanModal');
        document.getElementById('loanEmployeeId').value = employeeId;
        document.getElementById('loanEmployeeName').value = employee.full_name;
        
        modal.classList.add('active');

        // Setup loan form
        const form = document.getElementById('loanForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveLoan(form);
        };

        // Close handlers
        document.getElementById('closeLoanModal').onclick = () => modal.classList.remove('active');
        document.getElementById('cancelLoanBtn').onclick = () => modal.classList.remove('active');
    }

    saveLoan(form) {
        const formData = new FormData(form);
        const loan = {
            loan_id: this.generateLoanId(),
            employee_id: formData.get('employee_id'),
            type: formData.get('type'),
            total_amount: parseFloat(formData.get('total_amount')) || 0,
            monthly_deduction: parseFloat(formData.get('monthly_deduction')) || 0,
            remaining_balance: parseFloat(formData.get('total_amount')) || 0,
            status: 'Active',
            remarks: formData.get('remarks'),
            created_at: new Date().toISOString()
        };

        this.loans.push(loan);
        this.saveToStorage('ebs_loans', this.loans);
        
        const employee = this.employees.find(e => e.employee_id === loan.employee_id);
        this.showNotification(`Loan/Advance added for ${employee.full_name}.`, 'success');
        this.logActivity(`Added ${loan.type} for ${employee.full_name}: K${loan.total_amount}`, 'Loan Management');
        
        document.getElementById('loanModal').classList.remove('active');
    }

    generateLoanId() {
        return `LOAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // ============================================
    // DASHBOARD
    // ============================================
    updateDashboard() {
        const activeEmployees = this.employees.filter(e => e.status === 'Active');
        const totalGross = activeEmployees.reduce((sum, e) => sum + e.basic_salary + e.allowances, 0);
        
        // Calculate NAPSA for all active employees
        let totalNapsa = 0;
        activeEmployees.forEach(emp => {
            const gross = emp.basic_salary + emp.allowances;
            const napsaEmployee = Math.min(gross * 0.05, this.settings.napsaMaxContribution);
            const napsaEmployer = Math.min(gross * 0.05, this.settings.napsaMaxContribution);
            totalNapsa += napsaEmployee + napsaEmployer;
        });

        const totalNet = totalGross - (totalNapsa / 2); // Subtract only employee portion

        document.getElementById('totalEmployees').textContent = activeEmployees.length;
        document.getElementById('totalGross').textContent = `K ${totalGross.toFixed(2)}`;
        document.getElementById('totalNapsa').textContent = `K ${totalNapsa.toFixed(2)}`;
        document.getElementById('totalNet').textContent = `K ${totalNet.toFixed(2)}`;
    }

    // ============================================
    // PAYROLL TAB (Initialize payroll-engine.js)
    // ============================================
    initPayrollTab() {
        if (typeof PayrollEngine !== 'undefined') {
            window.payrollEngine = window.payrollEngine || new PayrollEngine(this);
        }
    }

    initPayslipsTab() {
        if (typeof PayslipGenerator !== 'undefined') {
            // Create payslip generator and attach to both window and this instance
            this.payslipGenerator = this.payslipGenerator || new PayslipGenerator(this);
            window.payslipGenerator = this.payslipGenerator; // Keep for backward compatibility
            this.payslipGenerator.renderPayslips();
        }
    }

    initReportsTab() {
        if (typeof ReportsManager !== 'undefined') {
            window.reportsManager = window.reportsManager || new ReportsManager(this);
        }
    }

    // ============================================
    // SETTINGS
    // ============================================
    loadSettings() {
        document.getElementById('napsaEmployeeRate').value = this.settings.napsaEmployeeRate;
        document.getElementById('napsaEmployerRate').value = this.settings.napsaEmployerRate;
        document.getElementById('napsaMaxContribution').value = this.settings.napsaMaxContribution;
        document.getElementById('companyEmail').value = this.settings.companyEmail;
        document.getElementById('emailSubject').value = this.settings.emailSubject;
        document.getElementById('emailTemplate').value = this.settings.emailTemplate;
        document.getElementById('requireApproval').checked = this.settings.requireApproval;

        // Save buttons
        document.getElementById('saveNapsaSettingsBtn').onclick = () => this.saveNapsaSettings();
        document.getElementById('saveEmailSettingsBtn').onclick = () => this.saveEmailSettings();
        document.getElementById('testEmailBtn').onclick = () => this.testEmailConnection();
        document.getElementById('saveSecuritySettingsBtn').onclick = () => this.saveSecuritySettings();
        document.getElementById('backupDataBtn').onclick = () => this.backupData();
        document.getElementById('restoreDataBtn').onclick = () => this.restoreData();
        
        // Load saved Gmail settings
        this.loadEmailSettings();
    }

    saveNapsaSettings() {
        this.settings.napsaEmployeeRate = parseFloat(document.getElementById('napsaEmployeeRate').value);
        this.settings.napsaEmployerRate = parseFloat(document.getElementById('napsaEmployerRate').value);
        this.settings.napsaMaxContribution = parseFloat(document.getElementById('napsaMaxContribution').value);
        this.saveToStorage('ebs_payroll_settings', this.settings);
        this.showNotification('NAPSA settings saved successfully.', 'success');
        this.logActivity('Updated NAPSA settings', 'Settings');
    }

    saveEmailSettings() {
        // Save Gmail SMTP credentials
        const gmailAddress = document.getElementById('gmailAddress').value.trim();
        const gmailPassword = document.getElementById('gmailAppPassword').value.trim();
        const senderName = document.getElementById('senderName').value.trim();
        
        if (gmailAddress) {
            if (!this.validateEmail(gmailAddress)) {
                this.showNotification('Invalid Gmail address format', 'error');
                return;
            }
            localStorage.setItem('ebs_gmail_address', gmailAddress);
        }
        
        // Only update password if a new one is entered (otherwise keep the existing saved password)
        if (gmailPassword) {
            localStorage.setItem('ebs_gmail_password', gmailPassword);
            this.showNotification('✅ Gmail password updated and saved!', 'success');
            // Clear the field after saving for security
            document.getElementById('gmailAppPassword').value = '';
        }
        
        if (senderName) {
            localStorage.setItem('ebs_sender_name', senderName);
        }
        
        // Save other email settings
        this.settings.companyEmail = document.getElementById('companyEmail').value;
        this.settings.emailSubject = document.getElementById('emailSubject').value;
        this.settings.emailTemplate = document.getElementById('emailTemplate').value;
        this.saveToStorage('ebs_payroll_settings', this.settings);
        
        // Reload settings to show visual indicators
        this.loadEmailSettings();
        
        this.showNotification('✅ Email settings saved permanently! Password will be remembered.', 'success');
        this.logActivity('Updated email settings with Gmail SMTP configuration', 'Settings');
    }
    
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    loadEmailSettings() {
        // Load Gmail SMTP settings from localStorage
        const gmailAddress = localStorage.getItem('ebs_gmail_address') || '';
        const gmailPassword = localStorage.getItem('ebs_gmail_password') || '';
        const senderName = localStorage.getItem('ebs_sender_name') || 'East Boundary Systems - Payroll';
        
        if (gmailAddress) {
            document.getElementById('gmailAddress').value = gmailAddress;
        }
        if (senderName) {
            document.getElementById('senderName').value = senderName;
        }
        
        // Show password status - display placeholder if password is saved
        const passwordField = document.getElementById('gmailAppPassword');
        if (gmailPassword) {
            passwordField.placeholder = '••••••••••••••••  (Password saved - leave empty to keep current)';
            passwordField.style.borderColor = '#28a745';
            passwordField.style.borderWidth = '2px';
            
            // Add visual indicator
            const savedIndicator = document.createElement('small');
            savedIndicator.id = 'passwordSavedIndicator';
            savedIndicator.style.color = '#28a745';
            savedIndicator.style.fontWeight = 'bold';
            savedIndicator.innerHTML = '✅ Password saved and active';
            
            // Insert after password field if not already there
            if (!document.getElementById('passwordSavedIndicator')) {
                passwordField.parentNode.insertBefore(savedIndicator, passwordField.nextSibling);
            }
        }
    }
    
    async testEmailConnection() {
        const gmailAddress = document.getElementById('gmailAddress').value.trim();
        let gmailPassword = document.getElementById('gmailAppPassword').value.trim();
        const senderName = document.getElementById('senderName').value.trim();
        
        // If password field is empty, try to use saved password
        if (!gmailPassword) {
            gmailPassword = localStorage.getItem('ebs_gmail_password') || '';
        }
        
        if (!gmailAddress) {
            this.showNotification('❌ Please enter your Gmail address', 'error');
            return;
        }
        
        if (!gmailPassword) {
            this.showNotification('❌ Please enter your Gmail App Password (or save it first)', 'error');
            return;
        }
        
        if (!this.validateEmail(gmailAddress)) {
            this.showNotification('❌ Invalid Gmail address format', 'error');
            return;
        }
        
        // Show loading message
        this.showNotification('🔄 Testing email connection... Please wait.', 'info');
        
        console.log('🧪 TEST EMAIL - Starting...');
        console.log('📍 Current URL:', window.location.href);
        console.log('📧 Gmail Address:', gmailAddress);
        console.log('🔑 Password length:', gmailPassword.length);
        
        try {
            const fetchUrl = window.location.protocol === 'file:' ? 
                'http://localhost/eastboundarysystems/salaries/send-email.php' : 
                'send-email.php';
            
            console.log('📤 Sending test email to:', fetchUrl);
            
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gmailAddress: gmailAddress,
                    gmailPassword: gmailPassword,
                    senderName: senderName,
                    recipientEmail: gmailAddress, // Send test email to self
                    recipientName: 'Test User',
                    subject: 'Test Email - East Boundary Systems',
                    message: `
                        <html>
                        <body style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2 style="color: #4a90e2;">✅ Email Configuration Successful!</h2>
                            <p>This is a test email from East Boundary Systems Payroll Management.</p>
                            <p>Your Gmail SMTP configuration is working correctly.</p>
                            <p><strong>Sender:</strong> ${senderName}</p>
                            <p><strong>Gmail Address:</strong> ${gmailAddress}</p>
                            <hr>
                            <p style="color: #666; font-size: 12px;">Generated at: ${new Date().toLocaleString()}</p>
                        </body>
                        </html>
                    `,
                    pdfData: '', // No PDF for test email
                    pdfFilename: ''
                })
            });
            
            console.log('📡 Response status:', response.status, response.statusText);
            console.log('📡 Response headers:', [...response.headers.entries()]);
            
            const responseText = await response.text();
            console.log('📄 Response body:', responseText.substring(0, 500));
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Failed to parse JSON:', parseError);
                throw new Error('Server returned invalid JSON. Response: ' + responseText.substring(0, 200));
            }
            
            console.log('✅ Parsed result:', result);
            
            if (result.success) {
                this.showNotification('✅ Email sent successfully! Check your Gmail inbox.', 'success');
                this.logActivity('Tested email connection successfully', 'Settings');
            } else {
                throw new Error(result.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('Email test error:', error);
            this.showNotification(`❌ Email test failed: ${error.message}`, 'error');
            this.logActivity(`Email test failed: ${error.message}`, 'Settings');
        }
    }

    saveSecuritySettings() {
        this.settings.requireApproval = document.getElementById('requireApproval').checked;
        this.saveToStorage('ebs_payroll_settings', this.settings);
        this.showNotification('Security settings saved successfully.', 'success');
        this.logActivity('Updated security settings', 'Settings');
    }

    backupData() {
        const backup = {
            employees: this.employees,
            payrolls: this.payrolls,
            payslips: this.payslips,
            loans: this.loans,
            settings: this.settings,
            activityLog: this.activityLog,
            timestamp: new Date().toISOString()
        };

        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payroll_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.showNotification('Backup downloaded successfully.', 'success');
        this.logActivity('Created data backup', 'System');
        document.getElementById('lastBackupDate').textContent = new Date().toLocaleString();
    }

    restoreData() {
        const input = document.getElementById('restoreFileInput');
        input.click();
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const backup = JSON.parse(event.target.result);
                    
                    if (confirm('This will replace all current data. Continue?')) {
                        this.employees = backup.employees || [];
                        this.payrolls = backup.payrolls || [];
                        this.payslips = backup.payslips || [];
                        this.loans = backup.loans || [];
                        this.settings = backup.settings || this.getDefaultSettings();
                        this.activityLog = backup.activityLog || [];

                        this.saveToStorage('ebs_employees', this.employees);
                        this.saveToStorage('ebs_payrolls', this.payrolls);
                        this.saveToStorage('ebs_payslips', this.payslips);
                        this.saveToStorage('ebs_loans', this.loans);
                        this.saveToStorage('ebs_payroll_settings', this.settings);
                        this.saveToStorage('ebs_activity_log', this.activityLog);

                        this.renderEmployees();
                        this.updateDashboard();
                        this.showNotification('Data restored successfully.', 'success');
                        this.logActivity('Restored data from backup', 'System');
                    }
                } catch (error) {
                    this.showNotification('Invalid backup file.', 'error');
                }
            };
            reader.readAsText(file);
        };
    }

    // ============================================
    // VALIDATION HELPERS
    // ============================================
    validateNRC(nrc) {
        return /^\d{6}\/\d{2}\/\d{1}$/.test(nrc);
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas ${iconMap[type]}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // ============================================
    // ACTIVITY LOG
    // ============================================
    logActivity(message, category) {
        const log = {
            id: Date.now(),
            message,
            category,
            user: this.currentUser.name,
            timestamp: new Date().toISOString()
        };
        
        this.activityLog.unshift(log);
        if (this.activityLog.length > 100) {
            this.activityLog = this.activityLog.slice(0, 100);
        }
        
        this.saveToStorage('ebs_activity_log', this.activityLog);
    }
}

// Initialize the system when DOM is ready
let payrollSystem;
document.addEventListener('DOMContentLoaded', () => {
    payrollSystem = new PayrollManagementSystem();
});
