# 🤖 AI Code Review Engine — Senior-Level Quality Assurance

## 🎯 Purpose
Автоматическая проверка КАЖДОГО фрагмента кода, сгенерированного через локальную AI модель, на соответствие стандарту senior+ разработчика с 25+ годами опыта.

---

## 🔥 MANDATORY: Before ANY Code Generation (AI does this automatically)

### Step 1: Pre-Generation Self-Audit

```
BEFORE generating any code — CHECK:

□ All Quality Gates from AGENTS-CODE-REVIEW.md are met?
□ No critical anti-patterns present?
□ JSDoc written for EVERY export?
□ Component ≤ 300 lines?
□ Props ≤ 5, State vars ≤ 3?
□ Error handling for ALL async operations?
□ Accessibility (ARIA, keyboard nav)?
□ No console.log in production code?
□ Constants instead of magic numbers?
□ Naming convention followed?
```

### Step 2: Auto-Applied Senior Patterns

```javascript
// ✅ AUTOMATICALLY apply these patterns:

// 1. Early return pattern (no deep nesting)
function processGame(gameId) {
  const game = getGameById(gameId);
  if (!game) return null;
  if (!game.isActive) return null;
  
  // Main logic at surface level
  return formatGameData(game);
}

// 2. Strategy pattern instead of switch hell
const gameActions = {
  play: handlePlay,
  pause: handlePause,
  resume: handleResume,
};
gameActions[action]?.(gameId);

// 3. Custom hook for ANY complex logic
function useGameController(gameId) {
  const [state, setState] = useState({
    game: null,
    error: null,
    isLoading: false,
    isPaused: false,
  });
  
  useEffect(() => { /* ... */ }, [gameId]);
  
  return state;
}

// 4. Composition instead of prop drilling
<Modal>
  <Modal.Header>Game Controls</Modal.Header>
  <Modal.Body>{children}</Modal.Body>
  <Modal.Footer><Controls /></Modal.Footer>
</Modal>
```

---

## 🔍 Post-Generation Review Checklist (Automatic)

### Architecture Quality
```
□ Can this code be split into smaller modules?
□ Any god object/component? (>300 lines = ❌)
□ Can coupling between modules be reduced?
□ Composition over inheritance used?
```

### Code Quality
```
□ Each function ≤ 30 lines?
□ No code duplication?
□ Descriptive names? (no: data, temp, item2, func)
□ Comments explain WHY, not WHAT?
```

### React Specific
```
□ Component: ≤ 300 lines, ≤ 5 props, ≤ 3 state vars
□ Complex logic extracted to custom hooks?
□ Memoization used ONLY where needed?
□ Key props are stable and unique (no array index)?
□ Conditional rendering uses ternary (not && with 0)?
□ Event handlers don't use inline arrow functions unnecessarily?
```

### Performance
```
□ No unnecessary re-renders?
□ Lazy loading for heavy components?
□ Bundle size considered?
□ Code splitting by routes/features?
```

### Security
```
□ No dangerouslySetInnerHTML without sanitization?
□ All user input validated?
□ No eval() usage?
□ Dependencies audited?
□ Secrets in .env (not hardcoded)?
```

### Accessibility
```
□ Semantic HTML used correctly?
□ ARIA labels on interactive elements?
□ Keyboard navigation works (tab/enter/escape)?
□ Focus indicators visible?
□ Color contrast WCAG AA minimum?
□ aria-live for dynamic content?
```

---

## 📊 AI Code Quality Scoring System

Each generated code snippet is scored 0-100:

| Category | Weight | Score Criteria |
|----------|--------|----------------|
| Architecture | 25% | Patterns, separation of concerns, SOLID principles |
| Code Quality | 20% | Style, naming, comments, function size |
| React Best Practices | 15% | Hooks, components, performance |
| Security | 15% | Input validation, XSS prevention, secrets |
| Accessibility | 10% | ARIA, keyboard nav, screen readers |
| Testing Readiness | 10% | Testability, pure functions, mock points |
| Performance | 5% | Memoization, lazy loading, bundle size |

### Scoring Gates:
- **90-100**: ✅ Senior+ quality — APPROVE immediately
- **75-89**: ⚠️ Good with improvements — list specific enhancements
- **60-74**: ❌ Needs work — major issues found, rewrite recommended
- **Below 60**: 🔴 FAIL — critical violations detected

---

## 🚨 CRITICAL Anti-Patterns (NEVER generate these)

```javascript
// ❌ GOD COMPONENT
function App() { /* 2000+ lines */ }

// ❌ PROP DRILLING
<Component a={a} b={b} c={c} d={d} e={e} f={f} />

// ❌ UNSAFE HTML
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ❌ SYNC FETCH WITHOUT ERROR HANDLING
fetch(url).then(r => r.json()) // no try/catch

// ❌ MUTATING STATE
setState(prev => { prev.push(x); return prev; })

// ❌ INLINE OBJECTS IN PROPS
<Component style={{color: 'red'}} />

// ❌ ARRAY INDEX AS KEY
{items.map((item, i) => <Component key={i} />)}

// ❌ EMPTY CATCH
catch(e) {}

// ❌ console.log in production
console.log('debug:', data)

// ❌ DEEP NESTING
if (a) { if (b) { if (c) { if (d) { ... } } } }

// ❌ CALLBACK HELL
fetch(a, () => { fetch(b, () => { fetch(c, () => { ... }) }) })

// ❌ MAGICAL NUMBERS
const timeout = userLevel * 2.5 + 10; // What is 2.5? What is 10?

// ❌ MISSING JSDoc on exports
export function calculateScore(points) { /* no doc */ }
```

