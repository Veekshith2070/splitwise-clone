const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:groupId", authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;

        const result = await pool.query(
            `
            SELECT
                u.id,
                u.name,

                COALESCE(paid.total_paid, 0) AS total_paid,

                COALESCE(owed.total_owed, 0) AS total_owed,

                COALESCE(sent.total_sent, 0) AS total_sent,

                COALESCE(received.total_received, 0) AS total_received

            FROM group_members gm

            JOIN users u
                ON u.id = gm.user_id

            LEFT JOIN (
                SELECT
                    paid_by,
                    SUM(amount) AS total_paid
                FROM expenses
                WHERE group_id = $1
                GROUP BY paid_by
            ) paid
                ON paid.paid_by = u.id

            LEFT JOIN (
                SELECT
                    es.user_id,
                    SUM(es.amount) AS total_owed
                FROM expense_splits es
                JOIN expenses e
                    ON e.id = es.expense_id
                WHERE e.group_id = $1
                GROUP BY es.user_id
            ) owed
                ON owed.user_id = u.id

            LEFT JOIN (
                SELECT
                    from_user,
                    SUM(amount) AS total_sent
                FROM settlements
                WHERE group_id = $1
                  AND status = 'ACCEPTED'
                GROUP BY from_user
            ) sent
                ON sent.from_user = u.id

            LEFT JOIN (
                SELECT
                    to_user,
                    SUM(amount) AS total_received
                FROM settlements
                WHERE group_id = $1
                  AND status = 'ACCEPTED'
                GROUP BY to_user
            ) received
                ON received.to_user = u.id

            WHERE gm.group_id = $1

            ORDER BY u.id;
            `,
            [groupId]
        );

        const balances = result.rows.map(user => ({
            userId: user.id,
            name: user.name,
            // FIX: was "+ total_received - total_sent" (backwards).
            // Sending an accepted settlement should REDUCE what you owe;
            // receiving one should REDUCE what you're owed.
            // This must match the formula used in settlementRoutes.js.
            balance:
                Number(user.total_paid)
                - Number(user.total_owed)
                + Number(user.total_sent)
                - Number(user.total_received)
        }));

        res.json({
            groupId: Number(groupId),
            balances
        });

    } catch (error) {
        console.error("Error calculating balances:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

module.exports = router;