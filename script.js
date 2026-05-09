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
    initializeCharts();
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

    // Update charts if analytics tab is opened
    if (tabName === 'analytics') {
        setTimeout(() => {
            updateCharts();
        }, 100);
    }
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
            },
            {
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
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData, { header: 1 });
        const workbook = XLSX.utils.book_new();
        
        // Properly create the sheet
        const wsHeaders = Object.keys(templateData[0]);
        const wsData = [wsHeaders, ...templateData.map(row => wsHeaders.map(key => row[key]))];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 18 },
            { wch: 15 },
            { wch: 25 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 18 },
            { wch: 20 },
            { wch: 15 },
            { wch: 12 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 12 }
        ];
        
        XLSX.utils.book_append_sheet(workbook, ws, 'Beneficiaries');
        XLSX.writeFile(workbook, 'NGO_Beneficiaries_Template.xlsx');
        showAlert('success', 'Template downloaded successfully!');
    } catch (error) {
        console.error('Download error:', error);
        showAlert('error', 'Error downloading template. Please try again.');
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

    // Determine available action buttons
    let actionButtons = `
        <button class="btn btn-info" onclick="editBeneficiary('${beneficiary.id}', 'Approved')">✓ Approve</button>
        <button class="btn btn-danger" onclick="editBeneficiary('${beneficiary.id}', 'Rejected')">✕ Reject</button>
    `;

    if (beneficiary.status === 'Approved') {
        actionButtons = `
            <button class="btn btn-success" onclick="editBeneficiary('${beneficiary.id}', 'Funded')">💰 Mark as Funded</button>
            <button class="btn btn-warning" onclick="editBeneficiary('${beneficiary.id}', 'Pending')">↩ Back to Pending</button>
            <button class="btn btn-danger" onclick="editBeneficiary('${beneficiary.id}', 'Rejected')">✕ Reject</button>
        `;
    } else if (beneficiary.status === 'Funded') {
        actionButtons = `
            <button class="btn btn-secondary" disabled>✓ Already Funded</button>
        `;
    } else if (beneficiary.status === 'Rejected') {
        actionButtons = `
            <button class="btn btn-info" onclick="editBeneficiary('${beneficiary.id}', 'Pending')">↩ Back to Pending</button>
        `;
    }

    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <h3 style="margin: 0; color: var(--primary-color);">${beneficiary.fullName}</h3>
                    <p style="margin: 5px 0; color: var(--text-secondary); font-size: 13px;">ID: ${beneficiary.id}</p>
                </div>
                <span class="status-badge status-${beneficiary.status.toLowerCase()}">${beneficiary.status}</span>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%); padding: 20px; border-radius: 8px; margin: 15px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">NIC / ID</p>
                        <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary);">${beneficiary.nicNumber}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Mobile</p>
                        <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary);">${beneficiary.mobileNumber}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Date of Birth</p>
                        <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.dateOfBirth}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Registration Date</p>
                        <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.dateRegistered}</p>
                    </div>
                </div>
            </div>
        </div>

        <div style="border-top: 2px solid var(--border-color); padding-top: 20px; margin-top: 20px;">
            <h4 style="margin: 0 0 15px 0; font-size: 15px; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">📍 Address Information</h4>
            <div style="display: grid; gap: 12px;">
                <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Full Address</p>
                    <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.address}</p>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">District</p>
                        <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.district}</p>
                    </div>
                    <div>
                        <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Grama Niladhari</p>
                        <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.gramaNeladhari}</p>
                    </div>
                </div>
            </div>
        </div>

        <div style="border-top: 2px solid var(--border-color); padding-top: 20px; margin-top: 20px;">
            <h4 style="margin: 0 0 15px 0; font-size: 15px; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">📞 Contact Information</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Emergency Contact</p>
                    <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.emergencyContact}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Emergency Phone</p>
                    <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.emergencyPhone}</p>
                </div>
            </div>
        </div>

        <div style="border-top: 2px solid var(--border-color); padding-top: 20px; margin-top: 20px;">
            <h4 style="margin: 0 0 15px 0; font-size: 15px; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">💰 Fund Information</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid var(--info-color);">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Category</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: var(--primary-color);">${beneficiary.category}</p>
                </div>
                <div style="background: #dcfce7; padding: 15px; border-radius: 8px; border-left: 4px solid var(--success-color);">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Amount Requested</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: var(--success-color);">₨${beneficiary.fundAmount.toLocaleString()}</p>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Family Members</p>
                    <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.familyMembers}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Dependents</p>
                    <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.dependents}</p>
                </div>
            </div>
        </div>

        ${beneficiary.bankName ? `
        <div style="border-top: 2px solid var(--border-color); padding-top: 20px; margin-top: 20px;">
            <h4 style="margin: 0 0 15px 0; font-size: 15px; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">🏦 Bank Details</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Bank Name</p>
                    <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.bankName}</p>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Account Number</p>
                    <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.accountNumber}</p>
                </div>
                <div style="grid-column: 1 / -1;">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: var(--text-secondary); font-weight: 600;">Account Holder</p>
                    <p style="margin: 0; font-size: 14px; color: var(--text-primary);">${beneficiary.accountHolder}</p>
                </div>
            </div>
        </div>
        ` : ''}

        <div style="display: flex; gap: 10px; margin-top: 30px; padding-top: 20px; border-top: 2px solid var(--border-color); flex-wrap: wrap;">
            ${actionButtons}
            <button class="btn btn-danger" onclick="deleteBeneficiary('${beneficiary.id}')">🗑️ Delete</button>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
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

    // Analytics stats
    const pending = beneficiaries.filter(b => b.status === 'Pending').length;
    const approved = beneficiaries.filter(b => b.status === 'Approved').length;
    const rejected = beneficiaries.filter(b => b.status === 'Rejected').length;
    const totalFunds = beneficiaries.filter(b => b.status === 'Funded').reduce((sum, b) => sum + b.fundAmount, 0);
    const pendingFunds = beneficiaries.filter(b => b.status === 'Approved').reduce((sum, b) => sum + b.fundAmount, 0);

    document.getElementById('analyticsTotal').textContent = total;
    document.getElementById('analyticsPending').textContent = pending;
    document.getElementById('analyticsApproved').textContent = approved;
    document.getElementById('analyticsFunded').textContent = funded;
    document.getElementById('analyticsRejected').textContent = rejected;
    document.getElementById('analyticsDuplicate').textContent = duplicates;
    document.getElementById('analyticsTotalFunds').textContent = '₨' + totalFunds.toLocaleString();
    document.getElementById('analyticsPendingFunds').textContent = '₨' + pendingFunds.toLocaleString();
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