---

## ✅ SENIOR Patterns (ALWAYS prefer these)

```javascript
// ✅ Strategy Pattern for polymorphic behavior
const strategies = {
  bronze: calculateBronzeReward,
  silver: calculateSilverReward,
  gold: calculateGoldReward,
};
strategies[tier](points);

// ✅ Factory Function for immutable objects
function createGame(id, config) {
  return Object.freeze({
    id,
    ...config,
    play() { /* ... */ },
  });
}

// ✅ Observer Pattern for event-driven logic
class EventEmitter {
  #listeners = new Map();
  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(fn);
  }
  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(fn => fn(...args));
  }
}

// ✅ Composition Pattern for components
function Card({ children, header, footer }) {
  return (
    <article className="card">
      {header && <Card.Header>{header}</Card.Header>}
      <Card.Body>{children}</Card.Body>
      {footer && <Card.Footer>{footer}</Card.Footer>}
    </article>
  );
}

// ✅ Correct memoization
const filtered = useMemo(
  () => games.filter(g => g.category === category),
  [games, category]
);

// ✅ Lazy Loading for heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));

// ✅ Error boundary for isolation
class ErrorBoundary extends Component { /* ... */ }

// ✅ Custom hook for reusable async logic
function useGameState(gameId) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/games/${gameId}`);
        if (!mounted) return;
        const data = await res.json();
        setState(data);
      } catch (err) {
        if (!mounted) return;
        setError(err);
      }
    })();
    return () => { mounted = false; };
  }, [gameId]);
  
  return { state, error, isLoading: !state && !error };
}
```

---

## 📝 JSDoc Standard (REQUIRED for ALL exports)

```javascript
/**
 * GameCard — Карточка игры в каталоге
 * 
 * Отображает обложку, название, рейтинг и кнопки действий.
 * Поддерживает keyboard navigation и ARIA attributes.
 * 
 * @param {Object} props
 * @param {Game} props.game — данные игры (объект с полями: id, title, coverUrl, rating)
 * @param {(game: Game) => void} props.onPlay — callback при нажатии Play
 * @param {(game: Game) => void} props.onFavorite — callback при добавлении в избранное
 * @param {boolean} props.isFavorite — флаг, добавлена ли игра в избранное
 * @param {React.ReactNode} [props.extra] — дополнительный контент внутри карточки
 * @param {string} [props.className] — дополнительные CSS классы
 * @param {React.RefObject} [props.ref] — ref для корневого элемента
 * @returns {JSX.Element} Карточка игры
 * 
 * @example
 * <GameCard
 *   game={{ id: 1, title: 'Pac-Man', coverUrl: '/pacman.png', rating: 4.5 }}
 *   onPlay={(g) => launchGame(g.id)}
 *   isFavorite={true}
 * />
 * 
 * @example
 * // С кастомным контентом
 * <GameCard game={game} onPlay={handlePlay}>
 *   <Badge text="NEW" />
 * </GameCard>
 */
function GameCard({ game, onPlay, onFavorite, isFavorite, extra, className }) {
  // implementation
}
```

---

## 🧪 Pre-Commit Quality Gate (Auto-run)

```bash
# 1. Lint — zero warnings allowed
npm run lint -- --max-warnings=0

# 2. Format check
npx prettier --check "src/**/*.{js,jsx}"

# 3. Type check (if using PropTypes)
npm run test:prop-types

# 4. Unit tests
npm run test

# 5. Build verification
npm run build

# 6. Security audit
npm audit --production

# 7. Bundle analysis
npm run analyze
```

---

## 🤖 AI Generation Protocol (Local Model)

### Когда генерируешь код через локальную модель:

1. **Всегда начинай с JSDoc** — опиши назначение, параметры, возвращаемое значение, примеры использования
2. **Разбивай на функции** — каждая функция ≤ 30 строк, одна ответственность
3. **Используй early returns** — нет глубокого вложенного кода (>2 уровня)
4. **Константы вместо магических значений** — `const MAX_RETRIES = 3;`
5. **Error handling** — try/catch для всего асинхронного, fallbacks для данных
6. **Edge cases** — пустые данные, ошибки сети, loading states, null/undefined
7. **Комментарии** — объясняй ПОЧЕМУ решение такое, а не ЧТО делает код
8. **Naming** — описательные имена, `fetchGameList` вместо `fetch`, `userProfileData` вместо `data`
9. **Composition** — маленькие переиспользуемые компоненты вместо больших
10. **Performance first** — думай о memoization, re-renders, bundle size ДО написания кода

### Когда ревьюишь код:

1. **Проверяй КАЖДЫЙ gate** из Quality Gates
2. **Предлагай конкретные улучшения** с примерами кода (не "улучши", а "сделай так: ...")
3. **Объясняй почему** это важно (не "плохо", а "почему плохо и к чему приведёт")
4. **Учитывай контекст** — production vs prototype vs experiment
5. **Будь строгим** — если код не соответствует стандарту, укажи конкретные нарушения с номерами gates

---

## 📈 Continuous Improvement Loop

```
Code Generated → AI Pre-review → Score ≥ 90? → Approve
                    ↓ No              ↓ Yes
            Auto-fix issues      Commit
                    ↓
            Score ≥ 75?  
                ↓ No    ↓ Yes
           List     Commit
        improvements
                ↓
           Developer
         approves/rejects
```

---

## 📚 References

- [React Official Docs](https://react.dev)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Eslint Rules](https://eslint.org/docs/rules/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)