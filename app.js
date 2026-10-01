const STORAGE_KEY = "hagoromo_visit_schedules";
const AUTH_SESSION_KEY = "hagoromo_visit_auth_session";
const SUPABASE_URL = "https://xytxjujsydpvmrvnmcnj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_EzqE7TE3zY_AuZJlZWEuKA_3fsXczmK";
const SCHEDULE_TYPES = {
  visit: {
    label: "面会",
    byDateRpc: "visit_schedules_by_date",
    byMonthRpc: "visit_schedules_by_month",
    addRpc: "visit_schedule_add",
    updateRpc: "visit_schedule_update",
    deleteRpc: "visit_schedule_delete",
  },
  outing: {
    label: "外出",
    byDateRpc: "outing_schedules_by_date",
    byMonthRpc: "outing_schedules_by_month",
    addRpc: "outing_schedule_add",
    updateRpc: "outing_schedule_update",
    deleteRpc: "outing_schedule_delete",
  },
  overnight: {
    label: "外泊",
    byDateRpc: "overnight_schedules_by_date",
    byMonthRpc: "overnight_schedules_by_month",
    addRpc: "overnight_schedule_add",
    updateRpc: "overnight_schedule_update",
    deleteRpc: "overnight_schedule_delete",
  },
};

const authView = document.querySelector("#auth-view");
const authLoading = document.querySelector("#auth-loading");
const authMessage = document.querySelector("#auth-message");
const loginForm = document.querySelector("#login-form");
const loginStaffSelect = document.querySelector("#login-staff");
const loginPinInput = document.querySelector("#login-pin");
const loginButton = document.querySelector("#login-button");
const initialAdminForm = document.querySelector("#initial-admin-form");
const initialAdminNameInput = document.querySelector("#initial-admin-name");
const initialAdminPinInput = document.querySelector("#initial-admin-pin");
const initialAdminPinConfirmInput = document.querySelector("#initial-admin-pin-confirm");
const initialAdminButton = document.querySelector("#initial-admin-button");
const appHeader = document.querySelector("#app-header");
const loggedInName = document.querySelector("#logged-in-name");
const logoutButton = document.querySelector("#logout-button");
const openStaffManagementButton = document.querySelector("#open-staff-management");
const staffManagementView = document.querySelector("#staff-management-view");
const staffManagementHeading = document.querySelector("#staff-management-heading");
const backFromStaffManagementButton = document.querySelector("#back-from-staff-management");
const managementMessage = document.querySelector("#management-message");
const staffList = document.querySelector("#staff-list");
const staffAddForm = document.querySelector("#staff-add-form");
const staffAddNameInput = document.querySelector("#staff-add-name");
const staffAddPinInput = document.querySelector("#staff-add-pin");
const staffAddPinConfirmInput = document.querySelector("#staff-add-pin-confirm");
const staffAddButton = document.querySelector("#staff-add-button");
const staffPinForm = document.querySelector("#staff-pin-form");
const staffPinTargetSelect = document.querySelector("#staff-pin-target");
const staffNewPinInput = document.querySelector("#staff-new-pin");
const staffNewPinConfirmInput = document.querySelector("#staff-new-pin-confirm");
const staffPinButton = document.querySelector("#staff-pin-button");
const mainView = document.querySelector("#main-view");
const scheduleTypeButtons = [...document.querySelectorAll("[data-schedule-type]")];
const registrationView = document.querySelector("#registration-view");
const openRegistrationButton = document.querySelector("#open-registration");
const backToMainButton = document.querySelector("#back-to-main");
const registrationForm = document.querySelector("#registration-form");
const visitDateInput = document.querySelector("#visit-date");
const scheduleDateLabel = document.querySelector("#schedule-date-label");
const visitTimeInput = document.querySelector("#visit-time");
const visitTimeField = document.querySelector("#visit-time-field");
const returnDateField = document.querySelector("#return-date-field");
const returnDateInput = document.querySelector("#return-date");
const residentNameInput = document.querySelector("#resident-name");
const unitField = document.querySelector("#unit-field");
const unitInputs = [...document.querySelectorAll('input[name="unit"]')];
const visitorNameInput = document.querySelector("#visitor-name");
const visitorNameField = document.querySelector("#visitor-name-field");
const visitorNameLabel = document.querySelector("#visitor-name-label");
const noteInput = document.querySelector("#notes");
const formError = document.querySelector("#form-error");
const registrationHeading = document.querySelector("#registration-heading");
const registrationDescription = document.querySelector("#registration-description");
const registrationModeLabel = document.querySelector("#registration-mode-label");
const formActions = document.querySelector(".form-actions");
const saveScheduleButton = document.querySelector("#save-schedule");
const deleteScheduleButton = document.querySelector("#delete-schedule");
const exportJsonButton = document.querySelector("#export-json");
const importJsonButton = document.querySelector("#import-json");
const jsonFileInput = document.querySelector("#json-file-input");
const dataMessage = document.querySelector("#data-message");
const todayDateLabel = document.querySelector("#today-date");
const scheduleHeading = document.querySelector("#today-heading");
const todayCount = document.querySelector("#today-count");
const todayScheduleList = document.querySelector("#today-schedule-list");
const todayCard = document.querySelector(".today-card");
const calendarGrid = document.querySelector(".calendar");
const calendarHeading = document.querySelector("#calendar-heading");
const previousMonthButton = document.querySelector("#previous-month");
const nextMonthButton = document.querySelector("#next-month");
const initialCalendarDate = new Date();
let calendarYear = initialCalendarDate.getFullYear();
let calendarMonth = initialCalendarDate.getMonth();
let calendarDays = [];
let selectedDate = getTodayForDateInput();
let currentScheduleType = "visit";
let editingScheduleId = null;
let supabaseClient = null;
let currentAuthSession = null;
let currentUserIsAdmin = false;
let managedStaffList = [];
let selectedDateSchedules = null;
let visibleMonthSchedules = [];
let visibleMonthSchedulesLoaded = false;
let scheduleAuthRecoveryInProgress = false;

