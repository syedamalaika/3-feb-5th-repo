const STORAGE_KEY = 'gtti_registration_data';

document.addEventListener('DOMContentLoaded', () => {
    const multiStepForm = document.getElementById('multiStepForm');
    const stepItems = document.querySelectorAll('.step-item');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const summaryDisplay = document.getElementById('summaryDisplay');

    // Get current page name
    const path = window.location.pathname;
    const page = path.split("/").pop();

    // Map pages to steps
    const pageToStep = {
        'index.html': 1,
        'personal-info.html': 1,
        'guardian-details.html': 2,
        'academic-record.html': 3,
        'course-selection.html': 4,
        'documents.html': 5,
        'review.html': 6
    };

    const currentStep = pageToStep[page] || 1;

    // Cursor Glow Tracking
    const glow = document.querySelector('.cursor-glow');
    if (glow) {
        document.addEventListener('mousemove', (e) => {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
        });
    }

    // Input Masking Logic
    const maskInput = (input, mask) => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            let maskedValue = '';
            let valueIdx = 0;
            for (let i = 0; i < mask.length && valueIdx < value.length; i++) {
                if (mask[i] === 'x') {
                    maskedValue += value[valueIdx++];
                } else {
                    maskedValue += mask[i];
                }
            }
            e.target.value = maskedValue;
            saveCurrentData();
        });
    };

    const cnicFields = document.querySelectorAll('input[name="cnic"], input[name="fatherCnic"]');
    cnicFields.forEach(f => maskInput(f, 'xxxxx-xxxxxxx-x'));

    const phoneFields = document.querySelectorAll('input[name="phone"], input[name="fatherPhone"]');
    phoneFields.forEach(f => maskInput(f, 'xxxx-xxxxxxx'));

    // Persistent Data Functions
    const saveCurrentData = () => {
        if (!multiStepForm) return;
        const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const formData = new FormData(multiStepForm);
        const data = { ...existingData };

        formData.forEach((value, key) => {
            if (key !== 'trade') { // Trade is handled separately if radio
                data[key] = value;
            }
        });

        // Handle radio/checkbox specifically if needed
        const trades = document.querySelectorAll('input[name="trade"]');
        if (trades.length > 0) {
            trades.forEach(t => {
                if (t.checked) data['trade'] = t.value;
            });
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };

    const loadPersistedData = () => {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        Object.keys(data).forEach(key => {
            const field = document.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'radio') {
                    const radio = document.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (radio) radio.checked = true;
                } else if (field.type === 'file') {
                    // Files cannot be set via JS value for security, but we show success if data exists
                } else {
                    field.value = data[key];
                    // Trigger label animation if applicable
                    if (field.value) field.dispatchEvent(new Event('placeholder-shown'));
                }
            }
        });
    };

    // Initialize Page
    if (multiStepForm) {
        loadPersistedData();

        // Save on any input
        multiStepForm.addEventListener('input', saveCurrentData);
        multiStepForm.addEventListener('change', saveCurrentData);
    }

    // Update Sidebar State
    stepItems.forEach(item => {
        const stepNum = parseInt(item.dataset.step);
        if (stepNum === currentStep) {
            item.classList.add('active');
        } else if (stepNum < currentStep) {
            item.classList.add('completed');
        }
    });

    // Navigation Function
    const stepPages = [
        'personal-info.html',
        'guardian-details.html',
        'academic-record.html',
        'course-selection.html',
        'documents.html',
        'review.html'
    ];

    const navigate = (direction) => {
        if (direction === 'next' && !validateCurrentPage()) return;

        saveCurrentData();
        const nextIdx = (currentStep - 1) + (direction === 'next' ? 1 : -1);
        if (nextIdx >= 0 && nextIdx < stepPages.length) {
            window.location.href = stepPages[nextIdx];
        }
    };

    // Validation
    const validateCurrentPage = () => {
        if (!multiStepForm) return true;
        const inputs = multiStepForm.querySelectorAll('input[required], select[required], textarea[required]');
        let valid = true;

        inputs.forEach(input => {
            const val = input.value.trim();
            let isFieldValid = true;

            if (!val) {
                isFieldValid = false;
            } else if (input.pattern) {
                const regex = new RegExp(`^${input.pattern}$`);
                if (!regex.test(val)) {
                    isFieldValid = false;
                }
            }

            // Custom Marks Validation
            if (input.name === 'obtainedMarks' || input.name === 'totalMarks') {
                const obtainedInput = document.querySelector('[name="obtainedMarks"]');
                const totalInput = document.querySelector('[name="totalMarks"]');
                if (obtainedInput && totalInput) {
                    const obtained = parseInt(obtainedInput.value);
                    const total = parseInt(totalInput.value);
                    if (obtained > total) {
                        obtainedInput.classList.add('is-invalid');
                        valid = false;
                    }
                }
            }

            if (!isFieldValid) {
                input.classList.add('is-invalid');
                valid = false;
            } else {
                input.classList.remove('is-invalid');
            }
        });

        // Special check for trade on step 4
        if (currentStep === 4) {
            const selectedTrade = document.querySelector('input[name="trade"]:checked');
            if (!selectedTrade) {
                alert('Please select a trade to continue');
                valid = false;
            }
        }

        return valid;
    };

    // Button Listeners
    if (nextBtn) nextBtn.addEventListener('click', () => navigate('next'));
    if (prevBtn) prevBtn.addEventListener('click', () => navigate('prev'));

    // File Upload Feedback (Specific Hook for UI)
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const box = input.nextElementSibling;
            if (input.files && input.files[0]) {
                const fileName = input.files[0].name;
                box.classList.add('upload-success');
                const span = box.querySelector('span');
                const i = box.querySelector('i');
                if (span) {
                    if (!span.getAttribute('data-original')) span.setAttribute('data-original', span.innerText);
                    span.innerText = fileName;
                }
                if (i) i.className = 'fas fa-check-circle';
            }
        });
    });

    // Summary Generator (Review Page)
    if (summaryDisplay) {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        let summaryHtml = '';

        const groups = {
            'Personal Info': ['studentName', 'cnic', 'dob', 'gender', 'phone', 'address'],
            'Guardian Info': ['fatherName', 'fatherCnic', 'fatherOccupation', 'fatherPhone'],
            'Academic Record': ['lastQualification', 'obtainedMarks', 'totalMarks', 'boardUniversity'],
            'Target Course': ['trade']
        };

        const labelMap = {
            'studentName': 'Student Name',
            'cnic': 'CNIC / B-Form',
            'dob': 'Date of Birth',
            'gender': 'Gender',
            'phone': 'Phone Number',
            'address': 'Address',
            'fatherName': 'Father Name',
            'fatherCnic': 'Father CNIC',
            'fatherOccupation': 'Occupation',
            'fatherPhone': 'Guardian Contact',
            'lastQualification': 'Latest Qualification',
            'obtainedMarks': 'Marks Obtained',
            'totalMarks': 'Total Marks',
            'boardUniversity': 'Board / Univ',
            'trade': 'Selected Trade'
        };

        for (const [groupName, fields] of Object.entries(groups)) {
            summaryHtml += `<div class="summary-group"><h5>${groupName}</h5>`;
            fields.forEach(field => {
                const value = data[field] || 'Not provided';
                summaryHtml += `
                    <div class="summary-item">
                        <span class="summary-label">${labelMap[field]}</span>
                        <span class="summary-value">${value}</span>
                    </div>
                `;
            });
            summaryHtml += `</div>`;
        }
        summaryDisplay.innerHTML = summaryHtml;
    }

    // Final Form Submission
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (document.getElementById('finalTerms').checked) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
                submitBtn.disabled = true;

                const appId = `GTTI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                document.getElementById('appId').innerText = `#${appId}`;

                setTimeout(() => {
                    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                    successModal.show();
                    localStorage.removeItem(STORAGE_KEY); // Clear data after success
                }, 2000);
            } else {
                alert('Please agree to the declaration before submitting.');
            }
        });
    }
});


