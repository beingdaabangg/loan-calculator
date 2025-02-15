// Main Calculation Functions
class LoanCalculator {
    constructor(loanDetails) {
        this.loanDetails = loanDetails;
    }

    // Calculate stepped EMI based on configuration
    calculateSteppedEMI(baseEMI, month, stepUpConfig) {
        if (stepUpConfig.type === 'none' || !stepUpConfig.percentage) return baseEMI;

        const stepUpMonth = new Date(stepUpConfig.startDate);
        const currentDate = new Date(CURRENT_DATE);
        currentDate.setMonth(currentDate.getMonth() + month - 1);

        if (currentDate < stepUpMonth) return baseEMI;

        switch(stepUpConfig.type) {
            case 'monthly':
                const monthsDiff = (currentDate.getFullYear() - stepUpMonth.getFullYear()) * 12 
                                 + currentDate.getMonth() - stepUpMonth.getMonth();
                return baseEMI * Math.pow(1 + stepUpConfig.percentage/100, monthsDiff);
            
            case 'yearly':
                const yearsDiff = Math.floor((currentDate.getFullYear() - stepUpMonth.getFullYear()) 
                                + (currentDate.getMonth() - stepUpMonth.getMonth())/12);
                return baseEMI * Math.pow(1 + stepUpConfig.percentage/100, yearsDiff);
            
            case 'onetime':
                return baseEMI * (1 + stepUpConfig.percentage/100);
            
            default:
                return baseEMI;
        }
    }

    // Calculate loan amortization schedule
    calculateLoan(params) {
        try {
            const {
                interestRate,
                adjustmentType,
                prepaymentAmount = 0,
                prepaymentType,
                stepUpConfig
            } = params;

            // Validate inputs
            this.validateInputs(params);

            // Initialize calculation variables
            const monthlyRate = interestRate / 1200;
            let balance = this.loanDetails.outstandingAmount - prepaymentAmount;
            let totalInterest = 0;
            const schedule = [];

            // Calculate remaining months
            let monthsRemaining = this.calculateRemainingMonths();
            let baseEMI = this.loanDetails.currentEMI;

            // Adjust EMI or tenure based on prepayment
            if (prepaymentAmount > 0) {
                if (prepaymentType === 'emi') {
                    baseEMI = this.calculateNewEMI(balance, monthlyRate, monthsRemaining);
                } else {
                    monthsRemaining = this.calculateNewTenure(balance, monthlyRate, baseEMI);
                }
            }

            // Generate amortization schedule
            let currentBalance = balance;
            for (let month = 1; month <= monthsRemaining; month++) {
                const currentEMI = this.calculateSteppedEMI(baseEMI, month, stepUpConfig);
                const interest = currentBalance * monthlyRate;
                const principal = currentEMI - interest;
                currentBalance = currentBalance - principal;
                totalInterest += interest;

                schedule.push({
                    month,
                    payment: currentEMI,
                    principal: principal,
                    interest: interest,
                    balance: Math.max(0, currentBalance),
                    totalInterest: totalInterest,
                    date: new Date(CURRENT_DATE.getFullYear(), 
                                 CURRENT_DATE.getMonth() + month - 1, 
                                 CURRENT_DATE.getDate())
                });
            }

            // Calculate additional metrics
            const effectiveRate = this.calculateEffectiveRate(schedule);
            const savings = this.calculateTotalSavings(schedule);
            const yearlyBreakdown = this.calculateYearlyBreakdown(schedule);

            return {
                schedule,
                summary: {
                    baseEMI,
                    monthsRemaining,
                    totalInterest,
                    totalPayment: totalInterest + balance,
                    effectiveRate,
                    savings,
                    yearlyBreakdown
                }
            };
        } catch (error) {
            console.error('Calculation error:', error);
            throw new Error(ERROR_MESSAGES.calculationError);
        }
    }

    // Helper calculation methods
    calculateRemainingMonths() {
        return (this.loanDetails.lastInstallment.getFullYear() - CURRENT_DATE.getFullYear()) * 12 + 
               (this.loanDetails.lastInstallment.getMonth() - CURRENT_DATE.getMonth());
    }

    calculateNewEMI(balance, monthlyRate, tenure) {
        return (balance * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
               (Math.pow(1 + monthlyRate, tenure) - 1);
    }

    calculateNewTenure(balance, monthlyRate, emi) {
        return Math.ceil(Math.log(emi / (emi - balance * monthlyRate)) / Math.log(1 + monthlyRate));
    }

    calculateEffectiveRate(schedule) {
        // Using Newton-Raphson method for IRR calculation
        let guess = 0.1; // Initial guess
        const tolerance = 0.0000001;
        const maxIterations = 20;

        for (let i = 0; i < maxIterations; i++) {
            const f = this.calculateNPV(schedule, guess);
            const fPrime = this.calculateNPVDerivative(schedule, guess);
            
            const newGuess = guess - f / fPrime;
            
            if (Math.abs(newGuess - guess) < tolerance) {
                return newGuess * 12 * 100; // Convert to annual percentage rate
            }
            
            guess = newGuess;
        }

        return guess * 12 * 100;
    }

    calculateNPV(schedule, rate) {
        return schedule.reduce((sum, item, index) => 
            sum + item.payment / Math.pow(1 + rate, index + 1), 0) - 
            this.loanDetails.outstandingAmount;
    }

    calculateNPVDerivative(schedule, rate) {
        return schedule.reduce((sum, item, index) => 
            sum - (index + 1) * item.payment / Math.pow(1 + rate, index + 2), 0);
    }

    calculateTotalSavings(schedule) {
        const regularPayments = schedule.length * this.loanDetails.currentEMI;
        const actualPayments = schedule.reduce((sum, month) => sum + month.payment, 0);
        return regularPayments - actualPayments;
    }

    calculateYearlyBreakdown(schedule) {
        const yearlyData = {};
        
        schedule.forEach(item => {
            const year = item.date.getFullYear();
            if (!yearlyData[year]) {
                yearlyData[year] = {
                    year,
                    totalEMI: 0,
                    totalPrincipal: 0,
                    totalInterest: 0,
                    closingBalance: item.balance
                };
            }
            
            yearlyData[year].totalEMI += item.payment;
            yearlyData[year].totalPrincipal += item.principal;
            yearlyData[year].totalInterest += item.interest;
            yearlyData[year].closingBalance = item.balance;
        });

        return Object.values(yearlyData);
    }

    // Input validation
    validateInputs(params) {
        const { interestRate, stepUpConfig, prepaymentAmount } = params;

        if (interestRate < VALIDATION_RULES.interestRate.min || 
            interestRate > VALIDATION_RULES.interestRate.max) {
            throw new Error(ERROR_MESSAGES.invalidInterestRate);
        }

        if (stepUpConfig.percentage < VALIDATION_RULES.stepUpPercentage.min || 
            stepUpConfig.percentage > VALIDATION_RULES.stepUpPercentage.max) {
            throw new Error(ERROR_MESSAGES.invalidStepUp);
        }

        if (prepaymentAmount < VALIDATION_RULES.prepaymentAmount.min) {
            throw new Error(ERROR_MESSAGES.invalidPrepayment);
        }
    }
}

// Create calculator instance
const loanCalculator = new LoanCalculator(LOAN_DETAILS);

// Export calculator instance
window.loanCalculator = loanCalculator;