function showAuthMessage(message) {
  authMessage.textContent = String(message).replace(/PIN/g, "パスワード");
  authMessage.hidden = !message;
}

function setAuthButtonBusy(button, busy, normalLabel, busyLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : normalLabel;
}

function showAuthPanel(panel) {
  authLoading.hidden = panel !== "loading";
  loginForm.hidden = panel !== "login";
  initialAdminForm.hidden = panel !== "initial";
  showAuthMessage("");
}

function showAuthenticationView() {
  authView.hidden = false;
  appHeader.hidden = true;
  openStaffManagementButton.hidden = true;
  mainView.hidden = true;
  registrationView.hidden = true;
  staffManagementView.hidden = true;
  window.scrollTo(0, 0);
}

function readAuthSession() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
    const expiresAt = session ? Date.parse(session.expires_at) : NaN;

    if (
      !session
      || typeof session.token !== "string"
      || typeof session.staff_id !== "string"
      || typeof session.display_name !== "string"
      || !Number.isFinite(expiresAt)
      || expiresAt <= Date.now()
    ) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    return session;
  } catch (error) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

function saveAuthSession(session) {
  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    return false;
  }
}

function clearAuthSession() {
  currentAuthSession = null;
  currentUserIsAdmin = false;
  managedStaffList = [];
  selectedDateSchedules = null;
  visibleMonthSchedules = [];
  visibleMonthSchedulesLoaded = false;
  openStaffManagementButton.hidden = true;
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function firstRpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

async function callVisitRpc(name, parameters = {}) {
  const { data, error } = await supabaseClient.rpc(name, parameters);
  if (error) {
    throw error;
  }
  return data;
}

function showApplication(session) {
  currentAuthSession = session;
  currentUserIsAdmin = false;
  currentScheduleType = "visit";
  openStaffManagementButton.hidden = true;
  loggedInName.textContent = session.display_name;
  authView.hidden = true;
  appHeader.hidden = false;
  staffManagementView.hidden = true;
  registrationView.hidden = true;
  mainView.hidden = false;
  selectedDateSchedules = null;
  visibleMonthSchedules = [];
  visibleMonthSchedulesLoaded = false;
  updateScheduleTypeUi();
  renderSelectedDateSchedules();
  renderCalendar();
  refreshScheduleData();
  window.scrollTo(0, 0);
  determineAdminAccess(session);
}

function setManagementMessage(message, type = "error") {
  managementMessage.textContent = String(message).replace(/PIN/g, "パスワード");
  managementMessage.className = `management-message ${type}`;
  managementMessage.hidden = !message;
}

function rpcResult(data) {
  return Array.isArray(data) ? data[0] : data;
}

async function determineAdminAccess(session) {
  try {
    const staff = await callVisitRpc("visit_staff_manage_list", {
      p_token: session.token,
    });

    if (currentAuthSession?.token !== session.token || !Array.isArray(staff)) {
      return;
    }

    currentUserIsAdmin = true;
    managedStaffList = staff;
    openStaffManagementButton.hidden = false;
  } catch (error) {
    if (currentAuthSession?.token === session.token) {
      currentUserIsAdmin = false;
      managedStaffList = [];
      openStaffManagementButton.hidden = true;
    }
  }
}

function updateStaffPinTargetOptions() {
  const selectedId = staffPinTargetSelect.value;
  staffPinTargetSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "職員を選択してください";
  staffPinTargetSelect.append(placeholder);

  managedStaffList.forEach((staff) => {
    const option = document.createElement("option");
    option.value = staff.id;
    option.textContent = staff.display_name;
    option.selected = staff.id === selectedId;
    staffPinTargetSelect.append(option);
  });
}

function createStaffBadge(label, className) {
  const badge = document.createElement("span");
  badge.className = `staff-badge ${className}`;
  badge.textContent = label;
  return badge;
}

function renderManagedStaffList() {
  staffList.replaceChildren();

  if (managedStaffList.length === 0) {
    const empty = document.createElement("p");
    empty.className = "staff-list-empty";
    empty.textContent = "登録されている職員はいません。";
    staffList.append(empty);
    updateStaffPinTargetOptions();
    return;
  }

  managedStaffList.forEach((staff) => {
    const item = document.createElement("article");
    item.className = "staff-item";

    const summary = document.createElement("div");
    const name = document.createElement("p");
    name.className = "staff-item__name";
    name.textContent = staff.id === currentAuthSession?.staff_id
      ? `${staff.display_name}（自分）`
      : staff.display_name;

    const badges = document.createElement("div");
    badges.className = "staff-item__badges";
    badges.append(
      createStaffBadge(staff.is_active ? "有効" : "無効", staff.is_active ? "active" : "inactive"),
      createStaffBadge(staff.is_admin ? "管理者" : "一般職員", staff.is_admin ? "admin" : "general"),
    );
    summary.append(name, badges);

    const actions = document.createElement("div");
    actions.className = "staff-item__actions";

    const activeButton = document.createElement("button");
    activeButton.type = "button";
    activeButton.className = `staff-toggle-button${staff.is_active ? " warning" : ""}`;
    activeButton.dataset.staffAction = "active";
    activeButton.dataset.staffId = staff.id;
    activeButton.textContent = staff.is_active ? "無効にする" : "有効にする";

    const adminButton = document.createElement("button");
    adminButton.type = "button";
    adminButton.className = `staff-toggle-button${staff.is_admin ? " warning" : ""}`;
    adminButton.dataset.staffAction = "admin";
    adminButton.dataset.staffId = staff.id;
    adminButton.textContent = staff.is_admin ? "一般職員に戻す" : "管理者にする";

    actions.append(activeButton, adminButton);
    item.append(summary, actions);
    staffList.append(item);
  });

  updateStaffPinTargetOptions();
}

async function loadManagedStaff(successMessage = "") {
  const loading = document.createElement("p");
  loading.className = "staff-list-loading";
  loading.textContent = "職員一覧を読み込んでいます…";
  staffList.replaceChildren(loading);

  try {
    const staff = await callVisitRpc("visit_staff_manage_list", {
      p_token: currentAuthSession.token,
    });
    if (!Array.isArray(staff)) {
      throw new Error("職員一覧の形式が正しくありません。");
    }

    currentUserIsAdmin = true;
    managedStaffList = staff;
    openStaffManagementButton.hidden = false;
    renderManagedStaffList();
    setManagementMessage(successMessage, "success");
  } catch (error) {
    currentUserIsAdmin = false;
    openStaffManagementButton.hidden = true;
    staffList.replaceChildren();
    setManagementMessage(
      error.code === "42501"
        ? "職員管理を利用する権限がありません。"
        : `職員一覧を読み込めませんでした。${error.message ? ` ${error.message}` : ""}`,
    );
  }
}

async function openStaffManagement() {
  if (!currentUserIsAdmin || !currentAuthSession) {
    return;
  }

  mainView.hidden = true;
  registrationView.hidden = true;
  staffManagementView.hidden = false;
  staffAddForm.reset();
  staffPinForm.reset();
  setManagementMessage("");
  window.scrollTo(0, 0);
  staffManagementHeading.focus();
  await loadManagedStaff();
}

async function returnToLoginAfterSessionChange(message) {
  clearAuthSession();
  await loadAuthenticationEntry();
  showAuthMessage(message);
}

async function submitStaffAdd(event) {
  event.preventDefault();
  setManagementMessage("");

  const displayName = staffAddNameInput.value.trim();
  const pin = staffAddPinInput.value;
  const confirmation = staffAddPinConfirmInput.value;

  if (!displayName) {
    setManagementMessage("職員名を入力してください。");
    staffAddNameInput.focus();
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    setManagementMessage("パスワードは4桁の数字で入力してください。");
    staffAddPinInput.focus();
    return;
  }
  if (pin !== confirmation) {
    setManagementMessage("パスワードとパスワード確認が一致しません。");
    staffAddPinConfirmInput.focus();
    return;
  }

  setAuthButtonBusy(staffAddButton, true, "職員を追加", "追加中…");
  try {
    const result = rpcResult(await callVisitRpc("visit_staff_add", {
      p_token: currentAuthSession.token,
      p_display_name: displayName,
      p_pin: pin,
    }));

    if (!result?.ok) {
      setManagementMessage(result?.message || "職員を追加できませんでした。");
      return;
    }

    staffAddForm.reset();
    await loadManagedStaff("職員を追加しました。");
  } catch (error) {
    setManagementMessage(`職員を追加できませんでした。${error.message ? ` ${error.message}` : ""}`);
  } finally {
    setAuthButtonBusy(staffAddButton, false, "職員を追加", "追加中…");
  }
}

async function submitStaffPinChange(event) {
  event.preventDefault();
  setManagementMessage("");

  const staffId = staffPinTargetSelect.value;
  const pin = staffNewPinInput.value;
  const confirmation = staffNewPinConfirmInput.value;

  if (!staffId) {
    setManagementMessage("対象職員を選択してください。");
    staffPinTargetSelect.focus();
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    setManagementMessage("パスワードは4桁の数字で入力してください。");
    staffNewPinInput.focus();
    return;
  }
  if (pin !== confirmation) {
    setManagementMessage("パスワードとパスワード確認が一致しません。");
    staffNewPinConfirmInput.focus();
    return;
  }

  setAuthButtonBusy(staffPinButton, true, "パスワードを変更", "変更中…");
  try {
    const result = rpcResult(await callVisitRpc("visit_staff_set_pin", {
      p_token: currentAuthSession.token,
      p_staff_id: staffId,
      p_new_pin: pin,
    }));

    if (!result?.ok) {
      setManagementMessage(result?.message || "パスワードを変更できませんでした。");
      return;
    }

    staffPinForm.reset();
    if (staffId === currentAuthSession.staff_id) {
      await returnToLoginAfterSessionChange("パスワードを変更しました。新しいパスワードでログインしてください。");
      return;
    }

    await loadManagedStaff("パスワードを変更しました。");
  } catch (error) {
    setManagementMessage(`パスワードを変更できませんでした。${error.message ? ` ${error.message}` : ""}`);
  } finally {
    setAuthButtonBusy(staffPinButton, false, "パスワードを変更", "変更中…");
  }
}

async function handleStaffAction(event) {
  const button = event.target.closest("[data-staff-action]");
  if (!button || !currentAuthSession) {
    return;
  }

  const staff = managedStaffList.find((item) => item.id === button.dataset.staffId);
  if (!staff) {
    return;
  }

  const action = button.dataset.staffAction;
  const isActiveAction = action === "active";
  const nextValue = isActiveAction ? !staff.is_active : !staff.is_admin;
  const rpcName = isActiveAction ? "visit_staff_set_active" : "visit_staff_set_admin";
  const parameters = isActiveAction
    ? { p_token: currentAuthSession.token, p_staff_id: staff.id, p_is_active: nextValue }
    : { p_token: currentAuthSession.token, p_staff_id: staff.id, p_is_admin: nextValue };

  button.disabled = true;
  setManagementMessage("");
  try {
    const result = rpcResult(await callVisitRpc(rpcName, parameters));
    if (!result?.ok) {
      setManagementMessage(result?.message || "職員情報を変更できませんでした。");
      return;
    }

    if (isActiveAction && !nextValue && staff.id === currentAuthSession.staff_id) {
      await returnToLoginAfterSessionChange("職員アカウントを無効にしたため、ログアウトしました。");
      return;
    }

    if (!isActiveAction && !nextValue && staff.id === currentAuthSession.staff_id) {
      currentUserIsAdmin = false;
      openStaffManagementButton.hidden = true;
      staffManagementView.hidden = true;
      mainView.hidden = false;
      window.scrollTo(0, 0);
      return;
    }

    await loadManagedStaff("職員情報を変更しました。");
  } catch (error) {
    setManagementMessage(`職員情報を変更できませんでした。${error.message ? ` ${error.message}` : ""}`);
  } finally {
    button.disabled = false;
  }
}

function showLoginForm(staffList, selectedStaffId = "") {
  loginForm.reset();
  loginStaffSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "職員を選択してください";
  loginStaffSelect.append(placeholder);

  staffList.forEach((staff) => {
    const option = document.createElement("option");
    option.value = staff.id;
    option.textContent = staff.display_name;
    option.selected = staff.id === selectedStaffId;
    loginStaffSelect.append(option);
  });

  showAuthPanel("login");
  loginStaffSelect.focus();
}

function showInitialAdminForm() {
  initialAdminForm.reset();
  showAuthPanel("initial");
  initialAdminNameInput.focus();
}

async function loadAuthenticationEntry(selectedStaffId = "") {
  showAuthenticationView();
  showAuthPanel("loading");
  authLoading.textContent = "職員情報を読み込んでいます…";

  try {
    const staffList = await callVisitRpc("visit_staff_list");
    if (!Array.isArray(staffList)) {
      throw new Error("職員一覧の形式が正しくありません。");
    }

    if (staffList.length === 0) {
      showInitialAdminForm();
      return;
    }

    showLoginForm(staffList, selectedStaffId);
  } catch (error) {
    showAuthPanel("loading");
    authLoading.textContent = "職員情報を読み込めませんでした。";
    showAuthMessage(`Supabaseへの接続を確認してください。${error.message ? ` ${error.message}` : ""}`);
  }
}

async function initializeAuthentication() {
  showAuthenticationView();
  showAuthPanel("loading");

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    authLoading.textContent = "Supabase接続設定が必要です。";
    showAuthMessage("app.jsのSUPABASE_URLとSUPABASE_PUBLISHABLE_KEYを設定してください。");
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    authLoading.textContent = "認証機能を読み込めませんでした。";
    showAuthMessage("通信状態を確認して、画面を再読み込みしてください。");
    return;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const savedSession = readAuthSession();
  if (savedSession) {
    showApplication(savedSession);
    return;
  }

  await loadAuthenticationEntry();
}

async function submitInitialAdmin(event) {
  event.preventDefault();
  showAuthMessage("");

  const displayName = initialAdminNameInput.value.trim();
  const pin = initialAdminPinInput.value;
  const pinConfirmation = initialAdminPinConfirmInput.value;

  if (!displayName) {
    showAuthMessage("職員名を入力してください。");
    initialAdminNameInput.focus();
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    showAuthMessage("パスワードは4桁の数字で入力してください。");
    initialAdminPinInput.focus();
    return;
  }
  if (pin !== pinConfirmation) {
    showAuthMessage("パスワードとパスワード確認が一致しません。");
    initialAdminPinConfirmInput.focus();
    return;
  }

  setAuthButtonBusy(initialAdminButton, true, "管理者を登録", "登録中…");
  try {
    const data = await callVisitRpc("visit_initial_admin_create", {
      p_display_name: displayName,
      p_pin: pin,
    });
    const result = firstRpcRow(data);

    if (!result || !result.ok) {
      showAuthMessage(result?.message || "初期管理者を登録できませんでした。");
      return;
    }

    await loadAuthenticationEntry(result.staff_id || "");
  } catch (error) {
    showAuthMessage(`初期管理者を登録できませんでした。${error.message ? ` ${error.message}` : ""}`);
  } finally {
    setAuthButtonBusy(initialAdminButton, false, "管理者を登録", "登録中…");
  }
}

async function submitLogin(event) {
  event.preventDefault();
  showAuthMessage("");

  const staffId = loginStaffSelect.value;
  const pin = loginPinInput.value;

  if (!staffId) {
    showAuthMessage("職員名を選択してください。");
    loginStaffSelect.focus();
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    showAuthMessage("パスワードは4桁の数字で入力してください。");
    loginPinInput.focus();
    return;
  }

  setAuthButtonBusy(loginButton, true, "ログイン", "確認中…");
  try {
    const data = await callVisitRpc("visit_login", {
      p_staff_id: staffId,
      p_pin: pin,
    });
    const result = firstRpcRow(data);

    if (!result || !result.ok) {
      showAuthMessage(result?.message || "ログインできませんでした。");
      loginPinInput.select();
      return;
    }

    const session = {
      token: result.token,
      staff_id: result.staff_id,
      display_name: result.display_name,
      expires_at: result.expires_at,
    };

    if (!saveAuthSession(session)) {
      showAuthMessage("ログイン情報を端末へ保存できませんでした。");
      return;
    }

    loginForm.reset();
    showApplication(session);
  } catch (error) {
    showAuthMessage(`ログインできませんでした。${error.message ? ` ${error.message}` : ""}`);
  } finally {
    setAuthButtonBusy(loginButton, false, "ログイン", "確認中…");
  }
}

async function logout() {
  logoutButton.disabled = true;
  const session = currentAuthSession || readAuthSession();

  try {
    if (session?.token && supabaseClient) {
      await callVisitRpc("visit_logout", { p_token: session.token });
    }
  } catch (error) {
    console.error("Supabaseのセッションを終了できませんでした。", error);
  } finally {
    clearAuthSession();
    logoutButton.disabled = false;
    await loadAuthenticationEntry();
  }
}

function getTodayForDateInput() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatDateForStorage(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isToday(dateValue) {
  return dateValue === getTodayForDateInput();
}

function formatScheduleHeading(dateValue) {
  const typeLabel = SCHEDULE_TYPES[currentScheduleType].label;
  if (isToday(dateValue)) {
    return `本日の${typeLabel}予定`;
  }

  const [, month, day] = dateValue.split("-").map(Number);
  return `${month}月${day}日の${typeLabel}予定`;
}

function updateScheduleTypeUi() {
  const typeLabel = SCHEDULE_TYPES[currentScheduleType].label;
  scheduleTypeButtons.forEach((button) => {
    const isActive = button.dataset.scheduleType === currentScheduleType;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  openRegistrationButton.textContent = `＋ ${typeLabel}予定を登録`;
}

function switchScheduleType(type) {
  if (!SCHEDULE_TYPES[type] || type === currentScheduleType) {
    return;
  }

  currentScheduleType = type;
  editingScheduleId = null;
  selectedDateSchedules = null;
  visibleMonthSchedules = [];
  visibleMonthSchedulesLoaded = false;
  updateScheduleTypeUi();
  renderSelectedDateSchedules();
  renderCalendarScheduleCounts();
  refreshScheduleData();
}

function showDataMessage(message, type) {
  dataMessage.textContent = message;
  dataMessage.className = `data-message ${type}`;
  dataMessage.hidden = false;
}

async function exportSchedulesAsJson() {
  exportJsonButton.disabled = true;
  exportJsonButton.textContent = "保存中…";
  dataMessage.hidden = true;

  try {
    const schedules = await callVisitRpc("visit_schedules_all", {
      p_token: getScheduleSession().token,
    });
    if (!Array.isArray(schedules)) {
      throw new Error("取得データの形式が正しくありません。");
    }

    const backupSchedules = schedules.map((schedule) => ({
      id: schedule.id,
      visit_date: schedule.visit_date,
      visit_time: schedule.visit_time,
      resident_name: schedule.resident_name,
      unit: schedule.unit ?? null,
      visitor_name: schedule.visitor_name,
      note: schedule.note,
      created_at: schedule.created_at,
      updated_at: schedule.updated_at,
    }));
    const json = JSON.stringify(backupSchedules, null, 2);
    const blob = new Blob(["\uFEFF", json], { type: "application/json;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = `hagoromo_visit_schedules_${getTodayForDateInput()}.json`;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    showDataMessage("全期間の面会予定をJSON保存しました。", "success");
  } catch (error) {
    await handleScheduleError(error, "JSONファイルを保存できませんでした。");
  } finally {
    exportJsonButton.disabled = false;
    exportJsonButton.textContent = "JSON保存";
  }
}

function selectJsonFile() {
  showDataMessage("JSON読込は共有版では現在利用できません。", "error");
}

function getScheduleSession() {
  const session = readAuthSession();
  if (!session || !currentAuthSession || session.token !== currentAuthSession.token) {
    const error = new Error("ログインが必要です");
    error.code = "28000";
    throw error;
  }
  return session;
}

function isScheduleAuthenticationError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "28000"
    || message.includes("ログインが必要")
    || message.includes("invalid session")
    || message.includes("session expired");
}

async function handleScheduleError(error, fallbackMessage, showInScheduleList = false) {
  console.error(fallbackMessage, error);

  if (isScheduleAuthenticationError(error)) {
    if (scheduleAuthRecoveryInProgress || (!currentAuthSession && !authView.hidden)) {
      return;
    }
    scheduleAuthRecoveryInProgress = true;
    clearAuthSession();
    try {
      await loadAuthenticationEntry();
      showAuthMessage("セッションの有効期限が切れました。もう一度ログインしてください。");
    } finally {
      scheduleAuthRecoveryInProgress = false;
    }
    return;
  }

  const message = `${fallbackMessage}${error?.message ? ` ${error.message}` : ""}`;
  showDataMessage(message, "error");
  if (showInScheduleList) {
    renderScheduleStatus(message, "error");
  }
}

function visibleMonthStart() {
  return `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-01`;
}

async function fetchSelectedDateSchedules() {
  const requestedDate = selectedDate;
  const requestedType = currentScheduleType;
  const typeConfig = SCHEDULE_TYPES[requestedType];
  let session;
  selectedDateSchedules = null;
  renderSelectedDateSchedules();

  try {
    session = getScheduleSession();
    const dateParameter = requestedType === "visit"
      ? { p_visit_date: requestedDate }
      : requestedType === "outing"
        ? { p_outing_date: requestedDate }
        : { p_target_date: requestedDate };
    const schedules = await callVisitRpc(typeConfig.byDateRpc, {
      p_token: session.token,
      ...dateParameter,
    });
    if (!Array.isArray(schedules)) {
      throw new Error("取得データの形式が正しくありません。");
    }
    if (
      selectedDate === requestedDate
      && currentScheduleType === requestedType
      && currentAuthSession?.token === session.token
    ) {
      selectedDateSchedules = schedules;
      renderSelectedDateSchedules();
    }
    return true;
  } catch (error) {
    if (
      (selectedDate !== requestedDate || currentScheduleType !== requestedType)
      && !isScheduleAuthenticationError(error)
    ) {
      return false;
    }
    selectedDateSchedules = null;
    await handleScheduleError(error, `${typeConfig.label}予定を読み込めませんでした。`, true);
    return false;
  }
}

async function fetchVisibleMonthSchedules() {
  const requestedMonth = visibleMonthStart();
  const requestedType = currentScheduleType;
  const typeConfig = SCHEDULE_TYPES[requestedType];
  let session;

  try {
    session = getScheduleSession();
    const schedules = await callVisitRpc(typeConfig.byMonthRpc, {
      p_token: session.token,
      p_month_start: requestedMonth,
    });
    if (!Array.isArray(schedules)) {
      throw new Error("取得データの形式が正しくありません。");
    }
    if (
      visibleMonthStart() === requestedMonth
      && currentScheduleType === requestedType
      && currentAuthSession?.token === session.token
    ) {
      visibleMonthSchedules = schedules;
      visibleMonthSchedulesLoaded = true;
      renderCalendarScheduleCounts();
    }
    return true;
  } catch (error) {
    if (
      (visibleMonthStart() !== requestedMonth || currentScheduleType !== requestedType)
      && !isScheduleAuthenticationError(error)
    ) {
      return false;
    }
    visibleMonthSchedules = [];
    visibleMonthSchedulesLoaded = false;
    renderCalendarScheduleCounts();
    await handleScheduleError(error, `月間の${typeConfig.label}予定を読み込めませんでした。`);
    return false;
  }
}

async function refreshScheduleData() {
  try {
    await Promise.all([
      fetchSelectedDateSchedules(),
      fetchVisibleMonthSchedules(),
    ]);
  } catch (error) {
    await handleScheduleError(
      error,
      `${SCHEDULE_TYPES[currentScheduleType].label}予定を読み込めませんでした。`,
      true,
    );
  }
}

function renderScheduleStatus(message, type = "loading") {
  todayScheduleList.replaceChildren();
  todayScheduleList.classList.remove("schedule-list--populated");
  const status = document.createElement("p");
  status.className = `schedule-status schedule-status--${type}`;
  status.textContent = message;
  todayScheduleList.append(status);
}

function renderEmptySchedule(dateValue) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";

  const icon = document.createElement("span");
  icon.className = "empty-state__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "✓";

  const message = document.createElement("p");
  const typeLabel = SCHEDULE_TYPES[currentScheduleType].label;
  message.textContent = isToday(dateValue)
    ? `本日の${typeLabel}予定はありません`
    : `この日の${typeLabel}予定はありません`;

  emptyState.append(icon, message);
  todayScheduleList.append(emptyState);
}

function renderScheduleItem(schedule) {
  const item = document.createElement("article");
  item.className = "schedule-item";
  item.setAttribute("role", "button");
  item.tabIndex = 0;

  const content = document.createElement("div");
  const name = document.createElement("p");
  name.className = "schedule-item__name";
  name.textContent = `${schedule.resident_name}様`;
  content.append(name);

  const details = [];
  if (currentScheduleType === "visit") {
    const unitLabels = { sakura: "さくら", keyaki: "けやき" };
    if (unitLabels[schedule.unit]) {
      const unit = document.createElement("p");
      unit.className = "schedule-item__unit";
      unit.textContent = unitLabels[schedule.unit];
      content.append(unit);
    }
    if (schedule.visitor_name) {
      details.push(`面会者：${schedule.visitor_name}`);
    }
  } else if (currentScheduleType === "outing") {
    if (schedule.companion) {
      details.push(`付き添い：${schedule.companion}`);
    }
  } else if (currentScheduleType === "overnight") {
    const [, startMonth, startDay] = schedule.start_date.split("-").map(Number);
    const [, returnMonth, returnDay] = schedule.return_date.split("-").map(Number);
    details.push(`外泊期間：${startMonth}/${startDay}〜${returnMonth}/${returnDay}帰苑`);
    if (schedule.destination) {
      details.push(`外泊先：${schedule.destination}`);
    }
  }
  if (schedule.note) {
    details.push(`備考：${schedule.note}`);
  }

  if (details.length > 0) {
    const detailText = document.createElement("p");
    detailText.className = "schedule-item__details";
    detailText.textContent = details.join(" ／ ");
    content.append(detailText);
  }

  const editHint = document.createElement("span");
  editHint.className = "schedule-item__edit";
  editHint.setAttribute("aria-hidden", "true");
  editHint.textContent = "編集 ›";

  const itemParts = [];
  if (currentScheduleType === "visit") {
    const time = document.createElement("time");
    time.className = "schedule-item__time";
    time.dateTime = `${schedule.visit_date}T${schedule.visit_time}`;
    time.textContent = schedule.visit_time.slice(0, 5);
    item.setAttribute("aria-label", `${schedule.visit_time} ${schedule.resident_name}様の予定を編集`);
    itemParts.push(time);
  } else {
    item.classList.add("schedule-item--without-time");
    item.setAttribute("aria-label", `${schedule.resident_name}様の${SCHEDULE_TYPES[currentScheduleType].label}予定を編集`);
  }

  item.addEventListener("click", () => showEditView(schedule));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showEditView(schedule);
    }
  });

  item.append(...itemParts, content, editHint);
  todayScheduleList.append(item);
}

function renderSelectedDateSchedules() {
  todayDateLabel.textContent = formatDateLabel(selectedDate);
  scheduleHeading.textContent = formatScheduleHeading(selectedDate);

  if (selectedDateSchedules === null) {
    todayCount.textContent = `—${currentScheduleType === "overnight" ? "人" : "件"}`;
    renderScheduleStatus(`${SCHEDULE_TYPES[currentScheduleType].label}予定を読み込んでいます…`);
    return;
  }

  const schedules = [...selectedDateSchedules].sort((first, second) => {
    if (currentScheduleType === "visit") {
      return first.visit_time.localeCompare(second.visit_time);
    }
    if (currentScheduleType === "outing") {
      return first.resident_name.localeCompare(second.resident_name, "ja");
    }
    return first.start_date.localeCompare(second.start_date)
      || first.resident_name.localeCompare(second.resident_name, "ja");
  });

  todayCount.textContent = `${schedules.length}${currentScheduleType === "overnight" ? "人" : "件"}`;
  todayScheduleList.replaceChildren();
  todayScheduleList.classList.toggle("schedule-list--populated", schedules.length > 0);

  if (schedules.length === 0) {
    renderEmptySchedule(selectedDate);
    return;
  }

  schedules.forEach(renderScheduleItem);
}

function updateCalendarSelection() {
  calendarDays.forEach((day) => {
    const isSelected = day.dataset.date === selectedDate;
    day.classList.toggle("selected", isSelected);
    day.setAttribute("aria-selected", String(isSelected));
  });
}

function selectCalendarDate(day) {
  selectedDate = day.dataset.date;
  updateCalendarSelection();
  fetchSelectedDateSchedules();
  todayCard.scrollIntoView({ block: "start" });
}

function createCalendarDay(date) {
  const dateValue = formatDateForStorage(date);
  const day = document.createElement("div");
  day.className = "calendar-day";
  day.dataset.date = dateValue;
  day.setAttribute("role", "gridcell");
  day.setAttribute("aria-label", formatDateLabel(dateValue));
  day.tabIndex = 0;

  if (date.getMonth() !== calendarMonth) {
    day.classList.add("muted");
  }
  if (date.getDay() === 0) {
    day.classList.add("sunday");
  }
  if (date.getDay() === 6) {
    day.classList.add("saturday");
  }

  const dayNumber = document.createElement("span");
  dayNumber.textContent = date.getDate();
  day.append(dayNumber);

  if (isToday(dateValue)) {
    day.classList.add("today");
    day.setAttribute("aria-current", "date");

    const todayLabel = document.createElement("small");
    todayLabel.textContent = "今日";
    day.append(todayLabel);
  }

  day.addEventListener("click", () => selectCalendarDate(day));
  day.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCalendarDate(day);
    }
  });

  return day;
}

