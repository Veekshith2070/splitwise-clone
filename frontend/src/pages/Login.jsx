import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        formData
      );

      localStorage.setItem("token", response.data.token);

      localStorage.setItem(
        "userId",
        response.data.user.id
        );

      navigate("/dashboard");

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Login failed"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-logo">
          ₹
        </div>

        <h1>Welcome back</h1>

        <p className="auth-subtitle">
          Login to manage your shared expenses
        </p>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <label>Email</label>

          <input
            type="email"
            name="email"
            placeholder="Your email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label>Password</label>

          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="auth-link">
          Don't have an account?{" "}
          <Link to="/register">
            Register
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Login;