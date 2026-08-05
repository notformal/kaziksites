# AI Code Review & Generation Standards

## 🎯 Mission
Весь код, написанный через локальную AI модель, должен соответствовать уровню senior+ разработчика с 25+ годами опыта.

---

## 📋 Quality Gates (Обязательные проверки)

### 1. Architecture & Design
- [ ] **Separation of Concerns** — каждый модуль/компонент решает ОДНУ задачу
- [ ] **Single Responsibility** — нет "божественных объектов" или "god components"
- [ ] **Dependency Injection** — минимальная связанность между модулями
- [ ] **Composition over Inheritance** — использовать композицию паттернов
- [ ] **DRY** — нет дублирования кода более 2 раз
- [ ] **KISS** — максимально простое решение без излишней абстракции
- [ ] **YAGNI** — нет ненужных абстракций и предположений

### 2. React Best Practices
- [ ] **Component Size** — файл компонента ≤ 300 строк
- [ ] **Component Complexity** — ≤ 5 props, ≤ 3 state переменных
- [ ] **Custom Hooks** — сложная логика вынесена в кастомные хуки
- [ ] **Memoization** — useMemo/useCallback только где нужен memo
- [ ] **Key Props** — всегда стабильные, уникальные key в списках
- [ ] **Conditional Rendering** — нет `&&` с нулями, использовать тернарники
- [ ] **Event Handlers** — нет `onClick={() => handler(x)}` в JSX, использовать refs или curry
- [ ] **Context API** — для глобального состояния, не пропс-drilling > 3 уровней

### 3. Performance Standards
- [ ] **No unnecessary re-renders** — React.memo где нужно
- [ ] **Lazy loading** — крупные компоненты через React.lazy
- [ ] **Virtual scrolling** — списки > 100 элементов
- [ ] **Bundle size** — нет тяжелых библиотек для простых вещей
- [ ] **Code splitting** — по роутам/фичам
- [ ] **Image optimization** — lazy loading, modern formats

### 4. Security Standards
- [ ] **XSS Protection** — нет dangerouslySetInnerHTML без санитизации
- [ ] **Input Validation** — все пользовательские данные валидируются
- [ ] **CSRF** — токены для форм
- [ ] **CSP Headers** — настроены правильно
- [ ] **No eval()** — использовать Function.replace или парсеры
- [ ] **Dependency Audit** — npm audit --production
- [ ] **Secrets Management** — .env файлы в .gitignore

### 5. Code Style (Senior Convention)
- [ ] **Naming** — camelCase для переменных, PascalCase для компонентов, UPPER для констант
- [ ] **JSDoc** — все экспорты с JSDoc комментариями
- [ ] **Type Safety** — PropTypes для всех props
- [ ] **Error Handling** — try/catch для асинхронных операций
- [ ] **No console.log** — использовать logger/winston
- [ ] **Consistent Formatting** — Prettier форматирование
- [ ] **No Magic Numbers** — константы с описательными именами

### 6. Testing Standards
- [ ] **Unit Tests** — чистые функции > 80% покрытия
- [ ] **Component Tests** — критические компоненты
- [ ] **Integration Tests** — пользовательские flow
- [ ] **E2E Tests** — критический business flow
- [ ] **Test Names** — описательные, BDD стиль

### 7. Accessibility (a11y)
- [ ] **Semantic HTML** — правильные теги
- [ ] **ARIA Labels** — на интерактивных элементах
- [ ] **Keyboard Navigation** — tab/enter/escape работают
- [ ] **Focus Management** — visible focus indicators
- [ ] **Color Contrast** — WCAG AA minimum
- [ ] **Screen Reader** — aria-live для динамического контента

---

## 🔴 Critical Anti-Patterns (НИКОГДА не использовать)

```javascript
// ❌ GOD COMPONENT
function App() { /* 2000+ строк */ }

// ❌ PROP DRILLING
<Component a={a} b={b} c={c} d={d} e={e} f={f} />

// ❌ UNSAFE HTML
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ❌ SYNC IN browser
fetch(url).then(r => r.json()) // без try/catch

// ❌ MUTATING STATE
setState(prev => { prev.push(x); return prev; })

// ❌ INLINE OBJECTS IN PROPS
<Component style={{color: 'red'}} />

// ❌ ARRAY INDEX AS KEY
{items.map((item, i) => <Component key={i} />)}

// ❌ EMPTY CATCH
catch(e) {}

// ❌ console.log в production
console.log('debug:', data)

// ❌ DEEP NESTING
if (a) { if (b) { if (c) { if (d) { ... } } } }

// ❌ CALLBACK HELL
fetch(a, () => { fetch(b, () => { fetch(c, () => { ... }) }) })
```

