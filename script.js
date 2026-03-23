// Wait for DOM and Chart.js to be ready
document.addEventListener('DOMContentLoaded', () => {
    // ---------- DATA MODEL ----------
    let transactions = [];       // each: { id, date, product, sales, cost, profit }
    let chartInstance = null;

    // Helper functions
    const formatCurrency = (val) => `$${val.toFixed(2)}`;
    const formatPercent = (val) => `${val.toFixed(1)}%`;
    const escapeHtml = (str) => str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });

    // Load from LocalStorage
    function loadFromStorage() {
        const stored = localStorage.getItem('insightflow_transactions');
        if (stored) {
            transactions = JSON.parse(stored);
        } else {
            // Default demo data – shows immediately when no data exists
            transactions = [
                { id: Date.now() + 1, date: '2025-02-01', product: 'Ergonomic Chair', sales: 450, cost: 280, profit: 170 },
                { id: Date.now() + 2, date: '2025-02-10', product: 'Standing Desk', sales: 890, cost: 510, profit: 380 },
                { id: Date.now() + 3, date: '2025-02-18', product: 'Monitor Arm', sales: 320, cost: 190, profit: 130 },
                { id: Date.now() + 4, date: '2025-03-01', product: 'Laptop Stand', sales: 275, cost: 140, profit: 135 },
                { id: Date.now() + 5, date: '2025-03-12', product: 'Wireless Mouse', sales: 125, cost: 60, profit: 65 }
            ];
        }
        renderAll();
    }

    function saveToStorage() {
        localStorage.setItem('insightflow_transactions', JSON.stringify(transactions));
    }

    // Update all UI components
    function renderAll() {
        updateStatsAndTrend();
        updateTable();
        updateChart();
        generateInsights();
        saveToStorage();
        document.getElementById('recordCount').innerText = transactions.length + ' records';
    }

    // KPI and trend detection
    function updateStatsAndTrend() {
        if (transactions.length === 0) {
            document.getElementById('totalSales').innerText = formatCurrency(0);
            document.getElementById('totalProfit').innerText = formatCurrency(0);
            document.getElementById('avgMargin').innerText = formatPercent(0);
            document.getElementById('trendBadge').innerHTML = '<span class="badge bg-secondary">No data</span>';
            return;
        }
        let totalSales = 0, totalProfit = 0, totalMarginSum = 0;
        transactions.forEach(t => {
            totalSales += t.sales;
            totalProfit += t.profit;
            totalMarginSum += (t.sales > 0 ? (t.profit / t.sales) * 100 : 0);
        });
        const avgMargin = transactions.length ? totalMarginSum / transactions.length : 0;
        document.getElementById('totalSales').innerText = formatCurrency(totalSales);
        document.getElementById('totalProfit').innerText = formatCurrency(totalProfit);
        document.getElementById('avgMargin').innerText = formatPercent(avgMargin);

        // Trend detection: linear regression on sales by date order
        const sorted = [...transactions].sort((a,b) => new Date(a.date) - new Date(b.date));
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

    // Render transaction table
    function updateTable() {
        const tbody = document.getElementById('tableBody');
        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No data yet. Add a transaction or import CSV/Excel.</td></tr>';
            return;
        }
        let html = '';
        transactions.forEach(t => {
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
        // Attach edit/delete events
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                editTransaction(id);
            });
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                deleteTransaction(id);
            });
        });
    }

    // Chart.js update
    function updateChart() {
        const ctx = document.getElementById('businessChart').getContext('2d');
        const dateMap = new Map();
        transactions.forEach(t => {
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
                        label: 'Sales ($)',
                        data: salesData,
                        backgroundColor: 'rgba(44, 110, 143, 0.7)',
                        borderRadius: 8,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Profit ($)',
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
                    y: { beginAtZero: true, title: { display: true, text: 'Amount ($)' } }
                }
            }
        });
    }

    // Generate insights
    function generateInsights() {
        const insightsDiv = document.getElementById('insightsPanel');
        if (transactions.length === 0) {
            insightsDiv.innerHTML = '<div class="alert alert-secondary">No transactions to analyze. Add data for smart insights.</div>';
            return;
        }
        let totalSales = 0, totalProfit = 0, totalMargin = 0;
        transactions.forEach(t => {
            totalSales += t.sales;
            totalProfit += t.profit;
            totalMargin += (t.sales > 0 ? (t.profit / t.sales) * 100 : 0);
        });
        const avgMargin = totalMargin / transactions.length;
        const profitableTransactions = transactions.filter(t => t.profit > 0).length;
        const lossTransactions = transactions.filter(t => t.profit <= 0).length;
        
        let topProduct = null, maxProfit = -Infinity;
        transactions.forEach(t => {
            if (t.profit > maxProfit) { maxProfit = t.profit; topProduct = t.product; }
        });
        let insightsHtml = `<ul class="list-unstyled mb-0">
            <li class="mb-2"><i class="fas fa-chart-line text-primary me-2"></i> <strong>Profitability:</strong> Total profit <strong>${formatCurrency(totalProfit)}</strong> on ${formatCurrency(totalSales)} sales.</li>
            <li class="mb-2"><i class="fas fa-percent text-info me-2"></i> <strong>Avg Margin:</strong> ${formatPercent(avgMargin)} – ${avgMargin > 25 ? 'Excellent' : avgMargin > 10 ? 'Healthy' : 'Needs improvement'}.</li>
            <li class="mb-2"><i class="fas fa-star text-warning me-2"></i> <strong>Top Performer:</strong> "${escapeHtml(topProduct)}" with profit ${formatCurrency(maxProfit)}.</li>
            <li class="mb-2"><i class="fas fa-chart-simple me-2"></i> <strong>Transactions:</strong> ${profitableTransactions} profitable, ${lossTransactions} with loss.</li>`;
        if (transactions.length >= 3) {
            insightsHtml += `<li class="mb-2"><i class="fas fa-trend-up me-2"></i> <strong>Recommendation:</strong> Based on recent data, focus on high-margin products and monitor cost structure.</li>`;
        } else {
            insightsHtml += `<li class="mb-2"><i class="fas fa-database me-2"></i> Add more records to unlock trend predictions.</li>`;
        }
        insightsHtml += `</ul>`;
        insightsDiv.innerHTML = insightsHtml;
    }

    // CRUD operations
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
            if (idx !== -1) {
                transactions[idx] = { ...transactions[idx], date, product, sales, cost, profit };
            }
        } else {
            const newId = Date.now();
            transactions.push({ id: newId, date, product, sales, cost, profit });
        }
        resetForm();
        renderAll();
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
            renderAll();
        }
    }

    function resetForm() {
        document.getElementById('editId').value = '';
        document.getElementById('transactionForm').reset();
    }

    // Flexible CSV import
    function importCSV(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const rows = text.split(/\r?\n/).filter(r => r.trim().length > 0);
            if (rows.length < 2) { alert("CSV must have header row and data."); return; }
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
            // Detect column indices by keywords
            const dateIdx = headers.findIndex(h => h.includes('date'));
            const productIdx = headers.findIndex(h => h.includes('product') || h.includes('item') || h.includes('name') || h.includes('description'));
            const salesIdx = headers.findIndex(h => h.includes('sales') || h.includes('revenue') || h.includes('amount'));
            const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('cogs') || h.includes('expense'));
            if (dateIdx === -1 || productIdx === -1 || salesIdx === -1 || costIdx === -1) {
                alert("Could not detect required columns. Make sure your file contains columns like: Date, Product, Sales, Cost.");
                return;
            }
            let imported = [];
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(',').map(c => c.trim());
                if (cols.length < 4) continue;
                const date = cols[dateIdx];
                const product = cols[productIdx];
                const sales = parseFloat(cols[salesIdx]);
                const cost = parseFloat(cols[costIdx]);
                if (date && product && !isNaN(sales) && !isNaN(cost)) {
                    const profit = sales - cost;
                    imported.push({ id: Date.now() + i + Math.random(), date, product, sales, cost, profit });
                }
            }
            if (imported.length) {
                transactions.push(...imported);
                renderAll();
                alert(`Successfully imported ${imported.length} records.`);
            } else {
                alert("No valid records found in CSV.");
            }
        };
        reader.readAsText(file);
    }

    // Excel import using SheetJS
    function importExcel(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
            if (!rows || rows.length < 2) { alert("Excel file has no data rows."); return; }
            const headers = rows[0].map(h => String(h).trim().toLowerCase());
            // Detect columns by keywords
            const dateIdx = headers.findIndex(h => h.includes('date'));
            const productIdx = headers.findIndex(h => h.includes('product') || h.includes('item') || h.includes('name') || h.includes('description'));
            const salesIdx = headers.findIndex(h => h.includes('sales') || h.includes('revenue') || h.includes('amount'));
            const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('cogs') || h.includes('expense'));
            if (dateIdx === -1 || productIdx === -1 || salesIdx === -1 || costIdx === -1) {
                alert("Could not detect required columns. Make sure your Excel file contains columns like: Date, Product, Sales, Cost.");
                return;
            }
            let imported = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 4) continue;
                const date = row[dateIdx] ? String(row[dateIdx]).trim() : "";
                const product = row[productIdx] ? String(row[productIdx]).trim() : "";
                const sales = parseFloat(row[salesIdx]);
                const cost = parseFloat(row[costIdx]);
                if (date && product && !isNaN(sales) && !isNaN(cost)) {
                    const profit = sales - cost;
                    imported.push({ id: Date.now() + i + Math.random(), date, product, sales, cost, profit });
                }
            }
            if (imported.length) {
                transactions.push(...imported);
                renderAll();
                alert(`Successfully imported ${imported.length} records.`);
            } else {
                alert("No valid records found in Excel file.");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // Export CSV
    function exportCSV() {
        if (transactions.length === 0) { alert("No data to export."); return; }
        const headers = ["Date", "Product", "Sales", "Cost", "Profit"];
        const rows = transactions.map(t => [t.date, t.product, t.sales, t.cost, t.profit]);
        const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `insightflow_export_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function clearAllData() {
        if (confirm("⚠️ This will delete ALL transactions. This action cannot be undone. Continue?")) {
            transactions = [];
            resetForm();
            renderAll();
        }
    }

    function downloadSampleCSV() {
        const sample = [["Date","Product","Sales","Cost"],["2025-04-01","Wireless Keyboard",89.99,45.00],["2025-04-05","USB Hub",35.50,20.00]];
        const csv = sample.map(row => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "sample_business_data.csv";
        link.click();
        URL.revokeObjectURL(link.href);
    }

    // Attach event listeners
    document.getElementById('transactionForm').addEventListener('submit', addOrUpdateTransaction);
    document.getElementById('cancelEditBtn').addEventListener('click', resetForm);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
    document.getElementById('clearStorageBtn').addEventListener('click', clearAllData);
    document.getElementById('csvUpload').addEventListener('change', (e) => { if(e.target.files.length) importCSV(e.target.files[0]); e.target.value=''; });
    document.getElementById('excelUpload').addEventListener('change', (e) => { if(e.target.files.length) importExcel(e.target.files[0]); e.target.value=''; });
    document.getElementById('sampleCsvLink').addEventListener('click', (e) => { e.preventDefault(); downloadSampleCSV(); });

    // Initialize
    loadFromStorage();
});
