const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
====================================================
CREATE SETTLEMENT REQUEST
POST /api/groups/settlements
====================================================
*/

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { groupId, toUser, amount } = req.body;
        const fromUser = req.user.userId;

        if (!groupId || !toUser || !amount) {
            return res.status(400).json({
                message: "Group, receiver and amount are required"
            });
        }

        if (fromUser === Number(toUser)) {
            return res.status(400).json({
                message: "You cannot settle with yourself"
            });
        }

        const paymentAmount = Number(amount);

        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({
                message: "Amount must be greater than 0"
            });
        }

        /*
        Check that both users belong to the group
        */

        const memberCheck = await pool.query(
            `
            SELECT user_id
            FROM group_members
            WHERE group_id = $1
              AND user_id IN ($2, $3)
            `,
            [groupId, fromUser, Number(toUser)]
        );

        if (memberCheck.rows.length !== 2) {
            return res.status(403).json({
                message: "Both users must be members of the group"
            });
        }

        /*
        Calculate balances.

        IMPORTANT:
        Only ACCEPTED settlements affect balances.

        balance =
        money paid
        - money owed
        + money already sent
        - money already received
        */

        const balanceResult = await pool.query(
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
            `,
            [groupId]
        );

        const sender = balanceResult.rows.find(
            user => Number(user.id) === Number(fromUser)
        );

        const receiver = balanceResult.rows.find(
            user => Number(user.id) === Number(toUser)
        );

        if (!sender || !receiver) {
            return res.status(400).json({
                message: "Invalid settlement users"
            });
        }

        /*
        Positive balance = user should receive money
        Negative balance = user should pay money
        */

        const senderBalance =
            Number(sender.total_paid)
            - Number(sender.total_owed)
            + Number(sender.total_sent)
            - Number(sender.total_received);

        const receiverBalance =
            Number(receiver.total_paid)
            - Number(receiver.total_owed)
            + Number(receiver.total_sent)
            - Number(receiver.total_received);

        console.log("SETTLEMENT CHECK");
        console.log({
            fromUser,
            toUser,
            paymentAmount,
            senderBalance,
            receiverBalance
        });

        /*
        Sender must currently owe money.
        */

        if (senderBalance >= -0.01) {
            return res.status(400).json({
                message: "You don't currently owe any money"
            });
        }

        /*
        Receiver must currently be owed money.
        */

        if (receiverBalance <= 0.01) {
            return res.status(400).json({
                message: "This person is not currently owed money"
            });
        }

        /*
        Sender cannot pay more than their debt.
        */

        const amountOwed = Math.abs(senderBalance);

        if (paymentAmount > amountOwed + 0.01) {
            return res.status(400).json({
                message:
                    `You can pay at most ₹${amountOwed.toFixed(2)}`
            });
        }

        /*
        Create pending settlement.
        */

        const result = await pool.query(
            `
            INSERT INTO settlements
            (
                group_id,
                from_user,
                to_user,
                amount,
                status
            )
            VALUES ($1, $2, $3, $4, 'PENDING')

            RETURNING
                id,
                group_id,
                from_user,
                to_user,
                amount,
                status,
                created_at
            `,
            [
                groupId,
                fromUser,
                Number(toUser),
                paymentAmount
            ]
        );

        res.status(201).json({
            message: "Settlement request sent successfully",
            settlement: result.rows[0]
        });

    } catch (error) {
        console.error(
            "Error recording settlement:",
            error
        );

        res.status(500).json({
            message: "Internal server error"
        });
    }
});


/*
====================================================
PENDING SETTLEMENTS
GET /api/groups/settlements/:groupId/pending
====================================================
*/

router.get(
    "/:groupId/pending",
    authMiddleware,
    async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.user.userId;

            const result = await pool.query(
                `
                SELECT
                    s.id,
                    s.group_id,
                    s.from_user,
                    from_user.name AS from_name,
                    s.to_user,
                    to_user.name AS to_name,
                    s.amount,
                    s.status,
                    s.created_at

                FROM settlements s

                JOIN users from_user
                    ON from_user.id = s.from_user

                JOIN users to_user
                    ON to_user.id = s.to_user

                WHERE s.group_id = $1
                  AND s.status = 'PENDING'
                  AND (
                      s.from_user = $2
                      OR s.to_user = $2
                  )

                ORDER BY s.created_at DESC
                `,
                [groupId, userId]
            );

            res.json({
                settlements: result.rows
            });

        } catch (error) {
            console.error(
                "Error fetching pending settlements:",
                error
            );

            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);


/*
====================================================
SETTLEMENT HISTORY
GET /api/groups/settlements/:groupId/history
====================================================
*/

router.get(
    "/:groupId/history",
    authMiddleware,
    async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.user.userId;

            const memberCheck = await pool.query(
                `
                SELECT 1
                FROM group_members
                WHERE group_id = $1
                  AND user_id = $2
                `,
                [groupId, userId]
            );

            if (memberCheck.rows.length === 0) {
                return res.status(403).json({
                    message: "You are not a member of this group"
                });
            }

            const result = await pool.query(
                `
                SELECT
                    s.id,
                    s.group_id,
                    s.from_user,
                    from_user.name AS from_name,
                    s.to_user,
                    to_user.name AS to_name,
                    s.amount,
                    s.status,
                    s.created_at

                FROM settlements s

                JOIN users from_user
                    ON from_user.id = s.from_user

                JOIN users to_user
                    ON to_user.id = s.to_user

                WHERE s.group_id = $1
                  AND s.status IN ('ACCEPTED', 'REJECTED')

                ORDER BY s.created_at DESC
                `,
                [groupId]
            );

            res.json({
                groupId: Number(groupId),
                settlements: result.rows
            });

        } catch (error) {
            console.error(
                "Error fetching settlement history:",
                error
            );

            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);


/*
====================================================
SUGGESTED SETTLEMENTS
GET /api/groups/settlements/:groupId
====================================================

Only ACCEPTED settlements affect balances.
*/

router.get(
    "/:groupId",
    authMiddleware,
    async (req, res) => {
        try {
            const { groupId } = req.params;
            const currentUserId = req.user.userId;

            /*
            Check membership
            */

            const memberCheck = await pool.query(
                `
                SELECT 1
                FROM group_members
                WHERE group_id = $1
                  AND user_id = $2
                `,
                [groupId, currentUserId]
            );

            if (memberCheck.rows.length === 0) {
                return res.status(403).json({
                    message: "You are not a member of this group"
                });
            }

            /*
            Calculate balances
            */

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

                ORDER BY u.id
                `,
                [groupId]
            );

            const debtors = [];
            const creditors = [];

            /*
            Same balance formula everywhere:
            
            paid - owed + sent - received
            */

            for (const user of result.rows) {

                const balance =
                    Number(user.total_paid)
                    - Number(user.total_owed)
                    + Number(user.total_sent)
                    - Number(user.total_received);

                if (balance < -0.01) {

                    debtors.push({
                        userId: user.id,
                        name: user.name,
                        amount: Math.abs(balance)
                    });

                } else if (balance > 0.01) {

                    creditors.push({
                        userId: user.id,
                        name: user.name,
                        amount: balance
                    });
                }
            }

            /*
            Generate minimum settlement transactions.
            */

            const settlements = [];

            let i = 0;
            let j = 0;

            while (
                i < debtors.length &&
                j < creditors.length
            ) {

                const debtor = debtors[i];
                const creditor = creditors[j];

                const amount = Math.min(
                    debtor.amount,
                    creditor.amount
                );

                settlements.push({
                    fromUserId: debtor.userId,
                    from: debtor.name,

                    toUserId: creditor.userId,
                    to: creditor.name,

                    amount: Number(
                        amount.toFixed(2)
                    )
                });

                debtor.amount -= amount;
                creditor.amount -= amount;

                if (Math.abs(debtor.amount) < 0.01) {
                    i++;
                }

                if (Math.abs(creditor.amount) < 0.01) {
                    j++;
                }
            }

            res.json({
                groupId: Number(groupId),
                settlements
            });

        } catch (error) {
            console.error(
                "Error calculating settlements:",
                error
            );

            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);


