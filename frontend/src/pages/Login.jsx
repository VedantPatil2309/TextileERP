import { useState } from "react";
import { api } from "../services/api";
import { Cpu, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Login({ setUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const submit = () => {
    if (!username || !password) {
      setError("Please enter your username and password");
      return;
    }
    setLoading(true);
    setError("");
    api
      .post("/auth/login", { username, password })
      .then((res) => {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setUser(res.data.user);
      })
      .catch(() => {
        setError("Invalid username or password");
        setLoading(false);
      });
  };

  const handleKey = (e) => {
    if (e.key === "Enter") submit();
  };

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-indigo-600 flex-col justify-between p-12 relative overflow-hidden">

        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-[-80px] right-[-80px] w-80 h-80 bg-indigo-500 rounded-full opacity-40" />
          <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 bg-indigo-700 rounded-full opacity-50" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-white/5 rounded-full" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Cpu size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">Textile ERP</span>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-snug mb-4">
            Manage your<br />factory smarter.
          </h2>
          <p className="text-indigo-200 text-sm leading-relaxed max-w-xs">
            Full visibility into production, purchase, inventory, and finance — all in one place built for the textile industry.
          </p>

          {/* Features */}
          <div className="mt-8 space-y-3">
            {["Purchase & GRN Management", "Production Tracking", "Quality Control", "Finance & Invoicing"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-indigo-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-indigo-300 text-xs">
          © {new Date().getFullYear()} Textile ERP System
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Cpu size={15} className="text-white" />
            </div>
            <span className="font-bold text-slate-800">Textile ERP</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Username</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-sm text-slate-800 placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKey}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl
                         transition-all duration-200 text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
