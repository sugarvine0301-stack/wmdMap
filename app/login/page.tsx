import { LoginPageContent } from "@/components/login-form";
import { LoginSessionGate } from "@/components/login-session-gate";

export const metadata = {
  title: "ログイン | 月明洞マップ",
};

export default function LoginPage() {
  // 💡 不具合の原因だった仲介関数を使わず、ここで直接環境変数を注入します。
  // 万が一読み込みが空でも、予備（||）として "wmdMap_2026" が身代わりになります。
  const expectedId = process.env.NEXT_PUBLIC_APP_ID || "wmdMap_2026";
  const expectedPassword = process.env.NEXT_PUBLIC_APP_PASSWORD || "wmdMap_2026";

  return (
    <>
      <LoginSessionGate />
      <LoginPageContent
        expectedId={expectedId}
        expectedPassword={expectedPassword}
      />
    </>
  );
}