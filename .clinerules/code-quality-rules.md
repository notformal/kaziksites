# 🛡️ Code Quality Rules — Senior Developer Standards (25+ Years Experience)

## 🔥 ALWAYS APPLY when writing or reviewing code:

### 1. Pre-Code Generation Checklist (AI must do this mentally before writing)

```
BEFORE writing ANY line of code:

□ Purpose clear? — знаю ЗАЧЕМ это код
□ Smallest possible solution? — ищу самое простое решение  
□ Reusable elsewhere? — думаю о переиспользовании
□ Testable? — могу ли я это протестировать
□ Secure? — думаю о безопасности
□ Accessible? — думаю о доступности
```

### 2. Code Style Rules (Strict)

#### Naming Conventions
```javascript
// ✅ CORRECT
const MAX_RETRIES = 3;                    // UPPER_SNAKE для констант
const userName = 'John';                  // camelCase для переменных
function fetchUserData() { }              // camelCase для функций
function UserCard() { }                   // PascalCase для компонентов
class GameEngine { }                      // PascalCase для классов
const GAME_CONFIG = { }                   // UPPER_SNAKE для объектов-конфиг
let currentIndex = 0;                     // camelCase для let переменных

// ❌ WRONG
const max_retries = 3;                    // snake_case не используем
const MaxRetries = 3;                     // PascalCase для констант
function fetch_user_data() { }            // snake_case для функций
function user_card() { }                  // camelCase для компонентов
class gameEngine { }                      // camelCase для классов
```

#### Function Rules
```javascript
// ✅ Maximum 30 lines per function
// ✅ Early returns (нет глубокого вложенного кода)
// ✅ One responsibility per function
// ✅ Descriptive parameter names
// ✅ JSDoc comments

/**
 * formatUserProfile — форматирует данные профиля пользователя для отображения
 * 
 * @param {Object} userData — необработанные данные пользователя
 * @param {string} userData.name — имя пользователя
 * @param {string} userData.avatarUrl — URL аватара
 * @param {Array<string>} userData.badges — список бейджей
 * @param {FormatOptions} options — опции форматирования
 * @returns {UserProfileFormatted} Отформатированный профиль
 */
function formatUserProfile(userData, options) {
  // Early return для пустых данных
  if (!userData?.name) {
    return createDefaultProfile();
  }
  
  // Основная логика
  const displayName = userData.name.trim() || 'Anonymous';
  const avatarUrl = sanitizeUrl(userData.avatarUrl);
  
  return {
    displayName,
    avatarUrl,
    badges: formatBadges(userData.badges, options.badgeStyle),
  };
}

// ❌ WRONG: Deep nesting, too many responsibilities, no error handling
function processData(data) {
  if (data) {
    if (data.items) {
      if (data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          if (data.items[i].active) {
            console.log(data.items[i]); // console.log в production!
          }
        }
      }
    }
  }
}
```

#### Component Rules (React)
```javascript
/**
 * GameCard — Карточка игры в каталоге
 * 
 * @param {Object} props
 * @param {Game} props.game — объект игры
 * @param {(game: Game) => void} props.onPlay — обработчик запуска
 * @param {boolean} [props.isLoading] — флаг загрузки
 * @returns {JSX.Element} Карточка игры
 */
function GameCard({ game, onPlay, isLoading }) {
  // Max 5 props (checked!)
  // Max 3 state variables (checked!)
  // Component < 300 lines (checked!)
  
  const formattedTitle = useMemo(
    () => formatGameTitle(game.title),
    [game.title]
  );
  
  const handlePlayClick = useCallback(() => {
    onPlay(game);
  }, [game, onPlay]);
  
  // Early return для loading state
  if (isLoading) {
    return <LoadingSpinner aria-label="Загрузка карточки игры..." />;
  }
  
  return (
    <article
      className="game-card"
      role="region"
      aria-labelledby={`game-title-${game.id}`}
    >
      <img
        src={game.coverUrl}
        alt={`${formattedTitle} обложка`}
        loading="lazy"
        width={300}
        height={200}
      />
      <h3 id={`game-title-${game.id}`}>{formattedTitle}</h3>
      <button
        onClick={handlePlayClick}
        disabled={isLoading}
        aria-label={`Запустить игру ${formattedTitle}`}
      >
        {isLoading ? 'Загрузка...' : 'Играть'}
      </button>
    </article>
  );
}
```

### 3. Anti-Patterns (NEVER use)

```javascript
// ❌ God component (>300 lines)
// ❌ Prop drilling (>3 levels deep)
// ❌ dangerouslySetInnerHTML без санитизации
// ❌ setState(prev => { prev.push(x); return prev; }) — мутация состояния
// ❌ Inline objects in props: <Component style={{color: 'red'}} />
// ❌ Array index as key: .map((item, i) => <Comp key={i} />)
// ❌ Empty catch blocks: catch(e) {}
// ❌ console.log в production коде
// ❌ Глубокое вложение (>2 уровня)
// ❌ Callback hell
// ❌ eval() или new Function() с пользовательскими данными
// ❌ Магические числа и строки
// ❌ Функции > 30 строк
// ❌ Компоненты > 5 props
// ❌ Состояние > 3 переменных в компоненте
```

