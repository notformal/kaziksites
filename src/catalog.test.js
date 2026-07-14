import{describe,expect,it}from'vitest';import{games,categories}from'./catalog';
describe('catalog',()=>{
 it('contains 240 unique games',()=>{expect(games).toHaveLength(240);expect(new Set(games.map(g=>g.id)).size).toBe(240)});
 it('uses only known categories',()=>{expect(games.every(g=>categories.includes(g.category))).toBe(true)});
 it('has complete display metadata',()=>{expect(games.every(g=>g.title&&g.studio&&g.icon&&g.rating)).toBe(true)});
});
