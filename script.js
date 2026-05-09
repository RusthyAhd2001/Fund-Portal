// ==================== GLOBAL STATE ====================
let beneficiaries = [];
let duplicateCheckResult = null;

// Category and Status definitions
const CATEGORIES = ['Education', 'Medical', 'Food', 'Housing', 'Orphan', 'Widow', 'Emergency'];
const STATUSES = ['Pending', 'Approved', 'Funded', 'Rejected'];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    loadBeneficiariesFromLocalStorage();
    setupEventListeners();
    updateStatistics();
    renderBeneficiariesTable();
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Form submission
    document.getElementById('beneficiaryForm').addEventListener('submit', handleFormSubmit);

    // Excel file upload
    document.getElementById('excelFile').addEventListener('change', handleExcelUpload);

    // Search and filter
    document.getElementById('searchInput').addEventListener('keyup', filterBeneficiaries);
    document.getElementById('filterCategory').addEventListener('change', filterBeneficiaries);
    document.getElementById('filterStatus').addEventListener('change', filterBeneficiaries);
}

// ==================== TAB MANAGEMENT ====================
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Add active class to clicked button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// ==================== DUPLICATE DETECTION ====================
function checkDuplicates(formData) {
    const duplicates = [];
    const { nicNumber, mobileNumber, fullName, dateOfBirth, accountNumber, familyDetails } = formData;

    beneficiaries.forEach(ben => {
        let isDuplicate = false;
        let reasons = [];

        // Check NIC
        if (ben.nicNumber.toLowerCase() === nicNumber.toLowerCase()) {
            isDuplicate = true;
            reasons.push('Same NIC Number');
        }

        // Check Mobile Number
        if (ben.mobileNumber === mobileNumber) {
            isDuplicate = true;
            reasons.push('Same Mobile Number');
        }

        // Check Name + DOB
        if (ben.fullName.toLowerCase().trim() === fullName.toLowerCase().trim() && 
            ben.dateOfBirth === dateOfBirth) {
            isDuplicate = true;
            reasons.push('Same Name & Date of Birth');
        }

        // Check Account Number
        if (accountNumber && ben.accountNumber === accountNumber) {
            isDuplicate = true;
            reasons.push('Same Bank Account');
        }

        // Check for similar names (Levenshtein distance)
        if (calculateSimilarity(ben.fullName, fullName) > 0.85) {
            reasons.push('Similar Name Found');
        }

        if (isDuplicate) {
            duplicates.push({
                beneficiary: ben,
                reasons: reasons
            });
        }
    });

    return duplicates;
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

// ==================== FORM HANDLING ====================
function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        id: 'BEN-' + Date.now(),
        fullName: document.getElementById('fullName').value.trim(),
        nicNumber: document.getElementById('nicNumber').value.trim(),
        mobileNumber: document.getElementById('mobileNumber').value.trim(),
        dateOfBirth: document.getElementById('dateOfBirth').value,
        address: document.getElementById('address').value.trim(),
        gramaNeladhari: document.getElementById('gramaNeladhari').value.trim(),
        district: document.getElementById('district').value.trim(),
        bankName: document.getElementById('bankName').value.trim(),
        accountNumber: document.getElementById('accountNumber').value.trim(),
        accountHolder: document.getElementById('accountHolder').value.trim(),
        familyMembers: document.getElementById('familyMembers').value || 0,
        dependents: document.getElementById('dependents').value || 0,
        emergencyContact: document.getElementById('emergencyContact').value.trim(),
        emergencyPhone: document.getElementById('emergencyPhone').value.trim(),
        category: document.getElementById('category').value,
        fundAmount: parseFloat(document.getElementById('fundAmount').value),
        status: 'Pending',
        dateRegistered: new Date().toISOString().split('T')[0],
        photoName: document.getElementById('photo').files[0] ? document.getElementById('photo').files[0].name : '',
    };

    // Check for duplicates
    const duplicates = checkDuplicates(formData);

    if (duplicates.length > 0) {
        showDuplicateAlert(duplicates);
        return;
    }

    // Save beneficiary
    beneficiaries.push(formData);
    saveBeneficiariesToLocalStorage();
    updateStatistics();

    // Show success message
    showAlert('success', `Beneficiary "${formData.fullName}" registered successfully!`);
    
    // Reset form
    resetForm();

    // Update table
    renderBeneficiariesTable();
}

