Веб сторінка, де користувач вводить список. 

Кожен елемент списку має:

1. текстове поле - зміст, вводиться користувачем, за замовчуванням пусте
2. числове поле - ціна, вводиться користувачем, за замовчуванням 0
3. числове поле - час , вводиться користувачем, за замовчуванням 0
4. кнопка - додати новий елемент
5. кнопка - додати вкладений список. Вкладений список має таку ж структуру, як і основний список. Може бути додана довільна кількість вкладених списків до кожного елемента списку.
6. кнопка - видалити елемент
7. в заголовку списку, як основного так і вкладених відображається загальна ціна та загальний час почного списку і вкладених якщо вони є.
8. список може бути експортовано в json файл. Також, користувач може завантажити список з json файлу.
9. користувач може редагувати елементи списку, в тому числі і вкладені. 
10. всі дані повинні зберігатися у локальному сховищі браузера. 
11. користувач може додавати нові списки. 
12. користувач може видаляти списки. 
13. користувач може редагувати списки. 

Інтерфейс 
1. простий
2. мінімалістичний
3. адаптивний для мобільних пристроїв.
4. тексотподібним. Унмкай рамок навколо полів, поле яке може бути редаговано має підкреслення
5. фон DADAD9
6. текст, підкреслення 465362
7. акценти C57B57 


За замовчуванням повинен бути створений один список з одним пустим елементом з курсором в полі зміст.

Назва проекту: lister.

Використовуй чистий html, css, javascript.

Code style and best practices:

TL;DR: Write semantic HTML for accessibility, use modular CSS with consistent naming (like BEM), and write modular, predictable JavaScript using modern ES6+ features and strict equality.

HTML: Structure & Semantics
Use semantic tags: Prefer <main>, <article>, <nav>, and <button> over generic <div> or <span> tags. This provides meaning to browsers, boosts SEO, and ensures screen reader accessibility.

Accessibility first: Always include alt attributes on <img> tags. Use alt="" if the image is purely decorative. Group form inputs with <label> tags linked via the for attribute.

Separate concerns: Keep styling in CSS and logic in JavaScript. Never use inline styles (style="color: red;") or inline event handlers (onclick="doSomething()").

Consistent syntax: Use lowercase for all tag names and attributes. Always enclose attribute values in double quotes (class="container").

CSS: Styling & Maintainability
Adopt a naming convention: Use a methodology like BEM (Block Element Modifier) to keep classes readable and avoid specificity wars (e.g., .card, .card__title, .card__title--large).

Keep specificity low: Avoid using IDs (#header) or overly nested selectors (.menu ul li a) for styling. Stick to flat class structures so styles can be easily overridden without relying on !important.

Mobile-first approach: Write default styles for small screens first. Use min-width media queries to add layout complexity as the viewport widens.

Leverage variables: Use CSS Custom Properties for colors, typography, and spacing to maintain a single source of truth across your stylesheet.

CSS
:root {
  --primary-color: #2563eb;
  --spacing-md: 1rem;
}
JavaScript: Logic & Modern Syntax
Variable declarations: Use const by default to prevent accidental reassignment. Only use let if the value must change in loops or logic. Never use var.

Strict equality: Always use === and !==. Avoid == and != to prevent bugs caused by automatic type coercion.

Naming conventions: Use camelCase for variables and functions (getUserData), PascalCase for classes and components (UserProfile), and UPPER_SNAKE_CASE for global constants (MAX_RETRIES).

Protect the global scope: Wrap code in ES6 modules (import/export) to encapsulate logic and prevent variable collisions across different scripts.

Modern ES6+ syntax: Use arrow functions for concise callbacks, destructuring to extract object properties, and template literals (`User: ${name}`) instead of string concatenation.

Asynchronous error handling: Always use try...catch blocks when using async/await to handle network failures or promise rejections gracefully.