function renderCalendar() {
  calendarGrid.querySelectorAll(".calendar-day").forEach((day) => day.remove());
  calendarHeading.textContent = `${calendarYear}年${calendarMonth + 1}月`;
  calendarGrid.setAttribute("aria-label", `${calendarYear}年${calendarMonth + 1}月のカレンダー`);

  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
  const totalCells = Math.ceil((firstDayOfMonth.getDay() + lastDayOfMonth.getDate()) / 7) * 7;
  const gridStartDate = new Date(calendarYear, calendarMonth, 1 - firstDayOfMonth.getDay());

  calendarDays = [];
  for (let index = 0; index < totalCells; index += 1) {
    const date = new Date(gridStartDate);
    date.setDate(gridStartDate.getDate() + index);
    const day = createCalendarDay(date);
    calendarDays.push(day);
    calendarGrid.append(day);
  }

  renderCalendarScheduleCounts();
  updateCalendarSelection();
}

function changeCalendarMonth(offset) {
  const nextMonth = new Date(calendarYear, calendarMonth + offset, 1);
  calendarYear = nextMonth.getFullYear();
  calendarMonth = nextMonth.getMonth();
  visibleMonthSchedules = [];
  visibleMonthSchedulesLoaded = false;
  renderCalendar();
  fetchVisibleMonthSchedules();
}

