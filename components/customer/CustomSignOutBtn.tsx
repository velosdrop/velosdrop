"use client";

import { useClerk } from "@clerk/nextjs";
import React from "react";

const CustomSignOutBtn = () => {
  const { signOut } = useClerk(); // Import Clerk's signOut method

  const handleSignOut = async () => {
    // Logic to handle sign out
    console.log("Sign Out Clicked");
    await signOut({ redirectUrl: "/sign-in" }); // Redirect to home after sign out
  };
  return (
    <button
      onClick={handleSignOut}
      className="bg-red-600 hover:bg-red-700 transition text-white px-4 py-2 rounded-md"
    >
      Sign Out
    </button>
  );
};

export default CustomSignOutBtn;