function showDuplicateAlert(duplicates) {
    const alertDiv = document.getElementById('duplicateAlert');
    const detailsDiv = document.getElementById('duplicateDetails');

    let html = '<div style="margin-bottom: 12px;">';
    duplicates.forEach((dup, idx) => {
        html += `
            <div style="background: #fef3c7; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                <p><strong>Match ${idx + 1}:</strong></p>
                <p>📋 Name: ${dup.beneficiary.fullName}</p>
                <p>🆔 NIC: ${dup.beneficiary.nicNumber}</p>
                <p>📱 Mobile: ${dup.beneficiary.mobileNumber}</p>
                <p>💰 Category: ${dup.beneficiary.category}</p>
                <p>✅ Status: ${dup.beneficiary.status}</p>
                <p><strong>Reasons:</strong> ${dup.reasons.join(', ')}</p>
            </div>
        `;
    });
    html += '</div>';
    html += '<p><strong>This person appears to already be in the system. Do not register again unless approved by admin.</strong></p>';

    detailsDiv.innerHTML = html;
    alertDiv.classList.remove('hidden');

    // Scroll to alert
    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearDuplicateAlert() {
    document.getElementById('duplicateAlert').classList.add('hidden');
}

function resetForm() {
    // Clear all form fields
    document.getElementById('fullName').value = '';
    document.getElementById('nicNumber').value = '';
    document.getElementById('mobileNumber').value = '';
    document.getElementById('dateOfBirth').value = '';
    document.getElementById('photo').value = '';
    document.getElementById('address').value = '';
    document.getElementById('gramaNeladhari').value = '';
    document.getElementById('district').value = '';
    document.getElementById('bankName').value = '';
    document.getElementById('accountNumber').value = '';
    document.getElementById('accountHolder').value = '';
    document.getElementById('familyMembers').value = '';
    document.getElementById('dependents').value = '';
    document.getElementById('emergencyContact').value = '';
    document.getElementById('emergencyPhone').value = '';
    document.getElementById('category').value = '';
    document.getElementById('fundAmount').value = '';
    
    // Clear file inputs
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.value = '';
    });
    
    clearDuplicateAlert();
    document.getElementById('fullName').focus();
    showAlert('success', 'Form cleared successfully!');
}

// ==================== EXCEL FILE UPLOAD ====================
function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show progress
    document.getElementById('uploadProgress').classList.remove('hidden');
    document.getElementById('uploadResults').classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            processExcelData(jsonData);
        } catch (error) {
            showAlert('error', 'Error reading Excel file. Please check the format.');
            console.error(error);
            document.getElementById('uploadProgress').classList.add('hidden');
        }
    };
    reader.readAsArrayBuffer(file);
}

function processExcelData(excelData) {
    const results = {
        success: [],
        duplicates: [],
        errors: []
    };

    const totalRows = excelData.length;

    excelData.forEach((row, index) => {
        // Update progress
        updateProgress((index + 1) / totalRows * 100);

        try {
            // Validate required fields
            if (!row['Full Name'] || !row['NIC/ID'] || !row['Mobile Number'] || !row['Category']) {
                results.errors.push({
                    row: index + 2,
                    reason: 'Missing required fields (Name, NIC, Mobile, Category)'
                });
                return;
            }

            const formData = {
                id: 'BEN-' + Date.now() + '-' + index,
                fullName: String(row['Full Name']).trim(),
                nicNumber: String(row['NIC/ID']).trim(),
                mobileNumber: String(row['Mobile Number']).trim(),
                dateOfBirth: row['Date of Birth'] ? formatDate(row['Date of Birth']) : '',
                address: String(row['Address'] || '').trim(),
                gramaNeladhari: String(row['Grama Niladhari'] || '').trim(),
                district: String(row['District'] || '').trim(),
                bankName: String(row['Bank Name'] || '').trim(),
                accountNumber: String(row['Account Number'] || '').trim(),
                accountHolder: String(row['Account Holder'] || '').trim(),
                familyMembers: row['Family Members'] || 0,
                dependents: row['Dependents'] || 0,
                emergencyContact: String(row['Emergency Contact'] || '').trim(),
                emergencyPhone: String(row['Emergency Phone'] || '').trim(),
                category: String(row['Category']).trim(),
                fundAmount: parseFloat(row['Fund Amount']) || 0,
                status: 'Pending',
                dateRegistered: new Date().toISOString().split('T')[0],
                photoName: ''
            };

            // Check for duplicates
            const duplicates = checkDuplicates(formData);

            if (duplicates.length > 0) {
                results.duplicates.push({
                    row: index + 2,
                    beneficiary: formData,
                    duplicateMatches: duplicates.length
                });
                return;
            }

            // Add to beneficiaries
            beneficiaries.push(formData);
            results.success.push({
                row: index + 2,
                name: formData.fullName
            });

        } catch (error) {
            results.errors.push({
                row: index + 2,
                reason: error.message
            });
        }
    });

    // Save to storage
    saveBeneficiariesToLocalStorage();
    updateStatistics();

    // Show results
    showUploadResults(results);

    // Hide progress
    document.getElementById('uploadProgress').classList.add('hidden');
}

