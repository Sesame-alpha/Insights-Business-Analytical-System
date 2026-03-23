
# InsightFlow – Business Analytics & Decision Support System

A lightweight, fully client-side Business Analytics Dashboard that helps you track sales, calculate profits, visualize trends, and generate data‑driven insights—all without any server, database, or account setup.


Features

- **Transaction Management** – Add, edit, or delete sales records (date, product, sales amount, cost). Profit is calculated automatically.
- **Real‑time KPIs** – Total Sales, Total Profit, Average Margin, and a dynamic Sales Trend indicator (Strong Upward, Slight Upward, Stable, etc.).
- **Interactive Charts** – Combined bar (sales) and line (profit) chart powered by Chart.js. Grouped by date for clear trend visualization.
- **AI-style Insights** – Automatically analyzes your data to highlight:
  - Total profit and profitability margin
  - Top‑performing product
  - Number of profitable vs. loss-making transactions
  - Smart recommendations based on margin thresholds
- **CSV Import/Export** – Upload any CSV file with flexible column detection, or export your current data to CSV for external use.
- **LocalStorage Persistence** – All data is saved automatically in your browser. Close and reopen—everything remains.
- **Responsive Design** – Works seamlessly on desktops, tablets, and smartphones (Bootstrap 5 + custom CSS).
- **No Backend, No Installation** – Just open the HTML file in a modern browser and start using it immediately.

## 🛠️ Tech Stack

- **HTML5** – Structure and semantic markup
- **CSS3** – External custom styling (clean corporate look)
- **Bootstrap 5** – Responsive grid and components
- **JavaScript (ES6)** – Core logic, trend detection (linear regression), CSV parsing, LocalStorage
- **Chart.js** – Interactive sales & profit visualization
- **Font Awesome** – Icon set for better CSV

CCSV Format

When importing a CSV, the system automatically detects columns containing:

- **Date** – any column with "date" in the name  
- **Product** – any column with "product", "item", or "name"  
- **Sales** – any column with "sales" or "revenue"  
- **Cost** – any column with "cost" or "cogs"

All other columns are ignored. A sample CSV can be downloaded directly from the dashboard.

## 🔒 Data Privacy

All data stays **only in your browser’s LocalStorage**. No data is sent to any server. You are in full control.

## 📄 License

This project is open source and free to use for personal or commercial purposes.

Acknowledgements

- [Bootstrap](https://getbootstrap.com/)
- [Chart.js](https://www.chartjs.org/)
- [Font Awesome](https://fontawesome.com/)

Made with ❤️ for business analytics.
