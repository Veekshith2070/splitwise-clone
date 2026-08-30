const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const app = express();
const authMiddleware = require("./middleware/authMiddleware");
const groupRoutes = require("./routes/groupRoutes");
const expenseRoutes = require("./routes/expensesRoutes");
const balanceRoutes = require("./routes/balanceRoutes");
const settlementRoutes = require("./routes/settlementRoutes");
const userRoutes = require("./routes/userRoutes");

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/groups/balances", balanceRoutes);
app.use("/api/groups/settlements", settlementRoutes);
app.use("/api/users", userRoutes);

app.get("/api/protected", authMiddleware, (req, res) => {
    res.json({
        message: "You are authenticated",
        userId: req.user.userId
    });
});

app.get("/", (req, res) => {
    res.json({
        message: "SplitWise Clone API is running"
    });
});

app.get("/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "Database connected",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});