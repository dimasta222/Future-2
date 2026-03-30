# Future Studio Constructor — Architecture Rules

## 1. Общий принцип
У каждого типа слоя своя логика поведения.  
Нельзя чинить text/image/shape через одну общую математику resize.

Типы:
- text
- image/upload
- shape/element

Resize dispatcher только маршрутизирует:
- resizeTextLayer(...)
- resizeImageLayer(...)
- resizeShapeLayer(...)

Dispatcher не содержит математику.

---

## 2. Text layer contract

### 2.1. Text content
Это:
- content/value
- fontSize
- lineHeight
- letterSpacing
- fontFamily
- align

### 2.2. Text box container
Это:
- position
- textBoxWidth
- визуальная рамка text layer

### 2.3. Правила
- side resize текста меняет только `textBoxWidth`
- side resize текста не меняет `fontSize`
- corner resize текста пропорциональный
- corner resize текста работает от fixed opposite corner
- текст можно сузить до вертикального столбца
- text box должен сразу синхронизироваться с текстом без blur/reselect

### 2.4. Метрики
Нужно разделять:
- **text content metrics** → только для "Фактический размер текста"
- **text box/container metrics** → только для selection frame / drag / resize

Запрещено:
- использовать factual text bounds как selection bounds
- использовать selection bounds как factual text size

### 2.5. DOM measurement
DOM measurement можно использовать:
- для factual text size
- для auto-height текста

DOM measurement нельзя использовать как stale source of truth для selection frame.

---

## 3. Image/upload layer contract

### 3.1. Upload initialization
Стартовые размеры изображения считаются только от:
- naturalWidth
- naturalHeight
- printable area bounds

Используется один общий scale factor.

Нельзя:
- считать width и height независимо
- допускать деформацию aspect ratio на upload path

### 3.2. Resize
- image corner resize сохраняет aspect ratio
- image resize логика живет только в resizeImageLayer(...)
- image upload sizing не должен чиниться через PreviewPanel hacks

### 3.3. Render
Preview render style изображения не должен ломать ratio.  
Нельзя использовать растягивающий CSS наподобие `object-fit: fill`, если он искажает картинку.

---

## 4. Shape/element layer contract

- shape resize живет только в resizeShapeLayer(...)
- text/image логика туда не попадает
- shape bounds считаются отдельно от text/image

---

## 5. Selection contract

### 5.1. Single selection
- selection frame строится по container bounds активного слоя
- не по factual content bounds

### 5.2. Multi selection
- общая рамка multiple selection строится по container bounds выбранных объектов
- не по буквам текста и не по внутреннему bitmap content

### 5.3. Overlay
Selection overlay не должен содержать бизнес-логику resize.  
Он только отображает текущие bounds и handles.

---

## 6. Snapping contract

Snapping — отдельная система.  
Она не должна подменять resize-математику.

Snapping работает с:
- container bounds слоя
- group bounds для multiselect
- print area guides
- object guides

Snapping не должен менять factual text metrics.

---

## 7. State contract

`useConstructorState.js` хранит:
- geometry слоя
- style слоя
- selection state
- history/clipboard state

State не должен смешивать:
- text content bounds
- text box bounds
- image upload sizing
- selection overlay logic

Если есть helper metrics, они должны явно говорить:
- это content metrics
или
- это container metrics

---

## 8. Preview contract

`ConstructorPreviewPanel.jsx` — orchestration/render слой.

Его ответственность:
- рендер preview
- pointer events
- вызов dispatcher/helper functions
- отображение overlays

Не его ответственность:
- длинная inline-математика resize для всех типов слоев
- смешанная логика text/image/shape

PreviewPanel не должен быть источником правды для всех геометрических правил.

---

## 9. Безопасные правила для будущих патчей

Перед любым патчем агент обязан определить:
1. Это text bug?
2. Это image/upload bug?
3. Это shape bug?
4. Это selection bug?
5. Это snapping bug?
6. Это state bug?
7. Это preview render bug?

Нельзя чинить image bug через text helpers.  
Нельзя чинить text bug через image math.  
Нельзя чинить selection bug через factual metrics.

---

## 10. Что трогать в зависимости от класса бага

### Если баг текста:
Смотреть только:
- resizeTextLayer(...)
- text metrics helpers
- text box/container bounds
- text factual size logic
- text render wrapper

### Если баг загрузки:
Смотреть только:
- upload/create-layer path
- image sizing helpers
- image render style
- resizeImageLayer(...)

### Если баг фигуры:
Смотреть только:
- resizeShapeLayer(...)
- shape bounds/render

### Если баг рамки/выделения:
Смотреть:
- selection overlay
- container bounds
- multiselect bounds

### Если баг snapping:
Смотреть:
- snapping helpers
- guide calculations
- container/group bounds

---

## 11. Что нельзя делать
Нельзя:
- возвращать общую resize-логику для всех слоев в один большой if/else
- использовать stale measured height как source of truth для active text box
- смешивать factual text size и selection box
- ломать image aspect ratio ради "fit"
- трогать несколько доменов сразу без необходимости

---

## 12. Обязательная проверка после любого патча

### Text
- FUTURE
- side resize
- corner resize
- vertical column
- sync text box

### Image
- wide image upload
- tall image upload
- square image upload
- corner resize
- aspect ratio preserved

### Shape
- resize shape unchanged

### Cross-check
- text patch не ломает image
- image patch не ломает text
- selection patch не ломает resize
- snapping patch не ломает bounds

---

## 13. Идеальный принцип проекта
Один тип слоя = одна resize-стратегия.  
Одна визуальная рамка = container bounds.  
Один factual size = content bounds.  
Один баг = один домен.  
Один фикс = минимальный patch.
