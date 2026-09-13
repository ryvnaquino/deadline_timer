const STORAGE_KEY = "deadline-timer-deadlines";

const elements = {
  list: document.querySelector("#deadline-list"),
  empty: document.querySelector("#empty-state"),
  count: document.querySelector("#deadline-count"),
  dialog: document.querySelector("#deadline-dialog"),
  form: document.querySelector("#deadline-form"),
  title: document.querySelector("#title"),
  target: document.querySelector("#target"),
  error: document.querySelector("#form-error"),
  dialogTitle: document.querySelector("#dialog-title"),
  addButton: document.querySelector("#add-deadline-button"),
  emptyAddButton: document.querySelector("#empty-add-button"),
  closeButton: document.querySelector("#close-dialog-button"),
  cancelButton: document.querySelector("#cancel-dialog-button"),
};

let deadlines = loadDeadlines();
let editingId = null;

function loadDeadlines() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item.id && item.title && item.target) : [];
  } catch {
    return [];
  }
}

function saveDeadlines() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deadlines));
}

function formatDate(target) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(target));
}

function getTimeLeft(target) {
  const difference = new Date(target).getTime() - Date.now();
  if (difference <= 0) return null;
  const totalSeconds = Math.floor(difference / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function createUnit(value, label) {
  return `<div class="unit"><span class="unit-value">${String(value).padStart(2, "0")}</span><span class="unit-label">${label}</span></div>`;
}

function render() {
  deadlines.sort((a, b) => new Date(a.target) - new Date(b.target));
  elements.count.textContent = deadlines.length;
  elements.empty.hidden = deadlines.length > 0;
  elements.list.innerHTML = deadlines.map((deadline) => {
    const left = getTimeLeft(deadline.target);
    const countdown = left
      ? `<div class="countdown">${createUnit(left.days, "Days")}${createUnit(left.hours, "Hours")}${createUnit(left.minutes, "Min")}${createUnit(left.seconds, "Sec")}</div>`
      : `<p class="expired-label">This deadline has passed.</p>`;
    return `<article class="deadline-card${left ? "" : " expired"}" data-id="${deadline.id}">
      <div class="card-top">
        <div><h3 class="deadline-title" title="${escapeHtml(deadline.title)}">${escapeHtml(deadline.title)}</h3><p class="deadline-date">${formatDate(deadline.target)}</p></div>
        <div class="menu-wrap">
          <button class="icon-button menu-toggle" type="button" aria-label="Options for ${escapeHtml(deadline.title)}" aria-expanded="false">···</button>
          <div class="menu" hidden><button type="button" data-action="edit">Edit</button><button class="delete-action" type="button" data-action="delete">Delete</button></div>
        </div>
      </div>${countdown}
    </article>`;
  }).join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function openDialog(id = null) {
  editingId = id;
  const deadline = deadlines.find((item) => item.id === id);
  elements.form.reset();
  elements.error.textContent = "";
  elements.dialogTitle.textContent = deadline ? "Edit a deadline" : "Add a deadline";
  if (deadline) {
    elements.title.value = deadline.title;
    elements.target.value = toInputValue(deadline.target);
  } else {
    elements.target.value = toInputValue(new Date(Date.now() + 86400000));
  }
  elements.dialog.showModal();
  elements.title.focus();
}

function toInputValue(date) {
  const value = new Date(date);
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function closeDialog() {
  elements.dialog.close();
  editingId = null;
}

elements.addButton.addEventListener("click", () => openDialog());
elements.emptyAddButton.addEventListener("click", () => openDialog());
elements.closeButton.addEventListener("click", closeDialog);
elements.cancelButton.addEventListener("click", closeDialog);

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = elements.title.value.trim();
  const target = new Date(elements.target.value);
  if (!title || Number.isNaN(target.getTime()) || target <= new Date()) {
    elements.error.textContent = "Choose a future date and time to start your countdown.";
    return;
  }
  if (editingId) {
    const index = deadlines.findIndex((item) => item.id === editingId);
    deadlines[index] = { ...deadlines[index], title, target: target.toISOString() };
  } else {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    deadlines.push({ id, title, target: target.toISOString() });
  }
  saveDeadlines();
  render();
  closeDialog();
});

elements.list.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  const card = event.target.closest(".deadline-card");
  if (!card) return;
  if (event.target.closest(".menu-toggle")) {
    const menu = card.querySelector(".menu");
    const isOpen = !menu.hidden;
    document.querySelectorAll(".menu").forEach((item) => { item.hidden = true; });
    menu.hidden = isOpen;
    event.target.closest(".menu-toggle").setAttribute("aria-expanded", String(!isOpen));
    return;
  }
  if (!action) return;
  const id = card.dataset.id;
  if (action.dataset.action === "edit") openDialog(id);
  if (action.dataset.action === "delete") {
    deadlines = deadlines.filter((deadline) => deadline.id !== id);
    saveDeadlines();
    render();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".menu-wrap")) document.querySelectorAll(".menu").forEach((menu) => { menu.hidden = true; });
});

render();
setInterval(() => {
  render();
}, 1000);