function formatDate(excelDate) {
    if (!excelDate) return '';
    
    // If it's already a date string, return it
    if (typeof excelDate === 'string') return excelDate;
    
    // Excel date calculation
    const utcDays = Math.floor(excelDate - 25567);
    const date = new Date(utcDays * 86400000);
    
    return date.toISOString().split('T')[0];
}

function updateProgress(percentage) {
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    fill.style.width = percentage + '%';
    text.textContent = Math.round(percentage) + '%';
}

function showUploadResults(results) {
    document.getElementById('uploadResults').classList.remove('hidden');
    document.getElementById('successCount').textContent = results.success.length;
    document.getElementById('duplicateCount').textContent = results.duplicates.length;
    document.getElementById('errorCount').textContent = results.errors.length;

    // Build results table
    let html = '<table style="width:100%; border-collapse: collapse; font-size: 13px;">';
    html += '<thead style="background: #f0f4f8;"><tr>';
    html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Row</th>';
    html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Status</th>';
    html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Details</th>';
    html += '</tr></thead><tbody>';

    // Success rows
    results.success.forEach(item => {
        html += `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px;">Row ${item.row}</td>
            <td style="padding: 10px;"><span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">✓ Success</span></td>
            <td style="padding: 10px;">${item.name}</td>
        </tr>`;
    });

    // Duplicate rows
    results.duplicates.forEach(item => {
        html += `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px;">Row ${item.row}</td>
            <td style="padding: 10px;"><span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">⚠ Duplicate</span></td>
            <td style="padding: 10px;">${item.beneficiary.fullName} - Matched with ${item.duplicateMatches} existing beneficiary(ies)</td>
        </tr>`;
    });

    // Error rows
    results.errors.forEach(item => {
        html += `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px;">Row ${item.row}</td>
            <td style="padding: 10px;"><span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">✕ Error</span></td>
            <td style="padding: 10px;">${item.reason}</td>
        </tr>`;
    });

    html += '</tbody></table>';

    document.getElementById('resultsTable').innerHTML = html;

    // Show summary alert
    showAlert('info', `Upload Complete: ${results.success.length} imported, ${results.duplicates.length} duplicates, ${results.errors.length} errors`);
}

function resetUpload() {
    document.getElementById('uploadResults').classList.add('hidden');
    document.getElementById('resultsTable').innerHTML = '';
    document.getElementById('excelFile').value = '';
    renderBeneficiariesTable();
}

