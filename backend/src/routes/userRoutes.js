const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/search", authMiddleware, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim() === "") {
            return res.json({
                users: []
            });
        }

        const result = await pool.query(
            `
            SELECT id, name, email
            FROM users
            WHERE name ILIKE $1
               OR email ILIKE $1
            ORDER BY name
            LIMIT 10
            `,
            [`%${q.trim()}%`]
        );

        res.json({
            users: result.rows
        });

    } catch (error) {
        console.error("Error searching users:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

module.exports = router;