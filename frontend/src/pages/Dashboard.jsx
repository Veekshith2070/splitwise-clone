import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CreateGroup from "../components/CreateGroup";

function Dashboard() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    try {
      setError("");
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await axios.get(
        "http://localhost:5000/api/groups",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setGroups(response.data.groups);

    } catch (error) {
      console.error(error);

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        setError("Failed to load groups");
      }

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="dashboard">

      {/* Header */}

      <header className="dashboard-header">

        <div>
          <h1>Splitwise Clone</h1>
          <p>Manage your shared expenses</p>
        </div>

        <button
          className="logout-button"
          onClick={logout}
        >
          Logout
        </button>

      </header>


      {/* Main */}

      <main className="dashboard-main">

        <div className="groups-header">

          <div>
            <h2>My Groups</h2>

            <p>
              {groups.length}{" "}
              {groups.length === 1 ? "group" : "groups"}
            </p>
          </div>

          <button
            className="create-group-button"
            onClick={() =>
              setShowCreateGroup(!showCreateGroup)
            }
          >
            {showCreateGroup
              ? "Cancel"
              : "+ Create Group"}
          </button>

        </div>


        {/* Create group */}

        {showCreateGroup && (
          <div className="create-group-card">

            <CreateGroup
              onGroupCreated={() => {
                setShowCreateGroup(false);
                fetchGroups();
              }}
            />

          </div>
        )}


        {/* Error */}

        {error && (
          <p className="error">
            {error}
          </p>
        )}


        {/* Loading */}

        {loading ? (

          <div className="loading">
            Loading your groups...
          </div>

        ) : groups.length === 0 ? (

          /* Empty state */

          <div className="empty-state">

            <div className="empty-icon">
              +
            </div>

            <h3>No groups yet</h3>

            <p>
              Create your first group to start
              tracking shared expenses.
            </p>

            <button
              onClick={() =>
                setShowCreateGroup(true)
              }
            >
              Create your first group
            </button>

          </div>

        ) : (

          /* Groups */

          <div className="group-list">

            {groups.map((group) => (

              <div
                className="group-card"
                key={group.id}
                onClick={() =>
                  navigate(`/groups/${group.id}`)
                }
              >

                <div className="group-icon">
                  {group.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="group-info">

                  <h3>
                    {group.name}
                  </h3>

                  <p>
                    Created by User {group.created_by}
                  </p>

                </div>

                <span className="group-arrow">
                  →
                </span>

              </div>

            ))}

          </div>

        )}

      </main>

    </div>
  );
}

export default Dashboard;