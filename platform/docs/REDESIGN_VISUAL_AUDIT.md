# Visual/UX audit: donors vs Aurora, Ember, Royale

Дата проверки: 14 июля 2026. Проверено в Chromium через Playwright на 1440×900 и 390×844. Аудит касается только композиции, визуальной системы и UX. Чужие логотипы, иллюстрации, торговые марки и тексты не должны переноситься в продукт.

## Evidence

| Проект | Desktop | Mobile |
|---|---|---|
| BitPlay | [`bitplay-desktop.png`](../output/visual-audit/bitplay-desktop.png) | [`bitplay-mobile.png`](../output/visual-audit/bitplay-mobile.png) |
| PlayGames2026 | [`playgames-desktop.png`](../output/visual-audit/playgames-desktop.png) | [`playgames-mobile.png`](../output/visual-audit/playgames-mobile.png) |
| Aurora | [`aurora-desktop.png`](../output/visual-audit/aurora-desktop.png) | [`aurora-mobile.png`](../output/visual-audit/aurora-mobile.png) |
| Ember | [`ember-desktop.png`](../output/visual-audit/ember-desktop.png) | [`ember-mobile.png`](../output/visual-audit/ember-mobile.png) |
| Royale | [`royale-desktop.png`](../output/visual-audit/royale-desktop.png) | [`royale-mobile.png`](../output/visual-audit/royale-mobile.png) |

Отдельный runtime Ember на ожидаемом порту `8281` во время аудита не был запущен. Визуальная тема проверена через production lobby `/?brand=ember`.

## Executive verdict

Текущие Aurora, Ember и Royale визуально не соответствуют классу donor-сайтов. Это один минималистичный portfolio-template с тремя палитрами, а не три самостоятельных игровых бренда. В нём присутствует технический каталог, но отсутствуют коммерческая плотность, богатая игровая графика, навигационная модель casino lobby, сильная промо-зона и ощущение живого продукта.

Главный провал: пользователь видит не бренд и не игры, а обязательное служебное объяснение про виртуальные кредиты. После него он получает десятки почти одинаковых карточек с emoji. Доноры, даже при собственных UX-недостатках, с первого viewport показывают идентичность, способы входа, промо, платформы, живые игры и яркие игровые превью.

## Что делают доноры

### Композиция

BitPlay и PlayGames2026 используют application shell, а не лендинг-портфолио:

- постоянный header с брендом, входом и регистрацией;
- desktop sidebar с разделами и быстрыми сценариями;
- промо/offer panel занимает верхнюю рабочую область;
- сразу под ней идут live wins и ряды настоящих игровых постеров;
- контент организован горизонтальными shelves/carousels и плотными сетками;
- дальше расположены промо, leaderboard, trust/how-it-works и footer.

PlayGames2026 лучше BitPlay использует desktop-ширину: shell 250 px + контент, hero в две части, 5 игровых карточек в строке, leaderboard и большая промо-плашка. На mobile shell упрощён, но порядок ценности сохраняется: бренд → промо → live wins → игры → программы/платформы.

### Типографика

Доноры используют узкий display face для заголовков и UI-labels. Это создаёт arcade/casino voice и позволяет уместить больше информации. Body-текст нейтральный, компактный и вторичный. Иерархия строится не гигантским hero-заголовком, а контрастом display headings, цветных labels, цены/метрик и CTA.

### Density и ритм

У доноров высокая информационная плотность: каждые 250–500 px по вертикали пользователь получает новый интерактивный блок. Карточки имеют разные реальные изображения и легко сканируются по силуэту. Пустого фона мало. На desktop контент ограничен понятной колонкой, но используется почти вся её ширина.

### Navigation

Навигация у доноров отражает реальные задачи: games/platforms, promotions, events, FAQ/support, account/auth. В мобильном header остаются brand, sign in и menu. Контентные переходы дублируются внутри страницы через секции и CTA.

### Catalog imagery

Ключевое отличие доноров: карточка продаёт конкретную игру через полноценный key art. Разные персонажи, сцены, композиции, логотипы и цветовые доминанты дают визуальный ритм. Форматы выдержаны, текст нанесён предсказуемо, hover CTA не заменяет само изображение.

### Conversion patterns

Без переноса механики реальных денег можно безопасно переиспользовать структуру:

- два чётких auth CTA в header;
- один главный CTA в промо/hero;
- live/recent strip как social proof;
- popular/new/trending shelves до полного каталога;
- daily virtual reward как retention CTA;
- profile progress, quests и коллекции как причина вернуться;
- search и categories всегда рядом с каталогом;
- игра открывается по всей карточке, favorite остаётся отдельным действием;
- sticky mobile bottom nav для Home, Games, Rewards, Favorites, Profile.

Не следует копировать deposit/withdrawal, crypto, cash bonus, реальные выигрыши или чужие ложные testimonials. Платформа остаётся virtual-credit social arcade.

