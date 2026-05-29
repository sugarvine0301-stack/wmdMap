import { Suspense } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { HomeClient } from "@/components/home-client";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-zinc-100 text-zinc-500">
          読み込み中...
        </div>
      }
    >
      <AuthGuard>
        <HomeClient initialSearchParams={resolvedSearchParams} />
      </AuthGuard>
    </Suspense>
  );
}