// ==================== CHARTS ====================
let categoryChart = null;
let statusChart = null;

function initializeCharts() {
    const categoryCtx = document.getElementById('categoryChart');
    const statusCtx = document.getElementById('statusChart');

    if (!categoryCtx || !statusCtx) return;

    // Category Chart
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: CATEGORIES,
            datasets: [{
                data: CATEGORIES.map(cat => beneficiaries.filter(b => b.category === cat).length),
                backgroundColor: [
                    '#1e40af',
                    '#3b82f6',
                    '#0f172a',
                    '#22c55e',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6'
                ],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 13 },
                        padding: 15
                    }
                }
            }
        }
    });

    // Status Chart
    statusChart = new Chart(statusCtx, {
        type: 'bar',
        data: {
            labels: STATUSES,
            datasets: [{
                label: 'Count',
                data: STATUSES.map(status => beneficiaries.filter(b => b.status === status).length),
                backgroundColor: [
                    '#fef3c7',
                    '#dbeafe',
                    '#dcfce7',
                    '#fee2e2'
                ],
                borderColor: [
                    '#f59e0b',
                    '#3b82f6',
                    '#22c55e',
                    '#ef4444'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function updateCharts() {
    if (categoryChart) {
        categoryChart.data.datasets[0].data = CATEGORIES.map(cat => beneficiaries.filter(b => b.category === cat).length);
        categoryChart.update();
    }

    if (statusChart) {
        statusChart.data.datasets[0].data = STATUSES.map(status => beneficiaries.filter(b => b.status === status).length);
        statusChart.update();
    }

    // Update detailed analytics
    updateDetailedAnalytics();
}

function updateDetailedAnalytics() {
    // Category breakdown
    const categoryBreakdown = {};
    CATEGORIES.forEach(cat => {
        const bensByCategory = beneficiaries.filter(b => b.category === cat);
        categoryBreakdown[cat] = {
            count: bensByCategory.length,
            amount: bensByCategory.reduce((sum, b) => sum + b.fundAmount, 0),
            funded: bensByCategory.filter(b => b.status === 'Funded').length,
            pending: bensByCategory.filter(b => b.status === 'Pending').length,
            approved: bensByCategory.filter(b => b.status === 'Approved').length,
            rejected: bensByCategory.filter(b => b.status === 'Rejected').length
        };
    });

    // Update category details in analytics
    const analyticsContainer = document.querySelector('.analytics-section');
    if (analyticsContainer) {
        updateAnalyticsDisplay(categoryBreakdown);
    }
}

function updateDetailedAnalytics() {
    // Category breakdown
    const categoryBreakdown = {};
    CATEGORIES.forEach(cat => {
        const bensByCategory = beneficiaries.filter(b => b.category === cat);
        categoryBreakdown[cat] = {
            count: bensByCategory.length,
            amount: bensByCategory.reduce((sum, b) => sum + b.fundAmount, 0),
            funded: bensByCategory.filter(b => b.status === 'Funded').length,
            pending: bensByCategory.filter(b => b.status === 'Pending').length,
            approved: bensByCategory.filter(b => b.status === 'Approved').length,
            rejected: bensByCategory.filter(b => b.status === 'Rejected').length
        };
    });

    // Update category breakdown table
    updateCategoryBreakdownTable(categoryBreakdown);

    // Update top categories
    updateTopCategories(categoryBreakdown);

    // Update fund status overview
    updateFundStatusOverview(categoryBreakdown);
}

function updateCategoryBreakdownTable(categoryBreakdown) {
    const container = document.getElementById('categoryBreakdownTable');
    if (!container) return;

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Pending</th>
                    <th>Approved</th>
                    <th>Funded</th>
                    <th>Rejected</th>
                    <th>Total Amount</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.entries(categoryBreakdown).forEach(([category, data]) => {
        if (data.count > 0) {
            html += `
                <tr>
                    <td><strong>${category}</strong></td>
                    <td>${data.count}</td>
                    <td><span style="background: #fef3c7; padding: 4px 8px; border-radius: 4px;">${data.pending}</span></td>
                    <td><span style="background: #dbeafe; padding: 4px 8px; border-radius: 4px;">${data.approved}</span></td>
                    <td><span style="background: #dcfce7; padding: 4px 8px; border-radius: 4px;">${data.funded}</span></td>
                    <td><span style="background: #fee2e2; padding: 4px 8px; border-radius: 4px;">${data.rejected}</span></td>
                    <td><strong>₨${data.amount.toLocaleString()}</strong></td>
                </tr>
            `;
        }
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function updateTopCategories(categoryBreakdown) {
    const container = document.getElementById('topCategories');
    if (!container) return;

    const sorted = Object.entries(categoryBreakdown)
        .filter(([cat, data]) => data.count > 0)
        .sort((a, b) => b[1].count - a[1].count);

    let html = '';
    sorted.forEach(([category, data]) => {
        const percentage = beneficiaries.length > 0 ? ((data.count / beneficiaries.length) * 100).toFixed(1) : 0;
        html += `
            <div class="category-item">
                <span class="category-name">${category}</span>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 12px; color: var(--text-secondary);">${percentage}%</span>
                    <span class="category-count">${data.count}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No data available</p>';
}

function updateFundStatusOverview(categoryBreakdown) {
    const container = document.getElementById('fundStatusOverview');
    if (!container) return;

    const statusData = {
        'Pending': beneficiaries.filter(b => b.status === 'Pending').length,
        'Approved': beneficiaries.filter(b => b.status === 'Approved').length,
        'Funded': beneficiaries.filter(b => b.status === 'Funded').length,
        'Rejected': beneficiaries.filter(b => b.status === 'Rejected').length
    };

    let html = '';
    Object.entries(statusData).forEach(([status, count]) => {
        const colors = {
            'Pending': '#f59e0b',
            'Approved': '#3b82f6',
            'Funded': '#22c55e',
            'Rejected': '#ef4444'
        };
        const bgColors = {
            'Pending': '#fef3c7',
            'Approved': '#dbeafe',
            'Funded': '#dcfce7',
            'Rejected': '#fee2e2'
        };
        
        html += `
            <div class="fund-status-item" style="border-left-color: ${colors[status]}; background: ${bgColors[status]};">
                <span class="status-name">${status}</span>
                <span class="status-count" style="background: ${colors[status]}">${count}</span>
            </div>
        `;
    });

    container.innerHTML = html;
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
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <p>${message}</p>
        <button class="btn btn-sm" onclick="this.parentElement.remove()">Dismiss</button>
    `;

    const container = document.querySelector('.main-content');
    container.insertBefore(alertDiv, container.firstChild);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
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
