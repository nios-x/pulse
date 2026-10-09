import { expect, type Page } from "@playwright/test";

export const IDS = {
  rahul: "c0000000-0000-4000-8000-000000000001",
  priya: "c0000000-0000-4000-8000-000000000002",
  suresh: "c0000000-0000-4000-8000-000000000003",
  kamala: "c0000000-0000-4000-8000-000000000004",
  aarav: "c0000000-0000-4000-8000-000000000005",
};

export async function signIn(page: Page, who: "rahul" | "priya" | "suresh" | "kamala") {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(`${who}@pulse.demo`);
  await page.getByLabel("Password", { exact: true }).fill("demo1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/dashboard");
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL("**/sign-in");
}

export async function toast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}