## Почему текущий дизайн выглядит непрофессионально

### 1. Первый экран заблокирован onboarding

На всех шести текущих скриншотах поверх hero отображается `WELCOME · 1 OF 3`. Модалка не является бренд-опытом и не даёт увидеть продукт. Крестик визуально отображается белым квадратом с почти невидимой иконкой. Это производит впечатление незавершённого UI и снижает доверие ещё до первой игры.

Исправление: первый экран всегда показывает brand shell и playable catalog. Информация о virtual credits должна быть компактной trust note под CTA. Полный onboarding открывается после регистрации или по явному запросу.

### 2. Hero декоративный, а не продуктовый

После модалки виден огромный абстрактный градиентный шар с символами `7`, звезда и корона. У него нет игрового сюжета, продукта, промо или понятного CTA. Большая часть первого viewport выглядит пустой.

Исправление: заменить на самостоятельную hero-композицию для каждого бренда: оригинальная key visual, 1 headline, 1 benefit, primary `Play featured`, secondary `Browse games`, compact balance/reward status. Не использовать чужие изображения.

### 3. Три бренда не являются тремя дизайнами

Aurora и Ember отличаются почти только зелёным/оранжевым accent. Royale добавляет serif в несколько заголовков. Layout, content, карточки, модалки, section order и изображения идентичны. Даже Ember/Royale activity list содержит `Aurora Orchard`, что разрушает правдоподобие бренда.

Исправление: общими могут быть API и primitives, но каждый бренд обязан иметь собственные art direction, logo lockup, shell, hero layout, card treatment, section choreography, tone of voice и motion language.

### 4. Emoji вместо game art

Каталог состоит из крупного emoji на радиальном свечении. Несколько символов повторяются: ракета, puzzle, target, gamepad, joystick. В результате 200 игр воспринимаются как 10 переименованных заглушек. Фейковые рейтинги 4.0–4.9, циклически расставленные по карточкам, усиливают ощущение сгенерированного наполнителя.

Исправление: каждой реально доступной игре нужен оригинальный thumbnail 16:9 или 4:5, полученный из разрешённого open-source gameplay/captured screenshot либо созданный как собственный брендовый key art. Нельзя показывать рейтинг без источника; заменить на честные теги `New`, `Popular`, `Quick`, `Multiplayer`, `Table`, `Original`.

### 5. Каталог начинается как inventory dump

На mobile подряд показаны 24 почти одинаковые карточки до следующего смыслового блока. На desktop сразу показана 6×4 сетка. Нет featured row, continue playing, originals, popular now, slots, table, quick games. Пользователь должен сам разбираться в сыром списке.

Исправление: первые 20–30 игр курировать вручную, остальное раскрывать shelves и фильтрами. На mobile использовать horizontal shelves по 1.35–1.6 карточки в viewport, а не бесконечную двухколоночную стену.

### 6. Нет рабочего app shell

На скриншотах текущих брендов header/nav не читается. После hero сразу начинается коллекция. Нет постоянно доступных auth, profile, balance, favorites, rewards и help. Доноры ощущаются приложениями; текущий сайт ощущается длинным маркетинговым шаблоном.

Исправление: desktop left rail 216–240 px или top shell 72 px со secondary category bar. Mobile header + bottom navigation. Balance и virtual reward должны быть видимы после авторизации.

### 7. Слишком много пустого пространства

Hero занимает около 900 px desktop и 800 px mobile до каталога, но почти ничего не сообщает. Между крупными блоками также 120–200 px пустоты. Это editorial spacing без editorial content.

Исправление: целевой первый полезный игровой shelf должен начинаться в пределах 650–760 px desktop и 520–650 px mobile. Вертикальный шаг секций 56–88 px desktop, 40–64 px mobile.

### 8. Social proof выглядит как admin dashboard

`Played here. Counted here.` содержит таблицы settled rounds, technical game IDs и псевдонимы. Это честные данные, но форма похожа на observability dashboard, не на развлекательный продукт. `687 settled rounds` при `17 anonymous players` доминирует сильнее самих игр.

Исправление: компактная live activity ticker/shelf с human-readable titles, avatar color, game art и virtual-credit win. Полный leaderboard оставить отдельной страницей или drawer. Не придумывать activity.

### 9. Слабая typographic voice

Aurora/Ember используют нейтральный grotesk, Royale механически переключает крупные заголовки на serif. Это не формирует уникальный бренд. На mobile крупные заголовки ломаются в неудобных местах, а мелкие metadata и footer слишком тусклые.

Исправление: отдельная typography scale для каждого бренда, максимум два семейства, осмысленная ширина заголовка, minimum 14 px для важных metadata, line-height 1.35–1.55 для body.

### 10. Visual QA предыдущей версии был формальным

