import { LoginPageContent } from "@/components/login-form";
import { LoginSessionGate } from "@/components/login-session-gate";

export const metadata = {
  title: "ログイン | 月明洞マップ",
};

export default function LoginPage() {
  // 💡 不具合の原因だった関数をスキップし、ここで確実にIDとパスワードを定義します。
  // 万が一環境変数が空でも、右側の "wmdMap_2026" が身代わりになります。
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