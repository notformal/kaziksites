// Сгенерировано scripts/generate-game-art.mjs из apps/api/src/slotLibrary.js.
// Не редактируйте вручную: витрина обязана совпадать с серверным расчётом.
export const ENGINES = {
  "classic-lines": {
    "id": "classic-lines",
    "name": "Royal Lines",
    "cols": 5,
    "rows": 3,
    "mode": "lines",
    "betUnits": 10,
    "targetRtp": 0.95,
    "wild": "wild",
    "scatter": "scatter",
    "wildMultiplier": 2,
    "paylines": [
      [1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0],
      [2, 2, 2, 2, 2],
      [0, 1, 2, 1, 0],
      [2, 1, 0, 1, 2],
      [0, 0, 1, 2, 2],
      [2, 2, 1, 0, 0],
      [1, 0, 1, 2, 1],
      [1, 2, 1, 0, 1],
      [0, 1, 1, 1, 2]
    ],
    "paytable": {
      "ten": {
        "3": 0.4,
        "4": 1,
        "5": 3
      },
      "jack": {
        "3": 0.4,
        "4": 1,
        "5": 3
      },
      "queen": {
        "3": 0.6,
        "4": 1.5,
        "5": 5
      },
      "king": {
        "3": 0.8,
        "4": 2,
        "5": 7
      },
      "ace": {
        "3": 1,
        "4": 3,
        "5": 10
      },
      "ruby": {
        "3": 2,
        "4": 6,
        "5": 20
      },
      "crown": {
        "3": 4,
        "4": 12,
        "5": 50
      }
    },
    "scatterPays": {
      "3": 8,
      "4": 20,
      "5": 100
    },
    "freeSpins": {
      "trigger": 3,
      "count": 10,
      "multiplier": 2
    },
    "cascade": false,
    "cascadeLadder": null,
    "ways": null,
    "symbols": [
      "crown",
      "ruby",
      "ace",
      "king",
      "queen",
      "ten",
      "jack",
      "wild",
      "scatter"
    ],
    "betOptions": [1, 2, 5, 10, 20, 50, 100, 200, 500]
  },
  "ways-243": {
    "id": "ways-243",
    "name": "Gem Ways 243",
    "cols": 5,
    "rows": 3,
    "mode": "ways",
    "betUnits": 1,
    "targetRtp": 0.955,
    "wild": "wild",
    "scatter": "scatter",
    "wildMultiplier": 1,
    "paylines": null,
    "paytable": {
      "ten": {
        "3": 0.15,
        "4": 0.4,
        "5": 1
      },
      "jack": {
        "3": 0.15,
        "4": 0.4,
        "5": 1
      },
      "queen": {
        "3": 0.25,
        "4": 0.6,
        "5": 1.5
      },
      "king": {
        "3": 0.3,
        "4": 0.8,
        "5": 2
      },
      "ace": {
        "3": 0.4,
        "4": 1,
        "5": 3
      },
      "ruby": {
        "3": 0.8,
        "4": 2,
        "5": 6
      },
      "crown": {
        "3": 1.5,
        "4": 5,
        "5": 15
      }
    },
    "scatterPays": {
      "3": 4,
      "4": 12,
      "5": 60
    },
    "freeSpins": {
      "trigger": 3,
      "count": 8,
      "multiplier": 3
    },
    "cascade": false,
    "cascadeLadder": null,
    "ways": 243,
    "symbols": [
      "crown",
      "ruby",
      "ace",
      "king",
      "queen",
      "ten",
      "jack",
      "wild",
      "scatter"
    ],
    "betOptions": [1, 2, 5, 10, 20, 50, 100, 200, 500]
  },
  "cascade-ways": {
    "id": "cascade-ways",
    "name": "Tumble Peaks",
    "cols": 5,
    "rows": 5,
    "mode": "ways",
    "betUnits": 1,
    "targetRtp": 0.955,
    "wild": "wild",
    "scatter": "scatter",
    "wildMultiplier": 1,
    "paylines": null,
    "paytable": {
      "ten": {
        "4": 0.6,
        "5": 2
      },
      "jack": {
        "4": 0.6,
        "5": 2
      },
      "queen": {
        "4": 0.9,
        "5": 3
      },
      "king": {
        "4": 1.2,
        "5": 4
      },
      "ace": {
        "3": 0.5,
        "4": 1.8,
        "5": 6
      },
      "ruby": {
        "3": 1,
        "4": 3.5,
        "5": 12
      },
      "crown": {
        "3": 2,
        "4": 8,
        "5": 28
      }
    },
    "scatterPays": {
      "3": 3,
      "4": 10,
      "5": 40
    },
    "freeSpins": {
      "trigger": 3,
      "count": 8,
      "multiplier": 2
    },
    "cascade": true,
    "cascadeLadder": [1, 2, 3, 5, 8],
    "ways": 3125,
    "symbols": [
      "crown",
      "ruby",
      "ace",
      "king",
      "queen",
      "ten",
      "jack",
      "wild",
      "scatter"
    ],
    "betOptions": [1, 2, 5, 10, 20, 50, 100, 200, 500]
  }
};

/** Белый список движков: ?engine= принимает только эти идентификаторы. */
export const ENGINE_IDS = ["classic-lines","ways-243","cascade-ways"];
