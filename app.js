const STORAGE_KEY = "hagoromo_visit_schedules";
const AUTH_SESSION_KEY = "hagoromo_visit_auth_session";
const SUPABASE_URL = "https://xytxjujsydpvmrvnmcnj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_EzqE7TE3zY_AuZJlZWEuKA_3fsXczmK";

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
const registrationView = document.querySelector("#registration-view");
const openRegistrationButton = document.querySelector("#open-registration");
const backToMainButton = document.querySelector("#back-to-main");
const registrationForm = document.querySelector("#registration-form");
const visitDateInput = document.querySelector("#visit-date");
const visitTimeInput = document.querySelector("#visit-time");
const residentNameInput = document.querySelector("#resident-name");
const visitorNameInput = document.querySelector("#visitor-name");
const noteInput = document.querySelector("#notes");
const formError = document.querySelector("#form-error");
const registrationHeading = document.querySelector("#registration-heading");
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
  if (isToday(dateValue)) {
    return "本日の面会予定";
  }

  const [, month, day] = dateValue.split("-").map(Number);
  return `${month}月${day}日の面会予定`;
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

    const json = JSON.stringify(schedules, null, 2);
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
  let session;
  selectedDateSchedules = null;
  renderSelectedDateSchedules();

  try {
    session = getScheduleSession();
    const schedules = await callVisitRpc("visit_schedules_by_date", {
      p_token: session.token,
      p_visit_date: requestedDate,
    });
    if (!Array.isArray(schedules)) {
      throw new Error("取得データの形式が正しくありません。");
    }
    if (selectedDate === requestedDate && currentAuthSession?.token === session.token) {
      selectedDateSchedules = schedules;
      renderSelectedDateSchedules();
    }
    return true;
  } catch (error) {
    if (selectedDate !== requestedDate && !isScheduleAuthenticationError(error)) {
      return false;
    }
    selectedDateSchedules = null;
    await handleScheduleError(error, "面会予定を読み込めませんでした。", true);
    return false;
  }
}

async function fetchVisibleMonthSchedules() {
  const requestedMonth = visibleMonthStart();
  let session;

  try {
    session = getScheduleSession();
    const schedules = await callVisitRpc("visit_schedules_by_month", {
      p_token: session.token,
      p_month_start: requestedMonth,
    });
    if (!Array.isArray(schedules)) {
      throw new Error("取得データの形式が正しくありません。");
    }
    if (visibleMonthStart() === requestedMonth && currentAuthSession?.token === session.token) {
      visibleMonthSchedules = schedules;
      visibleMonthSchedulesLoaded = true;
      renderCalendarScheduleCounts();
    }
    return true;
  } catch (error) {
    if (visibleMonthStart() !== requestedMonth && !isScheduleAuthenticationError(error)) {
      return false;
    }
    visibleMonthSchedules = [];
    visibleMonthSchedulesLoaded = false;
    renderCalendarScheduleCounts();
    await handleScheduleError(error, "月間の面会予定を読み込めませんでした。");
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
    await handleScheduleError(error, "面会予定を読み込めませんでした。", true);
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
  message.textContent = isToday(dateValue)
    ? "本日の面会予定はありません"
    : "この日の面会予定はありません";

  emptyState.append(icon, message);
  todayScheduleList.append(emptyState);
}

function renderScheduleItem(schedule) {
  const item = document.createElement("article");
  item.className = "schedule-item";
  item.setAttribute("role", "button");
  item.setAttribute("aria-label", `${schedule.visit_time} ${schedule.resident_name}様の予定を編集`);
  item.tabIndex = 0;

  const time = document.createElement("time");
  time.className = "schedule-item__time";
  time.dateTime = `${schedule.visit_date}T${schedule.visit_time}`;
  time.textContent = schedule.visit_time.slice(0, 5);

  const content = document.createElement("div");
  const name = document.createElement("p");
  name.className = "schedule-item__name";
  name.textContent = `${schedule.resident_name}様`;
  content.append(name);

  const details = [];
  if (schedule.visitor_name) {
    details.push(`面会者：${schedule.visitor_name}`);
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

  item.addEventListener("click", () => showEditView(schedule));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showEditView(schedule);
    }
  });

  item.append(time, content, editHint);
  todayScheduleList.append(item);
}

