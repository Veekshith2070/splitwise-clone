const express = require("express");
const pool  = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.userId;

        if (!name) {
          return res.status(400).json({
            message: "Group name is required"
          });
        }

        const result = await pool.query(
            `INSERT INTO groups (name, created_by)
            VALUES ($1, $2)
            RETURNING id, name, created_by, created_at`,
            [name, userId]
        );

        const group = result.rows[0];

        await pool.query(
          `INSERT INTO group_members (group_id, user_id)
          VALUES ($1, $2)`,
          [group.id, userId]
        );

        res.status(201).json({
            message: "Group created successfully",
            group
        });
    } catch (error) {
        console.error("Error creating group:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

router.post("/:groupId/members", authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;

        if(!userId) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        // check if group exists

        const groupResult = await pool.query(
              "SELECT id FROM groups WHERE id = $1",
              [groupId]
        );

        if(groupResult.rows.length === 0) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        // check if user exists

        const userResult = await pool.query(
            "SELECT id FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0){
            return res.status(404).json({
                message: "User not found"
            });
        }

        //check if already a member
        const memberResult = await pool.query(
            `SELECT id
            FROM group_members
            WHERE group_id = $1 AND user_id = $2`,
            [groupId, userId]
        );

        if(memberResult.rows.length > 0){
            return res.status(409).json({
                message: "User already exists"
            });
        }

        //Add user to group

        await pool.query(
            `INSERT INTO group_members (group_id, user_id)
            VALUES ($1, $2)`,
            [groupId, userId]
        );

        res.status(201).json({
            message: "User added to group successfully"
        });
    } catch (error) {
        console.error("Error adding member:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `
            SELECT
                g.id,
                g.name,
                g.created_by,
                g.created_at
            FROM groups g
            JOIN group_members gm
                ON g.id = gm.group_id
            WHERE gm.user_id = $1
            ORDER BY g.created_at DESC
            `,
            [userId]
        );

        res.json({
            groups: result.rows
        });

    } catch (error) {
        console.error("Error fetching groups:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

router.get("/:groupId/available-users", authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;

        const result = await pool.query(
            `
            SELECT id, name, email
            FROM users
            WHERE id NOT IN (
                SELECT user_id
                FROM group_members
                WHERE group_id = $1
            )
            ORDER BY name
            `,
            [groupId]
        );

        res.json({
            users: result.rows
        });

    } catch (error) {
        console.error("Error fetching available users:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

router.get("/:groupId", authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        const result = await pool.query(
            `
            SELECT
                g.id,
                g.name,
                g.created_by,
                g.created_at
            FROM groups g
            JOIN group_members gm
                ON gm.group_id = g.id
            WHERE g.id = $1
              AND gm.user_id = $2
            `,
            [groupId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        res.json({
            group: result.rows[0]
        });

    } catch (error) {
        console.error("Error fetching group:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

router.get("/:groupId/members", authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        // Check whether the logged-in user belongs to this group
        const memberCheck = await pool.query(
            `SELECT 1
             FROM group_members
             WHERE group_id = $1 AND user_id = $2`,
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
                u.id AS "userId",
                u.name,
                u.email
            FROM group_members gm
            JOIN users u
                ON u.id = gm.user_id
            WHERE gm.group_id = $1
            ORDER BY u.id
            `,
            [groupId]
        );

        res.json({
            groupId: Number(groupId),
            members: result.rows
        });

    } catch (error) {
        console.error("Error fetching group members:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

router.get("/:groupId/expenses", authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.userId;

        // Check whether user belongs to the group
        const memberCheck = await pool.query(
            `SELECT 1
             FROM group_members
             WHERE group_id = $1 AND user_id = $2`,
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
                e.id,
                e.description,
                e.amount,
                e.created_at,
                u.id AS "paidByUserId",
                u.name AS "paidByName"
            FROM expenses e
            JOIN users u
                ON u.id = e.paid_by
            WHERE e.group_id = $1
            ORDER BY e.created_at DESC
            `,
            [groupId]
        );

        const expenses = result.rows.map(expense => ({
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            paidBy: {
                userId: expense.paidByUserId,
                name: expense.paidByName
            },
            createdAt: expense.created_at
        }));

        res.json({
            groupId: Number(groupId),
            expenses
        });

    } catch (error) {
        console.error("Error fetching group expenses:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

module.exports = router;