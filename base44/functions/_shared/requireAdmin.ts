import type { ReturnType } from "npm:@base44/sdk@0.8.31";

type Base44Client = ReturnType<typeof import("npm:@base44/sdk@0.8.31").createClientFromRequest>;

export async function requireAdmin(base44: Base44Client) {
  const user = await base44.auth.me();
  if (!user?.email) {
    return { error: Response.json({ error: { message: "Unauthorized" } }, { status: 401 }) };
  }
  const role = (user as { role?: string }).role;
  if (role !== "admin") {
    return { error: Response.json({ error: { message: "Forbidden" } }, { status: 403 }) };
  }
  return { user };
}
