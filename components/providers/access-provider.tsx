"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/db/schema";
import { can, denialReason, type AccessContext, type Action } from "@/lib/permissions";

type AccessValue = {
  access: AccessContext;
  actualRole: Role;
  viewingAs: Role | null;
};

const Ctx = createContext<AccessValue | null>(null);

export function AccessProvider({ value, children }: { value: AccessValue; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccess() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAccess must be used inside AccessProvider");
  return {
    ...value,
    role: value.access.role,
    can: (action: Action, memberId?: string | null) => can(value.access, action, memberId),
    reason: (action: Action, memberId?: string | null) => denialReason(value.access, action, memberId),
  };
}
