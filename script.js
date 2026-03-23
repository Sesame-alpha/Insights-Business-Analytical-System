document.addEventListener('DOMContentLoaded', () => {
    // ---------- DATA ----------
    let transactions = [];           // master data
    let filteredTransactions = [];    // filtered by date range
    let chartInstance = null;
    let currentCurrency = '$';
    let customCurrencySymbol = '';
    let startDateFilter = '';
    let endDateFilter = '';

    // Helper functions
    const formatCurrency = (val) => {
        const symbol = customCurrencySymbol || currentCurrency;
        return `${symbol}${val.toFixed(2)}`;
    };
    const formatPercent = (val) => `${val.toFixed(1)}%`;
    const escapeHtml = (str) => str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });

    // Detect currency from string (supports any Unicode symbol at start or end)
    function detectCurrencyFromValue(value) {
        if (typeof value !== 'string') return null;
        // Try to find a currency symbol at the beginning or end
        const match = value.match(/^([€£¥₹₽₩₺R$C\$A\$USD$€£¥₹₽₩₺R$C\$A\$])(?:\s*)(\d[\d,.]*)/);
        if (match) return match[1];
        // Common symbols not captured by above (like ₿)
        const customMatch = value.match(/^([^0-9\s.,]+)(?:\s*)(\d)/);
        if (customMatch) return customMatch[1];
        return null;
    }

    // Update input group symbols
    function updateInputSymbols() {
        const symbol = customCurrencySymbol || currentCurrency;
        const salesSpan = document.getElementById('salesCurrencySymbol');
        const costSpan = document.getElementById('costCurrencySymbol');
        if (salesSpan) salesSpan.innerText = symbol;
        if (costSpan) costSpan.innerText = symbol;
    }

    // Load data from localStorage
    function loadFromStorage() {
        const stored = localStorage.getItem('insightflow_transactions');
        if (stored) {
            transactions = JSON.parse(stored);
        } else {
            // Default demo data
            transactions = [
                { id: Date.now() + 1, date: '2025-02-01', product: 'Ergonomic Chair', sales: 450, cost: 280, profit: 170 },
                { id: Date.now() + 2, date: '2025-02-10', product: 'Standing Desk', sales: 890, cost: 510, profit: 380 },
                { id: Date.now() + 3, date: '2025-02-18', product: 'Monitor Arm', sales: 320, cost: 190, profit: 130 },
                { id: Date.now() + 4, date: '2025-03-01', product: 'Laptop Stand', sales: 275, cost: 140, profit: 135 },
                { id: Date.now() + 5, date: '2025-03-12', product: 'Wireless Mouse', sales: 125, cost: 60, profit: 65 }
            ];
        }
        // Load currency preference
        const storedCurrency = localStorage.getItem('insightflow_currency');
        if (storedCurrency) {
            if (storedCurrency === 'custom') {
                currentCurrency = '';
                customCurrencySymbol = localStorage.getItem('insightflow_custom_currency') || '$';
                document.getElementById('currencySelector').value = 'custom';
                document.getElementById('customCurrency').style.display = 'block';
                document.getElementById('customCurrency').value = customCurrencySymbol;
            } else {
                currentCurrency = storedCurrency;
                document.getElementById('currencySelector').value = storedCurrency;
                document.getElementById('customCurrency').style.display = 'none';
            }
        }
        // Load filters
        const storedStart = localStorage.getItem('insightflow_filter_start');
        const storedEnd = localStorage.getItem('insightflow_filter_end');
        if (storedStart) startDateFilter = storedStart;
        if (storedEnd) endDateFilter = storedEnd;
        document.getElementById('filterStartDate').value = startDateFilter;
        document.getElementById('filterEndDate').value = endDateFilter;

        updateInputSymbols();
        applyFilter();
    }

    function saveToStorage() {
        localStorage.setItem('insightflow_transactions', JSON.stringify(transactions));
        localStorage.setItem('insightflow_currency', currentCurrency || 'custom');
        if (currentCurrency === 'custom') {
            localStorage.setItem('insightflow_custom_currency', customCurrencySymbol);
        }
        localStorage.setItem('insightflow_filter_start', startDateFilter);
        localStorage.setItem('insightflow_filter_end', endDateFilter);
    }

    // Filter transactions by date range
    function applyFilter() {
        let filtered = [...transactions];
        if (startDateFilter) {
            filtered = filtered.filter(t => t.date >= startDateFilter);
        }
        if (endDateFilter) {
            filtered = filtered.filter(t => t.date <= endDateFilter);
        }
        filteredTransactions = filtered;
        renderAll();
    }

    // Main render function
    function renderAll() {
        updateStatsAndTrend();
        updateTable();
        updateChart();
        generateInsights();
        generateSummary();
        saveToStorage();
        document.getElementById('recordCount').innerText = filteredTransactions.length + ' records';
    }

    // KPI and trend using filtered data
    function updateStatsAndTrend() {
        if (filteredTransactions.length === 0) {
            document.getElementById('totalSales').innerText = formatCurrency(0);
            document.getElementById('totalProfit').innerText = formatCurrency(0);
            document.getElementById('avgMargin').innerText = formatPercent(0);
            document.getElementById('trendBadge').innerHTML = '<span class="badge bg-secondary">No data</span>';
            return;
        }
        let totalSales = 0, totalProfit = 0, totalMarginSum = 0;
        filteredTransactions.forEach(t => {
            totalSales += t.sales;
            totalProfit += t.profit;
            totalMarginSum += (t.sales > 0 ? (t.profit / t.sales) * 100 : 0);
        });
        const avgMargin = filteredTransactions.length ? totalMarginSum / filteredTransactions.length : 0;
        document.getElementById('totalSales').innerText = formatCurrency(totalSales);
        document.getElementById('totalProfit').innerText = formatCurrency(totalProfit);
        document.getElementById('avgMargin').innerText = formatPercent(avgMargin);

        // Trend detection on filtered data
        const sorted = [...filteredTransactions].sort((a,b) => new Date(a.date) - new Date(b.date));
        if (sorted.length < 2) {
            document.getElementById('trendBadge').innerHTML = '<span class="badge bg-info">Insufficient data</span>';
            return;
        }
        const n = sorted.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            let x = i;
            let y = sorted[i].sales;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }
        const denominator = (n * sumX2 - sumX * sumX);
        let slope = 0;
        if (denominator !== 0) slope = (n * sumXY - sumX * sumY) / denominator;
        
        let trendHtml = '';
        if (slope > 5) trendHtml = '<span class="badge bg-success"><i class="fas fa-arrow-up"></i> Strong Upward</span>';
        else if (slope > 0.5) trendHtml = '<span class="badge bg-info"><i class="fas fa-chart-line"></i> Slight Upward</span>';
        else if (slope < -5) trendHtml = '<span class="badge bg-danger"><i class="fas fa-arrow-down"></i> Strong Downward</span>';
        else if (slope < -0.5) trendHtml = '<span class="badge bg-warning text-dark"><i class="fas fa-arrow-down"></i> Slight Downward</span>';
        else trendHtml = '<span class="badge bg-secondary"><i class="fas fa-minus"></i> Stable</span>';
        document.getElementById('trendBadge').innerHTML = trendHtml;
    }

    // Table render using filtered data
    function updateTable() {
        const tbody = document.getElementById('tableBody');
        if (filteredTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No data in selected range. Add transactions or adjust filters.</td></tr>';
            return;
        }
        let html = '';
        filteredTransactions.forEach(t => {
            html += `<tr>
                        <td>${t.date}</td>
                        <td>${escapeHtml(t.product)}</td>
                        <td>${formatCurrency(t.sales)}</td>
                        <td>${formatCurrency(t.cost)}</td>
                        <td class="fw-semibold text-success">${formatCurrency(t.profit)}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-btn me-1" data-id="${t.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${t.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
        });
        tbody.innerHTML = html;
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editTransaction(parseInt(btn.dataset.id)));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteTransaction(parseInt(btn.dataset.id)));
        });
    }

    // Chart using filtered data
    function updateChart() {
        const ctx = document.getElementById('businessChart').getContext('2d');
        const dateMap = new Map();
        filteredTransactions.forEach(t => {
            const date = t.date;
            if (!dateMap.has(date)) {
                dateMap.set(date, { sales: 0, profit: 0 });
            }
            const entry = dateMap.get(date);
            entry.sales += t.sales;
            entry.profit += t.profit;
        });
        const sortedDates = Array.from(dateMap.keys()).sort((a,b) => new Date(a) - new Date(b));
        const salesData = sortedDates.map(d => dateMap.get(d).sales);
        const profitData = sortedDates.map(d => dateMap.get(d).profit);
        
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedDates,
                datasets: [
                    {
                        label: `Sales (${customCurrencySymbol || currentCurrency})`,
                        data: salesData,
                        backgroundColor: 'rgba(44, 110, 143, 0.7)',
                        borderRadius: 8,
                        yAxisID: 'y'
                    },
                    {
                        label: `Profit (${customCurrencySymbol || currentCurrency})`,
                        data: profitData,
                        type: 'line',
                        borderColor: '#2c7a4d',
                        backgroundColor: 'rgba(44, 122, 77, 0.1)',
                        borderWidth: 3,
                        tension: 0.2,
                        fill: false,
                        pointRadius: 4,
                        pointBackgroundColor: '#2c7a4d',
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    tooltip: { mode: 'index', intersect: false },
                    legend: { position: 'top' }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: `Amount (${customCurrencySymbol || currentCurrency})` } }
                }
            }
        });
    }

    // Insights using filtered data
    function generateInsights() {
        const div = document.getElementById('insightsPanel');
        if (filteredTransactions.length === 0) {
            div.innerHTML = '<div class="alert alert-secondary">No data in selected range.</div>';
            return;
        }
        let totalSales = 0, totalProfit = 0, totalMargin = 0;
        filteredTransactions.forEach(t => {
            totalSales += t.sales;
            totalProfit += t.profit;
            totalMargin += (t.sales > 0 ? (t.profit / t.sales) * 100 : 0);
        });
        const avgMargin = totalMargin / filteredTransactions.length;
        const profitable = filteredTransactions.filter(t => t.profit > 0).length;
        const loss = filteredTransactions.filter(t => t.profit <= 0).length;
        let topProduct = null, maxProfit = -Infinity;
        filteredTransactions.forEach(t => {
            if (t.profit > maxProfit) { maxProfit = t.profit; topProduct = t.product; }
        });
        let html = `<ul class="list-unstyled mb-0">
            <li class="mb-2"><i class="fas fa-chart-line text-primary me-2"></i> <strong>Profitability:</strong> Total profit <strong>${formatCurrency(totalProfit)}</strong> on ${formatCurrency(totalSales)} sales.</li>
            <li class="mb-2"><i class="fas fa-percent text-info me-2"></i> <strong>Avg Margin:</strong> ${formatPercent(avgMargin)} – ${avgMargin > 25 ? 'Excellent' : avgMargin > 10 ? 'Healthy' : 'Needs improvement'}.</li>
            <li class="mb-2"><i class="fas fa-star text-warning me-2"></i> <strong>Top Performer:</strong> "${escapeHtml(topProduct)}" with profit ${formatCurrency(maxProfit)}.</li>
            <li class="mb-2"><i class="fas fa-chart-simple me-2"></i> <strong>Transactions:</strong> ${profitable} profitable, ${loss} with loss.</li>`;
        if (filteredTransactions.length >= 3) {
            html += `<li class="mb-2"><i class="fas fa-trend-up me-2"></i> <strong>Recommendation:</strong> Focus on high-margin products.</li>`;
        } else {
            html += `<li class="mb-2"><i class="fas fa-database me-2"></i> Add more records for deeper insights.</li>`;
        }
        html += `</ul>`;
        div.innerHTML = html;
    }

    // Executive summary using filtered data
    function generateSummary() {
        const div = document.getElementById('summaryPanel');
        if (filteredTransactions.length === 0) {
            div.innerHTML = '<div class="alert alert-secondary">No data to summarize.</div>';
            return;
        }
        // Top 3 products by profit
        const products = [...filteredTransactions];
        const productProfit = {};
        products.forEach(p => {
            if (!productProfit[p.product]) productProfit[p.product] = 0;
            productProfit[p.product] += p.profit;
        });
        const sortedProducts = Object.entries(productProfit).sort((a,b) => b[1] - a[1]);
        const top3 = sortedProducts.slice(0,3);
        // Bottom 3 by profit
        const bottom3 = sortedProducts.slice(-3).reverse();
        // Average profit per transaction
        const avgProfit = products.reduce((sum, p) => sum + p.profit, 0) / products.length;

        let html = `<div class="row">
            <div class="col-md-4 mb-3">
                <div class="card h-100 border-0 bg-light">
                    <div class="card-body">
                        <h6 class="card-title"><i class="fas fa-chart-line me-1"></i> Key Metrics</h6>
                        <p class="mb-1">Total Records: <strong>${filteredTransactions.length}</strong></p>
                        <p class="mb-1">Avg Profit/Transaction: <strong>${formatCurrency(avgProfit)}</strong></p>
                        <p class="mb-1">Profit Margin: <strong>${formatPercent((products.reduce((s,p)=>s+p.profit,0) / products.reduce((s,p)=>s+p.sales,0))*100)}</strong></p>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card h-100 border-0 bg-light">
                    <div class="card-body">
                        <h6 class="card-title"><i class="fas fa-trophy me-1"></i> Top 3 Products (by Profit)</h6>
                        <ol class="small mb-0">
                            ${top3.map(([name, profit]) => `<li>${escapeHtml(name)}: ${formatCurrency(profit)}</li>`).join('')}
                        </ol>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card h-100 border-0 bg-light">
                    <div class="card-body">
                        <h6 class="card-title"><i class="fas fa-chart-simple me-1"></i> Bottom 3 Products (by Profit)</h6>
                        <ol class="small mb-0">
                            ${bottom3.map(([name, profit]) => `<li>${escapeHtml(name)}: ${formatCurrency(profit)}</li>`).join('')}
                        </ol>
                    </div>
                </div>
            </div>
        </div>`;
        div.innerHTML = html;
    }

    // CRUD operations (operate on master data, then reapply filter)
    function addOrUpdateTransaction(event) {
        event.preventDefault();
        const idField = document.getElementById('editId').value;
        const date = document.getElementById('transDate').value;
        const product = document.getElementById('productName').value.trim();
        const sales = parseFloat(document.getElementById('salesAmount').value);
        const cost = parseFloat(document.getElementById('costAmount').value);
        if (!date || !product || isNaN(sales) || isNaN(cost)) {
            alert("Please fill all fields correctly.");
            return;
        }
        const profit = sales - cost;
        if (idField) {
            const idx = transactions.findIndex(t => t.id == idField);
            if (idx !== -1) transactions[idx] = { ...transactions[idx], date, product, sales, cost, profit };
        } else {
            transactions.push({ id: Date.now(), date, product, sales, cost, profit });
        }
        resetForm();
        applyFilter(); // re-filter and render
    }

    function editTransaction(id) {
        const trans = transactions.find(t => t.id === id);
        if (trans) {
            document.getElementById('editId').value = trans.id;
            document.getElementById('transDate').value = trans.date;
            document.getElementById('productName').value = trans.product;
            document.getElementById('salesAmount').value = trans.sales;
            document.getElementById('costAmount').value = trans.cost;
        }
    }

    function deleteTransaction(id) {
        if (confirm('Delete this transaction permanently?')) {
            transactions = transactions.filter(t => t.id !== id);
            resetForm();
            applyFilter();
        }
    }

    function resetForm() {
        document.getElementById('editId').value = '';
        document.getElementById('transactionForm').reset();
    }

    // CSV Import with currency detection
    function importCSV(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
            if (rows.length < 2) { alert("CSV must have header row and data."); return; }
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
            const dateIdx = headers.findIndex(h => h.includes('date'));
            const productIdx = headers.findIndex(h => h.includes('product') || h.includes('item') || h.includes('name') || h.includes('description'));
            const salesIdx = headers.findIndex(h => h.includes('sales') || h.includes('revenue') || h.includes('amount'));
            const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('cogs') || h.includes('expense'));
            if (dateIdx === -1 || productIdx === -1 || salesIdx === -1 || costIdx === -1) {
                alert("Could not detect required columns. Columns must contain: Date, Product, Sales, Cost.");
                return;
            }
            let imported = [];
   
