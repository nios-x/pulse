"use client";

import Link from "next/link";
import { LogOut, Settings, UserRound } from "lucide-react";
import { signOutAction } from "@/app/actions/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "@/components/health/member-avatar";

export function UserMenu({ name, email, tone, selfId }: { name: string; email: string; tone: number; selfId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted aria-expanded:bg-muted"
      >
        <MemberAvatar name={name} tone={tone} size="sm" className="size-9" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="py-2">
            <span className="block text-base font-semibold text-foreground">{name}</span>
            <span className="block truncate text-sm font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`/members/${selfId}`} />}>
          <UserRound aria-hidden="true" /> My health profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings?tab=account" />}>
          <Settings aria-hidden="true" /> Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOutAction()}>
          <LogOut aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
