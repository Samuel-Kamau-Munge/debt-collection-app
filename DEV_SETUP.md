# Developer Setup Guide

This guide helps you set up and run the Debt Collection System locally for development.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (running on port 3307 by default, or configure in `.env`)
- Git

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and edit it with your credentials:

```bash
cp .env.example .env
```

Edit `.env` and update at minimum:
- `DB_PASSWORD` - your MySQL password
- `JWT_SECRET` - generate a strong secret (e.g., use `node generate-tokens.js`)
- `SMTP_*` fields if you want email functionality
- `TWILIO_*` fields if you want SMS/phone functionality (or leave `PHONE_MOCK_MODE=true` for testing)

### 3. Initialize Database

Run the database initialization script to create tables:

```bash
node init-db.js
```

**Optional:** Populate with test data:

```bash
node populate-db.js
```

### 4. Start Development Servers

#### Option A: Using Helper Scripts

**macOS/Linux:**
```bash
./scripts/run-dev.sh
# Or specify custom ports:
./scripts/run-dev.sh 5000 5001
```

**Windows PowerShell:**
```powershell
.\scripts\run-dev.ps1
# Or specify custom ports:
.\scripts\run-dev.ps1 -ApiPort 5000 -DashboardPort 5001
```

#### Option B: Manual Start

**Terminal 1 - API Server:**
```bash
npm run dev
# Or: PORT=5000 nodemon server.js
```

**Terminal 2 - Dashboard Server:**
```bash
PORT=5001 node dashboard-server.js
```

### 5. Access the Application

- **API Server:** http://localhost:5000
- **Dashboard:** http://localhost:5001

### 6. Create a Test User

```bash
node create-test-user.js
```

## Running Tests

Run individual test scripts to verify functionality:

```bash
# Test authentication flow
node test-auth-flow.html  # (open in browser)

# Test debt recording
node test-debt-recording.js

# Test email alerts
node test-email-alerts.js

# Test phone service
node test-phone-service.js

# Test SMS
node test-sms.js
```

## Troubleshooting

### Error: "Cannot connect to database"

**Solution:**
1. Verify MySQL is running: `mysql -u root -p`
2. Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `.env`
3. Ensure database exists: `CREATE DATABASE debt_manager;` (or run `node init-db.js`)

### Error: "MODULE_NOT_FOUND"

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port already in use"

**Solution:**
1. Find process using the port: 
   - macOS/Linux: `lsof -i :5000`
   - Windows: `netstat -ano | findstr :5000`
2. Kill the process or use a different port: `PORT=5050 npm run dev`

### Error: "JWT secret not configured"

**Solution:**
1. Ensure `.env` file exists (copy from `.env.example`)
2. Set a strong `JWT_SECRET` value in `.env`
3. Optionally use: `node generate-tokens.js` to generate secrets

### Database tables not created

**Solution:**
```bash
node init-db.js
```

### Email/SMS not working

**Solution:**
1. For development, use `PHONE_MOCK_MODE=true` to test without real credentials
2. Check SMTP/Twilio credentials in `.env`
3. Review logs in `./logs/app.log`

### "nodemon: command not found"

**Solution:**
```bash
npm install -g nodemon
# Or use npx:
npx nodemon server.js
```

## Additional Configuration

### Phone Service Setup
See [PHONE_SERVICE_SETUP.md](PHONE_SERVICE_SETUP.md) for detailed Twilio configuration.

### M-Pesa/KCB Integration
See [MPESA_KCB_INTEGRATION.md](MPESA_KCB_INTEGRATION.md) for payment integration details.

### Custom Notifications
See [CUSTOM_NOTIFICATION_SERVICE.md](CUSTOM_NOTIFICATION_SERVICE.md) for notification customization.

## Development Commands

```bash
# Install dependencies
npm install

# Run API server with hot reload
npm run dev

# Run API server (production mode)
npm start

# Initialize database
node init-db.js

# Populate test data
node populate-db.js

# Create test user
node create-test-user.js

# Configure phone service
node configure-phone-service.js
```

## Project Structure

```
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── public/          # Static files
├── scripts/         # Helper scripts
├── logs/            # Application logs
├── server.js        # Main API server
└── dashboard-server.js  # Dashboard server
```

## Need Help?

- Check existing issues in the GitHub repository
- Review the documentation files in the root directory
- Ensure all dependencies are installed and `.env` is configured correctly
