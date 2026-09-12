import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, ArrowRight } from "lucide-react";

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setIsSubmitting(true);
    setError(null);
    login(demoEmail, "Password123!").catch((err: any) => {
      setError(err.message || "Login failed");
      setIsSubmitting(false);
    });
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">V</div>
          <h2>Velozity Global Solutions</h2>
          <p>Technical Assessment &middot; Client Project Dashboard</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                placeholder="name@velozity.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"} <ArrowRight size={16} />
          </button>
        </form>

        <div className="demo-accounts-box">
          <span className="demo-accounts-title">Quick Demo Sign-In</span>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="demo-btn demo-admin"
              onClick={() => handleDemoLogin("admin@velozity.com")}
            >
              <strong>Admin</strong>
              <span>admin@velozity.com</span>
            </button>
            <button
              type="button"
              className="demo-btn demo-pm"
              onClick={() => handleDemoLogin("pm1@velozity.com")}
            >
              <strong>PM (Alpha)</strong>
              <span>pm1@velozity.com</span>
            </button>
            <button
              type="button"
              className="demo-btn demo-pm"
              onClick={() => handleDemoLogin("pm2@velozity.com")}
            >
              <strong>PM (Beta)</strong>
              <span>pm2@velozity.com</span>
            </button>
            <button
              type="button"
              className="demo-btn demo-dev"
              onClick={() => handleDemoLogin("dev1@velozity.com")}
            >
              <strong>Developer 1</strong>
              <span>dev1@velozity.com</span>
            </button>
          </div>
          <p className="demo-hint">Default password for all seeded accounts is: <code>Password123!</code></p>
        </div>
      </div>
    </div>
  );
};
