import { chromium } from "playwright";
const base = "http://127.0.0.1:4183";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on("console", (m) => { const t=m.text(); if(!t.includes("sandbox")) console.log(`[${m.type()}] ${t}`); });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.addInitScript(() => { localStorage.setItem("casino_locale","en"); localStorage.setItem("casino_onboarding_v1","done"); });
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(async () => {
  await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include",
    body: JSON.stringify({ email:`probe${Date.now()}@e.test`, password:"QaProbe!2026", displayName:"Probe" }) });
  sessionStorage.setItem("casino_authenticated","1");
});
const bal = () => page.evaluate(async()=>{const r=await fetch("/api/wallet/balance",{credentials:"include"});return (await r.json()).balance});
for (const slug of ["wheel","crash","plinko","keno"]) {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".grid .game").first().waitFor();
  for (let i=0;i<12;i++){ if (await page.locator(`[data-game-slug="${slug}"]`).count()) break; const m=page.locator("button.load"); if(!await m.count()) break; await m.click(); await page.waitForTimeout(120); }
  await page.locator(`[data-game-slug="${slug}"] .gameMain`).first().click();
  const f = page.frameLocator(".secureGame iframe");
  await page.waitForTimeout(1500);
  const before = await bal();
  const disabled = await f.locator("#play").isDisabled().catch(()=>null);
  if (!disabled) await f.locator("#play").click().catch(e=>console.log(slug,"click err",e.message.split("\n")[0]));
  await page.waitForTimeout(4000);
  const after = await bal();
  const result = await f.locator("#result").textContent().catch(()=>"(no #result)");
  console.log(`${slug}: disabled=${disabled} ${before} → ${after} result="${(result||"").trim().slice(0,60)}"`);
  await page.keyboard.press("Escape");
}
await browser.close();
