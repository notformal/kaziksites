const cache = {};

export default class Symbol {
  constructor(name = Symbol.random()) {
    this.name = name;

    if (cache[name]) {
      this.img = cache[name].cloneNode();
    } else {
      this.img = new Image();
      this.img.src = Symbol.assets[name];

      cache[name] = this.img;
    }
  }

  static preload() {
    Symbol.symbols.forEach((symbol) => new Symbol(symbol));
  }

  static get symbols() {
    return ["gem","crown","star","bolt","moon","seven"];
  }

  static get assets(){return{gem:require('../assets/original/gem.svg'),crown:require('../assets/original/crown.svg'),star:require('../assets/original/star.svg'),bolt:require('../assets/original/bolt.svg'),moon:require('../assets/original/moon.svg'),seven:require('../assets/original/seven.svg')}}

  static random() {
    return this.symbols[Math.floor(Math.random() * this.symbols.length)];
  }
}