function renderCalendarScheduleCounts() {
  calendarDays.forEach((day) => {
    day.querySelector(".calendar-day__count")?.remove();
    const dateValue = day.dataset.date;
    const count = visibleMonthSchedules.filter((schedule) => {
      if (currentScheduleType === "visit") {
        return schedule.visit_date === dateValue;
      }
      if (currentScheduleType === "outing") {
        return schedule.outing_date === dateValue;
      }
      return schedule.start_date <= dateValue && dateValue < schedule.return_date;
    }).length;

    if (count === 0) {
      return;
    }

    const countLabel = document.createElement("small");
    countLabel.className = "calendar-day__count";
    countLabel.textContent = `${count}${currentScheduleType === "overnight" ? "人" : "件"}`;
    day.append(countLabel);
  });
}

function clearValidationErrors() {
  formError.hidden = true;
  formError.textContent = "";
  [visitDateInput, visitTimeInput, returnDateInput, residentNameInput].forEach((input) => {
    input.removeAttribute("aria-invalid");
  });
  unitField.removeAttribute("aria-invalid");
}

function getSelectedUnit() {
  return unitInputs.find((input) => input.checked)?.value || "";
}

function setSelectedUnit(unit) {
  unitInputs.forEach((input) => {
    input.checked = input.value === unit;
  });
}

