// East Boundary School Management System - Enhanced Version
class SchoolManagementSystem {
    constructor() {
        this.students = JSON.parse(localStorage.getItem('eastBoundaryStudents')) || [];
        // If seeded samples from previous versions exist, allow one-time clear via flag
        if (Array.isArray(this.students) && this.students.some(s => /john smith|sarah johnson|michael brown|emily davis/i.test((s.name||'')))) {
            // Comment the next line if you prefer to keep legacy data
            this.students = [];
            localStorage.setItem('eastBoundaryStudents', JSON.stringify(this.students));
        }
        this.currentStudentId = null;
        this.currentGradeFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        // Automatically show all students when page loads
        this.selectGrade('all');
        this.updateEmptyState();
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

        // Ensure Payments link navigates reliably regardless of relative path context
        const paymentsLink = document.querySelector('.menu-item[data-section="payments"] a');
        if (paymentsLink) {
            paymentsLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPayments();
            });
        }

        // Grade selection buttons
        const gradeButtons = document.querySelectorAll('.grade-btn');
        gradeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const grade = btn.dataset.grade;
                this.selectGrade(grade);
            });
        });

        // Student form events
        const addStudentBtn = document.getElementById('addStudentBtn');
        const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
        const studentForm = document.getElementById('studentForm');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const changeGradeBtn = document.getElementById('changeGradeBtn');
        const filterByGradeBtn = document.getElementById('filterByGradeBtn');

        addStudentBtn.addEventListener('click', () => this.openStudentModal());
        emptyStateAddBtn.addEventListener('click', () => this.openStudentModal());
        studentForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        modalCloseBtn.addEventListener('click', () => this.closeStudentModal());
        cancelBtn.addEventListener('click', () => this.closeStudentModal());
        changeGradeBtn.addEventListener('click', () => this.showGradeSelection());
        filterByGradeBtn.addEventListener('click', () => this.showGradeSelection());

        // Photo upload events
        const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        const removePhotoBtn = document.getElementById('removePhotoBtn');
        const studentPhoto = document.getElementById('studentPhoto');
        const photoPreview = document.getElementById('photoPreview');

        uploadPhotoBtn.addEventListener('click', () => studentPhoto.click());
        removePhotoBtn.addEventListener('click', () => this.removePhoto());
        studentPhoto.addEventListener('change', (e) => this.handlePhotoUpload(e));
        photoPreview.addEventListener('click', () => studentPhoto.click());

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeStudentModal();
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

        if (section === 'students') {
            // Show all students by default when Students menu is clicked
            this.selectGrade('all');
        } else if (section === 'payments') {
            this.navigateToPayments();
        } else {
            this.showNotification(`${section.charAt(0).toUpperCase() + section.slice(1)} section coming soon!`, 'info');
        }
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
            .replace(/student\\index\.html/i, 'payment/index.html')
            .replace(/student\/index\.html/i, 'payment/index.html');
        window.location.href = fallback;
    }

    showGradeSelection() {
        document.getElementById('gradeSelection').style.display = 'block';
        document.getElementById('studentsSection').classList.remove('active');
        this.currentGradeFilter = 'all';
    }

    selectGrade(grade) {
        this.currentGradeFilter = grade;
        
        // Update active grade button
        document.querySelectorAll('.grade-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-grade="${grade}"]`).classList.add('active');

        // Show students section
        document.getElementById('gradeSelection').style.display = 'none';
        document.getElementById('studentsSection').classList.add('active');

        // Update section title and filter info
        const sectionTitle = document.getElementById('sectionTitle');
        const gradeFilterInfo = document.getElementById('gradeFilterInfo');
        const currentGrade = document.getElementById('currentGrade');

        if (grade === 'all') {
            sectionTitle.textContent = 'All Students';
            gradeFilterInfo.style.display = 'none';
        } else {
            sectionTitle.textContent = `${grade} Students`;
            currentGrade.textContent = grade;
            gradeFilterInfo.style.display = 'flex';
        }

        this.renderStudents();
        this.updateEmptyState();
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

    generateStudentId() {
        // Generate unique student ID with format: EBS-YYYY-NNNN
        const year = new Date().getFullYear();
        const existingIds = this.students.map(student => student.id);
        
        let counter = 1;
        let newId;
        
        do {
            newId = `EBS-${year}-${counter.toString().padStart(4, '0')}`;
            counter++;
        } while (existingIds.includes(newId));
        
        return newId;
    }

    openStudentModal(student = null) {
        const modal = document.getElementById('studentModal');
        const modalTitle = document.getElementById('modalTitle');
        const studentForm = document.getElementById('studentForm');
        const saveBtn = document.getElementById('saveBtn');

        this.currentStudentId = student ? student.id : null;

        if (student) {
            // Edit mode
            modalTitle.textContent = 'Edit Student';
            this.populateForm(student);
            saveBtn.textContent = 'Update Student';
        } else {
            // Add mode
            modalTitle.textContent = 'Add New Student';
            studentForm.reset();
            document.getElementById('studentId').value = this.generateStudentId();
            this.resetPhotoPreview();
            saveBtn.textContent = 'Save Student';
        }

        modal.classList.add('active');
        document.getElementById('studentName').focus();
    }

    populateForm(student) {
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentName').value = student.name;
        document.getElementById('studentGrade').value = student.grade;
        document.getElementById('studentDob').value = student.dob;
        document.getElementById('enrollmentStatus').value = student.enrollmentStatus || 'Active';
        document.getElementById('yearOfAdmission').value = student.yearOfAdmission || '';
        document.getElementById('guardianName').value = student.guardianName || '';
        document.getElementById('guardianPhone').value = student.guardianPhone || '';
        document.getElementById('guardianAddress').value = student.guardianAddress || '';
        document.getElementById('guardianEmail').value = student.guardianEmail || '';
        document.getElementById('guardianRelationship').value = student.guardianRelationship || '';

        // Handle photo
        if (student.photo) {
            this.setPhotoPreview(student.photo);
        } else {
            this.resetPhotoPreview();
        }
    }

    closeStudentModal() {
        const modal = document.getElementById('studentModal');
        modal.classList.remove('active');
        this.currentStudentId = null;
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
        
        photoPreview.innerHTML = `<img src="${photoData}" alt="Student Photo">`;
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
        document.getElementById('studentPhoto').value = '';
        this.resetPhotoPreview();
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const studentData = {
            id: formData.get('id'),
            name: formData.get('name').trim(),
            grade: formData.get('grade'),
            dob: formData.get('dob'),
            enrollmentStatus: formData.get('enrollmentStatus'),
            yearOfAdmission: formData.get('yearOfAdmission'),
            guardianName: formData.get('guardianName').trim(),
            guardianPhone: formData.get('guardianPhone').trim(),
            guardianAddress: formData.get('guardianAddress').trim(),
            guardianEmail: formData.get('guardianEmail').trim(),
            guardianRelationship: formData.get('guardianRelationship')
        };

        // Get photo data
        const photoFile = document.getElementById('studentPhoto').files[0];
        if (photoFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                studentData.photo = e.target.result;
                this.processStudentData(studentData);
            };
            reader.readAsDataURL(photoFile);
        } else if (this.currentStudentId) {
            // Keep existing photo if no new photo uploaded
            const existingStudent = this.students.find(s => s.id === this.currentStudentId);
            studentData.photo = existingStudent ? existingStudent.photo : null;
            this.processStudentData(studentData);
        } else {
            this.processStudentData(studentData);
        }
    }

    processStudentData(studentData) {
        // Validation
        if (!studentData.name || !studentData.grade || !studentData.dob) {
            this.showNotification('Please fill in all required student fields', 'error');
            return;
        }

        if (!studentData.guardianName || !studentData.guardianPhone || !studentData.guardianAddress || !studentData.guardianRelationship) {
            this.showNotification('Please fill in all required guardian/parent fields', 'error');
            return;
        }

        if (!studentData.enrollmentStatus || !studentData.yearOfAdmission) {
            this.showNotification('Please fill in enrollment status and year of admission', 'error');
            return;
        }

        // Validate date of birth
        const dob = new Date(studentData.dob);
        const today = new Date();
        
        // Check that date of birth is not in the future
        if (dob > today) {
            this.showNotification('Date of birth cannot be in the future', 'error');
            return;
        }

        // Validate email if provided
        if (studentData.guardianEmail && !this.isValidEmail(studentData.guardianEmail)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        if (this.currentStudentId) {
            // Update existing student
            this.updateStudent(studentData);
        } else {
            // Add new student
            this.addStudent(studentData);
        }

        this.closeStudentModal();
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    addStudent(studentData) {
        // Check if student with same name already exists
        const existingStudent = this.students.find(student => 
            student.name.toLowerCase() === studentData.name.toLowerCase()
        );

        if (existingStudent) {
            this.showNotification('A student with this name already exists', 'error');
            return;
        }

        this.students.push(studentData);
        this.saveStudents();
        this.renderStudents();
        this.updateEmptyState();
        this.showNotification('Student added successfully!', 'success');
        // Assign initial fees for the new student in shared storage used by Payments app
        this.assignFeesForNewStudentLocal(studentData);
    }

    assignFeesForNewStudentLocal(student) {
        try {
            const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
            const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
            let feeStructure = load('ebs_fee_structure');
            if (!feeStructure) {
                const currentYear = new Date().getFullYear();
                const terms = [`Term 1, ${currentYear}`, `Term 2, ${currentYear}`, `Term 3, ${currentYear}`];
                const base = () => ([{ name: 'Tuition', amount: 500 }, { name: 'PTA', amount: 50 }, { name: 'Development', amount: 75 }]);
                const grades = ['Nursery','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 9'];
                feeStructure = {};
                grades.forEach(g => { feeStructure[g] = {}; terms.forEach(t => feeStructure[g][t] = base()); });
                save('ebs_fee_structure', feeStructure);
            }
            const term = (student.yearOfAdmission && feeStructure[student.grade]?.[student.yearOfAdmission]) ? student.yearOfAdmission : `Term 1, ${new Date().getFullYear()}`;
            const items = feeStructure[student.grade]?.[term] || [];
            const totalFee = items.reduce((s,i)=> s + Number(i.amount||0), 0);
            const studentFees = load('ebs_student_fees') || {};
            studentFees[student.id] = {
                studentId: student.id,
                term,
                grade: student.grade,
                totalFee,
                amountPaid: 0,
                balance: totalFee,
                status: 'Nil Payment'
            };
            save('ebs_student_fees', studentFees);
        } catch {}
    }

    updateStudent(studentData) {
        const index = this.students.findIndex(student => student.id === this.currentStudentId);
        
        if (index !== -1) {
            // Check if another student has the same name (excluding current student)
            const existingStudent = this.students.find(student => 
                student.name.toLowerCase() === studentData.name.toLowerCase() && 
                student.id !== this.currentStudentId
            );

            if (existingStudent) {
                this.showNotification('A student with this name already exists', 'error');
                return;
            }

            this.students[index] = studentData;
            this.saveStudents();
            this.renderStudents();
            this.showNotification('Student updated successfully!', 'success');
        }
    }

    deleteStudent(studentId) {
        if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            this.students = this.students.filter(student => student.id !== studentId);
            this.saveStudents();
            this.renderStudents();
            this.updateEmptyState();
            this.showNotification('Student deleted successfully!', 'success');
        }
    }

    editStudent(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            this.openStudentModal(student);
        }
    }

    saveStudents() {
        localStorage.setItem('eastBoundaryStudents', JSON.stringify(this.students));
    }

    calculateAge(dob) {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    getFilteredStudents() {
        let filteredStudents = this.students;
        
        if (this.currentGradeFilter !== 'all') {
            filteredStudents = filteredStudents.filter(student => student.grade === this.currentGradeFilter);
        }

        // Sort by grade, then by name
        return filteredStudents.sort((a, b) => {
            // First sort by grade
            const gradeOrder = ['Nursery', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 9'];
            const gradeA = gradeOrder.indexOf(a.grade);
            const gradeB = gradeOrder.indexOf(b.grade);
            
            if (gradeA !== gradeB) {
                return gradeA - gradeB;
            }
            
            // Then sort by name
            return a.name.localeCompare(b.name);
        });
    }

    renderStudents() {
        const tbody = document.getElementById('studentsTableBody');
        const filteredStudents = this.getFilteredStudents();
        
        if (filteredStudents.length === 0) {
            tbody.innerHTML = '';
            return;
        }

        tbody.innerHTML = filteredStudents.map(student => {
            const age = this.calculateAge(student.dob);
            const formattedDob = new Date(student.dob).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const photoHtml = student.photo 
                ? `<img src="${student.photo}" alt="Student Photo" class="student-photo">`
                : `<div class="student-photo-placeholder"><i class="fas fa-user"></i></div>`;

            return `
                <tr class="fade-in">
                    <td>${photoHtml}</td>
                    <td><strong>${student.id}</strong></td>
                    <td>${student.name}</td>
                    <td><span class="grade-badge">${student.grade}</span></td>
                    <td>${formattedDob}</td>
                    <td>${age} years</td>
                    <td><span class="status-badge ${student.enrollmentStatus?.toLowerCase() || 'active'}">${student.enrollmentStatus || 'Active'}</span></td>
                    <td>${student.yearOfAdmission || 'N/A'}</td>
                    <td>
                        <div class="guardian-info">
                            <div class="guardian-name">${student.guardianName || 'N/A'}</div>
                            <div class="guardian-relationship">${student.guardianRelationship || 'N/A'}</div>
                        </div>
                    </td>
                    <td>
                        <div class="contact-info">
                            <div class="phone-number">${student.guardianPhone || 'N/A'}</div>
                            ${student.guardianEmail ? `<div class="email-address">${student.guardianEmail}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-success" onclick="schoolSystem.editStudent('${student.id}')">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="schoolSystem.deleteStudent('${student.id}')">
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
        const filteredStudents = this.getFilteredStudents();
        const searchResults = filteredStudents.filter(student => 
            student.name.toLowerCase().includes(query.toLowerCase()) ||
            student.id.toLowerCase().includes(query.toLowerCase()) ||
            student.grade.toLowerCase().includes(query.toLowerCase()) ||
            (student.guardianName && student.guardianName.toLowerCase().includes(query.toLowerCase())) ||
            (student.guardianPhone && student.guardianPhone.includes(query))
        );

        this.renderSearchResults(searchResults);
    }

    renderSearchResults(students) {
        const tbody = document.getElementById('studentsTableBody');
        
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 2rem;">No students found matching your search.</td></tr>';
            return;
        }

        tbody.innerHTML = students.map(student => {
            const age = this.calculateAge(student.dob);
            const formattedDob = new Date(student.dob).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const photoHtml = student.photo 
                ? `<img src="${student.photo}" alt="Student Photo" class="student-photo">`
                : `<div class="student-photo-placeholder"><i class="fas fa-user"></i></div>`;

            return `
                <tr class="fade-in">
                    <td>${photoHtml}</td>
                    <td><strong>${student.id}</strong></td>
                    <td>${student.name}</td>
                    <td><span class="grade-badge">${student.grade}</span></td>
                    <td>${formattedDob}</td>
                    <td>${age} years</td>
                    <td><span class="status-badge ${student.enrollmentStatus?.toLowerCase() || 'active'}">${student.enrollmentStatus || 'Active'}</span></td>
                    <td>${student.yearOfAdmission || 'N/A'}</td>
                    <td>
                        <div class="guardian-info">
                            <div class="guardian-name">${student.guardianName || 'N/A'}</div>
                            <div class="guardian-relationship">${student.guardianRelationship || 'N/A'}</div>
                        </div>
                    </td>
                    <td>
                        <div class="contact-info">
                            <div class="phone-number">${student.guardianPhone || 'N/A'}</div>
                            ${student.guardianEmail ? `<div class="email-address">${student.guardianEmail}</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-success" onclick="schoolSystem.editStudent('${student.id}')">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                            <button class="btn btn-danger" onclick="schoolSystem.deleteStudent('${student.id}')">
                                <i class="fas fa-trash"></i>
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const studentsTable = document.querySelector('.students-table');
        const emptyStateMessage = document.getElementById('emptyStateMessage');
        
        const filteredStudents = this.getFilteredStudents();
        
        if (filteredStudents.length === 0) {
            emptyState.style.display = 'block';
            studentsTable.style.display = 'none';
            
            if (this.currentGradeFilter === 'all') {
                emptyStateMessage.textContent = 'Start by adding your first student to the system.';
            } else {
                emptyStateMessage.textContent = `No students found in ${this.currentGradeFilter}. Add a student to this grade or select a different grade.`;
            }
        } else {
            emptyState.style.display = 'none';
            studentsTable.style.display = 'table';
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
    exportStudents() {
        const filteredStudents = this.getFilteredStudents();
        
        if (filteredStudents.length === 0) {
            this.showNotification('No students to export', 'error');
            return;
        }

        const csvContent = [
            ['Student ID', 'Name', 'Grade', 'Date of Birth', 'Age', 'Status', 'Admission', 'Guardian Name', 'Phone', 'Email', 'Relationship'],
            ...filteredStudents.map(student => [
                student.id,
                student.name,
                student.grade,
                student.dob,
                this.calculateAge(student.dob),
                student.enrollmentStatus || 'Active',
                student.yearOfAdmission || 'N/A',
                student.guardianName || 'N/A',
                student.guardianPhone || 'N/A',
                student.guardianEmail || 'N/A',
                student.guardianRelationship || 'N/A'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `east-boundary-students-${this.currentGradeFilter}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Students exported successfully!', 'success');
    }

    // Statistics
    getStatistics() {
        const filteredStudents = this.getFilteredStudents();
        const totalStudents = filteredStudents.length;
        const gradeDistribution = {};
        const statusDistribution = {};
        const ageGroups = { '3-5': 0, '6-8': 0, '9-12': 0, '13-18': 0 };

        filteredStudents.forEach(student => {
            const age = this.calculateAge(student.dob);
            const grade = student.grade;
            const status = student.enrollmentStatus || 'Active';
            
            gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
            statusDistribution[status] = (statusDistribution[status] || 0) + 1;
            
            if (age >= 3 && age <= 5) ageGroups['3-5']++;
            else if (age >= 6 && age <= 8) ageGroups['6-8']++;
            else if (age >= 9 && age <= 12) ageGroups['9-12']++;
            else if (age >= 13 && age <= 18) ageGroups['13-18']++;
        });

        return {
            totalStudents,
            gradeDistribution,
            statusDistribution,
            ageGroups
        };
    }
}

// Initialize the school management system
let schoolSystem;
document.addEventListener('DOMContentLoaded', () => {
    schoolSystem = new SchoolManagementSystem();
});