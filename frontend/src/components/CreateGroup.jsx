import { useState } from "react";
import axios from "axios";

function CreateGroup({ onGroupCreated }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:5000/api/groups",
        {
          name
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setName("");
      onGroupCreated();

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Failed to create group"
      );
    }
  };

  return (
    <div className="create-group">

      <h2>Create Group</h2>

      {error && (
        <p className="error">{error}</p>
      )}

      <form onSubmit={handleSubmit}>

        <input
          type="text"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <button type="submit">
          Create
        </button>

      </form>

    </div>
  );
}

export default CreateGroup;