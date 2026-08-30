import { useState } from "react";
import axios from "axios";

function AddExpense({ groupId, members, onExpenseAdded }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splits, setSplits] = useState({});
  const [splitMode, setSplitMode] = useState("equal");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSplitChange = (userId, value) => {
    setSplits({
      ...splits,
      [userId]: value
    });
  };

  const handleEqualSplit = () => {
    if (!amount || Number(amount) <= 0) {
      setError("Enter the total amount first");
      return;
    }

    if (members.length === 0) {
      setError("There are no members in this group");
      return;
    }

    setError("");

    const total = Number(amount);
    const memberCount = members.length;

    // Work in paise to avoid floating point problems
    const totalPaise = Math.round(total * 100);
    const basePaise = Math.floor(totalPaise / memberCount);
    const remainder = totalPaise % memberCount;

    const equalSplits = {};

    members.forEach((member, index) => {
      const sharePaise =
        basePaise + (index < remainder ? 1 : 0);

      equalSplits[member.userId] = (
        sharePaise / 100
      ).toFixed(2);
    });

    setSplits(equalSplits);
    setSplitMode("equal");
  };

  const handleCustomSplit = () => {
    setSplitMode("custom");
    setSplits({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!paidBy) {
      setError("Please select who paid");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const expenseSplits = members.map((member) => ({
        userId: member.userId,
        amount: Number(
          splits[member.userId] || 0
        )
      }));

      const splitTotal = expenseSplits.reduce(
        (total, split) => total + split.amount,
        0
      );

      // Compare using paise
      if (
        Math.round(splitTotal * 100) !==
        Math.round(Number(amount) * 100)
      ) {
        setError(
          `Split total ₹${splitTotal.toFixed(2)} must equal expense amount ₹${Number(amount).toFixed(2)}`
        );
        return;
      }

      await axios.post(
        "http://localhost:5000/api/expenses",
        {
          groupId: Number(groupId),
          description,
          amount: Number(amount),
          paidBy: Number(paidBy),
          splits: expenseSplits
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setDescription("");
      setAmount("");
      setPaidBy("");
      setSplits({});
      setSplitMode("equal");

      onExpenseAdded();

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Failed to create expense"
      );

    } finally {
      setLoading(false);
    }
  };

  const splitTotal = Object.values(splits).reduce(
    (total, value) => total + Number(value || 0),
    0
  );

  const remaining =
    Number(amount || 0) - splitTotal;

  return (
    <div className="add-expense">

      <h2>Add Expense</h2>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>

        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
          required
        />

        <input
          type="number"
          placeholder="Total amount"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setSplits({});
          }}
          min="0.01"
          step="0.01"
          required
        />

        <select
          value={paidBy}
          onChange={(e) =>
            setPaidBy(e.target.value)
          }
          required
        >
          <option value="">
            Who paid?
          </option>

          {members.map((member) => (
            <option
              key={member.userId}
              value={member.userId}
            >
              {member.name}
            </option>
          ))}
        </select>

        <div className="split-header">
          <h3>Split Expense</h3>

          <div className="split-buttons">

            <button
              type="button"
              className={
                splitMode === "equal"
                  ? "active"
                  : ""
              }
              onClick={handleEqualSplit}
            >
              Equal
            </button>

            <button
              type="button"
              className={
                splitMode === "custom"
                  ? "active"
                  : ""
              }
              onClick={handleCustomSplit}
            >
              Custom
            </button>

          </div>
        </div>

        {members.map((member) => (
          <div
            className="split-input"
            key={member.userId}
          >

            <label>
              {member.name}
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={
                splits[member.userId] || ""
              }
              onChange={(e) =>
                handleSplitChange(
                  member.userId,
                  e.target.value
                )
              }
            />

          </div>
        ))}

        <div className="split-summary">

          <span>
            Split total
          </span>

          <strong>
            ₹{splitTotal.toFixed(2)}
          </strong>

          <span>
            Remaining
          </span>

          <strong>
            ₹{remaining.toFixed(2)}
          </strong>

        </div>

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Adding..."
            : "Add Expense"}
        </button>

      </form>

    </div>
  );
}

export default AddExpense;