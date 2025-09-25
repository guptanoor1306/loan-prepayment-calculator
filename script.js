// Simplified Loan Prepayment Calculator with Tabbed Interface

// Analytics Tracking
class Analytics {
    static track(event, properties = {}) {
        // Store analytics data
        const analyticsData = {
            event: event,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...properties
        };
        
        // Store in localStorage for now (can be sent to analytics service)
        const existingData = JSON.parse(localStorage.getItem('loanCalculatorAnalytics') || '[]');
        existingData.push(analyticsData);
        localStorage.setItem('loanCalculatorAnalytics', JSON.stringify(existingData));
        
        // Console log for development
        console.log('Analytics:', analyticsData);
        
        // Here you can add code to send to your analytics service
        // Example: fetch('/api/analytics', { method: 'POST', body: JSON.stringify(analyticsData) })
    }
    
    static getAnalytics() {
        return JSON.parse(localStorage.getItem('loanCalculatorAnalytics') || '[]');
    }
}

class LoanCalculator {
    constructor() {
        this.form = document.getElementById('loanForm');
        this.resultsSection = document.getElementById('results');
        this.baseEMIElement = document.getElementById('baseEMI');
        
        this.initializeEventListeners();
        this.initializeTabs();
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateBaseEMI();
        });

        // Add real-time validation
        const inputs = this.form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateInput(input));
            input.addEventListener('input', () => this.clearError(input));
        });
    }

    initializeTabs() {
        const tabHeaders = document.querySelectorAll('.tab-header');
        tabHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const tabId = header.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    switchTab(activeTabId) {
        // Track tab switch
        Analytics.track('tab_switched', { tab: activeTabId });
        
        // Update tab headers
        document.querySelectorAll('.tab-header').forEach(header => {
            header.classList.remove('active');
        });
        document.querySelector(`[data-tab="${activeTabId}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(activeTabId).classList.add('active');
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        let isValid = true;
        let errorMessage = '';

        this.clearError(input);

        if (!input.value.trim()) {
            isValid = false;
            errorMessage = 'This field is required';
        } else if (isNaN(value) || value <= 0) {
            isValid = false;
            errorMessage = 'Please enter a valid positive number';
        } else {
            switch (input.id) {
                case 'principal':
                    if (value < 1000) {
                        isValid = false;
                        errorMessage = 'Principal amount should be at least ₹1,000';
                    }
                    break;
                case 'interestRate':
                    if (value > 50) {
                        isValid = false;
                        errorMessage = 'Interest rate seems too high (>50%)';
                    }
                    break;
                case 'tenure':
                    if (value > 360) {
                        isValid = false;
                        errorMessage = 'Tenure cannot exceed 360 months (30 years)';
                    } else if (!Number.isInteger(value)) {
                        isValid = false;
                        errorMessage = 'Tenure must be a whole number of months';
                    }
                    break;
            }
        }

        if (!isValid) {
            this.showError(input, errorMessage);
        }

        return isValid;
    }

    showError(input, message) {
        input.style.borderColor = '#dc3545';
        
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '0.8rem';
        errorDiv.style.marginTop = '5px';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
    }

    clearError(input) {
        input.style.borderColor = '#333';
        const errorMessage = input.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    getFormData() {
        const formData = new FormData(this.form);
        return {
            principal: parseFloat(formData.get('principal')) || 0,
            interestRate: parseFloat(formData.get('interestRate')) || 0,
            tenure: parseInt(formData.get('tenure')) || 0,
            emiStepUp: parseFloat(formData.get('emiStepUp')) || 5
        };
    }

    validateForm() {
        const requiredInputs = this.form.querySelectorAll('input[required]');
        let isValid = true;

        requiredInputs.forEach(input => {
            if (!this.validateInput(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    calculatePMT(principal, annualRate, months) {
        const monthlyRate = (annualRate / 12) / 100;
        
        if (monthlyRate === 0) {
            return principal / months;
        }

        const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, months);
        const denominator = Math.pow(1 + monthlyRate, months) - 1;
        
        return numerator / denominator;
    }

    calculateBaseEMI() {
        if (!this.validateForm()) {
            return;
        }

        const data = this.getFormData();
        
        // Track analytics
        Analytics.track('base_emi_calculated', {
            principal: data.principal,
            interestRate: data.interestRate,
            tenure: data.tenure
        });
        
        try {
            const baseEMI = this.calculatePMT(data.principal, data.interestRate, data.tenure);
            
            this.displayResults(baseEMI, data);
            
        } catch (error) {
            console.error('Calculation error:', error);
            Analytics.track('calculation_error', { error: error.message });
            alert('An error occurred during calculation. Please check your inputs and try again.');
        }
    }

    displayResults(baseEMI, inputData) {
        const formattedEMI = this.formatCurrency(baseEMI);
        
        this.baseEMIElement.textContent = formattedEMI;
        
        // Show results
        this.resultsSection.style.display = 'block';
        
        // Show strategy sections
        document.getElementById('strategyComparison').style.display = 'block';
        document.getElementById('strategyTabs').style.display = 'block';
        
        // Update comparison summary
        this.updateComparisonSummary(inputData, baseEMI);
        
        // Store data
        this.storeCalculationData({
            ...inputData,
            baseEMI: baseEMI,
            formattedBaseEMI: formattedEMI
        });

        // Scroll to comparison
        document.getElementById('strategyComparison').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    updateComparisonSummary(loanData, baseEMI) {
        const originalInterest = (baseEMI * loanData.tenure) - loanData.principal;
        
        document.getElementById('originalSummary').textContent = this.formatCurrency(originalInterest) + ' interest';
        document.getElementById('originalTenure').textContent = loanData.tenure + ' months';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    storeCalculationData(data) {
        localStorage.setItem('loanCalculatorData', JSON.stringify(data));
        window.loanData = data;
    }
}

// Strategy A: Extra EMI Calculator
class ExtraEMICalculator {
    constructor() {
        this.initializeStrategy();
    }

    initializeStrategy() {
        const calculateBtn = document.getElementById('calculateStrategy2');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateStrategy());
        }

        const showFirst12Btn = document.getElementById('showFirst12');
        const showAllBtn = document.getElementById('showAll');
        const exportBtn = document.getElementById('exportTable');

        if (showFirst12Btn) showFirst12Btn.addEventListener('click', () => this.showTableRows(12));
        if (showAllBtn) showAllBtn.addEventListener('click', () => this.showTableRows(-1));
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportToCSV());
    }

    calculateStrategy() {
        const loanData = JSON.parse(localStorage.getItem('loanCalculatorData'));
        if (!loanData) {
            alert('Please calculate Base EMI first!');
            return;
        }

        const extraPaymentMonth = parseInt(document.getElementById('extraPaymentMonth').value);
        
        // Track analytics
        Analytics.track('strategy_a_calculated', {
            extraPaymentMonth: extraPaymentMonth,
            principal: loanData.principal,
            interestRate: loanData.interestRate,
            tenure: loanData.tenure
        });
        
        const amortizationData = this.generateSchedule(loanData, extraPaymentMonth);
        
        this.displayResults(amortizationData, loanData);
    }

    generateSchedule(loanData, extraPaymentMonth) {
        const principal = loanData.principal;
        const monthlyRate = (loanData.interestRate / 12) / 100;
        const baseEMI = loanData.baseEMI;
        
        let schedule = [];
        let currentBalance = principal;
        let month = 1;
        let totalInterestPaid = 0;

        while (currentBalance > 0.01 && month <= 600) {
            const openingBalance = currentBalance;
            const interestPayment = openingBalance * monthlyRate;
            let principalPayment = baseEMI - interestPayment;
            
            if (principalPayment > openingBalance) {
                principalPayment = openingBalance;
            }

            const isExtraPaymentMonth = (month - extraPaymentMonth) % 12 === 0 && month >= extraPaymentMonth;
            const extraPrepay = isExtraPaymentMonth && currentBalance > baseEMI ? 
                Math.min(baseEMI, currentBalance - principalPayment) : 0;
            
            const effectiveEMI = baseEMI + extraPrepay;
            const totalPrincipalReduction = Math.min(principalPayment + extraPrepay, openingBalance);
            const closingBalance = Math.max(0, openingBalance - totalPrincipalReduction);

            schedule.push({
                month: month,
                openingBalance: openingBalance,
                scheduledEMI: baseEMI,
                interest: interestPayment,
                principal: principalPayment,
                extraPrepay: extraPrepay,
                effectiveEMI: effectiveEMI,
                closingBalance: closingBalance,
                isExtraMonth: extraPrepay > 0
            });

            totalInterestPaid += interestPayment;
            currentBalance = closingBalance;
            month++;

            if (currentBalance < 0.01) break;
        }

        return {
            schedule: schedule,
            totalMonths: schedule.length,
            totalInterestPaid: totalInterestPaid,
            monthsReduced: loanData.tenure - schedule.length
        };
    }

    displayResults(amortizationData, loanData) {
        const originalTotalInterest = (loanData.baseEMI * loanData.tenure) - loanData.principal;
        const interestSaved = originalTotalInterest - amortizationData.totalInterestPaid;

        document.getElementById('interestSaved').textContent = this.formatCurrency(interestSaved);
        document.getElementById('tenureReduced').textContent = `${amortizationData.monthsReduced} months`;

        // Update comparison summary
        document.getElementById('extraEmiSummary').textContent = this.formatCurrency(interestSaved) + ' saved';
        document.getElementById('extraEmiTenure').textContent = `${amortizationData.monthsReduced} months saved`;

        this.generateTable(amortizationData.schedule);
        document.getElementById('strategy2Results').style.display = 'block';
        
        localStorage.setItem('strategy2Data', JSON.stringify({
            ...amortizationData,
            interestSaved: interestSaved
        }));
    }

    generateTable(schedule) {
        const tbody = document.getElementById('amortizationBody');
        tbody.innerHTML = '';

        schedule.forEach((row) => {
            const tr = document.createElement('tr');
            tr.className = 'amortization-row';
            
            if (row.isExtraMonth) {
                tr.classList.add('extra-payment-row');
            }

            tr.innerHTML = `
                <td class="month-cell">${row.month}</td>
                <td class="currency-cell">${this.formatCurrency(row.openingBalance)}</td>
                <td class="currency-cell">${this.formatCurrency(row.scheduledEMI)}</td>
                <td class="currency-cell">${this.formatCurrency(row.interest)}</td>
                <td class="currency-cell">${this.formatCurrency(row.principal)}</td>
                <td class="currency-cell ${row.isExtraMonth ? 'extra-prepay-highlight' : ''}">${this.formatCurrency(row.extraPrepay)}</td>
                <td class="currency-cell">${this.formatCurrency(row.closingBalance)}</td>
            `;

            tbody.appendChild(tr);
        });

        this.showTableRows(12);
    }

    showTableRows(count) {
        const rows = document.querySelectorAll('#amortizationBody .amortization-row');
        const buttons = document.querySelectorAll('#strategyA .table-control-btn');
        
        buttons.forEach(btn => btn.classList.remove('active'));
        if (count === 12) {
            document.getElementById('showFirst12').classList.add('active');
        } else {
            document.getElementById('showAll').classList.add('active');
        }

        rows.forEach((row, index) => {
            if (count === -1 || index < count) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    exportToCSV() {
        // CSV export functionality
        const table = document.getElementById('amortizationTable');
        const rows = table.querySelectorAll('tr');
        let csvContent = '';

        rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            const rowData = Array.from(cells).map(cell => {
                return '"' + cell.textContent.replace(/"/g, '""') + '"';
            });
            csvContent += rowData.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extra_emi_schedule.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// Strategy B: Step-up EMI Calculator
class StepUpCalculator {
    constructor() {
        this.initializeStrategy();
    }

    initializeStrategy() {
        const calculateBtn = document.getElementById('calculateStrategy3');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateStrategy());
        }

        const showFirst12Btn = document.getElementById('showFirst12Step');
        const showFirst24Btn = document.getElementById('showFirst24Step');
        const showAllBtn = document.getElementById('showAllStep');

        if (showFirst12Btn) showFirst12Btn.addEventListener('click', () => this.showTableRows(12));
        if (showFirst24Btn) showFirst24Btn.addEventListener('click', () => this.showTableRows(24));
        if (showAllBtn) showAllBtn.addEventListener('click', () => this.showTableRows(-1));
    }

    calculateStrategy() {
        const loanData = JSON.parse(localStorage.getItem('loanCalculatorData'));
        if (!loanData) {
            alert('Please calculate Base EMI first!');
            return;
        }

        const stepUpPercentage = parseFloat(document.getElementById('stepUpPercentage').value) || 5;
        const stepUpStartYear = parseInt(document.getElementById('stepUpStartYear').value) || 2;
        
        const stepUpData = this.generateSchedule(loanData, stepUpPercentage, stepUpStartYear);
        this.displayResults(stepUpData, loanData);
    }

    generateSchedule(loanData, stepUpPercentage, stepUpStartYear) {
        const principal = loanData.principal;
        const monthlyRate = (loanData.interestRate / 12) / 100;
        const baseEMI = loanData.baseEMI;
        const stepUpMultiplier = stepUpPercentage / 100;
        
        let schedule = [];
        let currentBalance = principal;
        let month = 1;
        let totalInterestPaid = 0;
        let currentEMI = baseEMI;

        while (currentBalance > 0.01 && month <= 600) {
            const openingBalance = currentBalance;
            const currentYear = Math.ceil(month / 12);
            
            if (currentYear >= stepUpStartYear) {
                const yearsOfStepUp = currentYear - stepUpStartYear + 1;
                currentEMI = baseEMI * Math.pow(1 + stepUpMultiplier, yearsOfStepUp);
            } else {
                currentEMI = baseEMI;
            }
            
            const interestPayment = openingBalance * monthlyRate;
            let principalPayment = currentEMI - interestPayment;
            
            if (principalPayment > openingBalance) {
                principalPayment = openingBalance;
                currentEMI = interestPayment + principalPayment;
            }

            const closingBalance = Math.max(0, openingBalance - principalPayment);
            const isStepUpMonth = month % 12 === 1 && currentYear >= stepUpStartYear && month > 1;

            schedule.push({
                month: month,
                year: currentYear,
                openingBalance: openingBalance,
                scheduledEMI: currentEMI,
                interest: interestPayment,
                principal: principalPayment,
                closingBalance: closingBalance,
                isStepUpMonth: isStepUpMonth
            });

            totalInterestPaid += interestPayment;
            currentBalance = closingBalance;
            month++;

            if (currentBalance < 0.01) break;
        }

        return {
            schedule: schedule,
            totalMonths: schedule.length,
            totalInterestPaid: totalInterestPaid,
            monthsReduced: loanData.tenure - schedule.length,
            finalEMI: currentEMI
        };
    }

    displayResults(stepUpData, loanData) {
        const originalTotalInterest = (loanData.baseEMI * loanData.tenure) - loanData.principal;
        const interestSaved = originalTotalInterest - stepUpData.totalInterestPaid;

        document.getElementById('stepUpInterestSaved').textContent = this.formatCurrency(interestSaved);
        document.getElementById('stepUpTenureReduced').textContent = `${stepUpData.monthsReduced} months`;
        document.getElementById('finalEMIAmount').textContent = this.formatCurrency(stepUpData.finalEMI);

        // Update comparison summary
        document.getElementById('stepUpSummary').textContent = this.formatCurrency(interestSaved) + ' saved';
        document.getElementById('stepUpTenureSummary').textContent = `${stepUpData.monthsReduced} months saved`;

        this.generateTable(stepUpData.schedule);
        document.getElementById('strategy3Results').style.display = 'block';
        
        localStorage.setItem('strategy3Data', JSON.stringify({
            ...stepUpData,
            interestSaved: interestSaved
        }));
    }

    generateTable(schedule) {
        const tbody = document.getElementById('stepUpAmortizationBody');
        tbody.innerHTML = '';

        schedule.forEach((row) => {
            const tr = document.createElement('tr');
            tr.className = 'amortization-row';
            
            if (row.isStepUpMonth) {
                tr.classList.add('step-up-row');
            }

            tr.innerHTML = `
                <td class="month-cell">${row.month}</td>
                <td class="month-cell">${row.year}</td>
                <td class="currency-cell">${this.formatCurrency(row.openingBalance)}</td>
                <td class="currency-cell ${row.isStepUpMonth ? 'step-up-highlight' : ''}">${this.formatCurrency(row.scheduledEMI)}</td>
                <td class="currency-cell">${this.formatCurrency(row.interest)}</td>
                <td class="currency-cell">${this.formatCurrency(row.principal)}</td>
                <td class="currency-cell">${this.formatCurrency(row.closingBalance)}</td>
            `;

            tbody.appendChild(tr);
        });

        this.showTableRows(12);
    }

    showTableRows(count) {
        const rows = document.querySelectorAll('#stepUpAmortizationBody .amortization-row');
        const buttons = document.querySelectorAll('#strategyB .table-control-btn');
        
        buttons.forEach(btn => btn.classList.remove('active'));
        if (count === 12) {
            document.getElementById('showFirst12Step').classList.add('active');
        } else if (count === 24) {
            document.getElementById('showFirst24Step').classList.add('active');
        } else {
            document.getElementById('showAllStep').classList.add('active');
        }

        rows.forEach((row, index) => {
            if (count === -1 || index < count) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// Strategy C: Lump-sum Calculator
class LumpsumCalculator {
    constructor() {
        this.lumpsumPayments = [
            { month: 6, amount: 100000 },
            { month: 18, amount: 100000 }
        ];
        this.initializeStrategy();
        this.updateLumpsumDisplay();
    }

    initializeStrategy() {
        const calculateBtn = document.getElementById('calculateStrategy4');
        const addLumpsumBtn = document.getElementById('addLumpsum');
        
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateStrategy());
        }
        
        if (addLumpsumBtn) {
            addLumpsumBtn.addEventListener('click', () => this.addLumpsumPayment());
        }

        const quickAddBtns = document.querySelectorAll('.quick-add-btn');
        quickAddBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseInt(e.target.dataset.amount);
                this.quickAddLumpsum(amount);
            });
        });

        const showFirst12Btn = document.getElementById('showFirst12Lump');
        const showPaymentMonthsBtn = document.getElementById('showPaymentMonths');
        const showAllBtn = document.getElementById('showAllLump');

        if (showFirst12Btn) showFirst12Btn.addEventListener('click', () => this.showTableRows(12));
        if (showPaymentMonthsBtn) showPaymentMonthsBtn.addEventListener('click', () => this.showTableRows('payments'));
        if (showAllBtn) showAllBtn.addEventListener('click', () => this.showTableRows(-1));
    }

    addLumpsumPayment() {
        const month = parseInt(document.getElementById('lumpsumMonth').value);
        const amount = parseInt(document.getElementById('lumpsumAmount').value);

        if (!month || !amount || month < 1 || amount < 1000) {
            alert('Please enter valid month (1+) and amount (₹1000+)');
            return;
        }

        const existingIndex = this.lumpsumPayments.findIndex(p => p.month === month);
        if (existingIndex >= 0) {
            this.lumpsumPayments[existingIndex].amount += amount;
        } else {
            this.lumpsumPayments.push({ month, amount });
        }

        this.lumpsumPayments.sort((a, b) => a.month - b.month);
        this.updateLumpsumDisplay();
        
        document.getElementById('lumpsumMonth').value = '';
        document.getElementById('lumpsumAmount').value = '';
    }

    quickAddLumpsum(amount) {
        const month = parseInt(document.getElementById('lumpsumMonth').value) || 6;
        
        const existingIndex = this.lumpsumPayments.findIndex(p => p.month === month);
        if (existingIndex >= 0) {
            this.lumpsumPayments[existingIndex].amount += amount;
        } else {
            this.lumpsumPayments.push({ month, amount });
        }

        this.lumpsumPayments.sort((a, b) => a.month - b.month);
        this.updateLumpsumDisplay();
    }

    removeLumpsumPayment(month) {
        this.lumpsumPayments = this.lumpsumPayments.filter(p => p.month !== month);
        this.updateLumpsumDisplay();
    }

    updateLumpsumDisplay() {
        const container = document.getElementById('lumpsumItems');
        container.innerHTML = '';

        if (this.lumpsumPayments.length === 0) {
            container.innerHTML = '<p style="color: #6c757d; text-align: center; padding: 10px;">No payments added yet.</p>';
            return;
        }

        this.lumpsumPayments.forEach(payment => {
            const item = document.createElement('div');
            item.className = 'lumpsum-item';
            item.innerHTML = `
                <span class="payment-details">
                    Month ${payment.month}: ${this.formatCurrency(payment.amount)}
                </span>
                <button class="remove-btn" onclick="window.lumpsumCalc.removeLumpsumPayment(${payment.month})">
                    ✕
                </button>
            `;
            container.appendChild(item);
        });
    }

    calculateStrategy() {
        const loanData = JSON.parse(localStorage.getItem('loanCalculatorData'));
        if (!loanData) {
            alert('Please calculate Base EMI first!');
            return;
        }

        if (this.lumpsumPayments.length === 0) {
            alert('Please add at least one lump-sum payment!');
            return;
        }
        
        const lumpsumData = this.generateSchedule(loanData, this.lumpsumPayments);
        this.displayResults(lumpsumData, loanData);
    }

    generateSchedule(loanData, lumpsumPayments) {
        const principal = loanData.principal;
        const monthlyRate = (loanData.interestRate / 12) / 100;
        const baseEMI = loanData.baseEMI;
        
        const paymentMap = {};
        lumpsumPayments.forEach(payment => {
            paymentMap[payment.month] = payment.amount;
        });
        
        let schedule = [];
        let currentBalance = principal;
        let month = 1;
        let totalInterestPaid = 0;
        let totalLumpsumPaid = 0;

        while (currentBalance > 0.01 && month <= 600) {
            const openingBalance = currentBalance;
            const interestPayment = openingBalance * monthlyRate;
            let principalPayment = baseEMI - interestPayment;
            
            if (principalPayment > openingBalance) {
                principalPayment = openingBalance;
            }

            const extraPrepay = paymentMap[month] || 0;
            let adjustedExtra = extraPrepay;
            
            if (principalPayment + extraPrepay > openingBalance) {
                adjustedExtra = Math.max(0, openingBalance - principalPayment);
            }
            
            const closingBalance = Math.max(0, openingBalance - principalPayment - adjustedExtra);

            schedule.push({
                month: month,
                openingBalance: openingBalance,
                scheduledEMI: baseEMI,
                interest: interestPayment,
                principal: principalPayment,
                extraPrepay: adjustedExtra,
                closingBalance: closingBalance,
                isLumpsumMonth: adjustedExtra > 0
            });

            totalInterestPaid += interestPayment;
            totalLumpsumPaid += adjustedExtra;
            currentBalance = closingBalance;
            month++;

            if (currentBalance < 0.01) break;
        }

        return {
            schedule: schedule,
            totalMonths: schedule.length,
            totalInterestPaid: totalInterestPaid,
            totalLumpsumPaid: totalLumpsumPaid,
            monthsReduced: loanData.tenure - schedule.length
        };
    }

    displayResults(lumpsumData, loanData) {
        const originalTotalInterest = (loanData.baseEMI * loanData.tenure) - loanData.principal;
        const interestSaved = originalTotalInterest - lumpsumData.totalInterestPaid;
        const roi = ((interestSaved / lumpsumData.totalLumpsumPaid) * 100).toFixed(1);

        document.getElementById('lumpsumInterestSaved').textContent = this.formatCurrency(interestSaved);
        document.getElementById('lumpsumTenureReduced').textContent = `${lumpsumData.monthsReduced} months`;
        document.getElementById('prepaymentROI').textContent = `${roi}%`;

        // Update comparison summary
        document.getElementById('lumpSumSummary').textContent = this.formatCurrency(interestSaved) + ' saved';
        document.getElementById('lumpSumTenureSummary').textContent = `${lumpsumData.monthsReduced} months saved`;

        this.generateTable(lumpsumData.schedule);
        document.getElementById('strategy4Results').style.display = 'block';
        
        // Show final recommendation
        this.showFinalRecommendation(interestSaved, lumpsumData.monthsReduced);
        
        localStorage.setItem('strategy4Data', JSON.stringify({
            ...lumpsumData,
            interestSaved: interestSaved,
            roi: parseFloat(roi)
        }));
    }

    generateTable(schedule) {
        const tbody = document.getElementById('lumpsumAmortizationBody');
        tbody.innerHTML = '';

        schedule.forEach((row) => {
            const tr = document.createElement('tr');
            tr.className = 'amortization-row';
            
            if (row.isLumpsumMonth) {
                tr.classList.add('lumpsum-row');
            }

            tr.innerHTML = `
                <td class="month-cell">${row.month}</td>
                <td class="currency-cell">${this.formatCurrency(row.openingBalance)}</td>
                <td class="currency-cell">${this.formatCurrency(row.scheduledEMI)}</td>
                <td class="currency-cell">${this.formatCurrency(row.interest)}</td>
                <td class="currency-cell">${this.formatCurrency(row.principal)}</td>
                <td class="currency-cell ${row.isLumpsumMonth ? 'lumpsum-highlight' : ''}">${this.formatCurrency(row.extraPrepay)}</td>
                <td class="currency-cell">${this.formatCurrency(row.closingBalance)}</td>
            `;

            tbody.appendChild(tr);
        });

        this.showTableRows(12);
    }

    showTableRows(count) {
        const rows = document.querySelectorAll('#lumpsumAmortizationBody .amortization-row');
        const buttons = document.querySelectorAll('#strategyC .table-control-btn');
        
        buttons.forEach(btn => btn.classList.remove('active'));
        
        if (count === 12) {
            document.getElementById('showFirst12Lump').classList.add('active');
        } else if (count === 'payments') {
            document.getElementById('showPaymentMonths').classList.add('active');
        } else {
            document.getElementById('showAllLump').classList.add('active');
        }

        rows.forEach((row, index) => {
            if (count === -1) {
                row.style.display = '';
            } else if (count === 'payments') {
                const hasLumpsum = row.classList.contains('lumpsum-row');
                const isEarlyMonth = index < 6;
                row.style.display = (hasLumpsum || isEarlyMonth) ? '' : 'none';
            } else if (index < count) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    showFinalRecommendation(interestSaved, monthsReduced) {
        const strategy2Data = JSON.parse(localStorage.getItem('strategy2Data') || '{}');
        const strategy3Data = JSON.parse(localStorage.getItem('strategy3Data') || '{}');
        
        let bestStrategy = 'Lump-sum Payments';
        let bestSavings = interestSaved;
        
        if (strategy2Data.interestSaved && strategy2Data.interestSaved > bestSavings) {
            bestStrategy = '1 EMI Extra/Year';
            bestSavings = strategy2Data.interestSaved;
        }
        
        if (strategy3Data.interestSaved && strategy3Data.interestSaved > bestSavings) {
            bestStrategy = 'EMI Step-up';
            bestSavings = strategy3Data.interestSaved;
        }

        const recommendationContent = `
            <div style="text-align: left;">
                <p><strong>🏆 Best Strategy:</strong> <span class="highlight">${bestStrategy}</span> saves ${this.formatCurrency(bestSavings)} in interest.</p>
                <br>
                <p><strong>💡 Smart Tips:</strong></p>
                <ul style="margin-left: 20px; color: #a0a3bd;">
                    <li><strong>Stable Income:</strong> Choose "1 EMI Extra/Year"</li>
                    <li><strong>Growing Income:</strong> Choose "EMI Step-up"</li>
                    <li><strong>Irregular Windfalls:</strong> Choose "Lump-sum Payments"</li>
                    <li><strong>Maximum Impact:</strong> Combine multiple strategies!</li>
                </ul>
            </div>
        `;

        document.getElementById('recommendationContent').innerHTML = recommendationContent;
        document.getElementById('finalRecommendation').style.display = 'block';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// Initialize all calculators
document.addEventListener('DOMContentLoaded', function() {
    const calculator = new LoanCalculator();
    const extraEMICalculator = new ExtraEMICalculator();
    const stepUpCalculator = new StepUpCalculator();
    const lumpsumCalculator = new LumpsumCalculator();
    
    // Make lumpsum calculator available globally for remove buttons
    window.lumpsumCalc = lumpsumCalculator;
    
    // Demo data
    if (window.location.search.includes('demo=true')) {
        document.getElementById('principal').value = '5000000';
        document.getElementById('interestRate').value = '8.5';
        document.getElementById('tenure').value = '240';
        document.getElementById('emiStepUp').value = '5';
    }
});