function configureRegistrationFields() {
  const isVisit = currentScheduleType === "visit";
  const isOvernight = currentScheduleType === "overnight";

  scheduleDateLabel.textContent = isOvernight ? "外泊開始日" : "日付";
  visitTimeField.hidden = !isVisit;
  visitTimeInput.required = isVisit;
  unitField.hidden = !isVisit;
  unitInputs.forEach((input) => {
    input.required = isVisit;
  });
  visitorNameField.hidden = false;
  visitorNameLabel.textContent = isVisit ? "面会者名" : isOvernight ? "外泊先" : "付き添い";
  returnDateField.hidden = !isOvernight;
  returnDateInput.required = isOvernight;

  if (isVisit) {
    registrationDescription.textContent = "面会日時と来苑される方の情報を入力してください。";
  } else if (isOvernight) {
    registrationDescription.textContent = "外泊開始日、帰苑日と利用者の情報を入力してください。帰苑日は外泊日に含みません。";
  } else {
    registrationDescription.textContent = "外出日と利用者の情報を入力してください。";
  }
}

function validateRegistrationForm() {
  const requiredFields = [
    { input: visitDateInput, label: currentScheduleType === "overnight" ? "外泊開始日" : "日付" },
    { input: residentNameInput, label: "利用者名" },
  ];
  if (currentScheduleType === "visit") {
    requiredFields.splice(1, 0, { input: visitTimeInput, label: "来苑時間" });
  }
  if (currentScheduleType === "overnight") {
    requiredFields.splice(1, 0, { input: returnDateInput, label: "帰苑日" });
  }
  const missingFields = requiredFields.filter(({ input }) => !input.value.trim());
  const unitMissing = currentScheduleType === "visit" && !getSelectedUnit();

  clearValidationErrors();

  const invalidOvernightRange = currentScheduleType === "overnight"
    && visitDateInput.value
    && returnDateInput.value
    && returnDateInput.value <= visitDateInput.value;

  if (missingFields.length === 0 && !unitMissing && !invalidOvernightRange) {
    return true;
  }

  missingFields.forEach(({ input }) => input.setAttribute("aria-invalid", "true"));
  if (unitMissing) {
    unitField.setAttribute("aria-invalid", "true");
  }
  const messages = [];
  if (missingFields.length > 0) {
    messages.push(`${missingFields.map(({ label }) => label).join("、")}を入力してください。`);
  }
  if (unitMissing) {
    messages.push("ユニットを選択してください。");
  }
  if (invalidOvernightRange) {
    returnDateInput.setAttribute("aria-invalid", "true");
    messages.push("帰苑日は外泊開始日より後の日付を指定してください。");
  }
  formError.textContent = messages.join(" ");
  formError.hidden = false;
  (missingFields[0]?.input || (unitMissing ? unitInputs[0] : returnDateInput)).focus();
  return false;
}

