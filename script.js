(function () {
  "use strict";

  const STORAGE_KEY = "dayPlanAppData";
  const APP_VERSION = 1;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const categories = [
    { id: "work", label: "Работа", color: "#66788f", icon: "💻" },
    { id: "children", label: "Дети", color: "#8ccae8", icon: "🧒" },
    { id: "birthday", label: "Дни рождения", color: "#eba5bd", icon: "🎁" },
    { id: "home", label: "Дом", color: "#efbd99", icon: "🏠" },
    { id: "health", label: "Здоровье", color: "#94d5c0", icon: "+" },
    { id: "personal", label: "Личное", color: "#b99add", icon: "☕" }
  ];

  const priorities = [
    { id: "high", label: "Высокий", mark: "!" },
    { id: "normal", label: "Обычный", mark: "•" },
    { id: "low", label: "Низкий", mark: "-" }
  ];

  const repeatOptions = [
    { id: "none", label: "Не повторять" },
    { id: "daily", label: "Каждый день" },
    { id: "weekly", label: "Каждую неделю" },
    { id: "monthly", label: "Каждый месяц" },
    { id: "yearly", label: "Каждый год" },
    { id: "weekdays", label: "По выбранным дням недели" }
  ];

  const viewLabels = {
    day: "День",
    week: "Неделя",
    month: "Месяц",
    year: "Год"
  };

  const monthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь"
  ];

  const weekdayShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const state = {
    activeView: "week",
    activeDate: new Date(),
    data: null,
    activeCategories: new Set(categories.map((category) => category.id)),
    pendingTask: null,
    pendingOperation: null,
    formMode: "create",
    editingContext: null,
    pendingScopeAction: null,
    pendingDelete: null
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function toISODate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseISODate(isoDate) {
    return new Date(`${isoDate}T00:00:00`);
  }

  function addDays(date, amount) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + amount);
    return nextDate;
  }

  function addMonths(date, amount) {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + amount);
    return nextDate;
  }

  function addYears(date, amount) {
    const nextDate = new Date(date);
    nextDate.setFullYear(nextDate.getFullYear() + amount);
    return nextDate;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfWeek(date) {
    const normalized = startOfDay(date);
    const day = normalized.getDay() || 7;
    return addDays(normalized, 1 - day);
  }

  function endOfWeek(date) {
    return addDays(startOfWeek(date), 6);
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function startOfMonthGrid(date) {
    return startOfWeek(startOfMonth(date));
  }

  function endOfMonthGrid(date) {
    return endOfWeek(endOfMonth(date));
  }

  function daysBetween(startDate, endDate) {
    return Math.round((startOfDay(endDate) - startOfDay(startDate)) / MS_PER_DAY);
  }

  function getISOWeekday(date) {
    return date.getDay() || 7;
  }

  function getCategory(categoryId) {
    return categories.find((category) => category.id === categoryId) || categories[0];
  }

  function getPriority(priorityId) {
    return priorities.find((priority) => priority.id === priorityId) || priorities[1];
  }

  function makeTask(overrides) {
    const now = new Date().toISOString();
    return {
      id: `task_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      title: "",
      category: "personal",
      date: toISODate(new Date()),
      isAllDay: true,
      startTime: "",
      endTime: "",
      priority: "normal",
      repeat: {
        type: "none",
        weekdays: []
      },
      note: "",
      excludedDates: [],
      sourceRecurringId: null,
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
  }

  function createDemoTasks(baseDate) {
    const today = new Date(baseDate);
    const tomorrow = addDays(today, 1);
    const healthDay = addDays(today, 3);
    const personalDay = addDays(today, 5);
    const birthdayDay = addDays(today, 30);

    return [
      makeTask({
        title: "Рабочая встреча",
        category: "work",
        date: toISODate(today),
        isAllDay: false,
        startTime: "10:00",
        endTime: "11:00",
        priority: "high",
        note: "Демонстрационная задача"
      }),
      makeTask({
        title: "Занятие ребенка",
        category: "children",
        date: toISODate(tomorrow),
        isAllDay: false,
        startTime: "16:00",
        endTime: "17:00",
        priority: "normal",
        note: "Демонстрационная задача"
      }),
      makeTask({
        title: "Купить продукты для дома",
        category: "home",
        date: toISODate(today),
        isAllDay: true,
        priority: "normal",
        note: "Демонстрационная задача"
      }),
      makeTask({
        title: "Записаться к врачу",
        category: "health",
        date: toISODate(healthDay),
        isAllDay: true,
        priority: "high",
        note: "Демонстрационная задача"
      }),
      makeTask({
        title: "Личное время",
        category: "personal",
        date: toISODate(personalDay),
        isAllDay: false,
        startTime: "19:00",
        endTime: "20:00",
        priority: "low",
        note: "Демонстрационная задача"
      }),
      makeTask({
        title: "День рождения Анны",
        category: "birthday",
        date: toISODate(birthdayDay),
        isAllDay: true,
        priority: "normal",
        repeat: {
          type: "yearly",
          weekdays: []
        },
        note: "ДР"
      })
    ];
  }

  function createInitialData(baseDate) {
    return {
      version: APP_VERSION,
      demoSeeded: true,
      tasks: createDemoTasks(baseDate)
    };
  }

  function readData(storage, baseDate) {
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) {
      const initialData = createInitialData(baseDate);
      storage.setItem(STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }

    try {
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.tasks)) {
        throw new Error("Invalid app data");
      }

      return {
        version: parsed.version || APP_VERSION,
        demoSeeded: Boolean(parsed.demoSeeded),
        tasks: parsed.tasks
      };
    } catch (error) {
      const initialData = createInitialData(baseDate);
      storage.setItem(STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }
  }

  function saveData(storage, data) {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function updateStorageStatus() {
    const storageStatus = document.getElementById("storage-status");
    if (storageStatus && state.data) {
      storageStatus.textContent = `Сохранено записей: ${state.data.tasks.length}`;
    }
  }

  function getVisibleStoredTasks() {
    return (state.data?.tasks || []).filter((task) => state.activeCategories.has(task.category));
  }

  function getStoredTask(taskId) {
    return state.data?.tasks.find((task) => task.id === taskId) || null;
  }

  function isRecurringTask(task) {
    return (task?.repeat?.type || "none") !== "none";
  }

  function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function hasTimeOverlap(firstStart, firstEnd, secondStart, secondEnd) {
    return timeToMinutes(firstStart) < timeToMinutes(secondEnd) && timeToMinutes(firstEnd) > timeToMinutes(secondStart);
  }

  function getCurrentPeriodLabel(date, view) {
    if (view === "week") {
      const start = startOfWeek(date);
      const end = endOfWeek(date);
      return `Неделя • ${start.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short"
      })} - ${end.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })}`;
    }

    if (view === "month") {
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }

    if (view === "year") {
      return `Год • ${date.getFullYear()}`;
    }

    return `${viewLabels[view]} • ${date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })}`;
  }

  function createTimeOptions() {
    const options = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 15) {
        options.push(`${pad(hour)}:${pad(minute)}`);
      }
    }
    return options;
  }

  function fillSelect(select, options, selectedId) {
    if (!select) {
      return;
    }

    select.innerHTML = "";
    options.forEach((option) => {
      const element = document.createElement("option");
      element.value = option.id || option;
      element.textContent = option.label || option;
      if ((option.id || option) === selectedId) {
        element.selected = true;
      }
      select.appendChild(element);
    });
  }

  function taskOccursOnDate(task, targetDate) {
    const taskStartDate = parseISODate(task.date);
    const targetISO = toISODate(targetDate);
    const repeatType = task.repeat?.type || "none";

    if (targetDate < taskStartDate) {
      return false;
    }

    if (task.excludedDates?.includes(targetISO)) {
      return false;
    }

    if (repeatType === "none") {
      return task.date === targetISO;
    }

    if (repeatType === "daily") {
      return true;
    }

    if (repeatType === "weekly") {
      return getISOWeekday(taskStartDate) === getISOWeekday(targetDate);
    }

    if (repeatType === "monthly") {
      return taskStartDate.getDate() === targetDate.getDate();
    }

    if (repeatType === "yearly") {
      return taskStartDate.getDate() === targetDate.getDate() && taskStartDate.getMonth() === targetDate.getMonth();
    }

    if (repeatType === "weekdays") {
      return Boolean(task.repeat?.weekdays?.includes(getISOWeekday(targetDate)));
    }

    return false;
  }

  function sortTasks(first, second) {
    if (first.isAllDay !== second.isAllDay) {
      return first.isAllDay ? -1 : 1;
    }

    return (first.startTime || "99:99").localeCompare(second.startTime || "99:99") || first.title.localeCompare(second.title);
  }

  function getTaskOccurrencesForRange(tasks, startDate, endDate) {
    const occurrences = [];
    const totalDays = daysBetween(startDate, endDate);

    for (let offset = 0; offset <= totalDays; offset += 1) {
      const date = addDays(startDate, offset);
      const dateISO = toISODate(date);

      tasks.forEach((task) => {
        if (taskOccursOnDate(task, date)) {
          occurrences.push({
            ...task,
            occurrenceDate: dateISO,
            originalDate: task.date,
            isRecurringInstance: (task.repeat?.type || "none") !== "none"
          });
        }
      });
    }

    return occurrences.sort(sortTasks);
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function renderTaskCard(task, compact) {
    const category = getCategory(task.category);
    const priority = getPriority(task.priority);
    const card = createElement("article", `task-card category-${category.id} priority-${priority.id}${compact ? " is-compact" : ""}`);
    card.dataset.taskId = task.id;
    card.dataset.date = task.occurrenceDate;
    card.title = "Двойной щелчок — редактировать";

    const priorityMark = createElement("span", "priority-mark", priority.mark);
    priorityMark.title = `Приоритет: ${priority.label}`;
    card.appendChild(priorityMark);

    const actions = createElement("div", "task-actions");
    const editButton = createElement("button", "task-action", "✎");
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.title = "Редактировать";
    editButton.setAttribute("aria-label", "Редактировать");
    const moveButton = createElement("button", "task-action", "⇄");
    moveButton.type = "button";
    moveButton.dataset.action = "move";
    moveButton.title = "Перенести";
    moveButton.setAttribute("aria-label", "Перенести");
    const deleteButton = createElement("button", "task-action danger-action", "×");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.title = "Удалить";
    deleteButton.setAttribute("aria-label", "Удалить");
    actions.append(editButton, moveButton, deleteButton);

    const content = createElement("div", "task-card-content");
    const meta = createElement("div", "task-meta");

    if (!task.isAllDay && task.startTime && task.endTime) {
      meta.appendChild(createElement("span", "task-time", `${task.startTime}-${task.endTime}`));
    }

    const categoryBadge = createElement("span", "category-badge");
    categoryBadge.appendChild(createElement("span", `category-icon category-icon-${category.id}`, category.icon));
    categoryBadge.appendChild(createElement("span", "", category.label));
    meta.appendChild(categoryBadge);

    if (task.category === "birthday") {
      meta.appendChild(createElement("span", "birthday-badge", "ДР"));
    }

    if (task.isRecurringInstance) {
      meta.appendChild(createElement("span", "repeat-badge", "Повтор"));
    }

    content.appendChild(meta);
    content.appendChild(createElement("h4", "task-title", task.title));
    const note = (task.note || "").trim();
    if (note && note !== "ДР") {
      content.appendChild(createElement("p", "task-note", note));
    }
    card.appendChild(content);
    card.appendChild(actions);

    return card;
  }

  function renderTaskList(container, tasks, compact) {
    tasks.forEach((task) => {
      container.appendChild(renderTaskCard(task, compact));
    });
  }

  function getTasksForDate(date) {
    return getTaskOccurrencesForRange(getVisibleStoredTasks(), startOfDay(date), startOfDay(date));
  }

  function renderDayView(root) {
    const tasks = getTasksForDate(state.activeDate);
    const allDayTasks = tasks.filter((task) => task.isAllDay);
    const timedTasks = tasks.filter((task) => !task.isAllDay);
    const view = createElement("div", "day-view");

    const allDaySection = createElement("section", "all-day-section");
    allDaySection.appendChild(createElement("h3", "section-title", "Задачи без времени"));
    const allDayList = createElement("div", "all-day-list");
    renderTaskList(allDayList, allDayTasks, false);
    allDaySection.appendChild(allDayList);
    view.appendChild(allDaySection);

    const timeline = createElement("section", "timeline compact-timeline");
    timeline.setAttribute("aria-label", "Занятое время");

    timedTasks.forEach((task) => {
      const timeBlock = createElement("div", "booked-time-row");
      timeBlock.dataset.time = `${task.startTime}-${task.endTime}`;
      timeBlock.appendChild(createElement("div", "booked-time-label", `${task.startTime}-${task.endTime}`));
      const taskSlot = createElement("div", "booked-time-task");
      taskSlot.appendChild(renderTaskCard(task, false));
      timeBlock.appendChild(taskSlot);
      timeline.appendChild(timeBlock);
    });

    view.appendChild(timeline);
    root.appendChild(view);
  }

  function renderWeekView(root) {
    const start = startOfWeek(state.activeDate);
    const end = endOfWeek(state.activeDate);
    const tasks = getTaskOccurrencesForRange(getVisibleStoredTasks(), start, end);
    const view = createElement("div", "week-view");

    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(start, offset);
      const dateISO = toISODate(date);
      const dayTasks = tasks.filter((task) => task.occurrenceDate === dateISO);
      const column = createElement("section", "week-day");
      column.dataset.date = dateISO;
      column.tabIndex = 0;
      column.title = "Открыть день";

      const heading = createElement("div", "week-day-heading");
      heading.appendChild(createElement("strong", "", weekdayShort[offset]));
      heading.appendChild(createElement("span", "", date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })));
      column.appendChild(heading);

      const list = createElement("div", "week-task-list");
      renderTaskList(list, dayTasks.filter((task) => task.isAllDay), true);
      renderTaskList(list, dayTasks.filter((task) => !task.isAllDay), true);
      column.appendChild(list);
      column.addEventListener("click", (event) => {
        if (event.target.closest(".task-card")) {
          return;
        }
        state.activeDate = parseISODate(dateISO);
        state.activeView = "day";
        updateHeader();
      });
      column.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          state.activeDate = parseISODate(dateISO);
          state.activeView = "day";
          updateHeader();
        }
      });
      view.appendChild(column);
    }

    root.appendChild(view);
  }

  function renderMonthView(root) {
    const gridStart = startOfMonthGrid(state.activeDate);
    const gridEnd = endOfMonthGrid(state.activeDate);
    const tasks = getTaskOccurrencesForRange(getVisibleStoredTasks(), gridStart, gridEnd);
    const view = createElement("div", "month-view");
    const weekdays = createElement("div", "month-weekdays");

    weekdayShort.forEach((weekday) => weekdays.appendChild(createElement("span", "", weekday)));
    view.appendChild(weekdays);

    const grid = createElement("div", "month-grid");
    const totalDays = daysBetween(gridStart, gridEnd);

    for (let offset = 0; offset <= totalDays; offset += 1) {
      const date = addDays(gridStart, offset);
      const dateISO = toISODate(date);
      const dayTasks = tasks.filter((task) => task.occurrenceDate === dateISO);
      const cell = createElement("section", `month-day${date.getMonth() !== state.activeDate.getMonth() ? " is-muted" : ""}`);
      cell.dataset.date = dateISO;
      cell.tabIndex = 0;
      cell.title = "Открыть день";
      cell.appendChild(createElement("div", "month-day-number", String(date.getDate())));

      const taskList = createElement("div", "month-task-list");
      renderTaskList(taskList, dayTasks.slice(0, 4), true);
      if (dayTasks.length > 4) {
        taskList.appendChild(createElement("span", "more-tasks", `Еще ${dayTasks.length - 4}`));
      }
      cell.appendChild(taskList);
      cell.addEventListener("click", (event) => {
        if (event.target.closest(".task-card")) {
          return;
        }
        state.activeDate = parseISODate(dateISO);
        state.activeView = "day";
        updateHeader();
      });
      cell.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          state.activeDate = parseISODate(dateISO);
          state.activeView = "day";
          updateHeader();
        }
      });
      grid.appendChild(cell);
    }

    view.appendChild(grid);
    root.appendChild(view);
  }

  function getMonthStats(monthIndex) {
    const monthDate = new Date(state.activeDate.getFullYear(), monthIndex, 1);
    const tasks = getTaskOccurrencesForRange(getVisibleStoredTasks(), startOfMonth(monthDate), endOfMonth(monthDate));
    const countsByCategory = tasks.reduce((accumulator, task) => {
      accumulator[task.category] = (accumulator[task.category] || 0) + 1;
      return accumulator;
    }, {});
    const topCategories = Object.entries(countsByCategory)
      .sort((first, second) => second[1] - first[1])
      .slice(0, 3)
      .map(([categoryId]) => getCategory(categoryId));

    return {
      tasks,
      topCategories,
      birthdays: countsByCategory.birthday || 0
    };
  }

  function renderYearView(root) {
    const view = createElement("div", "year-view");

    for (let month = 0; month < 12; month += 1) {
      const stats = getMonthStats(month);
      const card = createElement("section", "year-month-card");
      card.dataset.month = String(month + 1);
      card.tabIndex = 0;
      card.title = "Открыть месяц";
      card.appendChild(createElement("h3", "", monthNames[month]));
      card.appendChild(createElement("p", "month-count", `${stats.tasks.length} записей`));

      const dots = createElement("div", "month-dots");
      stats.topCategories.forEach((category) => {
        const dot = createElement("span", `month-dot category-${category.id}`);
        dot.title = category.label;
        dots.appendChild(dot);
      });
      card.appendChild(dots);

      if (stats.birthdays) {
        card.appendChild(createElement("span", "year-birthday-note", `ДР: ${stats.birthdays}`));
      }

      card.addEventListener("click", () => {
        state.activeDate = new Date(state.activeDate.getFullYear(), month, 1);
        state.activeView = "month";
        updateHeader();
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          state.activeDate = new Date(state.activeDate.getFullYear(), month, 1);
          state.activeView = "month";
          updateHeader();
        }
      });
      view.appendChild(card);
    }

    root.appendChild(view);
  }

  function renderCalendar() {
    const root = document.getElementById("calendar-root");
    if (!root) {
      return;
    }

    root.className = `calendar-view ${state.activeView}-view-wrapper`;
    root.innerHTML = "";

    if (state.activeView === "day") {
      renderDayView(root);
    } else if (state.activeView === "week") {
      renderWeekView(root);
    } else if (state.activeView === "month") {
      renderMonthView(root);
    } else {
      renderYearView(root);
    }
  }

  function updateHeader() {
    const period = document.getElementById("current-period");
    const title = document.getElementById("calendar-title");
    const subtitle = document.getElementById("calendar-subtitle");
    const datePicker = document.getElementById("date-picker");
    const taskDate = document.getElementById("task-date");

    if (period) {
      period.textContent = getCurrentPeriodLabel(state.activeDate, state.activeView);
    }
    if (title) {
      title.textContent = viewLabels[state.activeView];
    }
    if (subtitle) {
      subtitle.textContent = getCurrentPeriodLabel(state.activeDate, state.activeView);
    }
    if (datePicker) {
      datePicker.value = toISODate(state.activeDate);
    }
    if (taskDate && !taskDate.value) {
      taskDate.value = toISODate(state.activeDate);
    }

    document.querySelectorAll(".view-tab").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === state.activeView);
    });

    renderCalendar();
  }

  function shiftActivePeriod(direction) {
    if (state.activeView === "day") {
      state.activeDate = addDays(state.activeDate, direction);
    } else if (state.activeView === "week") {
      state.activeDate = addDays(state.activeDate, direction * 7);
    } else if (state.activeView === "month") {
      state.activeDate = addMonths(state.activeDate, direction);
    } else {
      state.activeDate = addYears(state.activeDate, direction);
    }
    updateHeader();
  }

  function showFormMessage(messages, type) {
    const message = document.getElementById("form-message");
    if (!message) {
      return;
    }

    const list = Array.isArray(messages) ? messages : [messages];
    message.className = `form-message ${type ? `is-${type}` : ""}`;
    message.innerHTML = "";
    list.forEach((text) => {
      const item = createElement("div", "", text);
      message.appendChild(item);
    });
  }

  function clearFormMessage() {
    const message = document.getElementById("form-message");
    if (message) {
      message.className = "form-message";
      message.textContent = "";
    }
  }

  function getSelectedWeekdays() {
    return Array.from(document.querySelectorAll("input[name='weekday']:checked")).map((input) => Number(input.value));
  }

  function buildTaskFromForm() {
    const title = document.getElementById("task-title")?.value.trim() || "";
    const category = document.getElementById("task-category")?.value || "";
    const date = document.getElementById("task-date")?.value || "";
    const isBirthday = category === "birthday";
    const isAllDay = isBirthday || Boolean(document.getElementById("task-all-day")?.checked);
    const repeatType = isBirthday ? "yearly" : document.getElementById("task-repeat")?.value || "none";
    const weekdays = repeatType === "weekdays" ? getSelectedWeekdays() : [];

    return makeTask({
      title,
      category,
      date,
      isAllDay,
      startTime: isAllDay ? "" : document.getElementById("task-start")?.value || "",
      endTime: isAllDay ? "" : document.getElementById("task-end")?.value || "",
      priority: document.getElementById("task-priority")?.value || "normal",
      repeat: {
        type: repeatType,
        weekdays
      },
      note: isBirthday ? document.getElementById("task-note")?.value.trim() || "ДР" : document.getElementById("task-note")?.value.trim() || ""
    });
  }

  function validateTaskDraft(task) {
    const errors = [];

    if (!task.title) {
      errors.push("Введите название задачи.");
    }

    if (!task.category || !categories.some((category) => category.id === task.category)) {
      errors.push("Выберите категорию.");
    }

    if (!task.date) {
      errors.push("Выберите дату.");
    }

    if (!task.isAllDay) {
      if (!task.startTime) {
        errors.push("Выберите время начала.");
      }
      if (!task.endTime) {
        errors.push("Выберите время окончания.");
      }
      if (task.startTime && task.endTime && timeToMinutes(task.endTime) <= timeToMinutes(task.startTime)) {
        errors.push("Время окончания должно быть позже времени начала.");
      }
    }

    if (task.repeat.type === "weekdays" && !task.repeat.weekdays.length) {
      errors.push("Выберите хотя бы один день недели для повтора.");
    }

    return errors;
  }

  function findConflictingTasks(task, ignoredTaskIds) {
    if (task.isAllDay || !task.startTime || !task.endTime || !task.date) {
      return [];
    }

    const ignored = new Set(ignoredTaskIds || []);

    return getTaskOccurrencesForRange(state.data?.tasks || [], parseISODate(task.date), parseISODate(task.date)).filter((existingTask) => {
      if (ignored.has(existingTask.id)) {
        return false;
      }
      if (existingTask.isAllDay || !existingTask.startTime || !existingTask.endTime) {
        return false;
      }

      return hasTimeOverlap(task.startTime, task.endTime, existingTask.startTime, existingTask.endTime);
    });
  }

  function closeTaskComposer() {
    const composer = document.getElementById("task-composer");
    composer?.classList.add("is-hidden");
    composer?.classList.remove("is-modal");
    composer?.removeAttribute("role");
    composer?.removeAttribute("aria-modal");
  }

  function saveTask(task) {
    state.data.tasks.push(task);
    saveData(window.localStorage, state.data);
    state.activeDate = parseISODate(task.date);
    resetTaskForm();
    closeTaskComposer();
    updateStorageStatus();
    updateHeader();
  }

  function replaceStoredTask(taskId, nextTask) {
    state.data.tasks = state.data.tasks.map((task) => (task.id === taskId ? nextTask : task));
  }

  function addExcludedDate(taskId, occurrenceDate) {
    const task = getStoredTask(taskId);
    if (!task) {
      return;
    }

    const excludedDates = new Set(task.excludedDates || []);
    excludedDates.add(occurrenceDate);
    task.excludedDates = Array.from(excludedDates);
    task.updatedAt = new Date().toISOString();
  }

  function finishTaskOperation(task) {
    const context = state.editingContext;
    const now = new Date().toISOString();

    if (!context || context.mode === "create") {
      state.data.tasks.push(task);
    } else if (context.scope === "single" && isRecurringTask(getStoredTask(context.taskId))) {
      addExcludedDate(context.taskId, context.occurrenceDate);
      state.data.tasks.push({
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        repeat: {
          type: "none",
          weekdays: []
        },
        sourceRecurringId: context.taskId,
        createdAt: now,
        updatedAt: now
      });
    } else {
      const original = getStoredTask(context.taskId);
      if (original) {
        replaceStoredTask(context.taskId, {
          ...task,
          id: original.id,
          excludedDates: original.excludedDates || [],
          sourceRecurringId: original.sourceRecurringId || null,
          createdAt: original.createdAt,
          updatedAt: now
        });
      }
    }

    saveData(window.localStorage, state.data);
    state.activeDate = parseISODate(task.date);
    resetTaskForm();
    closeTaskComposer();
    updateStorageStatus();
    updateHeader();
  }

  function openConflictModal(task, conflicts) {
    state.pendingTask = task;
    state.pendingOperation = state.editingContext ? { ...state.editingContext } : { mode: "create" };
    const modal = document.getElementById("conflict-modal");
    const text = document.getElementById("conflict-text");
    if (text) {
      text.textContent = `На это время уже есть задача: ${conflicts.map((item) => item.title).join(", ")}. Можно сохранить всё равно или вернуться к редактированию.`;
    }
    modal?.classList.remove("is-hidden");
  }

  function closeConflictModal() {
    state.pendingTask = null;
    state.pendingOperation = null;
    document.getElementById("conflict-modal")?.classList.add("is-hidden");
  }

  function resetTaskForm() {
    const form = document.getElementById("task-form");
    form?.reset();
    state.formMode = "create";
    state.editingContext = {
      mode: "create"
    };
    const taskDate = document.getElementById("task-date");
    if (taskDate) {
      taskDate.value = toISODate(state.activeDate);
    }
    fillSelect(document.getElementById("task-category"), categories, "personal");
    fillSelect(document.getElementById("task-priority"), priorities, "normal");
    fillSelect(document.getElementById("task-repeat"), repeatOptions, "none");
    fillSelect(document.getElementById("task-start"), createTimeOptions(), "09:00");
    fillSelect(document.getElementById("task-end"), createTimeOptions(), "10:00");
    updateFormVisibility();
    clearFormMessage();
    const title = document.getElementById("task-form-title");
    if (title) {
      title.textContent = "Новая задача";
    }
  }

  function setWeekdaySelection(weekdays) {
    const selected = new Set(weekdays || []);
    document.querySelectorAll("input[name='weekday']").forEach((input) => {
      input.checked = selected.has(Number(input.value));
    });
  }

  function populateTaskForm(task, mode, scope, occurrenceDate) {
    document.getElementById("task-title").value = task.title || "";
    document.getElementById("task-category").value = task.category || "personal";
    document.getElementById("task-date").value = scope === "series" ? task.date : occurrenceDate || task.date;
    document.getElementById("task-all-day").checked = Boolean(task.isAllDay);
    document.getElementById("task-start").value = task.startTime || "09:00";
    document.getElementById("task-end").value = task.endTime || "10:00";
    document.getElementById("task-priority").value = task.priority || "normal";
    document.getElementById("task-repeat").value = scope === "single" ? "none" : task.repeat?.type || "none";
    document.getElementById("task-note").value = task.note || "";
    setWeekdaySelection(scope === "single" ? [] : task.repeat?.weekdays || []);
    updateFormVisibility();
    clearFormMessage();
  }

  function openTaskForm(mode, task, occurrenceDate, scope) {
    const composer = document.getElementById("task-composer");
    const formTitle = document.getElementById("task-form-title");
    state.formMode = mode;
    state.editingContext = {
      mode,
      taskId: task.id,
      occurrenceDate: occurrenceDate || task.date,
      scope: scope || "series"
    };
    composer?.classList.remove("is-hidden");
    composer?.setAttribute("role", "dialog");
    composer?.setAttribute("aria-modal", "true");
    if (formTitle) {
      formTitle.textContent = mode === "move" ? "Перенести задачу" : "Редактировать задачу";
    }
    populateTaskForm(task, mode, scope || "series", occurrenceDate || task.date);
    composer?.classList.add("is-modal");
    document.getElementById("task-title")?.focus();
  }

  function updateFormVisibility() {
    const category = document.getElementById("task-category")?.value;
    const allDayCheckbox = document.getElementById("task-all-day");
    const repeatSelect = document.getElementById("task-repeat");
    const timeGrid = document.querySelector(".time-grid");
    const weekdayPicker = document.getElementById("weekday-picker");
    const isBirthday = category === "birthday";

    if (isBirthday) {
      if (allDayCheckbox) {
        allDayCheckbox.checked = true;
      }
      if (repeatSelect) {
        repeatSelect.value = "yearly";
      }
    }

    timeGrid?.classList.toggle("is-hidden", isBirthday || Boolean(allDayCheckbox?.checked));
    weekdayPicker?.classList.toggle("is-hidden", isBirthday || repeatSelect?.value !== "weekdays");
  }

  function handleTaskSubmit(event) {
    event.preventDefault();
    const task = buildTaskFromForm();
    const errors = validateTaskDraft(task);

    if (errors.length) {
      showFormMessage(errors, "error");
      return;
    }

    const ignoreIds = state.editingContext?.taskId ? [state.editingContext.taskId] : [];
    const conflicts = findConflictingTasks(task, ignoreIds);
    if (conflicts.length) {
      openConflictModal(task, conflicts);
      return;
    }

    finishTaskOperation(task);
  }

  function updateFilterButtons() {
    const allSelected = state.activeCategories.size === categories.length;
    document.querySelectorAll(".filter-chip").forEach((button) => {
      const category = button.dataset.category;
      button.classList.toggle("is-active", category === "all" ? allSelected : state.activeCategories.has(category));
    });
  }

  function initFilters() {
    document.querySelectorAll(".filter-chip").forEach((button) => {
      button.addEventListener("click", () => {
        const category = button.dataset.category;

        if (category === "all") {
          state.activeCategories = new Set(categories.map((item) => item.id));
        } else if (state.activeCategories.size === categories.length) {
          state.activeCategories = new Set([category]);
        } else if (state.activeCategories.has(category)) {
          state.activeCategories.delete(category);
          if (!state.activeCategories.size) {
            state.activeCategories = new Set(categories.map((item) => item.id));
          }
        } else {
          state.activeCategories.add(category);
        }

        updateFilterButtons();
        renderCalendar();
      });
    });
    updateFilterButtons();
  }

  function openScopeModal(action, taskId, occurrenceDate) {
    state.pendingScopeAction = {
      action,
      taskId,
      occurrenceDate
    };
    const text = document.getElementById("scope-text");
    if (text) {
      text.textContent = action === "move" ? "Перенести только эту дату или изменить всю серию?" : "Изменить только эту дату или всю серию?";
    }
    document.getElementById("scope-modal")?.classList.remove("is-hidden");
  }

  function closeScopeModal() {
    state.pendingScopeAction = null;
    document.getElementById("scope-modal")?.classList.add("is-hidden");
  }

  function runScopedAction(scope) {
    const action = state.pendingScopeAction;
    if (!action) {
      return;
    }
    const task = getStoredTask(action.taskId);
    closeScopeModal();
    if (!task) {
      return;
    }
    openTaskForm(action.action, task, action.occurrenceDate, scope);
  }

  function openDeleteModal(taskId) {
    const task = getStoredTask(taskId);
    if (!task) {
      return;
    }

    state.pendingDelete = {
      taskId
    };
    const title = document.getElementById("delete-title");
    const text = document.getElementById("delete-text");
    if (title) {
      title.textContent = "Удалить задачу?";
    }
    if (text) {
      text.textContent = isRecurringTask(task)
        ? "Будет удалена вся серия повторяющейся задачи."
        : "После подтверждения задача исчезнет из календаря.";
    }
    document.getElementById("delete-modal")?.classList.remove("is-hidden");
  }

  function closeDeleteModal() {
    state.pendingDelete = null;
    document.getElementById("delete-modal")?.classList.add("is-hidden");
  }

  function confirmDelete() {
    if (!state.pendingDelete) {
      return;
    }

    state.data.tasks = state.data.tasks.filter((task) => task.id !== state.pendingDelete.taskId);
    saveData(window.localStorage, state.data);
    closeDeleteModal();
    updateStorageStatus();
    updateHeader();
  }

  function handleTaskActionClick(event) {
    const button = event.target.closest(".task-action");
    if (!button) {
      return;
    }

    event.stopPropagation();
    const card = button.closest(".task-card");
    const taskId = card?.dataset.taskId;
    const occurrenceDate = card?.dataset.date;
    const task = getStoredTask(taskId);
    if (!task) {
      return;
    }

    const action = button.dataset.action;
    if (action === "delete") {
      openDeleteModal(task.id);
      return;
    }

    if (isRecurringTask(task)) {
      openScopeModal(action, task.id, occurrenceDate);
      return;
    }

    openTaskForm(action, task, occurrenceDate, "series");
  }

  function handleTaskCardDoubleClick(event) {
    if (event.target.closest(".task-action")) {
      return;
    }

    const card = event.target.closest(".task-card");
    if (!card) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const taskId = card.dataset.taskId;
    const occurrenceDate = card.dataset.date;
    const task = getStoredTask(taskId);
    if (!task) {
      return;
    }

    if (isRecurringTask(task)) {
      openScopeModal("edit", task.id, occurrenceDate);
      return;
    }

    openTaskForm("edit", task, occurrenceDate, "series");
  }

  function initTaskForm() {
    const form = document.getElementById("task-form");
    const addTaskButton = document.getElementById("add-task-button");
    const taskComposer = document.getElementById("task-composer");
    const cancelButton = document.getElementById("cancel-task-button");
    const closeTaskFormButton = document.getElementById("close-task-form-button");
    const categorySelect = document.getElementById("task-category");
    const allDayCheckbox = document.getElementById("task-all-day");
    const repeatSelect = document.getElementById("task-repeat");

    form?.addEventListener("submit", handleTaskSubmit);
    categorySelect?.addEventListener("change", updateFormVisibility);
    allDayCheckbox?.addEventListener("change", updateFormVisibility);
    repeatSelect?.addEventListener("change", updateFormVisibility);

    if (addTaskButton && taskComposer) {
      addTaskButton.addEventListener("click", () => {
        taskComposer.classList.remove("is-modal");
        taskComposer.removeAttribute("role");
        taskComposer.removeAttribute("aria-modal");
        taskComposer.classList.toggle("is-hidden");
        if (!taskComposer.classList.contains("is-hidden")) {
          resetTaskForm();
          document.getElementById("task-title")?.focus();
        }
      });
    }

    cancelButton?.addEventListener("click", () => {
      resetTaskForm();
      closeTaskComposer();
    });

    closeTaskFormButton?.addEventListener("click", () => {
      resetTaskForm();
      closeTaskComposer();
    });

    document.getElementById("save-conflict-button")?.addEventListener("click", () => {
      if (state.pendingTask) {
        const task = state.pendingTask;
        const operation = state.pendingOperation;
        closeConflictModal();
        state.editingContext = operation;
        finishTaskOperation(task);
      }
    });

    document.getElementById("edit-conflict-button")?.addEventListener("click", closeConflictModal);
    document.getElementById("scope-single-button")?.addEventListener("click", () => runScopedAction("single"));
    document.getElementById("scope-series-button")?.addEventListener("click", () => runScopedAction("series"));
    document.getElementById("scope-cancel-button")?.addEventListener("click", closeScopeModal);
    document.getElementById("confirm-delete-button")?.addEventListener("click", confirmDelete);
    document.getElementById("cancel-delete-button")?.addEventListener("click", closeDeleteModal);
    document.getElementById("calendar-root")?.addEventListener("click", handleTaskActionClick);
    document.getElementById("calendar-root")?.addEventListener("dblclick", handleTaskCardDoubleClick);
  }

  function initControls() {
    document.querySelectorAll(".view-tab").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeView = button.dataset.view;
        updateHeader();
      });
    });

    const todayButton = document.getElementById("today-button");
    const datePicker = document.getElementById("date-picker");
    const prevButton = document.getElementById("prev-period");
    const nextButton = document.getElementById("next-period");

    if (todayButton) {
      todayButton.addEventListener("click", () => {
        state.activeDate = new Date();
        updateHeader();
      });
    }

    if (prevButton) {
      prevButton.addEventListener("click", () => shiftActivePeriod(-1));
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => shiftActivePeriod(1));
    }

    if (datePicker) {
      datePicker.addEventListener("change", () => {
        if (datePicker.value) {
          state.activeDate = parseISODate(datePicker.value);
          updateHeader();
        }
      });
    }
  }

  function initFormOptions() {
    fillSelect(document.getElementById("task-category"), categories, "personal");
    fillSelect(document.getElementById("task-priority"), priorities, "normal");
    fillSelect(document.getElementById("task-repeat"), repeatOptions, "none");
    fillSelect(document.getElementById("task-start"), createTimeOptions(), "09:00");
    fillSelect(document.getElementById("task-end"), createTimeOptions(), "10:00");
  }

  function initApp() {
    state.data = readData(window.localStorage, new Date());
    const storageStatus = document.getElementById("storage-status");

    initFormOptions();
    initControls();
    initFilters();
    initTaskForm();
    resetTaskForm();
    updateHeader();
    updateStorageStatus();
  }

  window.PlanDayApp = {
    STORAGE_KEY,
    categories,
    priorities,
    repeatOptions,
    createDemoTasks,
    createInitialData,
    createTimeOptions,
    readData,
    toISODate,
    parseISODate,
    startOfWeek,
    endOfWeek,
    startOfMonthGrid,
    endOfMonthGrid,
    taskOccursOnDate,
    getTaskOccurrencesForRange,
    state
  };

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initApp);
  }
})();
