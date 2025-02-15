// Main Application Class
class LoanCalculatorApp {
    constructor() {
        this.calculator = window.loanCalculator;
        this.chartManager = window.chartManager;
        this.exportManager = window.exportManager;
        this.currentLoanData = null;
        this.isDarkMode = false;
    }

    // Initialize application
    initialize() {
        this.setupEventListeners();
        this.performInitialCalculation();
        this.setupThemeToggle();
        this.setupExportButtons();
        this.setupTabNavigation();
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Input change handlers
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.handleInputChange(input));
        });

        // Schedule filter
        const scheduleFilter = document.getElementById('scheduleFilter');
        if (scheduleFilter) {
            scheduleFilter.addEventListener('change', () => {
                this.updateScheduleTable(this.currentLoanData, scheduleFilter.value);
            });
        }

        // Chart interactions
        document.addEventListener('chartElementClick', (event) => {
            this.handleChartClick(event.detail);
        });

        // Export events
        document.addEventListener(EVENTS.EXPORT_STARTED, () => this.showLoading());
        document.addEventListener(EVENTS.EXPORT_COMPLETED, () => {
            this.hideLoading();
            this.showToast('Export completed successfully');
        });
    }

    // Input Change Handler
    async handleInputChange(input) {
        this.showLoading();
        try {
            const params = this.collectInputParameters();
            this.currentLoanData = await this.calculator.calculateLoan(params);
            this.updateUI(this.currentLoanData);
            this.chartManager.updateCharts(this.currentLoanData);
            this.showToast('Calculations updated');
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Collect Input Parameters
    collectInputParameters() {
        return {
            interestRate: parseFloat(document.getElementById('interestRate').value),
            adjustmentType: document.getElementById('adjustmentType').value,
            prepaymentAmount: parseFloat(document.getElementById('prepaymentAmount').value) || 0,
            prepaymentType: document.getElementById('prepaymentType').value,
            stepUpConfig: {
                type: document.getElementById('stepUpType').value,
                percentage: parseFloat(document.getElementById('stepUpPercentage').value) || 0,
                startDate: document.getElementById('stepUpDate').value
            }
        };
    }

    // UI Updates
    updateUI(loanData) {
        // Update summary values
        this.updateSummaryValues(loanData);
        
        // Update schedule table
        const filterValue = document.getElementById('scheduleFilter')?.value || 'all';
        this.updateScheduleTable(loanData, filterValue);
        
        // Update analysis metrics if visible
        if (document.getElementById('analysis').classList.contains('active')) {
            this.updateAnalysisMetrics(loanData);
        }
    }

    updateSummaryValues(loanData) {
        const elements = {
            'newEMI': formatCurrency(loanData.summary.baseEMI),
            'newTenure': `${loanData.summary.monthsRemaining} months`,
            'totalInterest': formatCurrency(loanData.summary.totalInterest),
            'totalPayment': formatCurrency(loanData.summary.totalPayment),
            'effectiveRate': `${loanData.summary.effectiveRate.toFixed(2)}%`,
            'totalSavings': formatCurrency(loanData.summary.savings)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.dataset.animate === 'true') {
                    this.animateValue(element, value);
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    updateScheduleTable(loanData, filterType) {
        const tbody = document.getElementById('amortizationBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const filteredData = this.filterScheduleData(loanData.schedule, filterType);

        filteredData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.style.animation = `fadeIn 0.3s ease ${index * 0.05}s`;
            tr.innerHTML = this.createScheduleRow(row);
            tbody.appendChild(tr);
        });
    }

    updateAnalysisMetrics(loanData) {
        // Update metrics cards
        const metrics = this.calculateAnalysisMetrics(loanData);
        Object.entries(metrics).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Update recommendations
        this.updateRecommendations(loanData);
    }

    // Helper Functions
    filterScheduleData(schedule, filterType) {
        switch (filterType) {
            case 'yearly':
                return schedule.filter(row => row.month % 12 === 0);
            case 'stepup':
                return schedule.filter(row => row.payment > LOAN_DETAILS.currentEMI);
            default:
                return schedule;
        }
    }

    createScheduleRow(row) {
        return `
            <td>${row.month}</td>
            <td>${formatDate(row.date)}</td>
            <td>${formatCurrency(row.payment)}</td>
            <td>${formatCurrency(row.principal)}</td>
            <td>${formatCurrency(row.interest)}</td>
            <td>${formatCurrency(row.balance)}</td>
        `;
    }

    calculateAnalysisMetrics(loanData) {
        return {
            'savingsAmount': formatCurrency(loanData.summary.savings),
            'effectiveInterestRate': `${loanData.summary.effectiveRate.toFixed(2)}%`,
            'timeReduced': `${Math.max(0, 123 - loanData.summary.monthsRemaining)} months`,
            'totalInterestSaved': formatCurrency(
                123 * LOAN_DETAILS.currentEMI - loanData.summary.totalPayment
            )
        };
    }

    // Theme Management
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
        this.chartManager.updateChartsTheme(this.isDarkMode);
        this.showToast(`Switched to ${this.isDarkMode ? 'dark' : 'light'} mode`);
    }

    // Export Setup
    setupExportButtons() {
        const exportButtons = {
            'exportExcel': 'excel',
            'exportCSV': 'csv',
            'exportPDF': 'pdf'
        };

        Object.entries(exportButtons).forEach(([id, format]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => this.handleExport(format));
            }
        });
    }

    async handleExport(format) {
        try {
            await this.exportManager.export(format, this.currentLoanData);
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Tab Navigation
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId, tabButtons, tabContents);
            });
        });
    }

    switchTab(tabId, buttons, contents) {
        buttons.forEach(btn => btn.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));

        const selectedButton = document.querySelector(`[data-tab="${tabId}"]`);
        const selectedContent = document.getElementById(tabId);

        if (selectedButton && selectedContent) {
            selectedButton.classList.add('active');
            selectedContent.classList.add('active');

            if (tabId === 'analysis') {
                this.chartManager.updateCharts(this.currentLoanData);
            }
        }
    }

    // UI Helpers
    showLoading() {
        const loader = document.querySelector('.loading-overlay');
        if (loader) loader.classList.add('active');
    }

    hideLoading() {
        const loader = document.querySelector('.loading-overlay');
        if (loader) loader.classList.remove('active');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Initial Setup
    async performInitialCalculation() {
        this.showLoading();
        try {
            const params = this.collectInputParameters();
            this.currentLoanData = await this.calculator.calculateLoan(params);
            this.chartManager.initializeCharts(this.currentLoanData);
            this.updateUI(this.currentLoanData);
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new LoanCalculatorApp();
    app.initialize();
    window.loanApp = app; // Make app instance globally available
});