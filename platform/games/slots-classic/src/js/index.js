import Slot from "./Slot.js";
import { GameSDK } from "@arcade/game-sdk";

const parentOrigin=new URLSearchParams(location.search).get('parentOrigin');
const sdk=parentOrigin?new GameSDK({parentOrigin,gameId:'slots-classic'}):null;
sdk?.start();

const config = {
  inverted: false, // true: reels spin from top to bottom; false: reels spin from bottom to top
  onSpinStart: (symbols) => {
    console.log("onSpinStart", symbols);
  },
  onSpinEnd: (symbols) => {
    console.log("onSpinEnd", symbols);
  },
  requestBet: sdk?async()=>{const roundId=crypto.randomUUID();const approved=await sdk.placeBet(100,roundId);return approved&&{...approved,roundId}}:null,
  requestSettlement: sdk?roundId=>sdk.requestSettlement(roundId):null,
};

const slot = new Slot(document.getElementById("slot"), config);
