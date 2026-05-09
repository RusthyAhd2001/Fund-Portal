# Fund-Portal

## NGO Beneficiary Verification & Fund Management Portal

A professional, single-page web application for managing NGO beneficiary registration, verification, and fund distribution with advanced duplicate detection and analytics.

### 🎯 Features

#### 1. **Beneficiary Registration**
- Comprehensive personal information collection
- NIC/ID verification
- Photo upload capability
- Address and family details
- Bank account information
- Emergency contact details
- Fund category selection

#### 2. **Intelligent Duplicate Detection**
- Real-time duplicate checking before registration
- Detects by:
  - NIC Number
  - Mobile Number
  - Name + Date of Birth
  - Bank Account
  - Similar name matching (string similarity)
- Prevents same person receiving funds twice

#### 3. **Bulk Upload System**
- Download Excel template
- Import multiple beneficiaries at once
- Automatic validation and duplicate checking
- Progress tracking
- Detailed results report (success/duplicates/errors)

#### 4. **Beneficiary Management**
- View all beneficiaries with complete details
- Search by Name, NIC, or Mobile
- Filter by Category and Status
- Update beneficiary status (Pending → Approved → Funded → Rejected)
- Delete beneficiary records
- Privacy-protected NIC display

#### 5. **Approval Workflow**
- **Pending** → Initial registration status
- **Approved** → Verified by officer
- **Funded** → Payment released
- **Rejected** → Application denied
- One-click status updates from detail modal

#### 6. **Analytics Dashboard**
- Beneficiary count by category (Doughnut chart)
- Status distribution (Bar chart)
- Category-wise breakdown table
- Top requested categories
- Fund status overview
- Real-time statistics

#### 7. **Fund Categories**
- Education Support
- Medical Support
- Food Support
- Housing Support
- Orphan Support
- Widow Support
- Emergency Support

### 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Charts:** Chart.js
- **Excel Processing:** XLSX.js
- **Storage:** Browser LocalStorage
- **No Backend Required** - Fully Client-Side

### 📋 File Structure

```
Fund-Portal/
├── index.html          # Main portal interface
├── styles.css          # Professional styling
├── script.js           # All functionality
└── README.md          # This file
```

### 🚀 How to Use

1. **Open the Portal**
   - Open `index.html` in any modern web browser
   - Or access via GitHub Pages

2. **Register Beneficiary**
   - Fill in personal information
   - System automatically checks for duplicates
   - Click "Register" to save

3. **Bulk Upload**
   - Download Excel template
   - Fill in beneficiary data
   - Upload file for batch import
   - Review results

4. **Manage Beneficiaries**
   - Go to "All Beneficiaries" tab
   - Search or filter as needed
   - Click "View" to see full details
   - Use action buttons to approve/reject/fund

5. **Check Analytics**
   - View statistics and charts
   - See category breakdown
   - Track fund distribution

### 💾 Data Storage

- All data stored in browser's LocalStorage
- Persists across sessions
- No server required
- Data remains private on your device

### 🔒 Data Validation

- **Duplicate Detection:** Prevents duplicate entries
- **Required Fields:** Enforces mandatory information
- **Phone Format:** Validates phone number format
- **Amount Validation:** Ensures valid fund amounts
- **File Upload:** Validates image/PDF files

### 📊 Status Workflow

```
Register Beneficiary
        ↓
System Checks Duplicate
        ↓
View in List (Pending)
        ↓
Approval Officer Reviews (View Details)
        ↓
Approve / Reject Decision
        ↓
Finance Officer Marks as Funded
        ↓
Complete
```

### 🎨 User Roles (Simulated)

While this is a single-page app, it supports workflow for:
- **Data Entry Officer:** Register beneficiaries
- **Verification Officer:** Check duplicates and documents
- **Admin:** Approve/Reject applications
- **Finance Officer:** Release funds
- **Viewer/Auditor:** View analytics and reports

### 📱 Responsive Design

- Desktop optimized
- Tablet friendly
- Mobile responsive
- Works on all modern browsers

### 🌐 Browser Support

- Chrome/Edge (Latest)
- Firefox (Latest)
- Safari (Latest)
- Mobile Browsers

### 🔧 Installation

1. Clone or download the repository
2. No installation required
3. Simply open `index.html` in browser
4. Start using immediately

### 📈 Sample Data

Use the bulk upload feature with the provided Excel template to import sample data. The system will automatically validate and detect duplicates.

### ✨ Key Highlights

✓ Professional UI/UX design
✓ Zero external dependencies (CDN libraries only)
✓ Real-time duplicate detection
✓ Advanced analytics and reporting
✓ Fully responsive
✓ Fast and lightweight
✓ No server-side code needed
✓ Complete data privacy

### 🎓 Use Cases

- **NGO Fund Distribution:** Manage beneficiary verification and fund allocation
- **Social Welfare Programs:** Track beneficiary applications and status
- **Disaster Relief:** Quick beneficiary registration and tracking
- **Community Support:** Centralized beneficiary database

### 📝 Notes

- Data is stored locally in browser
- Clear browser cache to reset data
- Export data regularly as backup
- Use bulk upload for mass data import

### 👨‍💻 Developer

**Rusthy Ahd**
- GitHub: https://github.com/RusthyAhd

### 📄 License

This project is open source and available for NGO use.

---

**Version:** 1.0.0
**Last Updated:** May 2026
**Status:** Production Ready ✅
