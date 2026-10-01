const STORAGE_KEY = "deadline-timer-deadlines";
const config = window.DEADLINE_CONFIG || {};
const cloudConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const supabaseClient = cloudConfigured && window.supabase
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

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
  accountButton: document.querySelector("#account-button"),
  accountDialog: document.querySelector("#account-dialog"),
  accountForm: document.querySelector("#account-form"),
  accountTitle: document.querySelector("#account-dialog-title"),
  accountEmail: document.querySelector("#account-email"),
  accountPassword: document.querySelector("#account-password"),
  accountMessage: document.querySelector("#account-message"),
  accountFields: document.querySelector("#account-fields"),
  accountModeButton: document.querySelector("#account-mode-button"),
  accountSubmitButton: document.querySelector("#account-submit-button"),
  signOutButton: document.querySelector("#sign-out-button"),
  closeAccountButton: document.querySelector("#close-account-button"),
  setupMessage: document.querySelector("#backend-setup-message"),
  storageStatus: document.querySelector("#storage-status"),
};

let deadlines = loadDeadlines();
let editingId = null;
let accountMode = "sign-in";
let currentUser = null;
let loadedUserId = null;
let sessionChange = 0;

function loadDeadlines() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.filter((item) => item.id && item.title && item.target && !Number.isNaN(new Date(item.target).getTime()))
      : [];
  } catch {
    return [];
  }
}

function saveLocalDeadlines() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deadlines));
    return true;
  } catch (error) {
    setStorageStatus(`Could not save on this device: ${error.message}`, true);
    return false;
  }
}

function setStorageStatus(message, isError = false) {
  elements.storageStatus.classList.toggle("status-error", isError);
  elements.storageStatus.lastChild.textContent = ` ${message}`;
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

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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

function updateAccountControls() {
  elements.setupMessage.hidden = Boolean(supabaseClient);
  elements.accountFields.hidden = !supabaseClient || Boolean(currentUser);
  elements.accountModeButton.hidden = !supabaseClient || Boolean(currentUser);
  elements.accountSubmitButton.hidden = !supabaseClient || Boolean(currentUser);
  elements.signOutButton.hidden = !currentUser;
  elements.accountButton.textContent = currentUser
    ? `Synced · ${currentUser.email}`
    : "Sign in to sync";
  elements.accountButton.title = currentUser ? `Signed in as ${currentUser.email}` : "Sign in to sync deadlines across devices";
  elements.accountTitle.textContent = currentUser
    ? "Your account"
    : accountMode === "sign-in" ? "Sign in to sync" : "Create an account";
  elements.accountSubmitButton.textContent = accountMode === "sign-in" ? "Sign in" : "Create account";
  elements.accountModeButton.textContent = accountMode === "sign-in" ? "Create account" : "Already have an account? Sign in";
}

async function fetchCloudDeadlines(userId) {
  const { data, error } = await supabaseClient
    .from("deadlines")
    .select("id, title, target_at")
    .eq("owner_id", userId)
    .order("target_at", { ascending: true });
  if (error) throw error;
  return data.map((row) => ({ id: row.id, title: row.title, target: row.target_at }));
}

async function importLocalDeadlines(userId, token) {
  const localDeadlines = loadDeadlines();
  if (!localDeadlines.length) return;

  const idsToPersist = new Set(localDeadlines.filter((item) => !isUuid(item.id)).map((item) => item.id));
  if (idsToPersist.size) {
    localDeadlines.forEach((item) => {
      if (idsToPersist.has(item.id)) item.id = createId();
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localDeadlines));
  }

  const cloudDeadlines = await fetchCloudDeadlines(userId);
  if (token !== sessionChange) return;
  const cloudIds = new Set(cloudDeadlines.map((item) => item.id));
  const newRows = localDeadlines
    .filter((item) => !cloudIds.has(item.id))
    .map((item) => ({
      id: item.id,
      owner_id: userId,
      title: item.title,
      target_at: new Date(item.target).toISOString(),
    }));
  if (newRows.length) {
    const { error } = await supabaseClient.from("deadlines").insert(newRows);
    if (error) throw error;
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function handleSession(session) {
  const token = ++sessionChange;
  const nextUser = session?.user || null;
  currentUser = nextUser;
  updateAccountControls();

  if (!nextUser) {
    loadedUserId = null;
    deadlines = loadDeadlines();
    setStorageStatus(supabaseClient ? "Saved locally · Sign in to sync across devices" : "Saved locally on this device");
    render();
    return;
  }
  if (loadedUserId === nextUser.id) return;

  setStorageStatus("Syncing your deadlines…");
  try {
    await importLocalDeadlines(nextUser.id, token);
    if (token !== sessionChange) return;
    deadlines = await fetchCloudDeadlines(nextUser.id);
    if (token !== sessionChange) return;
    loadedUserId = nextUser.id;
    setStorageStatus("Synced to your account");
    render();
  } catch (error) {
    if (token !== sessionChange) return;
    setStorageStatus(`Cloud sync failed: ${error.message}`, true);
  }
}

async function initializeAuth() {
  if (!supabaseClient) {
    updateAccountControls();
    setStorageStatus("Saved locally · Cloud sync setup needed");
    return;
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => handleSession(session), 0);
  });
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setStorageStatus(`Could not check sign-in: ${error.message}`, true);
    return;
  }
  await handleSession(data.session);
}