function renderSelectedDateSchedules() {
  todayDateLabel.textContent = formatDateLabel(selectedDate);
  scheduleHeading.textContent = formatScheduleHeading(selectedDate);

  if (selectedDateSchedules === null) {
    todayCount.textContent = "—件";
    renderScheduleStatus("面会予定を読み込んでいます…");
    return;
  }

  const schedules = [...selectedDateSchedules]
    .sort((first, second) => first.visit_time.localeCompare(second.visit_time));

  todayCount.textContent = `${schedules.length}件`;
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
  const countByDate = visibleMonthSchedules.reduce((counts, schedule) => {
    if (schedule.visit_date) {
      counts[schedule.visit_date] = (counts[schedule.visit_date] || 0) + 1;
    }
    return counts;
  }, {});

  calendarDays.forEach((day) => {
    day.querySelector(".calendar-day__count")?.remove();
    const count = countByDate[day.dataset.date] || 0;

    if (count === 0) {
      return;
    }

    const countLabel = document.createElement("small");
    countLabel.className = "calendar-day__count";
    countLabel.textContent = `${count}件`;
    day.append(countLabel);
  });
}

function clearValidationErrors() {
  formError.hidden = true;
  formError.textContent = "";
  [visitDateInput, visitTimeInput, residentNameInput].forEach((input) => {
    input.removeAttribute("aria-invalid");
  });
}

function validateRegistrationForm() {
  const requiredFields = [
    { input: visitDateInput, label: "日付" },
    { input: visitTimeInput, label: "来苑時間" },
    { input: residentNameInput, label: "利用者名" },
  ];
  const missingFields = requiredFields.filter(({ input }) => !input.value.trim());

  clearValidationErrors();

  if (missingFields.length === 0) {
    return true;
  }

  missingFields.forEach(({ input }) => input.setAttribute("aria-invalid", "true"));
  formError.textContent = `${missingFields.map(({ label }) => label).join("、")}を入力してください。`;
  formError.hidden = false;
  missingFields[0].input.focus();
  return false;
}

function showRegistrationView() {
  editingScheduleId = null;
  registrationForm.reset();
  clearValidationErrors();
  visitDateInput.value = getTodayForDateInput();
  registrationModeLabel.textContent = "新規登録";
  registrationHeading.textContent = "面会予定を登録";
  saveScheduleButton.textContent = "登録する";
  deleteScheduleButton.hidden = true;
  formActions.classList.remove("editing");
  mainView.hidden = true;
  registrationView.hidden = false;
  window.scrollTo(0, 0);
  registrationHeading.focus();
}

function showEditView(schedule) {
  editingScheduleId = schedule.id;
  registrationForm.reset();
  clearValidationErrors();
  visitDateInput.value = schedule.visit_date;
  visitTimeInput.value = schedule.visit_time.slice(0, 5);
  residentNameInput.value = schedule.resident_name;
  visitorNameInput.value = schedule.visitor_name || "";
  noteInput.value = schedule.note || "";
  registrationModeLabel.textContent = "予定編集";
  registrationHeading.textContent = "面会予定を編集";
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
  const rpcName = isEditing ? "visit_schedule_update" : "visit_schedule_add";
  const normalLabel = isEditing ? "変更を保存" : "登録する";
  const parameters = {
    p_token: "",
    p_visit_date: visitDateInput.value,
    p_visit_time: visitTimeInput.value,
    p_resident_name: residentNameInput.value.trim(),
    p_visitor_name: visitorNameInput.value.trim() || null,
    p_note: noteInput.value.trim() || null,
  };
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
      await handleScheduleError(error, "面会予定を保存できませんでした。");
      return;
    }
    formError.textContent = `面会予定を保存できませんでした。${error?.message ? ` ${error.message}` : ""}`;
    formError.hidden = false;
  } finally {
    saveScheduleButton.disabled = false;
    saveScheduleButton.textContent = normalLabel;
  }
}

async function deleteEditingSchedule() {
  if (!editingScheduleId || !window.confirm("この面会予定を削除しますか？")) {
    return;
  }

  deleteScheduleButton.disabled = true;
  deleteScheduleButton.textContent = "削除中…";
  try {
    const deleted = await callVisitRpc("visit_schedule_delete", {
      p_token: getScheduleSession().token,
      p_id: editingScheduleId,
    });
    if (deleted !== true) {
      throw new Error("削除する面会予定が見つかりませんでした。");
    }
    showMainView();
    await refreshScheduleData();
  } catch (error) {
    if (isScheduleAuthenticationError(error)) {
      await handleScheduleError(error, "面会予定を削除できませんでした。");
      return;
    }
    formError.textContent = `面会予定を削除できませんでした。${error?.message ? ` ${error.message}` : ""}`;
    formError.hidden = false;
  } finally {
    deleteScheduleButton.disabled = false;
    deleteScheduleButton.textContent = "削除";
  }
}

openRegistrationButton.addEventListener("click", showRegistrationView);
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
