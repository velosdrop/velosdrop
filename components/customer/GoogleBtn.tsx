"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";

const GoogleBtn = () => {
  return (
    <div className="grid w-full items-center justify-center">
      <SignIn.Root>
        <Clerk.Connection
          name="google"
          className="flex w-full items-center justify-center gap-3 rounded-md bg-white text-black px-4 py-2 font-semibold hover:bg-gray-200 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 17 16"
            className="w-4"
            aria-hidden
          >
            <path
              fill="currentColor"
              d="M8.82 7.28v2.187h5.227c-.16 1.226-.57 2.124-1.192 2.755-.764.765-1.955 1.6-4.035 1.6-3.218 0-5.733-2.595-5.733-5.813 0-3.218 2.515-5.814 5.733-5.814 1.733 0 3.005.685 3.938 1.565l1.538-1.538C12.998.96 11.256 0 8.82 0 4.41 0 .705 3.591.705 8s3.706 8 8.115 8c2.382 0 4.178-.782 5.582-2.24 1.44-1.44 1.893-3.475 1.893-5.111 0-.507-.035-.978-.115-1.369H8.82Z"
            />
          </svg>
          Sign in with Google
        </Clerk.Connection>
      </SignIn.Root>
    </div>
  );
};

export default GoogleBtn;