async function persistDeadline(deadline, isEditing) {
  if (!currentUser) {
    const index = deadlines.findIndex((item) => item.id === deadline.id);
    if (isEditing && index !== -1) deadlines[index] = deadline;
    if (!isEditing) deadlines.push(deadline);
    if (saveLocalDeadlines()) {
      setStorageStatus("Saved locally · Sign in to sync across devices");
      render();
      closeDialog();
    }
    return;
  }

  setStorageStatus("Saving to your account…");
  const values = {
    owner_id: currentUser.id,
    title: deadline.title,
    target_at: new Date(deadline.target).toISOString(),
  };
  const result = isEditing
    ? await supabaseClient.from("deadlines").update(values).eq("id", deadline.id).eq("owner_id", currentUser.id).select("id, title, target_at").single()
    : await supabaseClient.from("deadlines").insert(values).select("id, title, target_at").single();
  if (result.error) throw result.error;
  const saved = { id: result.data.id, title: result.data.title, target: result.data.target_at };
  if (isEditing) deadlines = deadlines.map((item) => item.id === saved.id ? saved : item);
  else deadlines.push(saved);
  setStorageStatus("Synced to your account");
  render();
  closeDialog();
}

async function deleteDeadline(id) {
  if (currentUser) {
    setStorageStatus("Deleting from your account…");
    const { error } = await supabaseClient
      .from("deadlines")
      .delete()
      .eq("id", id)
      .eq("owner_id", currentUser.id);
    if (error) {
      setStorageStatus(`Could not delete deadline: ${error.message}`, true);
      return;
    }
    setStorageStatus("Synced to your account");
  } else {
    deadlines = deadlines.filter((deadline) => deadline.id !== id);
    if (!saveLocalDeadlines()) return;
    setStorageStatus("Saved locally · Sign in to sync across devices");
  }
  deadlines = deadlines.filter((deadline) => deadline.id !== id);
  render();
}

elements.addButton.addEventListener("click", () => openDialog());
elements.emptyAddButton.addEventListener("click", () => openDialog());
elements.closeButton.addEventListener("click", closeDialog);
elements.cancelButton.addEventListener("click", closeDialog);

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = elements.title.value.trim();
  const target = new Date(elements.target.value);
  if (!title || Number.isNaN(target.getTime()) || target <= new Date()) {
    elements.error.textContent = "Choose a future date and time to start your countdown.";
    return;
  }
  const existing = deadlines.find((item) => item.id === editingId);
  const deadline = {
    id: existing?.id || createId(),
    title,
    target: target.toISOString(),
  };
  try {
    await persistDeadline(deadline, Boolean(existing));
  } catch (error) {
    elements.error.textContent = `Could not save deadline: ${error.message}`;
    setStorageStatus(`Could not save deadline: ${error.message}`, true);
  }
});

elements.list.addEventListener("click", async (event) => {
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
  if (action.dataset.action === "delete") await deleteDeadline(id);
});

elements.accountButton.addEventListener("click", () => {
  elements.accountMessage.textContent = "";
  updateAccountControls();
  elements.accountDialog.showModal();
});
elements.closeAccountButton.addEventListener("click", () => elements.accountDialog.close());
elements.accountModeButton.addEventListener("click", () => {
  accountMode = accountMode === "sign-in" ? "sign-up" : "sign-in";
  elements.accountMessage.textContent = "";
  updateAccountControls();
});

elements.accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return;
  elements.accountMessage.textContent = accountMode === "sign-in" ? "Signing in…" : "Creating your account…";
  const credentials = {
    email: elements.accountEmail.value.trim(),
    password: elements.accountPassword.value,
  };
  const result = accountMode === "sign-in"
    ? await supabaseClient.auth.signInWithPassword(credentials)
    : await supabaseClient.auth.signUp(credentials);
  if (result.error) {
    elements.accountMessage.textContent = result.error.message;
    return;
  }
  if (accountMode === "sign-up" && !result.data.session) {
    elements.accountMessage.textContent = "Check your email to confirm your account, then sign in.";
    return;
  }
  elements.accountMessage.textContent = "Signed in. Loading your deadlines…";
  await handleSession(result.data.session);
  if (result.data.session) elements.accountDialog.close();
});

elements.signOutButton.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    elements.accountMessage.textContent = `Could not sign out: ${error.message}`;
    return;
  }
  loadedUserId = null;
  currentUser = null;
  deadlines = loadDeadlines();
  updateAccountControls();
  setStorageStatus("Signed out · Saved locally on this device");
  render();
  elements.accountDialog.close();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".menu-wrap")) document.querySelectorAll(".menu").forEach((menu) => { menu.hidden = true; });
});

render();
initializeAuth();
setInterval(render, 1000);
