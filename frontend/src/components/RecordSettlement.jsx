import { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../services/api";

function RecordSettlement({
  groupId,
  settlements,
  members,
  onSettlementRecorded
}) {
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUserId = (() => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return null;
      }

      const payload = JSON.parse(atob(token.split(".")[1]));

      return Number(payload.userId ?? payload.id);
    } catch (error) {
      console.error("Failed to decode token:", error);
      return null;
    }
  })();

  /*
    settlements already contains the correct pairwise
    (who owes whom) breakdown computed on the backend.

    Do NOT derive this from `balances` — balances are
    net totals per person and cannot tell you who
    specifically owes whom once there are 3+ members.
  */

  const peopleYouShouldPay = settlements.filter(
    (settlement) => Number(settlement.fromUserId) === currentUserId
  );

  const peopleWhoOweYou = settlements.filter(
    (settlement) => Number(settlement.toUserId) === currentUserId
  );

  const handleUserChange = (e) => {
    const userId = Number(e.target.value);

    setSelectedUser(userId);
    setError("");
    setMessage("");

    const settlement = peopleYouShouldPay.find(
      (item) => Number(item.toUserId) === userId
    );

    if (settlement) {
      setAmount(Number(settlement.amount).toFixed(2));
    } else {
      setAmount("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setMessage("");

    if (!selectedUser) {
      setError("Please select a person");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }

    const suggestedSettlement = peopleYouShouldPay.find(
      (settlement) => Number(settlement.toUserId) === Number(selectedUser)
    );

    if (!suggestedSettlement) {
      setError("You cannot settle with this person right now.");
      return;
    }

    const suggestedAmount = Number(suggestedSettlement.amount);

    if (Number(amount) > suggestedAmount + 0.01) {
      setError(`You can pay at most ₹${suggestedAmount.toFixed(2)}`);
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/api/groups/settlements`,
        {
          groupId: Number(groupId),
          toUser: Number(selectedUser),
          amount: Number(amount)
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage("Payment request sent. Waiting for confirmation.");

      setSelectedUser("");
      setAmount("");

      await onSettlementRecorded();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message || "Failed to record settlement"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="record-settlement">
      <h2>Record Settlement</h2>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {peopleYouShouldPay.length === 0 ? (
        <p>You don't currently need to pay anyone.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>Who did you pay?</label>

          <select value={selectedUser} onChange={handleUserChange}>
            <option value="">Select a person</option>

            {peopleYouShouldPay.map((settlement) => (
              <option key={settlement.toUserId} value={settlement.toUserId}>
                {settlement.to} — Pay ₹{Number(settlement.amount).toFixed(2)}
              </option>
            ))}
          </select>

          {selectedUser && (
            <>
              <label>Amount paid</label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <p>
                This will send a payment confirmation request to the
                person.
              </p>

              <button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Mark as Paid"}
              </button>
            </>
          )}
        </form>
      )}

      <div className="settlement-info">
        <h3>People Who Owe You</h3>

        {peopleWhoOweYou.length === 0 ? (
          <p>No one currently owes you.</p>
        ) : (
          peopleWhoOweYou.map((settlement) => (
            <div className="balance-card" key={settlement.fromUserId}>
              <span>{settlement.from}</span>
              <strong>+₹{Number(settlement.amount).toFixed(2)}</strong>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default RecordSettlement;