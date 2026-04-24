# Eco-UI

Eco-UI is a local-first, privacy-focused web application for organizing your personal finances. Upload your bank's CSV exports, categorize your transactions, set up automation rules, and visualize your spending habits. All data is stored locally in your browser.

## Features

- **CSV Upload:** Easily import transaction data from your bank.
- **Smart Queue:** Process transactions one by one, skip them for later, or ignore them completely.
- **Advanced Splitting:** Split a single transaction across multiple categories.
- **Automation Rules:** Automatically categorize or ignore recurring transactions based on description matches (exact, contains, starts with, ends with) and optional amount ranges.
- **Dashboard Analytics:** View your total income, costs, net balance, and visualize your spending breakdown by month or week using interactive charts.
- **Transactions History:** Review, search, filter, and re-categorize previously processed transactions.
- **Data Portability:** Export your complete data (categories, transactions, rules) as a JSON backup, and import it on any device.

## Getting Started (Development)

This project is built with React, Vite, TypeScript, and Tailwind CSS.

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/esaiaswestberg/eco-ui.git
   cd eco-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## Docker Deployment

Eco-UI provides a pre-built Docker image hosted on GitHub Container Registry (GHCR) that serves the optimized static application via Nginx.

### Running with Docker Compose

You can easily run the application using the provided `docker-compose.yml` file.

1. Ensure you have Docker and Docker Compose installed.
2. Download the `docker-compose.yml` file or clone this repository.
3. Start the container in the background:
   ```bash
   docker compose up -d
   ```
4. Access the application at `http://localhost:8080`.

To stop the application, run:
```bash
docker compose down
```

## Privacy & Data Storage

Eco-UI is completely local-first. It does not communicate with any external backend servers to store your financial data. All categories, automation rules, and transaction histories are saved directly within your browser's `localStorage`.

Always remember to use the **Settings -> Export Backup** feature to safely store your data outside of your browser!
