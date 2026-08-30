import { useState } from "react";
import axios from "axios";

function AddMember({ groupId, onMemberAdded }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const searchUsers = async (value) => {
    setSearch(value);
    setSelectedUser(null);
    setError("");
    setMessage("");

    if (!value.trim()) {
      setUsers([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `http://localhost:5000/api/users/search?q=${encodeURIComponent(value)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setUsers(response.data.users);

    } catch (error) {
      console.error(error);
      setError("Failed to search users");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!selectedUser) {
      setError("Please select a user");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `http://localhost:5000/api/groups/${groupId}/members`,
        {
          userId: selectedUser.id
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage(response.data.message);

      setSearch("");
      setUsers([]);
      setSelectedUser(null);

      onMemberAdded();

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Failed to add member"
      );
    }
  };

  return (
    <div className="add-member">

      <h2>Add Member</h2>

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

      <form onSubmit={handleSubmit}>

        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => searchUsers(e.target.value)}
        />

        {users.length > 0 && (
          <div className="user-results">

            {users.map((user) => (
              <div
                key={user.id}
                className={`user-result ${
                  selectedUser?.id === user.id
                    ? "selected"
                    : ""
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            ))}

          </div>
        )}

        {search && users.length === 0 && (
          <p>No users found.</p>
        )}

        {selectedUser && (
          <p>
            Selected: <strong>{selectedUser.name}</strong>
          </p>
        )}

        <button
          type="submit"
          disabled={!selectedUser}
        >
          Add Member
        </button>

      </form>

    </div>
  );
}

export default AddMember;