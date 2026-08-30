import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../services/api";

function PendingSettlements({ groupId, onSettlementUpdated }) {
  const [settlements, setSettlements] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  // Get logged-in user's ID from JWT
  const getCurrentUserId = () => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return Number(payload.userId);
    } catch (error) {
      return null;
    }
  };

  const currentUserId = getCurrentUserId();

  const fetchPendingSettlements = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/groups/settlements/${groupId}/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSettlements(response.data.settlements);
      setError("");

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Failed to load settlement requests"
      );
    }
  };

  useEffect(() => {
    fetchPendingSettlements();
  }, [groupId]);

  const handleAccept = async (id) => {
    try {
      setError("");
      setMessage("");

      const response = await axios.patch(
        `${API_BASE_URL}/api/groups/settlements/${id}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage(response.data.message);

      await fetchPendingSettlements();
      await onSettlementUpdated();

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Failed to accept settlement"
      );
    }
  };

  const handleReject = async (id) => {
    try {
      setError("");
      setMessage("");

      const response = await axios.patch(
        `${API_BASE_URL}/api/groups/settlements/${id}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage(response.data.message);

      await fetchPendingSettlements();
      await onSettlementUpdated();

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Failed to reject settlement"
      );
    }
  };

  return (
    <section>
      <h2>Settlement Requests</h2>

      {message && (
        <p className="success">
          {message}
        </p>
      )}

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {settlements.length === 0 ? (
        <p>No pending settlement requests.</p>
      ) : (
        <div className="settlement-list">

          {settlements.map((settlement) => {

            const isReceiver =
              Number(settlement.to_user) === currentUserId;

            const isPayer =
              Number(settlement.from_user) === currentUserId;

            return (
              <div
                className="settlement-card"
                key={settlement.id}
              >

                {isReceiver && (
                  <>
                    <h3>Settlement Request</h3>

                    <p>
                      <strong>
                        {settlement.from_name}
                      </strong>{" "}
                      says they paid you{" "}
                      <strong>
                        ₹{Number(settlement.amount).toFixed(2)}
                      </strong>
                    </p>

                    <div className="settlement-actions">

                      <button
                        onClick={() =>
                          handleAccept(settlement.id)
                        }
                      >
                        Accept
                      </button>

                      <button
                        onClick={() =>
                          handleReject(settlement.id)
                        }
                      >
                        Reject
                      </button>

                    </div>
                  </>
                )}

                {isPayer && (
                  <>
                    <h3>Payment Pending</h3>

                    <p>
                      You marked{" "}
                      <strong>
                        ₹{Number(settlement.amount).toFixed(2)}
                      </strong>{" "}
                      as paid to{" "}
                      <strong>
                        {settlement.to_name}
                      </strong>
                      .
                    </p>

                    <p>
                      ⏳ Waiting for{" "}
                      {settlement.to_name}
                      {" "}to confirm.
                    </p>
                  </>
                )}

              </div>
            );
          })}

        </div>
      )}
    </section>
  );
}

export default PendingSettlements;