### 4. Required Patterns (ALWAYS use)

```javascript
// ✅ Early returns
// ✅ Strategy pattern для полиморфного поведения
// ✅ Factory functions для объектов
// ✅ Custom hooks для логики
// ✅ Composition для компонентов
// ✅ useMemo/useCallback ТОЛЬКО где нужно
// ✅ Lazy loading для тяжёлых компонентов
// ✅ Error boundary для изоляции ошибок
// ✅ JSDoc для всех экспортов
// ✅ try/catch для асинхронного кода
// ✅ Константы вместо магических значений
// ✅ ARIA labels на интерактивных элементах
// ✅ Keyboard navigation
// ✅ Semantic HTML
```

### 5. Security Rules (Non-negotiable)

```javascript
// ❌ Никогда:
dangerouslySetInnerHTML={{__html: userInput}}
eval(userInput)
new Function(userInput)
`${userInput}` in SQL queries

// ✅ Всегда:
sanitizeHtml(userInput)  // или DOMPurify
parameterizedQueries     // для SQL
inputValidation()        // валидировать все входные данные
.env для секретов        // не хардкодить
```

### 6. Accessibility Rules (Non-negotiable)

```javascript
// ✅ Semantic HTML (button, nav, main, article, section)
// ✅ ARIA labels на кнопках и интерактивных элементах
// ✅ Keyboard navigation (tab, enter, escape работают)
// ✅ Focus indicators visible (outline не none без замены)
// ✅ Color contrast WCAG AA (4.5:1 для текста)
// ✅ aria-live для динамического контента
// ✅ alt текст для изображений
// ✅ lang атрибут на html теге
```

### 7. Performance Rules

```javascript
// ✅ React.memo для дорогих компонентов
// ✅ useMemo для вычислений
// ✅ useCallback для функций-зависимостей
// ✅ React.lazy() для тяжёлых компонентов
// ✅ Virtual scrolling для списков > 100 элементов
// ✅ Lazy loading для изображений
// ✅ Code splitting по роутам/фичам
// ✅ Bundle size monitoring
```

### 8. Testing Requirements

```javascript
// ✅ Unit tests для чистых функций (>80% coverage)
// ✅ Component tests для критических компонентов
// ✅ Integration tests для user flows
// ✅ E2E tests для business critical flow
// ✅ Описательные test names (BDD style)
```

---

## 📋 AI Code Review Process (For Every Generated Code)

### Phase 1: Self-Audit (Before presenting code)

```
1. Check each rule above — mark ✓ or ✗
2. If any ✗ — fix before presenting
3. Calculate quality score (0-100)
4. Present code with score and noted improvements
```

### Phase 2: Quality Scoring

```
Architecture (25%): patterns, SOLID, separation of concerns
Code Quality (20%): style, naming, comments, function size
React Best Practices (15%): hooks, components, performance
Security (15%): input validation, XSS, secrets
Accessibility (10%): ARIA, keyboard, screen readers
Testing (10%): testability, pure functions
Performance (5%): memoization, lazy loading, bundle

≥ 90: ✅ APPROVE — senior+ quality
75-89: ⚠️ LIST specific improvements needed
60-74: ❌ REWRITE — major issues found
< 60: 🔴 REJECT — critical violations
```

### Phase 3: Presentation (When showing code to user)

```
1. Quality score с разбивкой по категориям
2. Что сделано правильно (позитивная обратная связь)
3. Конкретные улучшения (если < 100)
4. Предложенные паттерны с примерами
5. Какие gates пройдены / не пройдены
```

---

## 🎓 Senior Developer Mindset (Internalize This)

```
1. Simple > Clever — простое решение лучше умного
2. Readable > Compact — читаемость важнее компактности
3. Maintainable > Powerful — поддерживаемость важнее мощности
4. Testable > Assumed — тестируемое предположению
5. Secure > Convenient — безопасность важнее удобства
6. Accessible > Exclusive — доступность важнее эксклюзивности
7. Documented > Obvious — документированное очевидным НЕ является
8. Separated > Monolithic — разделённое монолитным НЕ является
9. Composed > Inherited — составленное наследованием НЕ является
10. Explicit > Implicit — явное скрытым НЕ является
```

---

## 📚 Quick Reference

| Rule | Standard |
|------|----------|
| Function length | ≤ 30 lines |
| Component file size | ≤ 300 lines |
| Component props | ≤ 5 |
| Component state vars | ≤ 3 |
| Nesting depth | ≤ 2 levels |
| Test coverage | > 80% |
| Lint warnings | 0 |
| Bundle (gzipped) | < 200KB |
| Color contrast | WCAG AA (4.5:1) |
| JSDoc | All exports |
| Naming convention | camelCase, PascalCase, UPPER_SNAKE |
| Comments style | WHY not WHAT |