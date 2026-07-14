import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(process.env.LOBBY_URL || "http://127.0.0.1:8180", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Play for entertainment" }).waitFor();
  await page.getByRole("button", { name: "NEXT" }).click();
  await page.getByRole("button", { name: "NEXT" }).click();
  await page.getByRole("button", { name: "START EXPLORING" }).click();
  await page.getByRole("button", { name: "No thanks" }).click();

  const helpButton = page.getByRole("button", { name: /Help|Fairness & limits/i }).first();
  await helpButton.click();
  await page.getByRole("heading", { name: "Straight answers" }).waitFor();
  await page.getByLabel("Session reminder interval").selectOption("15");
  assert.equal(await page.evaluate(() => localStorage.getItem("arcade_session_reminder_minutes")), "15");
  await page.getByRole("button", { name: "Close help" }).click();

  await page.getByRole("button", { name: "JOIN FREE" }).click();
  if (await page.getByRole("button", { name: "New here? Create account" }).count()) {
    await page.getByRole("button", { name: "New here? Create account" }).click();
  }
  const stamp = Date.now();
  await page.getByLabel("Display name").fill("Trust QA");
  await page.getByLabel("Email").fill(`trust-${stamp}@example.com`);
  await page.getByLabel("Password").fill(`Trust-QA-${stamp}!`);
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await page.getByRole("heading", { name: "Trust QA" }).waitFor();
  await page.getByRole("button", { name: "Close" }).click();

  const roundId = `trust_${stamp}`;
  await page.evaluate(async ({ roundId }) => {
    const base = "http://127.0.0.1:8887/api";
    const send = (path, body) => fetch(base + path, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const bet = await send("/wallet/bet", { amount: 10, gameId: "slots-classic", roundId, clientSeed: "trust-browser-seed" });
    if (!bet.ok) throw new Error(`bet_${bet.status}`);
    const settle = await send("/wallet/settle", { gameId: "slots-classic", roundId });
    if (!settle.ok) throw new Error(`settle_${settle.status}`);
  }, { roundId });
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByText("slots-classic", { exact: true }).first().waitFor();
  await page.getByText("Verify fairness", { exact: true }).first().click();
  await page.getByRole("button", { name: "Recalculate in browser" }).first().click();
  await page.getByText("Commitment verified", { exact: false }).waitFor();
  assert.deepEqual(errors, []);
  console.log("Trust browser smoke passed: onboarding, help, reminder, disclosed proof, Web Crypto verification; console errors 0.");
} finally {
  await browser.close();
}
