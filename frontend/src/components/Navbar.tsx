import React from "react";
import Image from "next/image";
import Link from "next/link";
const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-99">
      <nav className="flex m-auto w-[80vw] items-center justify-between my-10">
        <Link href="/" className="flex flex-col text-2xl font-bold">
          <div>
            Fyatta<span className="text-[var(--orange)]">QR</span>
          </div>
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="px-5 py-3 border border-1 rounded-md border-gray-300 hover:border-[var(--orange)] hover:bg-orange-50 hover:text-[var(--orange)] duration-200"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-5 py-3 border rounded-md text-white bg-[var(--orange)]"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