function showRegistrationView() {
  const typeLabel = SCHEDULE_TYPES[currentScheduleType].label;
  editingScheduleId = null;
  registrationForm.reset();
  clearValidationErrors();
  configureRegistrationFields();
  visitDateInput.value = getTodayForDateInput();
  registrationModeLabel.textContent = "新規登録";
  registrationHeading.textContent = `${typeLabel}予定を登録`;
  saveScheduleButton.textContent = "登録する";
  deleteScheduleButton.hidden = true;
  formActions.classList.remove("editing");
  mainView.hidden = true;
  registrationView.hidden = false;
  window.scrollTo(0, 0);
  registrationHeading.focus();
}

function showEditView(schedule) {
  const typeLabel = SCHEDULE_TYPES[currentScheduleType].label;
  editingScheduleId = schedule.id;
  registrationForm.reset();
  clearValidationErrors();
  configureRegistrationFields();
  visitDateInput.value = currentScheduleType === "visit"
    ? schedule.visit_date
    : currentScheduleType === "outing"
      ? schedule.outing_date
      : schedule.start_date;
  returnDateInput.value = currentScheduleType === "overnight" ? schedule.return_date : "";
  visitTimeInput.value = currentScheduleType === "visit" ? schedule.visit_time.slice(0, 5) : "";
  residentNameInput.value = schedule.resident_name;
  setSelectedUnit(currentScheduleType === "visit" ? schedule.unit : "");
  visitorNameInput.value = currentScheduleType === "visit"
    ? schedule.visitor_name || ""
    : currentScheduleType === "outing"
      ? schedule.companion || ""
      : schedule.destination || "";
  noteInput.value = schedule.note || "";
  registrationModeLabel.textContent = "予定編集";
  registrationHeading.textContent = `${typeLabel}予定を編集`;
  saveScheduleButton.textContent = "変更を保存";
  deleteScheduleButton.hidden = false;
  formActions.classList.add("editing");
  mainView.hidden = true;
  registrationView.hidden = false;
  window.scrollTo(0, 0);
  registrationHeading.focus();
}

