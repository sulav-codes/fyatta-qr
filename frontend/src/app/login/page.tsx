import { Suspense } from "react";
import LoginContent from "./LoginContent";

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-300">
      Loading login...
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