---

## ✅ Senior-Level Patterns (ПРЕДПОЧИТАТЬ)

```javascript
// ✅ Strategy Pattern для изменяемого поведения
const strategies = {
  a: strategyA,
  b: strategyB,
};
strategies[type](data);

// ✅ Factory Function для создания объектов
function createGame(id, config) {
  return Object.freeze({
    id,
    ...config,
    play() { /* ... */ },
  });
}

// ✅ Observer Pattern для event-driven логики
class EventEmitter {
  #listeners = new Map();
  on(event, fn) { /* ... */ }
  emit(event, ...args) { /* ... */ }
}

// ✅ Composition Pattern для компонентов
function Card({ children, header, footer }) {
  return (
    <article className="card">
      {header && <Card.Header>{header}</Card.Header>}
      <Card.Body>{children}</Card.Body>
      {footer && <Card.Footer>{footer}</Card.Footer>}
    </article>
  );
}

// ✅ Memoization с правильными deps
const filtered = useMemo(
  () => games.filter(g => g.category === category),
  [games, category]
);

// ✅ Lazy Loading для крупных компонентов
const HeavyChart = lazy(() => import('./HeavyChart'));

// ✅ Error Boundary для изоляции
class ErrorBoundary extends Component { /* ... */ }

// ✅ Custom Hook для переиспользуемой логики
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

## 📝 JSDoc Standard (Обязательно для всех экспортов)

```javascript
/**
 * GameCard — компонент карточки игры
 * 
 * Отображает карточку игры с обложкой, названием, рейтингом
 * и кнопками действий (play, favorite).
 * 
 * @param {Object} props
 * @param {Game} props.game — данные игры
 * @param {(game: Game) => void} props.onPlay — callback при нажатии Play
 * @param {(game: Game) => void} props.onFavorite — callback при добавлении в избранное
 * @param {boolean} props.isFavorite — флаг избранного
 * @param {React.ReactNode} props.extra — дополнительный контент
 * @param {string} [props.className] — дополнительный класс
 * @returns {JSX.Element} Карточка игры
 * 
 * @example
 * <GameCard
 *   game={gameData}
 *   onPlay={handlePlay}
 *   isFavorite={true}
 * />
 */
function GameCard({ game, onPlay, onFavorite, isFavorite, extra, className }) {
  // implementation
}
```

---

## 🔧 Pre-Commit Checklist (Автоматическая проверка)

```bash
# 1. Lint
npm run lint -- --max-warnings=0

# 2. Format check
npx prettier --check "src/**/*.{js,jsx}"

# 3. Tests
npm run test

# 4. Build
npm run build

# 5. Security audit
npm audit --production

# 6. Bundle size
npm run analyze
```

---

## 📊 Code Quality Metrics (Senior Targets)

| Metric | Target | Threshold |
|--------|--------|-----------|
| Lint Errors | 0 | 0 |
| Lint Warnings | 0 | 3 |
| Test Coverage | >80% | 60% |
| Component Size | <300 lines | 500 lines |
| Max Props | ≤5 | 8 |
| Max State Vars | ≤3 | 5 |
| Bundle Size | <200KB gzipped | 300KB |
| LCP | <2.5s | 4s |
| CLS | <0.1 | 0.25 |
| Accessibility | WCAG AA | A |

---

## 🤖 AI Generation Rules

### При генерации кода через локальную модель:

1. **Всегда начинай с JSDoc** — описывай что делает функция/компонент
2. **Разбивай на функции** — каждая функция ≤ 30 строк
3. **Используй early returns** — нет глубокого вложенного кода
4. **Константы вместо магических значений** — `const MAX_RETRIES = 3;`
5. **Error handling** — try/catch для всего асинхронного
6. **Edge cases** — обрабатывай пустые данные, ошибки, loading
7. **Comments** — почему, а не что. Код должен быть self-explanatory
8. **Naming** — описательные имена, никаких `a`, `b`, `tmp`, `data2`
9. **Composition** — маленькие переиспользуемые компоненты
10. **Performance** — думай о memoization, re-renders, bundle size

### При ревью кода:

1. **Проверяй каждый gate** из Quality Gates выше
2. **Предлагай конкретные улучшения** с примерами кода
3. **Объясняй почему** это важно (не просто "плохо", а "почему плохо")
4. **Учитывай контекст** — production vs prototype
5. **Будь строгим** — если код не соответствует стандарту, укажи конкретные нарушения

---

## 📚 References

- [React Official Docs](https://react.dev)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Eslint Rules](https://eslint.org/docs/rules/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Performance](https://react.dev/learn/render-and-commit)