function showMainView() {
  registrationForm.reset();
  clearValidationErrors();
  editingScheduleId = null;
  registrationView.hidden = true;
  staffManagementView.hidden = true;
  mainView.hidden = false;
  renderSelectedDateSchedules();
  renderCalendarScheduleCounts();
  window.scrollTo(0, 0);
  openRegistrationButton.focus();
}

async function registerSchedule(event) {
  event.preventDefault();

  if (!validateRegistrationForm()) {
    return;
  }

  const isEditing = Boolean(editingScheduleId);
  const typeConfig = SCHEDULE_TYPES[currentScheduleType];
  const rpcName = isEditing ? typeConfig.updateRpc : typeConfig.addRpc;
  const normalLabel = isEditing ? "変更を保存" : "登録する";
  const parameters = {
    p_token: "",
    p_resident_name: residentNameInput.value.trim(),
    p_note: noteInput.value.trim() || null,
  };
  if (currentScheduleType === "visit") {
    Object.assign(parameters, {
      p_visit_date: visitDateInput.value,
      p_visit_time: visitTimeInput.value,
      p_unit: getSelectedUnit(),
      p_visitor_name: visitorNameInput.value.trim() || null,
    });
  } else if (currentScheduleType === "outing") {
    parameters.p_outing_date = visitDateInput.value;
    parameters.p_companion = visitorNameInput.value.trim() || null;
  } else {
    parameters.p_start_date = visitDateInput.value;
    parameters.p_return_date = returnDateInput.value;
    parameters.p_destination = visitorNameInput.value.trim() || null;
  }
  if (isEditing) {
    parameters.p_id = editingScheduleId;
  }

  saveScheduleButton.disabled = true;
  saveScheduleButton.textContent = "保存中…";
  try {
    parameters.p_token = getScheduleSession().token;
    await callVisitRpc(rpcName, parameters);
    showMainView();
    await refreshScheduleData();
  } catch (error) {
    if (isScheduleAuthenticationError(error)) {
      await handleScheduleError(error, `${typeConfig.label}予定を保存できませんでした。`);
      return;
    }
    formError.textContent = `${typeConfig.label}予定を保存できませんでした。${error?.message ? ` ${error.message}` : ""}`;
    formError.hidden = false;
  } finally {
    saveScheduleButton.disabled = false;
    saveScheduleButton.textContent = normalLabel;
  }
}