function downloadTemplate() {
    try {
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            showAlert('error', 'Excel library not loaded. Please refresh the page and try again.');
            return;
        }

        // Create template data with example and empty rows
        const templateData = [
            {
                'Full Name': 'Example Name',
                'NIC/ID': '2001XXXXXXXX',
                'Mobile Number': '+94-XXXXXXXXX',
                'Date of Birth': '1990-01-15',
                'Address': 'Street Address',
                'Grama Niladhari': 'Division Name',
                'District': 'District Name',
                'Bank Name': 'Bank Name',
                'Account Number': 'Account Number',
                'Account Holder': 'Account Holder Name',
                'Family Members': '5',
                'Dependents': '2',
                'Emergency Contact': 'Contact Name',
                'Emergency Phone': '+94-XXXXXXXXX',
                'Category': 'Education',
                'Fund Amount': '50000'
            }
        ];

        // Add 9 empty rows for data entry
        for (let i = 0; i < 9; i++) {
            templateData.push({
                'Full Name': '',
                'NIC/ID': '',
                'Mobile Number': '',
                'Date of Birth': '',
                'Address': '',
                'Grama Niladhari': '',
                'District': '',
                'Bank Name': '',
                'Account Number': '',
                'Account Holder': '',
                'Family Members': '',
                'Dependents': '',
                'Emergency Contact': '',
                'Emergency Phone': '',
                'Category': '',
                'Fund Amount': ''
            });
        }

        // Create a new workbook
        const workbook = XLSX.utils.book_new();
        
        // Create worksheet from data
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // Set column widths for better readability
        worksheet['!cols'] = [
            { wch: 20 }, // Full Name
            { wch: 15 }, // NIC/ID
            { wch: 18 }, // Mobile Number
            { wch: 15 }, // Date of Birth
            { wch: 25 }, // Address
            { wch: 20 }, // Grama Niladhari
            { wch: 15 }, // District
            { wch: 15 }, // Bank Name
            { wch: 18 }, // Account Number
            { wch: 20 }, // Account Holder
            { wch: 15 }, // Family Members
            { wch: 12 }, // Dependents
            { wch: 20 }, // Emergency Contact
            { wch: 18 }, // Emergency Phone
            { wch: 15 }, // Category
            { wch: 12 }  // Fund Amount
        ];

        // Set header row styling - make first row bold with background
        const headerRow = worksheet['!rows'] = [{ hpx: 25 }];

        // Add instructions sheet
        const instructionsData = [
            ['NGO Beneficiary Registration - Template Instructions'],
            [''],
            ['Column Descriptions:'],
            ['Full Name', 'Enter the beneficiary\'s full name'],
            ['NIC/ID', 'National ID or Identification number'],
            ['Mobile Number', 'Format: +94-XXXXXXXXX'],
            ['Date of Birth', 'Format: YYYY-MM-DD (e.g., 1990-01-15)'],
            ['Address', 'Complete residential address'],
            ['Grama Niladhari', 'Grama Niladhari Division name'],
            ['District', 'District name'],
            ['Bank Name', 'Name of the bank (optional)'],
            ['Account Number', 'Bank account number (optional)'],
            ['Account Holder', 'Account holder name (optional)'],
            ['Family Members', 'Number of family members'],
            ['Dependents', 'Number of dependents'],
            ['Emergency Contact', 'Emergency contact person name'],
            ['Emergency Phone', 'Emergency contact phone number'],
            ['Category', 'Benefit category: Education, Medical, Food, Housing, Orphan, Widow, Emergency'],
            ['Fund Amount', 'Amount requested (in ₨)'],
            [''],
            ['Categories:', ''],
            ['', 'Education, Medical, Food, Housing, Orphan, Widow, Emergency']
        ];

        const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
        instructionsSheet['!cols'] = [{ wch: 30 }, { wch: 50 }];

        // Add sheets to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Entry');
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

        // Write the file
        const fileName = `NGO_Beneficiaries_Template_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        showAlert('success', '✓ Template downloaded successfully! Please fill in the data and upload it.');
    } catch (error) {
        console.error('Download error:', error);
        showAlert('error', 'Failed to download template. Please ensure you have a stable internet connection and try again.');
    }
}

// ==================== TABLE MANAGEMENT ====================
function renderBeneficiariesTable() {
    const tbody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');

    if (beneficiaries.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = beneficiaries.map(ben => `
        <tr>
            <td>${ben.id}</td>
            <td><strong>${ben.fullName}</strong></td>
            <td>${maskNIC(ben.nicNumber)}</td>
            <td>${ben.mobileNumber}</td>
            <td>${ben.category}</td>
            <td>₨${ben.fundAmount.toLocaleString()}</td>
            <td><span class="status-badge status-${ben.status.toLowerCase()}">${ben.status}</span></td>
            <td>${ben.dateRegistered}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewDetails('${ben.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

function maskNIC(nic) {
    if (nic.length <= 4) return nic;
    return nic.substring(0, 4) + '****' + nic.substring(nic.length - 4);
}

function filterBeneficiaries() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('filterCategory').value;
    const status = document.getElementById('filterStatus').value;

    const filtered = beneficiaries.filter(ben => {
        const matchSearch = !search || 
            ben.fullName.toLowerCase().includes(search) ||
            ben.nicNumber.toLowerCase().includes(search) ||
            ben.mobileNumber.includes(search);

        const matchCategory = !category || ben.category === category;
        const matchStatus = !status || ben.status === status;

        return matchSearch && matchCategory && matchStatus;
    });

    renderFilteredTable(filtered);
}

function renderFilteredTable(data) {
    const tbody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');

    if (data.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = data.map(ben => `
        <tr>
            <td>${ben.id}</td>
            <td><strong>${ben.fullName}</strong></td>
            <td>${maskNIC(ben.nicNumber)}</td>
            <td>${ben.mobileNumber}</td>
            <td>${ben.category}</td>
            <td>₨${ben.fundAmount.toLocaleString()}</td>
            <td><span class="status-badge status-${ben.status.toLowerCase()}">${ben.status}</span></td>
            <td>${ben.dateRegistered}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewDetails('${ben.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

function viewDetails(id) {
    const beneficiary = beneficiaries.find(b => b.id === id);
    if (!beneficiary) return;

    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');

    // Create editable form
    let editForm = `
        <div style="max-height: 70vh; overflow-y: auto;">
            <h2 style="margin-top: 0; color: var(--primary-color); display: flex; justify-content: space-between; align-items: center;">
                <span>👤 Beneficiary Details - ${beneficiary.id}</span>
                <span class="status-badge status-${beneficiary.status.toLowerCase()}">${beneficiary.status}</span>
            </h2>
            
            <form id="editForm_${id}" style="display: grid; gap: 20px;">
                <!-- Personal Information -->
                <fieldset class="form-fieldset" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px;">
                    <legend style="padding: 0 10px; font-weight: 600;">📋 Personal Information</legend>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Full Name</label>
                            <input type="text" value="${beneficiary.fullName}" id="edit_fullName_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" required>
                        </div>
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">NIC Number</label>
                            <input type="text" value="${beneficiary.nicNumber}" id="edit_nicNumber_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" required>
                        </div>
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Mobile Number</label>
                            <input type="tel" value="${beneficiary.mobileNumber}" id="edit_mobileNumber_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" required>
                        </div>
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Date of Birth</label>
                            <input type="date" value="${beneficiary.dateOfBirth}" id="edit_dateOfBirth_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" required>
                        </div>
                    </div>
                </fieldset>

                <!-- Address Information -->
                <fieldset class="form-fieldset" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px;">
                    <legend style="padding: 0 10px; font-weight: 600;">📍 Address Information</legend>
                    <div style="display: grid; gap: 15px;">
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Full Address</label>
                            <textarea id="edit_address_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px; font-family: inherit;" rows="3" required>${beneficiary.address}</textarea>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">District</label>
                                <input type="text" value="${beneficiary.district}" id="edit_district_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" required>
                            </div>
                            <div>
                                <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Grama Niladhari</label>
                                <input type="text" value="${beneficiary.gramaNeladhari}" id="edit_gramaNeladhari_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" required>
                            </div>
                        </div>
                    </div>
                </fieldset>

                <!-- Fund Information -->
                <fieldset class="form-fieldset" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px;">
                    <legend style="padding: 0 10px; font-weight: 600;">💰 Fund Information</legend>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Category</label>
                            <select id="edit_category_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" required>
                                ${CATEGORIES.map(cat => `<option value="${cat}" ${beneficiary.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Fund Amount (₨)</label>
                            <input type="number" value="${beneficiary.fundAmount}" id="edit_fundAmount_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" required>
                        </div>
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Family Members</label>
                            <input type="number" value="${beneficiary.familyMembers || 0}" id="edit_familyMembers_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" min="1">
                        </div>
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Dependents</label>
                            <input type="number" value="${beneficiary.dependents || 0}" id="edit_dependents_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;" min="0">
                        </div>
                    </div>
                </fieldset>

                <!-- Contact Information -->
                <fieldset class="form-fieldset" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px;">
                    <legend style="padding: 0 10px; font-weight: 600;">📞 Contact Information</legend>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Emergency Contact</label>
                            <input type="text" value="${beneficiary.emergencyContact || ''}" id="edit_emergencyContact_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;">
                        </div>
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Emergency Phone</label>
                            <input type="tel" value="${beneficiary.emergencyPhone || ''}" id="edit_emergencyPhone_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;">
                        </div>
                    </div>
                </fieldset>

                <!-- Bank Information -->
                <fieldset class="form-fieldset" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px;">
                    <legend style="padding: 0 10px; font-weight: 600;">🏦 Bank Details</legend>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Bank Name</label>
                            <input type="text" value="${beneficiary.bankName || ''}" id="edit_bankName_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;">
                        </div>
                        <div>
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Account Number</label>
                            <input type="text" value="${beneficiary.accountNumber || ''}" id="edit_accountNumber_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;">
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <label style="font-weight: 600; font-size: 13px; color: var(--text-secondary);">Account Holder Name</label>
                            <input type="text" value="${beneficiary.accountHolder || ''}" id="edit_accountHolder_${id}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;">
                        </div>
                    </div>
                </fieldset>

                <!-- Status Selection -->
                <fieldset class="form-fieldset" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px;">
                    <legend style="padding: 0 10px; font-weight: 600;">⚙️ Status</legend>
                    <select id="edit_status_${id}" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px; font-weight: 600;" required>
                        ${STATUSES.map(status => `<option value="${status}" ${beneficiary.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                    </select>
                </fieldset>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 10px; padding-top: 20px; border-top: 2px solid var(--border-color); flex-wrap: wrap; justify-content: space-between;">
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="button" class="btn btn-success" onclick="saveEditedBeneficiary('${id}')">💾 Save Changes</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">❌ Cancel</button>
                    </div>
                    <button type="button" class="btn btn-danger" onclick="deleteBeneficiary('${id}')">🗑️ Delete</button>
                </div>
            </form>
        </div>
    `;

    modalBody.innerHTML = editForm;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
}

function saveEditedBeneficiary(id) {
    const beneficiary = beneficiaries.find(b => b.id === id);
    if (!beneficiary) return;

    // Get all edited values from form inputs
    const updatedData = {
        fullName: document.getElementById(`edit_fullName_${id}`).value,
        nicNumber: document.getElementById(`edit_nicNumber_${id}`).value,
        mobileNumber: document.getElementById(`edit_mobileNumber_${id}`).value,
        dateOfBirth: document.getElementById(`edit_dateOfBirth_${id}`).value,
        address: document.getElementById(`edit_address_${id}`).value,
        district: document.getElementById(`edit_district_${id}`).value,
        gramaNeladhari: document.getElementById(`edit_gramaNeladhari_${id}`).value,
        category: document.getElementById(`edit_category_${id}`).value,
        fundAmount: parseFloat(document.getElementById(`edit_fundAmount_${id}`).value),
        familyMembers: parseInt(document.getElementById(`edit_familyMembers_${id}`).value) || 0,
        dependents: parseInt(document.getElementById(`edit_dependents_${id}`).value) || 0,
        emergencyContact: document.getElementById(`edit_emergencyContact_${id}`).value,
        emergencyPhone: document.getElementById(`edit_emergencyPhone_${id}`).value,
        bankName: document.getElementById(`edit_bankName_${id}`).value,
        accountNumber: document.getElementById(`edit_accountNumber_${id}`).value,
        accountHolder: document.getElementById(`edit_accountHolder_${id}`).value,
        status: document.getElementById(`edit_status_${id}`).value
    };

    // Validate required fields
    if (!updatedData.fullName || !updatedData.nicNumber || !updatedData.mobileNumber || 
        !updatedData.dateOfBirth || !updatedData.address || !updatedData.district || 
        !updatedData.gramaNeladhari || !updatedData.category || !updatedData.fundAmount) {
        showAlert('danger', 'Please fill all required fields!');
        return;
    }

    // Update the beneficiary object
    Object.assign(beneficiary, updatedData);
    
    // Save to local storage
    saveBeneficiariesToLocalStorage();
    
    // Update tables and close modal
    updateStatistics();
    renderBeneficiariesTable();
    filterBeneficiaries();
    closeModal();
    
    // Show success message
    showAlert('success', `✓ Beneficiary "${updatedData.fullName}" updated successfully!`);
}

function editBeneficiary(id, directStatus = null) {
    const beneficiary = beneficiaries.find(b => b.id === id);
    if (!beneficiary) return;

    let newStatus = directStatus;

    // If no direct status provided, show selection menu
    if (!newStatus) {
        const statusChoice = prompt(
            'Select new status:\n\n1. Pending\n2. Approved\n3. Funded\n4. Rejected\n\nEnter number (1-4):', 
            '1'
        );

        const statusMap = {
            '1': 'Pending',
            '2': 'Approved',
            '3': 'Funded',
            '4': 'Rejected'
        };

        newStatus = statusMap[statusChoice];
    }

    if (!newStatus) return;

    // Check if trying to fund someone who already has funds in another category
    if (newStatus === 'Funded' && beneficiary.status !== 'Funded') {
        const alreadyFunded = beneficiaries.find(b => 
            b.id !== id && 
            b.nicNumber === beneficiary.nicNumber && 
            b.status === 'Funded'
        );

        if (alreadyFunded) {
            if (!confirm(`⚠️ Warning: This beneficiary already received funds for: ${alreadyFunded.category}\n\nAre you sure you want to fund them again?`)) {
                return;
            }
        }
    }

    beneficiary.status = newStatus;
    saveBeneficiariesToLocalStorage();
    updateStatistics();
    renderBeneficiariesTable();
    updateCharts();
    
    // Refresh the modal with updated information
    viewDetails(id);
    showAlert('success', `Status updated to <strong>${newStatus}</strong>`);
}

function deleteBeneficiary(id) {
    if (confirm('Are you sure you want to delete this beneficiary? This action cannot be undone.')) {
        const index = beneficiaries.findIndex(b => b.id === id);
        if (index > -1) {
            const name = beneficiaries[index].fullName;
            beneficiaries.splice(index, 1);
            saveBeneficiariesToLocalStorage();
            updateStatistics();
            renderBeneficiariesTable();
            closeModal();
            showAlert('success', `${name} has been deleted.`);
        }
    }
}

// ==================== STATISTICS ====================
function updateStatistics() {
    const total = beneficiaries.length;
    const funded = beneficiaries.filter(b => b.status === 'Funded').length;
    const duplicates = calculateDuplicates();

    document.getElementById('totalBeneficiaries').textContent = total;
    document.getElementById('totalFunded').textContent = funded;
    document.getElementById('totalDuplicates').textContent = duplicates;
}

function calculateDuplicates() {
    let count = 0;
    const nicNumbers = new Set();
    const mobileNumbers = new Set();

    beneficiaries.forEach(ben => {
        if (nicNumbers.has(ben.nicNumber)) {
            count++;
        } else {
            nicNumbers.add(ben.nicNumber);
        }

        if (mobileNumbers.has(ben.mobileNumber)) {
            count++;
        } else {
            mobileNumbers.add(ben.mobileNumber);
        }
    });

    return count;
}

// ==================== LOCAL STORAGE ====================
function saveBeneficiariesToLocalStorage() {
    localStorage.setItem('beneficiaries', JSON.stringify(beneficiaries));
}

function loadBeneficiariesFromLocalStorage() {
    const data = localStorage.getItem('beneficiaries');
    if (data) {
        beneficiaries = JSON.parse(data);
    }
}

// ==================== ALERTS ====================
function showAlert(type, message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    const icons = {
        'success': '✓',
        'danger': '✕',
        'warning': '⚠',
        'info': 'ℹ',
        'error': '✕'
    };
    const colors = {
        'success': '#10b981',
        'danger': '#ef4444',
        'warning': '#f59e0b',
        'info': '#3b82f6',
        'error': '#ef4444'
    };
    
    const bgColors = {
        'success': '#ecfdf5',
        'danger': '#fef2f2',
        'warning': '#fffbeb',
        'info': '#eff6ff',
        'error': '#fef2f2'
    };

    const toastType = type === 'error' ? 'danger' : type;
    const color = colors[toastType] || colors['info'];
    const bgColor = bgColors[toastType] || bgColors['info'];
    const icon = icons[toastType] || icons['info'];

    toast.style.cssText = `
        background: white;
        border-left: 5px solid ${color};
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 450px;
        animation: slideInRight 0.3s ease;
        pointer-events: auto;
    `;

    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = `
        font-size: 24px;
        color: ${color};
        font-weight: bold;
        flex-shrink: 0;
    `;
    iconSpan.textContent = icon;

    const content = document.createElement('div');
    content.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    `;
    content.innerHTML = `
        <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">${toastType.charAt(0).toUpperCase() + toastType.slice(1)}</p>
        <p style="margin: 0; color: #6b7280; font-size: 13px;">${message}</p>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        flex-shrink: 0;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
    `;
    closeBtn.textContent = '×';
    closeBtn.onmouseover = () => closeBtn.style.color = '#6b7280';
    closeBtn.onmouseout = () => closeBtn.style.color = '#9ca3af';
    closeBtn.onclick = () => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    };

    toast.appendChild(iconSpan);
    toast.appendChild(content);
    toast.appendChild(closeBtn);
    toastContainer.appendChild(toast);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }
    }, 5000);
}

// ==================== CLOSE MODAL ON CLICK OUTSIDE ====================
window.addEventListener('click', (event) => {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeModal();
    }
});
