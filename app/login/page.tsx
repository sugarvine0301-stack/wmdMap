import { LoginPageContent } from "@/components/login-form";
import { LoginSessionGate } from "@/components/login-session-gate";

export const metadata = {
  title: "ログイン | 月明洞マップ",
};

export default function LoginPage() {
  return (
    <>
      <LoginSessionGate />
      <LoginPageContent />
    </>
  );
}