Техническое отсутствие horizontal overflow и console errors не означает хорошего дизайна. Скриншоты показывают формально работающую страницу, но не подтверждают качество композиции, brand distinctness, качество изображений или похожесть на donor product category.

## Три самостоятельных art directions

### Aurora: cinematic sci-fi arcade

- Shell: тёмный graphite/navy, acid-lime только для активных состояний, cyan secondary.
- Hero: оригинальная космическая сцена с одним flagship original, интерфейсные HUD-слои минимальны.
- Cards: 16:9 cinematic thumbnails, 4.5 карты desktop, 1.45 mobile carousel.
- Typography: wide geometric display + neutral UI sans.
- Sections: Featured tonight → Aurora Originals → Quick play → Table lab → All games.
- Motion: мягкий parallax, scan glow только на hover/focus, 160–240 ms.

### Ember: energetic social club

- Shell: warm black/burgundy, orange, coral, magenta; никаких перекрашенных Aurora-компонентов.
- Hero: асимметричная collage-композиция, крупный seasonal challenge и progress.
- Cards: 4:5 poster art, badges встроены в image composition, более плотная типографика.
- Typography: condensed italic display + compact sans.
- Sections: Live now → Weekly challenge → Hot streak → Arcade battles → Full library.
- Motion: быстрые slide/scale transitions, restrained sparks/confetti только после результата.

### Royale: premium game house

- Shell: ink/forest, parchment, muted gold; избегать casino-kitsch и чрезмерного свечения.
- Hero: editorial split layout с крупной оригинальной иллюстрацией и curated collection.
- Cards: спокойные 3:2 art tiles с рамками, номера коллекций и короткие curator notes.
- Typography: high-contrast serif display + humanist sans UI.
- Sections: House selection → New arrivals → Strategy room → Arcade salon → Complete archive.
- Motion: fade/clip reveals 240–360 ms, тактильные gold focus states.

## Общая целевая architecture страницы

1. Persistent shell: logo, Games, Rewards, Activity, Help, search, balance/profile.
2. Hero 560–680 px desktop / 380–500 px mobile с реальным featured game.
3. Continue/Recently played, если есть история; иначе Popular now.
4. Brand Originals, максимум 6 curated cards.
5. Category shelves с настоящими thumbnails.
6. Daily virtual reward / quests как retention block.
7. Compact live activity и leaderboard teaser.
8. All games explorer с search, filter, sort и pagination/virtualization.
9. Trust/fairness/help блок.
10. Compact legal footer.

## Asset rules

- Использовать только assets с подтверждённой лицензией, собственные captures из интегрированных open-source игр или созданный с нуля art.
- Для каждого внешнего asset сохранять source, author, license, modification и attribution requirement.
- Не использовать донорские логотипы, персонажей, screenshots, promo art или тексты.
- Не выдавать один renderer/reskin за множество уникальных игр.
- Не генерировать фейковые ratings, online count, winners или testimonials.
- Для game thumbnails: единый safe area, минимум 1280×720 master, WebP/AVIF derivatives, blur placeholder, осмысленный alt.

## Measurable acceptance criteria

- Three-brand visual similarity test: при переводе в grayscale и скрытом logo layouts всё ещё различимы.
- Первый interactive game card виден без scroll на desktop и не дальше 1.25 mobile viewport.
- Onboarding не блокирует новый anonymous visit.
- Не менее 30 featured/top games имеют уникальные лицензированные или собственные thumbnails до клиентской демонстрации; остальные не показываются как emoji fillers.
- Повторяющийся thumbnail ratio среди первых 24 карточек: 0.
- Все игровые названия и metadata отражают реальные game IDs; нет cross-brand названий.
- Desktop: минимум 4 карточки visible в первом shelf; mobile: 1.3–1.6 карточки carousel.
- Header/auth/search/profile доступны на любой scroll position.
- Skeletons, empty states и image-error states оформлены, broken images отсутствуют.
- Visual regression screenshots: 1440×900, 1280×720, 768×1024, 390×844, 360×800.
- Проверка контраста WCAG AA, keyboard focus, reduced motion и touch target ≥44 px.
- Финальный review оценивает не только ошибки браузера, но и hierarchy, imagery, density, uniqueness, content truthfulness и donor-category fit.

## Priority order

**P0:** убрать blocking onboarding; создать полноценный shell; заменить abstract orb; прекратить показ emoji-каталога; подготовить реальные thumbnails первых 30 игр.

**P1:** разделить три brand layouts; собрать curated shelves; сделать mobile bottom nav; привести activity/leaderboard к entertainment UI.

**P2:** расширить art library до всего реально демонстрируемого каталога; добавить brand-specific motion; провести accessibility и visual-regression pass.

До выполнения P0 сайты не следует показывать клиенту как high-end casino/social-arcade showcase.
