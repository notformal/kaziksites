import Slot from "./Slot.js";
import { GameSDK } from "@nova/game-sdk";
import { createGameI18n, detectGameLocale } from "@nova/game-sdk/i18n";
import { BET, GAME_STRINGS, MAX_WIN_MULTIPLIER, PAY_TABLE } from "./game.config.js";

const parentOrigin = new URLSearchParams(location.search).get("parentOrigin");
const sdk = parentOrigin ? new GameSDK({ parentOrigin, gameId: "slots-classic" }) : null;
const t = createGameI18n(GAME_STRINGS, detectGameLocale());
t.apply();
document.title = t("title");

const $ = (id) => document.getElementById(id);
const money = (value) => Number(value || 0).toLocaleString(t.locale);
const betInput = $("bet");
Object.assign(betInput, { min: BET.min, max: BET.max, step: BET.step, value: BET.default });
$("maxWin").textContent = `${MAX_WIN_MULTIPLIER}×`;

let balance = null;
const setBalance = (value) => {
  balance = Number(value);
  $("balance").textContent = money(balance);
  $("spin").disabled = false;
};
addEventListener("game:init", (e) => setBalance(e.detail.balance));
addEventListener("game:balance_update", (e) => setBalance(e.detail.balance));
sdk?.start();

const readBet = () => {
  const amount = Math.trunc(Number(betInput.value));
  if (!Number.isFinite(amount) || amount < BET.min) return null;
  return Math.min(amount, BET.max);
};

const slot = new Slot(document.getElementById("slot"), {
  payTable: PAY_TABLE,
  // Ставка идёт на сервер до анимации: без BET_APPROVED барабаны не крутятся.
  requestBet: sdk
    ? async () => {
        const amount = readBet();
        if (amount === null) return null;
        if (balance !== null && amount > balance) {
          $("result").textContent = t("insufficient");
          return null;
        }
        $("result").textContent = t("waiting");
        $("win").textContent = "0";
        const roundId = `slots_${crypto.randomUUID().replaceAll("-", "")}`;
        const approved = await sdk.placeBet(amount, roundId);
        if (!approved) {
          $("result").textContent = t("betRejected");
          return null;
        }
        if (approved.balance != null) setBalance(approved.balance);
        return { ...approved, roundId, amount };
      }
    : null,
  // Результат раунда решает сервер — клиент только рисует то, что ему вернули.
  requestSettlement: sdk
    ? (roundId) =>
        new Promise((resolve) => {
          const done = (e) => {
            if (e.detail?.roundId !== roundId) return;
            removeEventListener("game:round_settled", done);
            resolve(e.detail);
          };
          addEventListener("game:round_settled", done);
          sdk.requestSettlement(roundId);
          setTimeout(() => {
            removeEventListener("game:round_settled", done);
            resolve(null);
          }, 10000);
        })
    : null,
  onRoundSettled: (settled) => {
    if (!settled) {
      $("result").textContent = t("settleError");
      return;
    }
    if (settled.balance != null) setBalance(settled.balance);
    const win = Number(settled.win || 0);
    $("win").textContent = money(win);
    $("result").textContent = win > 0 ? t("youWon", { amount: money(win) }) : t("noWin");
  },
});

$("spin").addEventListener("click", () => slot.spin());
