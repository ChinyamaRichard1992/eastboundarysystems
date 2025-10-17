// East Boundary School Management System - Teacher Management
class TeacherManagementSystem {
    constructor() {
        this.teachers = JSON.parse(localStorage.getItem('eastBoundaryTeachers')) || [];
        this.currentTeacherId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderTeachers();
        this.updateEmptyState();
        this.updateStatistics();
    }

    bindEvents() {
        // Hamburger menu toggle
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const closeBtn = document.getElementById('closeBtn');

        hamburgerBtn.addEventListener('click', () => this.toggleSidebar());
        closeBtn.addEventListener('click', () => this.closeSidebar());
        overlay.addEventListener('click', () => this.closeSidebar());

        // Sidebar menu items
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.handleMenuClick(section);
            });
        });

        // Teacher form events
        const addTeacherBtn = document.getElementById('addTeacherBtn');
        const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
        const teacherForm = document.getElementById('teacherForm');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const filterByStatusBtn = document.getElementById('filterByStatusBtn');

        addTeacherBtn.addEventListener('click', () => this.openTeacherModal());
        emptyStateAddBtn.addEventListener('click', () => this.openTeacherModal());
        teacherForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        modalCloseBtn.addEventListener('click', () => this.closeTeacherModal());
        cancelBtn.addEventListener('click', () => this.closeTeacherModal());
        filterByStatusBtn.addEventListener('click', () => this.showStatusFilter());

        // Photo upload events
        const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        const removePhotoBtn = document.getElementById('removePhotoBtn');
        const teacherPhoto = document.getElementById('teacherPhoto');
        const photoPreview = document.getElementById('photoPreview');

        uploadPhotoBtn.addEventListener('click', () => teacherPhoto.click());
        removePhotoBtn.addEventListener('click', () => this.removePhoto());
        teacherPhoto.addEventListener('change', (e) => this.handlePhotoUpload(e));
        photoPreview.addEventListener('click', () => teacherPhoto.click());

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Input formatting for NRC and phone numbers
        const nrcInput = document.getElementById('teacherNrc');
        const contactInput = document.getElementById('teacherContact');
        const nextOfKinPhoneInput = document.getElementById('nextOfKinPhone');

        nrcInput.addEventListener('input', (e) => this.formatNRCInput(e));
        contactInput.addEventListener('input', (e) => this.formatPhoneInput(e));
        nextOfKinPhoneInput.addEventListener('input', (e) => this.formatPhoneInput(e));

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTeacherModal();
                this.closeSidebar();
            }
        });
    }

    handleMenuClick(section) {
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        if (section === 'teachers') {
            // Stay on teachers page
            return;
        } else if (section === 'students') {
            this.navigateToStudents();
        } else if (section === 'payments') {
            this.navigateToPayments();
        } else {
            this.showNotification(`${section.charAt(0).toUpperCase() + section.slice(1)} section coming soon!`, 'info');
        }
    }

    navigateToStudents() {
        try {
            const current = new URL(window.location.href);
            const parts = current.pathname.split('/');
            if (parts.length >= 2) {
                parts[parts.length - 2] = 'student';
                parts[parts.length - 1] = 'index.html';
                current.pathname = parts.join('/');
                window.location.href = current.toString();
                return;
            }
        } catch {}
        // Fallback replacements for file:// or unusual contexts
        const fallback = window.location.href
            .replace(/teacher\\index\.html/i, 'student/index.html')
            .replace(/teacher\/index\.html/i, 'student/index.html');
        window.location.href = fallback;
    }

    navigateToPayments() {
        try {
            const current = new URL(window.location.href);
            const parts = current.pathname.split('/');
            if (parts.length >= 2) {
                parts[parts.length - 2] = 'payment';
                parts[parts.length - 1] = 'index.html';
                current.pathname = parts.join('/');
                window.location.href = current.toString();
                return;
            }
        } catch {}
        // Fallback replacements for file:// or unusual contexts
        const fallback = window.location.href
            .replace(/teacher\\index\.html/i, 'payment/index.html')
            .replace(/teacher\/index\.html/i, 'payment/index.html');
        window.location.href = fallback;
    }

    showStatusFilter() {
        // Create a simple status filter dropdown
        const statuses = ['All', 'Active', 'On Leave'];
        const currentStatus = prompt('Filter by status:\n1. All\n2. Active\n3. On Leave\n\nEnter number (1-3):');
        
        if (currentStatus) {
            const statusIndex = parseInt(currentStatus) - 1;
            if (statusIndex >= 0 && statusIndex < statuses.length) {
                this.filterByStatus(statuses[statusIndex]);
            }
        }
    }

    filterByStatus(status) {
        const filteredTeachers = status === 'All' 
            ? this.teachers 
            : this.teachers.filter(teacher => teacher.status === status);
        
        this.renderFilteredTeachers(filteredTeachers);
        this.showNotification(`Showing ${status} teachers`, 'info');
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const mainContent = document.querySelector('.main-content');

        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        hamburgerBtn.classList.toggle('active');
        mainContent.classList.toggle('sidebar-open');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const mainContent = document.querySelector('.main-content');

        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        hamburgerBtn.classList.remove('active');
        mainContent.classList.remove('sidebar-open');
    }

    generateTeacherId() {
        // Generate unique teacher ID with format: EBT-YYYY-NNNN
        const year = new Date().getFullYear();
        const existingIds = this.teachers.map(teacher => teacher.id);
        
        let counter = 1;
        let newId;
        
        do {
            newId = `EBT-${year}-${counter.toString().padStart(4, '0')}`;
            counter++;
        } while (existingIds.includes(newId));
        
        return newId;
    }

    openTeacherModal(teacher = null) {
        const modal = document.getElementById('teacherModal');
        const modalTitle = document.getElementById('modalTitle');
        const teacherForm = document.getElementById('teacherForm');
        const saveBtn = document.getElementById('saveBtn');

        this.currentTeacherId = teacher ? teacher.id : null;

        if (teacher) {
            // Edit mode
            modalTitle.textContent = 'Edit Teacher';
            this.populateForm(teacher);
            saveBtn.textContent = 'Update Teacher';
        } else {
            // Add mode
            modalTitle.textContent = 'Add New Teacher';
            teacherForm.reset();
            this.resetPhotoPreview();
            saveBtn.textContent = 'Save Teacher';
        }

        modal.classList.add('active');
        document.getElementById('teacherName').focus();
    }

    populateForm(teacher) {
        document.getElementById('teacherName').value = teacher.full_name || '';
        document.getElementById('teacherGender').value = teacher.gender || '';
        document.getElementById('teacherDob').value = teacher.date_of_birth || '';
        document.getElementById('teacherNrc').value = teacher.nrc_id || '';
        document.getElementById('teacherContact').value = teacher.contact_number || '';
        document.getElementById('teacherEmail').value = teacher.email || '';
        document.getElementById('teacherAddress').value = teacher.physical_address || '';
        document.getElementById('teacherMaritalStatus').value = teacher.marital_status || '';
        document.getElementById('nextOfKinName').value = teacher.next_of_kin_name || '';
        document.getElementById('nextOfKinPhone').value = teacher.next_of_kin_phone || '';
        document.getElementById('relationship').value = teacher.relationship || '';
        document.getElementById('teacherQualification').value = teacher.qualification || '';
        document.getElementById('teacherTcz').value = teacher.tcz_number || '';
        document.getElementById('employmentDate').value = teacher.employment_date || '';
        document.getElementById('teacherPosition').value = teacher.position || '';
        document.getElementById('mainSubject').value = teacher.main_subject || '';
        document.getElementById('otherSubjects').value = teacher.other_subjects || '';
        document.getElementById('gradeLevel').value = teacher.grade_level || '';
        document.getElementById('teacherClass').value = teacher.class || '';
        document.getElementById('teacherStatus').value = teacher.status || 'Active';

        // Handle photo
        if (teacher.profile_picture) {
            this.setPhotoPreview(teacher.profile_picture);
        } else {
            this.resetPhotoPreview();
        }
    }

    closeTeacherModal() {
        const modal = document.getElementById('teacherModal');
        modal.classList.remove('active');
        this.currentTeacherId = null;
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                this.showNotification('Photo size must be less than 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.setPhotoPreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    setPhotoPreview(photoData) {
        const photoPreview = document.getElementById('photoPreview');
        const removePhotoBtn = document.getElementById('removePhotoBtn');
        
        photoPreview.innerHTML = `<img src="${photoData}" alt="Teacher Photo">`;
        removePhotoBtn.style.display = 'inline-flex';
    }

    resetPhotoPreview() {
        const photoPreview = document.getElementById('photoPreview');
        const removePhotoBtn = document.getElementById('removePhotoBtn');
        
        photoPreview.innerHTML = `
            <i class="fas fa-user-circle"></i>
            <span>No photo selected</span>
        `;
        removePhotoBtn.style.display = 'none';
    }

    removePhoto() {
        document.getElementById('teacherPhoto').value = '';
        this.resetPhotoPreview();
    }

    formatNRCInput(event) {
        let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
        
        if (value.length >= 6) {
            value = value.substring(0, 6) + '/' + value.substring(6);
        }
        if (value.length >= 9) {
            value = value.substring(0, 9) + '/' + value.substring(9, 10);
        }
        
        event.target.value = value;
    }

    formatPhoneInput(event) {
        let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        event.target.value = value;
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const teacherData = {
            id: this.currentTeacherId || this.generateTeacherId(),
            full_name: formData.get('full_name').trim(),
            gender: formData.get('gender'),
            date_of_birth: formData.get('date_of_birth'),
            nrc_id: formData.get('nrc_id').trim(),
            contact_number: formData.get('contact_number').trim(),
            email: formData.get('email').trim(),
            physical_address: formData.get('physical_address').trim(),
            marital_status: formData.get('marital_status'),
            next_of_kin_name: formData.get('next_of_kin_name').trim(),
            next_of_kin_phone: formData.get('next_of_kin_phone').trim(),
            relationship: formData.get('relationship').trim(),
            qualification: formData.get('qualification'),
            tcz_number: formData.get('tcz_number').trim(),
            employment_date: formData.get('employment_date'),
            position: formData.get('position'),
            main_subject: formData.get('main_subject').trim(),
            other_subjects: formData.get('other_subjects').trim(),
            grade_level: formData.get('grade_level'),
            class: formData.get('class'),
            status: formData.get('status'),
            date_registered: this.currentTeacherId ? 
                this.teachers.find(t => t.id === this.currentTeacherId)?.date_registered : 
                new Date().toISOString()
        };

        // Get photo data
        const photoFile = document.getElementById('teacherPhoto').files[0];
        if (photoFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                teacherData.profile_picture = e.target.result;
                this.processTeacherData(teacherData);
            };
            reader.readAsDataURL(photoFile);
        } else if (this.currentTeacherId) {
            // Keep existing photo if no new photo uploaded
            const existingTeacher = this.teachers.find(t => t.id === this.currentTeacherId);
            teacherData.profile_picture = existingTeacher ? existingTeacher.profile_picture : null;
            this.processTeacherData(teacherData);
        } else {
            this.processTeacherData(teacherData);
        }
    }

    processTeacherData(teacherData) {
        // Validation
        if (!teacherData.full_name || !teacherData.gender || !teacherData.nrc_id || 
            !teacherData.qualification || !teacherData.employment_date || 
            !teacherData.position || !teacherData.main_subject) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate NRC format (exactly 123456/12/1 format)
        if (!/^\d{6}\/\d{2}\/\d{1}$/.test(teacherData.nrc_id)) {
            this.showNotification('Please enter a valid NRC ID format (e.g., 123456/12/1)', 'error');
            return;
        }

        // Validate phone number (exactly 10 digits)
        if (teacherData.contact_number && !/^\d{10}$/.test(teacherData.contact_number)) {
            this.showNotification('Phone number must be exactly 10 digits', 'error');
            return;
        }

        // Validate email if provided
        if (teacherData.email && !this.isValidEmail(teacherData.email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Check if NRC already exists (excluding current teacher if editing)
        const existingTeacher = this.teachers.find(teacher => 
            teacher.nrc_id === teacherData.nrc_id && 
            teacher.id !== this.currentTeacherId
        );

        if (existingTeacher) {
            this.showNotification('A teacher with this NRC ID already exists', 'error');
            return;
        }

        if (this.currentTeacherId) {
            // Update existing teacher
            this.updateTeacher(teacherData);
        } else {
            // Add new teacher
            this.addTeacher(teacherData);
        }

        this.closeTeacherModal();
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    addTeacher(teacherData) {
        this.teachers.push(teacherData);
        this.saveTeachers();
        this.renderTeachers();
        this.updateEmptyState();
        this.updateStatistics();
        this.showNotification('Teacher added successfully!', 'success');
    }

    updateTeacher(teacherData) {
        const index = this.teachers.findIndex(teacher => teacher.id === this.currentTeacherId);
        
        if (index !== -1) {
            this.teachers[index] = teacherData;
            this.saveTeachers();
            this.renderTeachers();
            this.updateStatistics();
            this.showNotification('Teacher updated successfully!', 'success');
        }
    }

    deleteTeacher(teacherId) {
        if (confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
            this.teachers = this.teachers.filter(teacher => teacher.id !== teacherId);
            this.saveTeachers();
            this.renderTeachers();
            this.updateEmptyState();
            this.updateStatistics();
            this.showNotification('Teacher deleted successfully!', 'success');
        }
    }

    editTeacher(teacherId) {
        const teacher = this.teachers.find(t => t.id === teacherId);
        if (teacher) {
            this.openTeacherModal(teacher);
        }
    }

    saveTeachers() {
        localStorage.setItem('eastBoundaryTeachers', JSON.stringify(this.teachers));
    }

    calculateYearsOfService(employmentDate) {
        if (!employmentDate) return 'N/A';
        
        const today = new Date();
        const employment = new Date(employmentDate);
        const years = today.getFullYear() - employment.getFullYear();
        const months = today.getMonth() - employment.getMonth();
        
        if (months < 0) {
            return `${years - 1} years`;
        }
        return `${years} years`;
    }

    renderTeachers() {
        const tbody = document.getElementById('teachersTableBody');
        
        if (this.teachers.length === 0) {
            tbody.innerHTML = '';
            return;
        }

        // Sort teachers by name
        const sortedTeachers = [...this.teachers].sort((a, b) => 
            a.full_name.localeCompare(b.full_name)
        );

        tbody.innerHTML = sortedTeachers.map(teacher => {
            const formattedEmploymentDate = teacher.employment_date 
                ? new Date(teacher.employment_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : 'N/A';

            const yearsOfService = this.calculateYearsOfService(teacher.employment_date);

            const photoHtml = teacher.profile_picture 
                ? `<img src="${teacher.profile_picture}" alt="Teacher Photo" class="teacher-photo">`
                : `<div class="teacher-photo-placeholder"><i class="fas fa-user"></i></div>`;

            return `
                <tr class="fade-in">
                    <td>${photoHtml}</td>
                    <td><strong>${teacher.full_name}</strong></td>
                    <td>${teacher.gender || 'N/A'}</td>
                    <td>${teacher.nrc_id || 'N/A'}</td>
                    <td>
                        <div class="contact-info">
                            <div class="phone-number">${teacher.contact_number || 'N/A'}</div>
                            ${teacher.email ? `<div class="email-address">${teacher.email}</div>` : ''}
                        </div>
                    </td>
                    <td>${teacher.email || 'N/A'}</td>
                    <td><span class="position-badge">${teacher.position || 'N/A'}</span></td>
                    <td>${teacher.main_subject || 'N/A'}</td>
                    <td>${teacher.grade_level || 'N/A'}</td>
                    <td>${teacher.class || 'N/A'}</td>
                    <td><span class="status-badge ${teacher.status?.toLowerCase().replace(' ', '-') || 'active'}">${teacher.status || 'Active'}</span></td>
                    <td>${formattedEmploymentDate}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-success" onclick="teacherSystem.editTeacher('${teacher.id}')">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="teacherSystem.deleteTeacher('${teacher.id}')">
                                <i class="fas fa-trash"></i>
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderFilteredTeachers(teachers) {
        const tbody = document.getElementById('teachersTableBody');
        
        if (teachers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; padding: 2rem;">No teachers found matching your filter.</td></tr>';
            return;
        }

        tbody.innerHTML = teachers.map(teacher => {
            const formattedEmploymentDate = teacher.employment_date 
                ? new Date(teacher.employment_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : 'N/A';

            const photoHtml = teacher.profile_picture 
                ? `<img src="${teacher.profile_picture}" alt="Teacher Photo" class="teacher-photo">`
                : `<div class="teacher-photo-placeholder"><i class="fas fa-user"></i></div>`;

            return `
                <tr class="fade-in">
                    <td>${photoHtml}</td>
                    <td><strong>${teacher.full_name}</strong></td>
                    <td>${teacher.gender || 'N/A'}</td>
                    <td>${teacher.nrc_id || 'N/A'}</td>
                    <td>
                        <div class="contact-info">
                            <div class="phone-number">${teacher.contact_number || 'N/A'}</div>
                            ${teacher.email ? `<div class="email-address">${teacher.email}</div>` : ''}
                        </div>
                    </td>
                    <td>${teacher.email || 'N/A'}</td>
                    <td><span class="position-badge">${teacher.position || 'N/A'}</span></td>
                    <td>${teacher.main_subject || 'N/A'}</td>
                    <td>${teacher.grade_level || 'N/A'}</td>
                    <td>${teacher.class || 'N/A'}</td>
                    <td><span class="status-badge ${teacher.status?.toLowerCase().replace(' ', '-') || 'active'}">${teacher.status || 'Active'}</span></td>
                    <td>${formattedEmploymentDate}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-success" onclick="teacherSystem.editTeacher('${teacher.id}')">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="teacherSystem.deleteTeacher('${teacher.id}')">
                                <i class="fas fa-trash"></i>
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    handleSearch(query) {
        const searchResults = this.teachers.filter(teacher => 
            teacher.full_name.toLowerCase().includes(query.toLowerCase()) ||
            teacher.nrc_id.toLowerCase().includes(query.toLowerCase()) ||
            (teacher.main_subject && teacher.main_subject.toLowerCase().includes(query.toLowerCase())) ||
            (teacher.position && teacher.position.toLowerCase().includes(query.toLowerCase())) ||
            (teacher.grade_level && teacher.grade_level.toLowerCase().includes(query.toLowerCase())) ||
            (teacher.contact_number && teacher.contact_number.includes(query)) ||
            (teacher.email && teacher.email.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderFilteredTeachers(searchResults);
    }

    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const teachersTable = document.querySelector('.teachers-table');
        const emptyStateMessage = document.getElementById('emptyStateMessage');
        
        if (this.teachers.length === 0) {
            emptyState.style.display = 'block';
            teachersTable.style.display = 'none';
            emptyStateMessage.textContent = 'Start by adding your first teacher to the system.';
        } else {
            emptyState.style.display = 'none';
            teachersTable.style.display = 'table';
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 3000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 400px;
        `;

        notification.querySelector('.notification-content').style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // Export functionality
    exportTeachers() {
        if (this.teachers.length === 0) {
            this.showNotification('No teachers to export', 'error');
            return;
        }

        const csvContent = [
            ['Teacher ID', 'Full Name', 'Gender', 'NRC ID', 'Contact', 'Email', 'Position', 'Main Subject', 'Grade Level', 'Class', 'Status', 'Employment Date'],
            ...this.teachers.map(teacher => [
                teacher.id,
                teacher.full_name,
                teacher.gender || 'N/A',
                teacher.nrc_id || 'N/A',
                teacher.contact_number || 'N/A',
                teacher.email || 'N/A',
                teacher.position || 'N/A',
                teacher.main_subject || 'N/A',
                teacher.grade_level || 'N/A',
                teacher.class || 'N/A',
                teacher.status || 'Active',
                teacher.employment_date || 'N/A'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `east-boundary-teachers-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Teachers exported successfully!', 'success');
    }

    // Update Statistics Display
    updateStatistics() {
        const totalTeachers = this.teachers.length;
        const maleTeachers = this.teachers.filter(teacher => teacher.gender === 'Male').length;
        const femaleTeachers = this.teachers.filter(teacher => teacher.gender === 'Female').length;
        const activeTeachers = this.teachers.filter(teacher => teacher.status === 'Active').length;

        // Update the statistics display
        document.getElementById('totalTeachers').textContent = totalTeachers;
        document.getElementById('maleTeachers').textContent = maleTeachers;
        document.getElementById('femaleTeachers').textContent = femaleTeachers;
        document.getElementById('activeTeachers').textContent = activeTeachers;
    }

    // Statistics
    getStatistics() {
        const totalTeachers = this.teachers.length;
        const positionDistribution = {};
        const statusDistribution = {};
        const subjectDistribution = {};
        const gradeDistribution = {};

        this.teachers.forEach(teacher => {
            const position = teacher.position || 'Unknown';
            const status = teacher.status || 'Active';
            const subject = teacher.main_subject || 'Unknown';
            const grade = teacher.grade_level || 'Unknown';
            
            positionDistribution[position] = (positionDistribution[position] || 0) + 1;
            statusDistribution[status] = (statusDistribution[status] || 0) + 1;
            subjectDistribution[subject] = (subjectDistribution[subject] || 0) + 1;
            gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
        });

        return {
            totalTeachers,
            positionDistribution,
            statusDistribution,
            subjectDistribution,
            gradeDistribution
        };
    }
}

// Initialize the teacher management system
let teacherSystem;
document.addEventListener('DOMContentLoaded', () => {
    teacherSystem = new TeacherManagementSystem();
});
