import { useEffect, useState } from "react";
import axios from "axios";

function SettlementHistory({ groupId, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    try {
      setError("");

      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_BASE_URL}/api/groups/settlements/${groupId}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setHistory(response.data.settlements);

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Failed to load settlement history"
      );
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [groupId, refreshKey]);

  return (
    <section>
      <h2>Settlement History</h2>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {history.length === 0 ? (
        <p>No completed settlements yet.</p>
      ) : (
        <div className="settlement-list">

          {history.map((settlement) => (
            <div
              className="settlement-card"
              key={settlement.id}
            >
              <div>
                <strong>
                  {settlement.from_name}
                </strong>

                <span> → </span>

                <strong>
                  {settlement.to_name}
                </strong>
              </div>

              <strong>
                ₹{Number(settlement.amount).toFixed(2)}
              </strong>

              <p>
                {settlement.status === "ACCEPTED"
                  ? "✓ Accepted"
                  : "✕ Rejected"}
              </p>

              <small>
                {new Date(
                  settlement.created_at
                ).toLocaleString()}
              </small>
            </div>
          ))}

        </div>
      )}
    </section>
  );
}

export default SettlementHistory;