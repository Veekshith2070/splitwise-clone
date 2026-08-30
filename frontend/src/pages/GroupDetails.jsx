import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../services/api";
import AddExpense from "../components/AddExpense";
import AddMember from "../components/AddMember";
import RecordSettlement from "../components/RecordSettlement";
import PendingSettlements from "../components/PendingSettlements";
import SettlementHistory from "../components/SettlementHistory";

function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  const fetchGroupData = async () => {
    try {
      setError("");

      const [
        groupResponse,
        membersResponse,
        expensesResponse,
        balancesResponse,
        settlementsResponse
      ] = await Promise.all([
        axios.get(
          `${API_BASE_URL}/api/groups/${groupId}`,
          config
        ),

        axios.get(
          `${API_BASE_URL}/api/groups/${groupId}/members`,
          config
        ),

        axios.get(
          `${API_BASE_URL}/api/groups/${groupId}/expenses`,
          config
        ),

        axios.get(
          `${API_BASE_URL}/api/groups/balances/${groupId}`,
          config
        ),

        axios.get(
          `${API_BASE_URL}/api/groups/settlements/${groupId}`,
          config
        )
      ]);

      setGroup(groupResponse.data.group);
      setMembers(membersResponse.data.members);
      setExpenses(expensesResponse.data.expenses);
      setBalances(balancesResponse.data.balances);
      setSettlements(settlementsResponse.data.settlements);

    } catch (error) {
      console.error(error);

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      setError(
        error.response?.data?.message ||
        "Failed to load group details"
      );
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  return (
    <div className="group-details">

      {/* Header */}

      <header className="group-header">

        <button
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>

        <div>
          <h1>
            {group ? group.name : "Loading..."}
          </h1>

          <p>
            {members.length}{" "}
            {members.length === 1 ? "member" : "members"}
          </p>
        </div>

      </header>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {/* Main layout */}

      <div className="group-grid">

        {/* LEFT SIDE */}

        <div className="group-main">

          {/* Expenses */}

          <section className="card">

            <div className="section-header">
              <h2>Expenses</h2>
              <span>{expenses.length}</span>
            </div>

            {expenses.length === 0 ? (
              <p>No expenses yet.</p>
            ) : (
              <div className="expense-list">

                {expenses.map((expense) => (
                  <div
                    className="expense-card"
                    key={expense.id}
                  >

                    <div>
                      <h3>{expense.description}</h3>

                      <p>
                        Paid by {expense.paidBy.name}
                      </p>
                    </div>

                    <strong>
                      ₹{Number(expense.amount).toFixed(2)}
                    </strong>

                  </div>
                ))}

              </div>
            )}

          </section>


          {/* Balances */}

          <section className="card">

            <div className="section-header">
              <h2>Balances</h2>
            </div>

            {balances.length === 0 ? (
              <p>No balances available.</p>
            ) : (
              <div className="balance-list">

                {balances.map((balance) => (

                  <div
                    className="balance-card"
                    key={balance.userId}
                  >

                    <span>
                      {balance.name}
                    </span>

                    <strong
                      className={
                        balance.balance > 0
                          ? "positive"
                          : balance.balance < 0
                          ? "negative"
                          : ""
                      }
                    >
                      {balance.balance > 0 ? "+" : ""}
                      ₹{Number(balance.balance).toFixed(2)}
                    </strong>

                  </div>

                ))}

              </div>
            )}

          </section>
          {/* Pending Settlement Requests */}
            <PendingSettlements
            groupId={groupId}
            onSettlementUpdated={() => {
                fetchGroupData();
                setHistoryRefresh(prev => prev + 1);
            }}
            />
          {/* Settlement History */}

            <SettlementHistory
            groupId={groupId}
            refreshKey={historyRefresh}
            />

          {/* Suggested Settlements */}

          <section className="card">

            <div className="section-header">
              <h2>Suggested Settlements</h2>
            </div>

            {settlements.length === 0 ? (

              <p>
                Everyone is settled up 🎉
              </p>

            ) : (

              <div className="settlement-list">

                {settlements.map((settlement, index) => (

                  <div
                    className="settlement-card"
                    key={index}
                  >

                    <span>
                      {settlement.from}
                    </span>

                    <span>
                      →
                    </span>

                    <span>
                      {settlement.to}
                    </span>

                    <strong>
                      ₹{Number(
                        settlement.amount
                      ).toFixed(2)}
                    </strong>

                  </div>

                ))}

              </div>

            )}

          </section>

        </div>


        {/* RIGHT SIDE */}

        <div className="group-sidebar">

          {/* Add Expense */}

          <div className="card">

            <AddExpense
              groupId={groupId}
              members={members}
              onExpenseAdded={fetchGroupData}
            />

          </div>


          {/* Record Settlement */}

          <div className="card">

            <RecordSettlement
                groupId={groupId}
                balances={balances}
                settlements={settlements}
                members={members}
                onSettlementRecorded={() => {
                    fetchGroupData();
                    setHistoryRefresh(prev => prev + 1);
                }}
            />

          </div>


          {/* Add Member */}

          <div className="card">

            <AddMember
              groupId={groupId}
              onMemberAdded={fetchGroupData}
            />

          </div>


          {/* Members */}

          <div className="card">

            <div className="section-header">

              <h2>Members</h2>

              <span>
                {members.length}
              </span>

            </div>

            <div className="members-list">

              {members.map((member) => (

                <div
                  className="member-card"
                  key={member.userId}
                >

                  <div className="member-avatar">
                    {member.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>

                    <strong>
                      {member.name}
                    </strong>

                    <p>
                      {member.email}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default GroupDetails;