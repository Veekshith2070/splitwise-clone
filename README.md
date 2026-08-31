# SplitWise Clone

A full-stack expense management application inspired by Splitwise that allows users to manage groups, record shared expenses, split bills, track balances, and record settlements.

## 🚀 Live Demo

- Frontend: https://splitwise-clone-frontend-so3i.onrender.com
- Backend API: https://splitwise-clone-backend-0obr.onrender.com

---

## ✨ Features

### Authentication
- User registration and login
- JWT-based authentication
- Protected routes for authenticated users

### Group Management
- Create expense groups
- Add members to groups
- View group members
- Manage expenses within individual groups

### Expense Management
- Add expenses to groups
- Select the user who paid for an expense
- Split expenses equally among group members
- Split expenses using custom amounts
- Validate that the total split amount matches the expense amount

### Balance Management
- Calculate how much each member owes
- Track balances between group members
- View pending settlements

### Settlements
- Record settlements between users
- View settlement history
- Track pending settlements

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- Axios
- React Router
- CSS

### Backend
- Node.js
- Express.js
- REST APIs
- JWT Authentication

### Database
- PostgreSQL

### Deployment
- Render

---

## 🏗️ Project Structure

```text
splitwise-clone/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   │
│   │   ├── middleware/
│   │   │   └── authMiddleware.js
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── balanceRoutes.js
│   │   │   ├── expensesRoutes.js
│   │   │   ├── groupRoutes.js
│   │   │   ├── settlementRoutes.js
│   │   │   └── userRoutes.js
│   │   │
│   │   └── server.js
│   │
│   ├── package.json
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddExpense.jsx
│   │   │   ├── AddMember.jsx
│   │   │   ├── BalanceCard.jsx
│   │   │   ├── CreateGroup.jsx
│   │   │   ├── ExpenseCard.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── PendingSettlements.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── RecordSettlement.jsx
│   │   │   └── SettlementHistory.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── GroupDetails.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
