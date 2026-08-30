const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            groupId,
            description,
            amount,
            paidBy,
            splits
        } = req.body;

        if (
            !groupId ||
            !description ||
            !amount ||
            !paidBy ||
            !splits
        ) {
            return res.status(400).json({
                message:
                    "Group, description, amount, paidBy and splits are required"
            });
        }

        if (!Array.isArray(splits) || splits.length === 0) {
            return res.status(400).json({
                message: "At least one split is required"
            });
        }

        const loggedInUser = req.user.userId;

        // Check whether logged-in user belongs to the group
        const currentUserCheck = await client.query(
            `
            SELECT id
            FROM group_members
            WHERE group_id = $1
              AND user_id = $2
            `,
            [groupId, loggedInUser]
        );

        if (currentUserCheck.rows.length === 0) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

        // Check whether the selected payer belongs to the group
        const payerCheck = await client.query(
            `
            SELECT id
            FROM group_members
            WHERE group_id = $1
              AND user_id = $2
            `,
            [groupId, paidBy]
        );

        if (payerCheck.rows.length === 0) {
            return res.status(400).json({
                message: "The selected payer is not a member of this group"
            });
        }

        // Check that every split user belongs to the group
        for (const split of splits) {

            if (!split.userId || Number(split.amount) < 0) {
                return res.status(400).json({
                    message: "Invalid split"
                });
            }

            const splitMemberCheck = await client.query(
                `
                SELECT id
                FROM group_members
                WHERE group_id = $1
                  AND user_id = $2
                `,
                [groupId, split.userId]
            );

            if (splitMemberCheck.rows.length === 0) {
                return res.status(400).json({
                    message:
                        "All split users must be members of the group"
                });
            }
        }

        // Calculate split total
        const splitTotal = splits.reduce(
            (total, split) =>
                total + Number(split.amount),
            0
        );

        // Avoid floating-point problems
        const splitTotalPaise = Math.round(
            splitTotal * 100
        );

        const amountPaise = Math.round(
            Number(amount) * 100
        );

        if (splitTotalPaise !== amountPaise) {
            return res.status(400).json({
                message:
                    "Split amounts must equal expense amount"
            });
        }

        await client.query("BEGIN");

        // Create expense
        const expenseResult = await client.query(
            `
            INSERT INTO expenses
                (group_id, description, amount, paid_by)
            VALUES
                ($1, $2, $3, $4)
            RETURNING
                id,
                group_id,
                description,
                amount,
                paid_by,
                created_at
            `,
            [
                groupId,
                description,
                amount,
                paidBy
            ]
        );

        const expense = expenseResult.rows[0];

        // Create splits
        for (const split of splits) {

            await client.query(
                `
                INSERT INTO expense_splits
                    (expense_id, user_id, amount)
                VALUES
                    ($1, $2, $3)
                `,
                [
                    expense.id,
                    split.userId,
                    split.amount
                ]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Expense created successfully",
            expense
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Error creating expense:",
            error
        );

        res.status(500).json({
            message: "Internal server error"
        });

    } finally {
        client.release();
    }
});

module.exports = router;