import { LoginPageContent } from "@/components/login-form";
import { LoginSessionGate } from "@/components/login-session-gate";
import { getLoginCredentialsProps } from "@/lib/auth-public-env";

export const metadata = {
  title: "ログイン | 月明洞マップ",
};

export default function LoginPage() {
  const credentials = getLoginCredentialsProps();

  return (
    <>
      <LoginSessionGate />
      <LoginPageContent
        expectedId={credentials.expectedId}
        expectedPassword={credentials.expectedPassword}
      />
    </>
  );
}
