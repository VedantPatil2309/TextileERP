import { useState } from "react";

export default function UserProfile() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative rounded-l hover:bg-sky-200 ">
      {/* Profile Button */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-violet-400 text-white flex items-center justify-center font-bold ">
          {user.username.charAt(0).toUpperCase()}
        </div>

        {/* Name & Role */}
        {/* <div className="text-right"> */}
        <div className="bg-white/20 ">
          <div className="text-sm font-semibold hover:bg-sky-300">{user.username}</div>
          <div className="text-xs text-gray-500 hover:bg-sky-300">{user.role}</div>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-white border rounded-xl shadow z-50">
          <div
            className="px-4 py-2 text-sm cursor-pointer hover:bg-sky-100 "
            onClick={() => (window.location.href = "/profile")}
          >
            Profile
          </div>
          <div
            className="px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-sky-100"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          >
            Logout
          </div>
        </div>
      )}
    </div>
  );
}
