// Loan Constants
const LOAN_DETAILS = {
    sanctionedAmount: 3082384,
    outstandingAmount: 2458898,
    currentEMI: 31507,
    firstInstallment: new Date('2020-05-02'),
    lastInstallment: new Date('2035-05-10'),
    initialPaidEMI: 33515
};

// Chart Configurations
const CHART_CONFIGS = {
    common: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                    }
                }
            }
        }
    },
    colors: {
        primary: 'rgb(79, 70, 229)',
        secondary: 'rgb(129, 140, 248)',
        success: 'rgb(16, 185, 129)',
        error: 'rgb(239, 68, 68)',
        warning: 'rgb(245, 158, 11)'
    }
};

// Date Constants
const CURRENT_DATE = new Date('2025-02-14');

// Export Configurations
const EXPORT_CONFIGS = {
    excel: {
        sheets: {
            monthlySchedule: "Monthly Schedule",
            loanSummary: "Loan Summary",
            yearlySummary: "Yearly Summary",
            savingsAnalysis: "Savings Analysis"
        }
    },
    pdf: {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: {
            top: 40,
            right: 40,
            bottom: 40,
            left: 40
        }
    }
};

// Formatter Functions
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
};

// Validation Constants
const VALIDATION_RULES = {
    interestRate: {
        min: 1,
        max: 30,
        step: 0.01
    },
    stepUpPercentage: {
        min: 0,
        max: 100,
        step: 0.1
    },
    prepaymentAmount: {
        min: 0,
        step: 1000
    }
};

// Error Messages
const ERROR_MESSAGES = {
    invalidInterestRate: 'Interest rate must be between 1% and 30%',
    invalidStepUp: 'Step-up percentage must be between 0% and 100%',
    invalidPrepayment: 'Prepayment amount must be positive',
    calculationError: 'Error in loan calculation',
    exportError: 'Error exporting data'
};

// Event Names
const EVENTS = {
    CALCULATION_UPDATED: 'calculationUpdated',
    EXPORT_STARTED: 'exportStarted',
    EXPORT_COMPLETED: 'exportCompleted',
    THEME_CHANGED: 'themeChanged'
};