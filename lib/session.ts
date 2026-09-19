import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Errors } from "@/lib/errors";

export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw Errors.unauthorized();
  return id;
}

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
