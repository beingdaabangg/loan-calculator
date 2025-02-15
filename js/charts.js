// Chart Management Class
class ChartManager {
    constructor() {
        this.charts = {};
        this.chartRefs = {};
    }

    // Initialize all charts
    initializeCharts(loanData) {
        this.createEMIProgressionChart(loanData);
        this.createBalanceReductionChart(loanData);
        this.createPaymentDistributionChart(loanData);
        this.createYearlyBreakdownChart(loanData);
    }

    // Create EMI Progression Chart
    createEMIProgressionChart(loanData) {
        const ctx = document.getElementById('emiProgressionChart').getContext('2d');
        
        this.charts.emiProgression = new Chart(ctx, {
            type: 'line',
            data: {
                labels: loanData.schedule.map(item => `Month ${item.month}`),
                datasets: [{
                    label: 'Regular EMI',
                    data: loanData.schedule.map(() => LOAN_DETAILS.currentEMI),
                    borderColor: CHART_CONFIGS.colors.primary,
                    tension: 0.1
                }, {
                    label: 'Stepped EMI',
                    data: loanData.schedule.map(item => item.payment),
                    borderColor: CHART_CONFIGS.colors.secondary,
                    tension: 0.1
                }]
            },
            options: {
                ...CHART_CONFIGS.common,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // Create Balance Reduction Chart
    createBalanceReductionChart(loanData) {
        const ctx = document.getElementById('balanceReductionChart').getContext('2d');
        
        this.charts.balanceReduction = new Chart(ctx, {
            type: 'line',
            data: {
                labels: loanData.schedule.map(item => `Month ${item.month}`),
                datasets: [{
                    label: 'Outstanding Balance',
                    data: loanData.schedule.map(item => item.balance),
                    borderColor: CHART_CONFIGS.colors.primary,
                    fill: true,
                    backgroundColor: `${CHART_CONFIGS.colors.primary}20`
                }]
            },
            options: {
                ...CHART_CONFIGS.common,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // Create Payment Distribution Chart
    createPaymentDistributionChart(loanData) {
        const ctx = document.getElementById('paymentDistributionChart').getContext('2d');
        const totalPrincipal = loanData.schedule.reduce((sum, item) => sum + item.principal, 0);
        
        this.charts.paymentDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Interest'],
                datasets: [{
                    data: [
                        totalPrincipal,
                        loanData.summary.totalInterest
                    ],
                    backgroundColor: [
                        CHART_CONFIGS.colors.success,
                        CHART_CONFIGS.colors.error
                    ]
                }]
            },
            options: {
                ...CHART_CONFIGS.common,
                cutout: '60%',
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return ` ${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Create Yearly Breakdown Chart
    createYearlyBreakdownChart(loanData) {
        const ctx = document.getElementById('yearlyBreakdownChart').getContext('2d');
        const yearlyData = loanData.summary.yearlyBreakdown;
        
        this.charts.yearlyBreakdown = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: yearlyData.map(item => item.year),
                datasets: [{
                    label: 'Principal',
                    data: yearlyData.map(item => item.totalPrincipal),
                    backgroundColor: CHART_CONFIGS.colors.success
                }, {
                    label: 'Interest',
                    data: yearlyData.map(item => item.totalInterest),
                    backgroundColor: CHART_CONFIGS.colors.error
                }]
            },
            options: {
                ...CHART_CONFIGS.common,
                scales: {
                    x: {
                        stacked: true
                    },
                    y: {
                        stacked: true,
                        ticks: {
                            callback: value => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // Update all charts with new data
    updateCharts(loanData) {
        this.updateEMIProgressionChart(loanData);
        this.updateBalanceReductionChart(loanData);
        this.updatePaymentDistributionChart(loanData);
        this.updateYearlyBreakdownChart(loanData);
    }

    // Individual chart update methods
    updateEMIProgressionChart(loanData) {
        const chart = this.charts.emiProgression;
        chart.data.labels = loanData.schedule.map(item => `Month ${item.month}`);
        chart.data.datasets[1].data = loanData.schedule.map(item => item.payment);
        chart.update();
    }

    updateBalanceReductionChart(loanData) {
        const chart = this.charts.balanceReduction;
        chart.data.labels = loanData.schedule.map(item => `Month ${item.month}`);
        chart.data.datasets[0].data = loanData.schedule.map(item => item.balance);
        chart.update();
    }

    updatePaymentDistributionChart(loanData) {
        const chart = this.charts.paymentDistribution;
        const totalPrincipal = loanData.schedule.reduce((sum, item) => sum + item.principal, 0);
        chart.data.datasets[0].data = [totalPrincipal, loanData.summary.totalInterest];
        chart.update();
    }

    updateYearlyBreakdownChart(loanData) {
        const chart = this.charts.yearlyBreakdown;
        const yearlyData = loanData.summary.yearlyBreakdown;
        
        chart.data.labels = yearlyData.map(item => item.year);
        chart.data.datasets[0].data = yearlyData.map(item => item.totalPrincipal);
        chart.data.datasets[1].data = yearlyData.map(item => item.totalInterest);
        chart.update();
    }

    // Theme management
    updateChartsTheme(isDarkMode) {
        const gridColor = isDarkMode ? '#4B5563' : '#E5E7EB';
        const textColor = isDarkMode ? '#F9FAFB' : '#1F2937';

        Object.values(this.charts).forEach(chart => {
            // Update grid lines
            if (chart.options.scales) {
                ['x', 'y'].forEach(axis => {
                    if (chart.options.scales[axis]) {
                        chart.options.scales[axis].grid = {
                            ...chart.options.scales[axis].grid,
                            color: gridColor
                        };
                        chart.options.scales[axis].ticks = {
                            ...chart.options.scales[axis].ticks,
                            color: textColor
                        };
                    }
                });
            }

            // Update legend text
            if (chart.options.plugins?.legend) {
                chart.options.plugins.legend.labels = {
                    ...chart.options.plugins.legend.labels,
                    color: textColor
                };
            }

            chart.update();
        });
    }

    // Destroy charts (cleanup)
    destroyCharts() {
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};
    }

    // Export chart as image
    exportChartAsImage(chartId) {
        const chart = this.charts[chartId];
        if (!chart) return null;
        
        return chart.toBase64Image();
    }

    // Animation functions
    animateValue(startValue, endValue, duration, callback) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentValue = startValue + (endValue - startValue) * progress;
            callback(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    // Chart interaction handlers
    addChartInteractions() {
        Object.entries(this.charts).forEach(([key, chart]) => {
            const canvas = chart.canvas;

            canvas.addEventListener('mousemove', (event) => {
                const elements = chart.getElementsAtEventForMode(
                    event,
                    'nearest',
                    { intersect: true },
                    false
                );

                if (elements.length) {
                    canvas.style.cursor = 'pointer';
                } else {
                    canvas.style.cursor = 'default';
                }
            });

            canvas.addEventListener('click', (event) => {
                const elements = chart.getElementsAtEventForMode(
                    event,
                    'nearest',
                    { intersect: true },
                    false
                );

                if (elements.length) {
                    const element = elements[0];
                    this.handleChartClick(key, element);
                }
            });
        });
    }

    handleChartClick(chartId, element) {
        const chart = this.charts[chartId];
        const datasetIndex = element.datasetIndex;
        const index = element.index;
        const value = chart.data.datasets[datasetIndex].data[index];

        // Dispatch custom event with click data
        const event = new CustomEvent('chartElementClick', {
            detail: {
                chartId,
                datasetIndex,
                index,
                value,
                label: chart.data.labels[index]
            }
        });
        document.dispatchEvent(event);
    }
}

// Create and export chart manager instance
const chartManager = new ChartManager();
window.chartManager = chartManager;