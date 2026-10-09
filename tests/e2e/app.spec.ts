import { expect, test } from "@playwright/test";
import { IDS, signIn, signOut, toast } from "./helpers";



test("landing page and sign-in work, demo account opens the dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("whole family");
  await page.getByRole("link", { name: "Try the demo family" }).click();
  await page.getByRole("button", { name: /Rahul.*Admin/ }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Rahul");
  await expect(page.getByRole("heading", { name: "Family members" })).toBeVisible();
  for (const n of ["Suresh Mehta", "Kamala Mehta", "Aarav Mehta", "Priya Mehta"]) {
    await expect(page.getByRole("heading", { name: n })).toBeVisible();
  }
  // Interaction alert and safety note are visible
  await expect(page.getByText("Brufen + Ecosprin: serious")).toBeVisible();
  await expect(page.getByText("Not a diagnosis. Consult a doctor.").first()).toBeVisible();
  // Role badge in header
  await expect(page.getByRole("banner").getByText("Admin", { exact: true }).first()).toBeVisible();
});

test("wrong password shows a friendly error", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("rahul@pulse.demo");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("That email and password don't match")).toBeVisible();
});

test("mark a dose taken and undo it", async ({ page }) => {
  await signIn(page, "rahul");
  await page.goto("/medications");
  const btn = page.getByRole("button", { name: /^Mark Atorva 10 mg at .* as taken$/ });
  await btn.click();
  await toast(page, "Atorva 10 mg marked as taken");
  await expect(page.getByRole("button", { name: /^Undo: Atorva 10 mg/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Undo: Atorva 10 mg/ }).click();
  await toast(page, "Undone: Atorva 10 mg");
  await expect(page.getByRole("button", { name: /^Mark Atorva 10 mg at .* as taken$/ })).toBeVisible();
});

test("record a high BP reading: labelled in words and alerts the family", async ({ page }) => {
  await signIn(page, "rahul");
  await page.getByRole("button", { name: "Record a reading" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Who is this for?").selectOption({ label: "Kamala Mehta" });
  await dialog.getByLabel("Top number").fill("165");
  await dialog.getByLabel("Bottom number").fill("100");
  await dialog.getByRole("button", { name: "Save reading" }).click();
  await toast(page, "Blood pressure saved: High · 165/100 mmHg");
  await page.goto(`/members/${IDS.kamala}`);
  await expect(page.getByText("Kamala's blood pressure is high")).toBeVisible();
  // Bad input is rejected with a plain message
  await page.getByRole("button", { name: "Record a reading" }).click();
  await page.getByRole("dialog").getByLabel("Top number").fill("120");
  await page.getByRole("dialog").getByLabel("Bottom number").fill("130");
  await page.getByRole("dialog").getByRole("button", { name: "Save reading" }).click();
  await expect(page.getByRole("dialog").getByText("The lower number should be smaller")).toBeVisible();
});

test("member profile tabs: vitals charts with ranges, medicines with clashes", async ({ page }) => {
  await signIn(page, "rahul");
  await page.goto(`/members/${IDS.suresh}?tab=vitals`);
  await expect(page.getByRole("region", { name: "Blood pressure chart" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Blood sugar chart" })).toBeVisible();
  await expect(page.getByText("Shaded: usual range").first()).toBeVisible();
  await page.getByRole("navigation", { name: "Suresh's health" }).getByRole("link", { name: /^Medicines/ }).click();
  await expect(page.getByRole("heading", { name: "Medicine clashes" })).toBeVisible();
  await expect(page.getByText("Brufen + Ecosprin").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Taken and missed, last 14 days" })).toBeVisible();
});

test("add a medicine: live clash check and duplicate warning", async ({ page }) => {
  await signIn(page, "rahul");
  await page.goto(`/medications/new?member=${IDS.suresh}`);
  await page.getByLabel("Name on the strip").fill("Combi");
  await page.getByRole("option").filter({ hasText: "Combiflam" }).click();
  await expect(page.getByText(/Serious with Ecosprin/)).toBeVisible();
  await expect(page.getByText("Same ingredient twice")).toBeVisible();
  await page.getByLabel("Tablets left").fill("10");
  await page.getByRole("button", { name: "Add medicine" }).click();
  await page.waitForURL(`**/medications?member=${IDS.suresh}`);
  await toast(page, "Combiflam added for Suresh");
  await expect(page.getByRole("heading", { name: /Combiflam/ })).toBeVisible();
});

test("View as viewer: actions are disabled with an explanation, and the server agrees", async ({ page }) => {
  await signIn(page, "rahul");
  await page.getByRole("button", { name: /Demo: view as another role/ }).first().click();
  await page.getByRole("menuitemradio", { name: /Viewer/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Previewing as Viewer" })).toBeVisible();
  await page.goto("/medications");
  await expect(page.getByRole("group", { name: /Not available: Viewers can look/ }).first()).toBeVisible();
  // Server also refuses: the add-medicine page shows the reason instead of the form
  await page.goto("/medications/new");
  await expect(page.getByText("You can't open this with your current role")).toBeVisible();
  await page.getByRole("button", { name: "Exit preview" }).click();
  await expect(page.getByText("Previewing as Viewer")).toHaveCount(0);
});

test("member role only sees their own profile; other profiles are not reachable", async ({ page }) => {
  await signIn(page, "suresh");
  await expect(page.getByRole("banner").getByText("Member", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Suresh Mehta" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Priya Mehta" })).toHaveCount(0);
  await page.goto(`/members/${IDS.priya}`);
  await expect(page.getByText("This profile isn't available")).toBeVisible();
  const res = await page.request.get(`/api/export`);
  expect(res.status()).toBe(403);
  await signOut(page);
});

test("caregiver can manage assigned people only", async ({ page }) => {
  await signIn(page, "priya");
  await page.goto(`/members/${IDS.suresh}?tab=medications`);
  await expect(page.getByRole("link", { name: "Add medicine" })).toBeVisible();
  // Caregivers cannot edit profiles by default (tooltip explains)
  await expect(page.getByRole("group", { name: /Not available: Caregivers can't do this/ })).toBeVisible();
  // People not assigned to Priya are not reachable at all
  await page.goto(`/members/${IDS.rahul}`);
  await expect(page.getByText("This profile isn't available")).toBeVisible();
  // and her dashboard shows only herself and the people she looks after
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Rahul Mehta" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Aarav Mehta" })).toBeVisible();
});

test("permissions matrix change applies to the caregiver immediately", async ({ page, browser }) => {
  await signIn(page, "rahul");
  await page.goto("/settings?tab=roles");
  await page.getByRole("switch", { name: "Caregiver: Edit health profiles" }).click();
  await toast(page, "Caregivers can now");
  const other = await browser.newPage();
  await signIn(other, "priya");
  await other.goto(`/members/${IDS.suresh}`);
  await expect(other.getByRole("button", { name: "Edit profile" })).toBeEnabled();
  await other.close();
  await page.getByRole("button", { name: "Reset to defaults" }).click();
  await toast(page, "Permissions reset");
});

test("symptom triage: red-flag rules decide emergencies before any AI", async ({ page }) => {
  await signIn(page, "rahul");
  await page.goto(`/triage?member=${IDS.suresh}`);
  await page.getByLabel(/What's happening/).fill("Chest pain and sweating for 20 minutes");
  await page.getByRole("button", { name: "Check how urgent this is" }).click();
  await expect(page.getByRole("heading", { name: "Emergency: get help now" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 112" })).toHaveAttribute("href", "tel:112");
  await expect(page.getByText("AI was not used")).toBeVisible();
  await expect(page.getByText(/heart emergency/).first()).toBeVisible();
  await page.getByRole("button", { name: "Start a new check" }).click();
  await page.getByLabel(/What's happening/).fill("runny nose and sneezing");
  await page.getByRole("button", { name: "Check how urgent this is" }).click();
  await expect(page.getByRole("heading", { name: "Care at home and watch" })).toBeVisible();
  await expect(page.getByText(/never a diagnosis|not a diagnosis/i).first()).toBeVisible();
});

test("upload a record with drag-and-drop zone and open it", async ({ page }) => {
  await signIn(page, "rahul");
  await page.goto("/records");
  await page.getByRole("button", { name: "Upload a record" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("input[type=file]").setInputFiles("tests/fixtures/report.png");
  await expect(dialog.getByText("will be encrypted")).toBeVisible();
  await dialog.getByLabel("Whose record?").selectOption({ label: "Aarav Mehta" });
  await dialog.getByLabel("Name").fill("Eye check-up report");
  await dialog.getByRole("button", { name: "Save record" }).click();
  await toast(page, /Saved "Eye check-up report" for Aarav · encrypted/);
  await expect(page.getByRole("heading", { name: "Eye check-up report" })).toBeVisible();
  // Filter by type
  await page.getByLabel("Type").selectOption({ label: "Prescription" });
  await expect(page.getByRole("heading", { name: "Eye check-up report" })).toHaveCount(0);
  // The file is decrypted on the fly for family members, and refused to strangers
  await page.getByLabel("Type").selectOption({ label: "All types" });
  const src = await page.getByRole("button", { name: "Preview Eye check-up report" }).locator("img").getAttribute("src");
  const file = await page.request.get(src!);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("image/png");
  const anon = await page.context().browser()!.newContext();
  expect((await anon.request.get(`${page.url().split("/records")[0]}${src}`, { maxRedirects: 0 })).status()).not.toBe(200);
  await anon.close();
});

test("prescription scanner (demo mode) adds reviewed medicines", async ({ page }) => {
  await signIn(page, "rahul");
  await page.goto("/records/scan");
  await page.getByLabel("Whose prescription?").selectOption({ label: "Priya Mehta" });
  await page.locator("input[type=file]").setInputFiles("tests/fixtures/report.png");
  await page.getByRole("button", { name: "Read prescription" }).click();
  await expect(page.getByText(/Sample result|Read by AI/)).toBeVisible();
  await page.getByRole("button", { name: /^Add \d medicines?$/ }).click();
  await page.waitForURL(`**/medications?member=${IDS.priya}`);
  await toast(page, /medicines? added for Priya/);
});

test("emergency card: QR link works without login and can be revoked", async ({ page, browser }) => {
  await signIn(page, "rahul");
  await page.goto(`/emergency/${IDS.aarav}`);
  await expect(page.getByText("PEANUTS")).toBeVisible();
  await expect(page.getByText("Blood group", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create QR code" }).click();
  await toast(page, "QR code created");
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  await page.goto("/settings?tab=privacy");
  const row = page.getByRole("listitem").filter({ hasText: "Aarav Mehta" }).filter({ hasText: "Emergency card" }).first();
  await row.getByRole("button", { name: "Copy" }).waitFor();
  const links = await page.evaluate(() => [...document.querySelectorAll("li")].map((li) => li.textContent ?? ""));
  expect(links.some((t) => t.includes("Aarav Mehta"))).toBeTruthy();
  // Open the public link in a fresh, logged-out browser
  const token = await page.evaluate(async () => {
    const html = await (await fetch("/emergency/c0000000-0000-4000-8000-000000000005")).text();
    return html.match(/\/share\/([\w-]{20,})/)?.[1] ?? null;
  });
  expect(token).toBeTruthy();
  const anon = await browser.newContext();
  const pub = await anon.newPage();
  await pub.goto(`/share/${token}`);
  await expect(pub.getByText("PEANUTS")).toBeVisible();
  await row.getByRole("button", { name: "Turn off" }).click();
  await toast(page, "Link turned off");
  await pub.reload();
  await expect(pub.getByRole("heading", { name: "This link was turned off" })).toBeVisible();
  await anon.close();
});

test("time-limited share link for a doctor shows a summary; expired links show nothing", async ({ page }) => {
  await page.goto("/share/demo-suresh-summary-for-dr-khan-9p");
  await expect(page.getByRole("heading", { name: "Suresh Mehta" })).toBeVisible();
  await expect(page.getByText("30-day adherence")).toBeVisible();
  await page.goto("/share/demo-aarav-old-link-expired-2x8");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
});

test("book a video consult with a doctor", async ({ page }) => {
  await signIn(page, "rahul");
  await page.goto(`/appointments/book?member=${IDS.kamala}`);
  await page.getByRole("button", { name: /Dr. Anjali Deshpande/ }).click();
  const panel = page.locator("#booking-panel");
  await panel.getByRole("button", { pressed: false }).filter({ hasText: /^\w{3}\d{1,2}$/ }).nth(1).click();
  const slot = panel.getByRole("button", { name: /(am|pm)$/ }).and(page.locator(":not([disabled])")).first();
  await slot.click();
  await panel.getByRole("button", { name: "Confirm booking" }).click();
  await page.waitForURL("**/appointments");
  await toast(page, /Booked Dr. Anjali Deshpande for Kamala/);
  await expect(page.getByRole("heading", { name: "Dr. Anjali Deshpande" }).first()).toBeVisible();
  await page.goto("/appointments?view=calendar");
  await expect(page.getByRole("grid")).toBeVisible();
});

test("invite flow: a new person joins with a code and gets the chosen role", async ({ page, browser }) => {
  await signIn(page, "rahul");
  await page.goto("/settings?tab=invites");
  await page.getByLabel("Role", { exact: true }).selectOption({ label: "Viewer" });
  await page.getByRole("button", { name: "Create invite code" }).click();
  await toast(page, "Invite code ready");
  const code = (await page.locator("p.font-mono").first().textContent())!.trim();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto(`/sign-up?invite=${code}`);
  await p2.getByLabel("Your name").fill("Neha Mehta");
  await p2.getByLabel("Email").fill(`neha${Date.now()}@example.com`);
  await p2.getByLabel("Password", { exact: true }).fill("strongpass1");
  await p2.getByRole("checkbox").click();
  await p2.getByRole("button", { name: "Create account" }).click();
  await p2.waitForURL("**/dashboard**");
  await expect(p2.getByRole("banner").getByText("Viewer", { exact: true }).first()).toBeVisible();
  await ctx.close();
});

test("new family sign-up with onboarding stepper", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Anita Rao");
  await page.getByLabel("Email").fill(`anita${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("strongpass1");
  // Consent is required
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Please agree to continue")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("strongpass1");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: /Create a family/ }).click();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Blood group").selectOption("O+");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Name").fill("Lakshmi Rao");
  await page.getByLabel("Relation to you").selectOption({ label: "Parent" });
  await page.getByRole("button", { name: "Add to family" }).click();
  await expect(page.getByText("Lakshmi Rao")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Choose roles" })).toBeVisible();
  await page.getByRole("button", { name: "Finish and open dashboard" }).click();
  await page.waitForURL("**/dashboard**");
  await expect(page.getByRole("heading", { name: "Lakshmi Rao" })).toBeVisible();
  // Empty states have a friendly message and a clear action
  await page.goto("/records");
  await expect(page.getByText("No records yet")).toBeVisible();
});

test("cron endpoints are protected and send reminders", async ({ request }) => {
  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  const res = await request.get("/api/cron/reminders", { headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? "local-cron-secret"}` } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.families).toBeGreaterThan(0);
  const daily = await request.get("/api/cron/daily", { headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? "local-cron-secret"}` } });
  expect(daily.status()).toBe(200);
});

test("mobile layout uses a bottom tab bar", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await signIn(page, "rahul");
  const nav = page.getByRole("navigation", { name: "Main" }).last();
  await expect(nav.getByRole("link", { name: "Medicines" })).toBeVisible();
  await nav.getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Emergency card" })).toBeVisible();
  await ctx.close();
});