async function deleteEditingSchedule() {
  const typeConfig = SCHEDULE_TYPES[currentScheduleType];
  if (!editingScheduleId || !window.confirm(`この${typeConfig.label}予定を削除しますか？`)) {
    return;
  }

  deleteScheduleButton.disabled = true;
  deleteScheduleButton.textContent = "削除中…";
  try {
    const deleted = await callVisitRpc(typeConfig.deleteRpc, {
      p_token: getScheduleSession().token,
      p_id: editingScheduleId,
    });
    if (deleted !== true) {
      throw new Error(`削除する${typeConfig.label}予定が見つかりませんでした。`);
    }
    showMainView();
    await refreshScheduleData();
  } catch (error) {
    if (isScheduleAuthenticationError(error)) {
      await handleScheduleError(error, `${typeConfig.label}予定を削除できませんでした。`);
      return;
    }
    formError.textContent = `${typeConfig.label}予定を削除できませんでした。${error?.message ? ` ${error.message}` : ""}`;
    formError.hidden = false;
  } finally {
    deleteScheduleButton.disabled = false;
    deleteScheduleButton.textContent = "削除";
  }
}

openRegistrationButton.addEventListener("click", showRegistrationView);
scheduleTypeButtons.forEach((button) => {
  button.addEventListener("click", () => switchScheduleType(button.dataset.scheduleType));
});
backToMainButton.addEventListener("click", showMainView);
registrationForm.addEventListener("submit", registerSchedule);
registrationForm.addEventListener("input", clearValidationErrors);
deleteScheduleButton.addEventListener("click", deleteEditingSchedule);
loginForm.addEventListener("submit", submitLogin);
initialAdminForm.addEventListener("submit", submitInitialAdmin);
logoutButton.addEventListener("click", logout);
openStaffManagementButton.addEventListener("click", openStaffManagement);
backFromStaffManagementButton.addEventListener("click", showMainView);
staffAddForm.addEventListener("submit", submitStaffAdd);
staffPinForm.addEventListener("submit", submitStaffPinChange);
staffList.addEventListener("click", handleStaffAction);
exportJsonButton.addEventListener("click", exportSchedulesAsJson);
importJsonButton.addEventListener("click", selectJsonFile);
previousMonthButton.addEventListener("click", () => changeCalendarMonth(-1));
nextMonthButton.addEventListener("click", () => changeCalendarMonth(1));

initializeAuthentication();
