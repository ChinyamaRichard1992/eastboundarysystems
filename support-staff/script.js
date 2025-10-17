// East Boundary School Management System - Support Staff Management
class SupportStaffManagementSystem {
    constructor() {
        this.staff = JSON.parse(localStorage.getItem('eastBoundarySupportStaff')) || [];
        this.currentStaffId = null;
        this.init();
    }

    init() {
        this.initSidebar();
        this.initEventListeners();
        this.renderStaff();
        this.updateStatistics();
    }

    // ============================================
    // SIDEBAR NAVIGATION
    // ============================================
    initSidebar() {
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
    // EVENT LISTENERS
    // ============================================
    initEventListeners() {
        const addStaffBtn = document.getElementById('addStaffBtn');
        const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
        const staffForm = document.getElementById('staffForm');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const searchStaff = document.getElementById('searchStaff');
        const filterBtn = document.getElementById('filterBtn');
        const exportStaffBtn = document.getElementById('exportStaffBtn');
        const nrcInput = document.getElementById('nrcId');
        const phoneInputs = [document.getElementById('contactNumber'), document.getElementById('nextOfKinPhone')];

        addStaffBtn?.addEventListener('click', () => this.openStaffModal());
        emptyStateAddBtn?.addEventListener('click', () => this.openStaffModal());
        staffForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        modalCloseBtn?.addEventListener('click', () => this.closeStaffModal());
        cancelBtn?.addEventListener('click', () => this.closeStaffModal());
        searchStaff?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        filterBtn?.addEventListener('click', () => this.handleFilter());
        exportStaffBtn?.addEventListener('click', () => this.exportToCSV());

        // NRC formatting
        nrcInput?.addEventListener('input', (e) => this.formatNRCInput(e));
        
        // Phone formatting
        phoneInputs.forEach(input => {
            input?.addEventListener('input', (e) => this.formatPhoneInput(e));
        });

        // Photo upload preview
        document.getElementById('staffPhoto')?.addEventListener('change', (e) => this.previewPhoto(e));
    }

    // ============================================
    // MODAL MANAGEMENT
    // ============================================
    openStaffModal(staff = null) {
        const modal = document.getElementById('staffModal');
        const form = document.getElementById('staffForm');
        const title = document.getElementById('modalTitle');
        
        form.reset();
        document.getElementById('photoPreview').innerHTML = '';
        this.currentStaffId = null;
        
        if (staff) {
            title.textContent = 'Edit Support Staff';
            this.currentStaffId = staff.id;
            
            // Fill form with staff data
            document.getElementById('fullName').value = staff.full_name || '';
            document.getElementById('gender').value = staff.gender || '';
            document.getElementById('dateOfBirth').value = staff.date_of_birth || '';
            document.getElementById('nrcId').value = staff.nrc_id || '';
            document.getElementById('contactNumber').value = staff.contact_number || '';
            document.getElementById('email').value = staff.email || '';
            document.getElementById('physicalAddress').value = staff.physical_address || '';
            document.getElementById('maritalStatus').value = staff.marital_status || '';
            document.getElementById('department').value = staff.department || '';
            document.getElementById('position').value = staff.position || '';
            document.getElementById('employmentDate').value = staff.employment_date || '';
            document.getElementById('status').value = staff.status || 'Active';
            document.getElementById('nextOfKinName').value = staff.next_of_kin_name || '';
            document.getElementById('nextOfKinPhone').value = staff.next_of_kin_phone || '';
            document.getElementById('relationship').value = staff.relationship || '';
            
            if (staff.profile_picture) {
                document.getElementById('photoPreview').innerHTML = 
                    `<img src="${staff.profile_picture}" alt="Profile" style="max-width: 200px; border-radius: 8px;">`;
            }
        } else {
            title.textContent = 'Add Support Staff';
        }
        
        modal.classList.add('active');
    }

    closeStaffModal() {
        document.getElementById('staffModal').classList.remove('active');
        this.currentStaffId = null;
    }

    // ============================================
    // FORM HANDLING
    // ============================================
    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const staffData = {
            id: this.currentStaffId || this.generateStaffId(),
            full_name: formData.get('full_name').trim(),
            gender: formData.get('gender'),
            date_of_birth: formData.get('date_of_birth'),
            nrc_id: formData.get('nrc_id').trim(),
            contact_number: formData.get('contact_number').trim(),
            email: formData.get('email').trim(),
            physical_address: formData.get('physical_address').trim(),
            marital_status: formData.get('marital_status'),
            department: formData.get('department'),
            position: formData.get('position').trim(),
            employment_date: formData.get('employment_date'),
            status: formData.get('status'),
            next_of_kin_name: formData.get('next_of_kin_name').trim(),
            next_of_kin_phone: formData.get('next_of_kin_phone').trim(),
            relationship: formData.get('relationship').trim(),
            date_registered: this.currentStaffId ? 
                this.staff.find(s => s.id === this.currentStaffId)?.date_registered : 
                new Date().toISOString()
        };

        // Get photo data
        const photoFile = document.getElementById('staffPhoto').files[0];
        if (photoFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                staffData.profile_picture = e.target.result;
                this.processStaffData(staffData);
            };
            reader.readAsDataURL(photoFile);
        } else if (this.currentStaffId) {
            const existingStaff = this.staff.find(s => s.id === this.currentStaffId);
            staffData.profile_picture = existingStaff ? existingStaff.profile_picture : null;
            this.processStaffData(staffData);
        } else {
            this.processStaffData(staffData);
        }
    }

    processStaffData(staffData) {
        // Validation
        if (!staffData.full_name || !staffData.gender || !staffData.nrc_id || 
            !staffData.department || !staffData.position || !staffData.employment_date) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate NRC format
        if (!/^\d{6}\/\d{2}\/\d{1}$/.test(staffData.nrc_id)) {
            this.showNotification('Please enter a valid NRC ID format (e.g., 123456/12/1)', 'error');
            return;
        }

        // Validate phone number
        if (staffData.contact_number && !/^\d{10}$/.test(staffData.contact_number)) {
            this.showNotification('Phone number must be exactly 10 digits', 'error');
            return;
        }

        // Validate email if provided
        if (staffData.email && !this.isValidEmail(staffData.email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Check for duplicate NRC
        const existingStaff = this.staff.find(s => 
            s.nrc_id === staffData.nrc_id && 
            s.id !== this.currentStaffId
        );

        if (existingStaff) {
            this.showNotification('A staff member with this NRC ID already exists', 'error');
            return;
        }

        if (this.currentStaffId) {
            this.updateStaff(staffData);
        } else {
            this.addStaff(staffData);
        }

        this.closeStaffModal();
    }

    // ============================================
    // STAFF OPERATIONS
    // ============================================
    generateStaffId() {
        const year = new Date().getFullYear();
        const prefix = 'STAFF';
        let counter = 1;
        let newId;

        do {
            newId = `${prefix}-${year}-${String(counter).padStart(4, '0')}`;
            counter++;
        } while (this.staff.some(s => s.id === newId));

        return newId;
    }

    addStaff(staffData) {
        this.staff.push(staffData);
        this.saveStaff();
        this.renderStaff();
        this.updateStatistics();
        this.showNotification(`✓ ${staffData.full_name} added successfully!`, 'success');
    }

    updateStaff(staffData) {
        const index = this.staff.findIndex(s => s.id === this.currentStaffId);
        
        if (index !== -1) {
            this.staff[index] = staffData;
            this.saveStaff();
            this.renderStaff();
            this.updateStatistics();
            this.showNotification(`✓ ${staffData.full_name} updated successfully!`, 'success');
        }
    }

    deleteStaff(staffId) {
        const staff = this.staff.find(s => s.id === staffId);
        
        if (confirm(`Are you sure you want to delete ${staff.full_name}? This action cannot be undone.`)) {
            this.staff = this.staff.filter(s => s.id !== staffId);
            this.saveStaff();
            this.renderStaff();
            this.updateStatistics();
            this.showNotification(`✓ Staff member deleted successfully!`, 'success');
        }
    }

    editStaff(staffId) {
        const staff = this.staff.find(s => s.id === staffId);
        if (staff) {
            this.openStaffModal(staff);
        }
    }

    saveStaff() {
        localStorage.setItem('eastBoundarySupportStaff', JSON.stringify(this.staff));
    }

    // ============================================
    // RENDERING
    // ============================================
    renderStaff(staffList = null) {
        const tbody = document.getElementById('staffTableBody');
        const staff = staffList || this.staff;

        if (staff.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-users-cog" style="font-size: 4rem; color: #ccc;"></i>
                        <p>No support staff members yet.</p>
                        <button class="btn btn-primary" id="emptyStateAddBtn">
                            <i class="fas fa-user-plus"></i> Add First Staff Member
                        </button>
                    </td>
                </tr>
            `;
            // Re-attach event listener
            document.getElementById('emptyStateAddBtn')?.addEventListener('click', () => this.openStaffModal());
            return;
        }

        const sortedStaff = staff.sort((a, b) => 
            a.full_name.localeCompare(b.full_name)
        );

        tbody.innerHTML = sortedStaff.map(s => {
            const formattedDate = s.employment_date ? 
                new Date(s.employment_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }) : 'N/A';

            const statusClass = s.status === 'Active' ? 'status-active' : 'status-inactive';

            return `
                <tr>
                    <td><strong>${s.id}</strong></td>
                    <td>
                        <div class="staff-name">
                            ${s.profile_picture ? 
                                `<img src="${s.profile_picture}" alt="${s.full_name}" class="staff-avatar">` : 
                                `<div class="staff-avatar-placeholder">${s.full_name.charAt(0)}</div>`
                            }
                            <strong>${s.full_name}</strong>
                        </div>
                    </td>
                    <td>${s.gender || 'N/A'}</td>
                    <td>${s.nrc_id}</td>
                    <td><span class="department-badge">${s.department}</span></td>
                    <td>${s.position}</td>
                    <td>${s.contact_number || 'N/A'}</td>
                    <td>${formattedDate}</td>
                    <td><span class="${statusClass}">${s.status}</span></td>
                    <td>
                        <button class="btn-icon btn-edit" onclick="supportStaffSystem.editStaff('${s.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="supportStaffSystem.deleteStaff('${s.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateEmptyState();
    }

    updateEmptyState() {
        const section = document.getElementById('supportStaffSection');
        if (this.staff.length === 0) {
            section.classList.add('empty');
        } else {
            section.classList.remove('empty');
        }
    }

    // ============================================
    // STATISTICS
    // ============================================
    updateStatistics() {
        const totalStaff = this.staff.length;
        const activeStaff = this.staff.filter(s => s.status === 'Active').length;
        const departments = new Set(this.staff.map(s => s.department)).size;

        document.getElementById('totalStaff').textContent = totalStaff;
        document.getElementById('activeStaff').textContent = activeStaff;
        document.getElementById('totalDepartments').textContent = departments;
    }

    // ============================================
    // SEARCH & FILTER
    // ============================================
    handleSearch(query) {
        const searchResults = this.staff.filter(s =>
            s.full_name.toLowerCase().includes(query.toLowerCase()) ||
            s.nrc_id.toLowerCase().includes(query.toLowerCase()) ||
            (s.department && s.department.toLowerCase().includes(query.toLowerCase())) ||
            (s.position && s.position.toLowerCase().includes(query.toLowerCase())) ||
            (s.contact_number && s.contact_number.includes(query))
        );
        this.renderStaff(searchResults);
    }

    handleFilter() {
        const departmentFilter = document.getElementById('departmentFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        let filtered = this.staff;

        if (departmentFilter !== 'All') {
            filtered = filtered.filter(s => s.department === departmentFilter);
        }

        if (statusFilter !== 'All') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }

        this.renderStaff(filtered);
        this.showNotification(`Showing ${filtered.length} staff member(s)`, 'info');
    }

    // ============================================
    // EXPORT
    // ============================================
    exportToCSV() {
        if (this.staff.length === 0) {
            this.showNotification('⚠️ No staff data to export!', 'error');
            return;
        }

        const csvContent = [
            ['Staff ID', 'Full Name', 'Gender', 'NRC ID', 'Department', 'Position', 'Contact', 'Email', 'Employment Date', 'Status'],
            ...this.staff.map(s => [
                s.id,
                s.full_name,
                s.gender || 'N/A',
                s.nrc_id,
                s.department,
                s.position,
                s.contact_number || 'N/A',
                s.email || 'N/A',
                s.employment_date || 'N/A',
                s.status
            ])
        ];

        const csv = csvContent.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `support_staff_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        this.showNotification('✓ CSV exported successfully!', 'success');
    }

    // ============================================
    // INPUT FORMATTING
    // ============================================
    formatNRCInput(event) {
        let value = event.target.value.replace(/\D/g, '');
        
        if (value.length > 6) {
            value = value.substring(0, 6) + '/' + value.substring(6);
        }
        if (value.length >= 9) {
            value = value.substring(0, 9) + '/' + value.substring(9, 10);
        }
        
        event.target.value = value;
    }

    formatPhoneInput(event) {
        let value = event.target.value.replace(/\D/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        event.target.value = value;
    }

    previewPhoto(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('photoPreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 8px;">`;
            };
            reader.readAsDataURL(file);
        }
    }

    // ============================================
    // VALIDATION
    // ============================================
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} show`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✓';
        if (type === 'error') icon = '⚠️';
        if (type === 'warning') icon = '⚠️';
        
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the system when DOM is ready
let supportStaffSystem;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        supportStaffSystem = new SupportStaffManagementSystem();
    });
} else {
    supportStaffSystem = new SupportStaffManagementSystem();
}
