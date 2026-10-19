import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader className="items-center text-center sm:items-start sm:text-left">
        <Image
          src="/logo.png"
          alt={APP_NAME}
          width={72}
          height={72}
          className="mb-2 h-16 w-16 rounded-lg object-contain"
          priority
        />
        <CardTitle>{APP_NAME} sign in</CardTitle>
        <CardDescription>
          Staff access only. Use credentials from your clinic administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<LoadingBlock label="Loading sign in" />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
