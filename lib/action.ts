import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/context";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Wraps a Server Action body: permission and validation errors become friendly messages. */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ForbiddenError) return { ok: false, error: err.message };
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
    }
    // redirect() and notFound() throw framework errors that must propagate
    unstable_rethrow(err);
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
