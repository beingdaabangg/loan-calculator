// Export Manager Class
class ExportManager {
    constructor() {
        this.exportFormats = {
            excel: this.exportToExcel.bind(this),
            csv: this.exportToCSV.bind(this),
            pdf: this.exportToPDF.bind(this)
        };
    }

    // Main export function
    async export(format, loanData) {
        try {
            if (!this.exportFormats[format]) {
                throw new Error(`Unsupported export format: ${format}`);
            }

            document.dispatchEvent(new CustomEvent(EVENTS.EXPORT_STARTED));
            await this.exportFormats[format](loanData);
            document.dispatchEvent(new CustomEvent(EVENTS.EXPORT_COMPLETED));
            
            return true;
        } catch (error) {
            console.error('Export error:', error);
            throw new Error(ERROR_MESSAGES.exportError);
        }
    }

    // Excel Export
    async exportToExcel(loanData) {
        const workbook = XLSX.utils.book_new();

        // Monthly Schedule Sheet
        const monthlyData = this.formatMonthlyData(loanData);
        const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);
        XLSX.utils.book_append_sheet(workbook, monthlySheet, EXPORT_CONFIGS.excel.sheets.monthlySchedule);

        // Loan Summary Sheet
        const summaryData = this.formatSummaryData(loanData);
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, EXPORT_CONFIGS.excel.sheets.loanSummary);

        // Yearly Summary Sheet
        const yearlyData = this.formatYearlyData(loanData);
        const yearlySheet = XLSX.utils.json_to_sheet(yearlyData);
        XLSX.utils.book_append_sheet(workbook, yearlySheet, EXPORT_CONFIGS.excel.sheets.yearlySummary);

        // Savings Analysis Sheet
        const savingsData = this.formatSavingsData(loanData);
        const savingsSheet = XLSX.utils.json_to_sheet(savingsData);
        XLSX.utils.book_append_sheet(workbook, savingsSheet, EXPORT_CONFIGS.excel.sheets.savingsAnalysis);

        // Save workbook
        XLSX.writeFile(workbook, "loan_analysis.xlsx");
    }

    // CSV Export
    async exportToCSV(loanData) {
        // Export multiple CSV files
        const exports = [
            {
                data: this.formatMonthlyData(loanData),
                filename: 'monthly_schedule.csv'
            },
            {
                data: this.formatSummaryData(loanData),
                filename: 'loan_summary.csv'
            },
            {
                data: this.formatYearlyData(loanData),
                filename: 'yearly_summary.csv'
            }
        ];

        // Generate and download each CSV
        exports.forEach(exp => {
            const csv = Papa.unparse(exp.data);
            this.downloadFile(csv, exp.filename, 'text/csv');
        });
    }

    // PDF Export
    async exportToPDF(loanData) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: EXPORT_CONFIGS.pdf.orientation,
            unit: 'mm',
            format: EXPORT_CONFIGS.pdf.pageSize
        });

        let currentY = EXPORT_CONFIGS.pdf.margins.top;

        // Add Title
        doc.setFontSize(16);
        doc.text('Loan Analysis Report', doc.internal.pageSize.width / 2, currentY, { align: 'center' });
        currentY += 15;

        // Add Loan Summary
        doc.setFontSize(12);
        doc.text('Loan Summary', EXPORT_CONFIGS.pdf.margins.left, currentY);
        currentY += 10;

        const summaryItems = this.formatSummaryForPDF(loanData);
        summaryItems.forEach(item => {
            doc.text(item, EXPORT_CONFIGS.pdf.margins.left + 5, currentY);
            currentY += 7;
        });

        // Add Charts
        currentY = await this.addChartsToPDF(doc, currentY + 10);

        // Add Monthly Schedule
        if (currentY > doc.internal.pageSize.height - 60) {
            doc.addPage();
            currentY = EXPORT_CONFIGS.pdf.margins.top;
        }

        doc.text('Monthly Schedule', EXPORT_CONFIGS.pdf.margins.left, currentY);
        currentY += 10;

        // Add table
        const tableData = this.formatScheduleForPDF(loanData);
        doc.autoTable({
            startY: currentY,
            head: [['Month', 'EMI', 'Principal', 'Interest', 'Balance']],
            body: tableData,
            styles: { fontSize: 8 },
            margin: EXPORT_CONFIGS.pdf.margins
        });

        // Save PDF
        doc.save('loan_analysis.pdf');
    }

    // Helper functions for data formatting
    formatMonthlyData(loanData) {
        return loanData.schedule.map(item => ({
            'Month': item.month,
            'Date': formatDate(item.date),
            'EMI Amount': item.payment,
            'Principal': item.principal,
            'Interest': item.interest,
            'Balance': item.balance,
            'Cumulative Interest': item.totalInterest
        }));
    }

    formatSummaryData(loanData) {
        return [{
            'Original Loan Amount': LOAN_DETAILS.sanctionedAmount,
            'Outstanding Amount': LOAN_DETAILS.outstandingAmount,
            'Current EMI': LOAN_DETAILS.currentEMI,
            'New EMI': loanData.summary.baseEMI,
            'Interest Rate': `${document.getElementById('interestRate').value}%`,
            'Total Interest': loanData.summary.totalInterest,
            'Total Payment': loanData.summary.totalPayment,
            'Tenure': `${loanData.summary.monthsRemaining} months`
        }];
    }

    formatYearlyData(loanData) {
        return loanData.summary.yearlyBreakdown;
    }

    formatSavingsData(loanData) {
        return loanData.schedule.map(item => ({
            'Month': item.month,
            'Regular EMI': LOAN_DETAILS.currentEMI,
            'Actual EMI': item.payment,
            'Monthly Saving': LOAN_DETAILS.currentEMI - item.payment,
            'Cumulative Saving': (LOAN_DETAILS.currentEMI - item.payment) * item.month
        }));
    }

    formatSummaryForPDF(loanData) {
        return [
            `Original Loan Amount: ${formatCurrency(LOAN_DETAILS.sanctionedAmount)}`,
            `Outstanding Amount: ${formatCurrency(LOAN_DETAILS.outstandingAmount)}`,
            `Current EMI: ${formatCurrency(LOAN_DETAILS.currentEMI)}`,
            `New EMI: ${formatCurrency(loanData.summary.baseEMI)}`,
            `Total Interest: ${formatCurrency(loanData.summary.totalInterest)}`,
            `Total Payment: ${formatCurrency(loanData.summary.totalPayment)}`,
            `Remaining Tenure: ${loanData.summary.monthsRemaining} months`
        ];
    }

    formatScheduleForPDF(loanData) {
        return loanData.schedule.map(item => [
            item.month.toString(),
            formatCurrency(item.payment),
            formatCurrency(item.principal),
            formatCurrency(item.interest),
            formatCurrency(item.balance)
        ]);
    }

    // Utility functions
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    async addChartsToPDF(doc, startY) {
        const charts = document.querySelectorAll('canvas');
        let currentY = startY;

        for (let chart of charts) {
            if (currentY > doc.internal.pageSize.height - 120) {
                doc.addPage();
                currentY = EXPORT_CONFIGS.pdf.margins.top;
            }

            const imgData = chart.toDataURL('image/png');
            const pageWidth = doc.internal.pageSize.width;
            const margin = EXPORT_CONFIGS.pdf.margins.left + EXPORT_CONFIGS.pdf.margins.right;
            const imgWidth = pageWidth - margin;
            const imgHeight = (chart.height * imgWidth) / chart.width;

            doc.addImage(imgData, 'PNG', 
                        EXPORT_CONFIGS.pdf.margins.left, 
                        currentY, 
                        imgWidth, 
                        imgHeight);
            currentY += imgHeight + 10;
        }

        return currentY;
    }
}

// Create and export instance
const exportManager = new ExportManager();
window.exportManager = exportManager;