/*
====================================================
ACCEPT SETTLEMENT
PATCH /api/groups/settlements/:id/accept
====================================================

ONLY receiver can accept.
*/

router.patch(
    "/:id/accept",
    authMiddleware,
    async (req, res) => {

        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const settlementResult = await pool.query(
                `
                SELECT
                    id,
                    group_id,
                    from_user,
                    to_user,
                    amount,
                    status
                FROM settlements
                WHERE id = $1
                `,
                [id]
            );

            if (settlementResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Settlement not found"
                });
            }

            const settlement =
                settlementResult.rows[0];

            /*
            Only receiver can accept.
            */

            if (
                Number(settlement.to_user) !==
                Number(userId)
            ) {
                return res.status(403).json({
                    message:
                        "Only the receiver can accept this settlement"
                });
            }

            if (settlement.status !== "PENDING") {
                return res.status(400).json({
                    message:
                        `Settlement is already ${settlement.status.toLowerCase()}`
                });
            }

            const result = await pool.query(
                `
                UPDATE settlements
                SET status = 'ACCEPTED'
                WHERE id = $1

                RETURNING
                    id,
                    group_id,
                    from_user,
                    to_user,
                    amount,
                    status,
                    created_at
                `,
                [id]
            );

            res.json({
                message:
                    "Settlement accepted successfully",
                settlement: result.rows[0]
            });

        } catch (error) {
            console.error(
                "Error accepting settlement:",
                error
            );

            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);


/*
====================================================
REJECT SETTLEMENT
PATCH /api/groups/settlements/:id/reject
====================================================

ONLY receiver can reject.
*/

router.patch(
    "/:id/reject",
    authMiddleware,
    async (req, res) => {

        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const settlementResult = await pool.query(
                `
                SELECT
                    id,
                    group_id,
                    from_user,
                    to_user,
                    amount,
                    status
                FROM settlements
                WHERE id = $1
                `,
                [id]
            );

            if (settlementResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Settlement not found"
                });
            }

            const settlement =
                settlementResult.rows[0];

            /*
            Only receiver can reject.
            */

            if (
                Number(settlement.to_user) !==
                Number(userId)
            ) {
                return res.status(403).json({
                    message:
                        "Only the receiver can reject this settlement"
                });
            }

            if (settlement.status !== "PENDING") {
                return res.status(400).json({
                    message:
                        `Settlement is already ${settlement.status.toLowerCase()}`
                });
            }

            const result = await pool.query(
                `
                UPDATE settlements
                SET status = 'REJECTED'
                WHERE id = $1

                RETURNING
                    id,
                    group_id,
                    from_user,
                    to_user,
                    amount,
                    status,
                    created_at
                `,
                [id]
            );

            res.json({
                message: "Settlement rejected",
                settlement: result.rows[0]
            });

        } catch (error) {
            console.error(
                "Error rejecting settlement:",
                error
            );

            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);


module.exports = router;