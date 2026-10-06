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
const scheduleTypeButtons = [...document.querySelectorAll("[data-registration-type]")];
const registrationView = document.querySelector("#registration-view");
const openRegistrationButton = document.querySelector("#open-registration");
const openScheduleManagementButton = document.querySelector("#open-schedule-management");
const scheduleManagementView = document.querySelector("#schedule-management-view");
const scheduleManagementHeading = document.querySelector("#schedule-management-heading");
const scheduleManagementDate = document.querySelector("#schedule-management-date");
const managedScheduleList = document.querySelector("#managed-schedule-list");
const backFromScheduleManagementButton = document.querySelector("#back-from-schedule-management");
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
  scheduleManagementView.hidden = true;
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
  scheduleManagementView.hidden = true;
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
    if (staff.id !== currentAuthSession?.staff_id) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "staff-toggle-button warning";
      deleteButton.dataset.staffAction = "delete";
      deleteButton.dataset.staffId = staff.id;
      deleteButton.textContent = "削除";
      actions.append(deleteButton);
    }
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
  scheduleManagementView.hidden = true;
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

async function deleteManagedStaff(staff, button) {
  if (button.disabled || !currentUserIsAdmin || staff.id === currentAuthSession?.staff_id) {
    return;
  }
  if (!window.confirm(`「${staff.display_name}」を削除しますか？\n削除するとログインできなくなります。\nこの操作は元に戻せません。`)) {
    return;
  }

  button.disabled = true;
  setManagementMessage("");
  try {
    const result = rpcResult(await callVisitRpc("visit_staff_delete", {
      p_token: currentAuthSession.token,
      p_staff_id: staff.id,
    }));
    if (!result?.ok) {
      setManagementMessage(result?.message || "職員を削除できませんでした。");
      return;
    }

    await loadManagedStaff("職員を削除しました。");
  } catch (error) {
    setManagementMessage(`職員を削除できませんでした。${error.message ? ` ${error.message}` : ""}`);
  } finally {
    button.disabled = false;
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
  if (action === "delete") {
    await deleteManagedStaff(staff, button);
    return;
  }
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
    return "本日の予定";
  }

  const [, month, day] = dateValue.split("-").map(Number);
  return `${month}月${day}日の予定`;
}

function updateScheduleTypeUi() {
  scheduleTypeButtons.forEach((button) => {
    const isActive = button.dataset.registrationType === currentScheduleType;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function switchScheduleType(type) {
  if (!SCHEDULE_TYPES[type] || type === currentScheduleType || editingScheduleId) {
    return;
  }

  currentScheduleType = type;
  visitTimeInput.value = "";
  returnDateInput.value = "";
  visitorNameInput.value = "";
  setSelectedUnit("");
  clearValidationErrors();
  updateScheduleTypeUi();
  configureRegistrationFields();
  registrationHeading.textContent = `${SCHEDULE_TYPES[type].label}予定を登録`;
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

function scheduleDateParameter(type, dateValue) {
  if (type === "visit") {
    return { p_visit_date: dateValue };
  }
  if (type === "outing") {
    return { p_outing_date: dateValue };
  }
  return { p_target_date: dateValue };
}

function schedulesWithType(schedules, type) {
  return schedules.map((schedule) => ({ ...schedule, schedule_type: type }));
}

async function fetchSelectedDateSchedules() {
  const requestedDate = selectedDate;
  let session;
  selectedDateSchedules = null;
  renderSelectedDateSchedules();

  try {
    session = getScheduleSession();
    const schedulesByType = await Promise.all(
      Object.entries(SCHEDULE_TYPES).map(async ([type, config]) => {
        const schedules = await callVisitRpc(config.byDateRpc, {
          p_token: session.token,
          ...scheduleDateParameter(type, requestedDate),
        });
        return { type, schedules };
      }),
    );
    if (schedulesByType.some(({ schedules }) => !Array.isArray(schedules))) {
      throw new Error("取得データの形式が正しくありません。");
    }
    if (
      selectedDate === requestedDate
      && currentAuthSession?.token === session.token
    ) {
      selectedDateSchedules = schedulesByType.flatMap(({ type, schedules }) => (
        schedulesWithType(schedules, type)
      ));
      renderSelectedDateSchedules();
    }
    return true;
  } catch (error) {
    if (selectedDate !== requestedDate && !isScheduleAuthenticationError(error)) {
      return false;
    }
    selectedDateSchedules = null;
    await handleScheduleError(error, "予定を読み込めませんでした。", true);
    return false;
  }
}

async function fetchVisibleMonthSchedules() {
  const requestedMonth = visibleMonthStart();
  let session;

  try {
    session = getScheduleSession();
    const schedulesByType = await Promise.all(
      Object.entries(SCHEDULE_TYPES).map(async ([type, config]) => {
        const schedules = await callVisitRpc(config.byMonthRpc, {
          p_token: session.token,
          p_month_start: requestedMonth,
        });
        return { type, schedules };
      }),
    );
    if (schedulesByType.some(({ schedules }) => !Array.isArray(schedules))) {
      throw new Error("取得データの形式が正しくありません。");
    }
    if (
      visibleMonthStart() === requestedMonth
      && currentAuthSession?.token === session.token
    ) {
      visibleMonthSchedules = schedulesByType.flatMap(({ type, schedules }) => (
        schedulesWithType(schedules, type)
      ));
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
    await handleScheduleError(error, "月間の予定を読み込めませんでした。");
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
    await handleScheduleError(error, "予定を読み込めませんでした。", true);
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
    ? "本日の予定はありません"
    : "この日の予定はありません";

  emptyState.append(icon, message);
  todayScheduleList.append(emptyState);
}

function renderScheduleItem(schedule, container, editable = false) {
  const scheduleType = schedule.schedule_type;
  const item = document.createElement("article");
  item.className = `schedule-item schedule-item--${scheduleType}`;

  const content = document.createElement("div");
  content.className = "schedule-item__content";
  const name = document.createElement("p");
  name.className = "schedule-item__name";
  name.textContent = `${schedule.resident_name}様`;
  content.append(name);

  if (scheduleType === "visit") {
    const unitLabels = { sakura: "さくら", keyaki: "けやき" };
    if (unitLabels[schedule.unit]) {
      const unit = document.createElement("p");
      unit.className = "schedule-item__unit";
      unit.textContent = unitLabels[schedule.unit];
      content.append(unit);
    }
  } else if (scheduleType === "overnight") {
    const [, startMonth, startDay] = schedule.start_date.split("-").map(Number);
    const [, returnMonth, returnDay] = schedule.return_date.split("-").map(Number);
    const detailText = document.createElement("p");
    detailText.className = "schedule-item__details";
    detailText.textContent = `外泊期間：${startMonth}/${startDay}〜${returnMonth}/${returnDay}帰苑`;
    content.append(detailText);
  }

  const itemParts = [];
  if (scheduleType === "visit") {
    const time = document.createElement("time");
    time.className = "schedule-item__time";
    time.dateTime = `${schedule.visit_date}T${schedule.visit_time}`;
    time.textContent = schedule.visit_time.slice(0, 5);
    itemParts.push(time);
  } else {
    item.classList.add("schedule-item--without-time");
  }

  item.append(...itemParts, content);
  if (editable) {
    const staffNames = document.createElement("p");
    staffNames.className = "schedule-item__staff-names";
    staffNames.textContent = `登録：${schedule.created_by_name ?? "不明"} ／ 更新：${schedule.updated_by_name ?? "不明"}`;
    content.append(staffNames);
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary-button schedule-edit-button";
    editButton.textContent = "編集";
    editButton.setAttribute("aria-label", `${schedule.resident_name}様の${SCHEDULE_TYPES[scheduleType].label}予定を編集`);
    editButton.addEventListener("click", () => showEditView(schedule));
    item.append(editButton);
  }
  container.append(item);
}

function renderSelectedDateSchedules() {
  todayDateLabel.textContent = formatDateLabel(selectedDate);
  scheduleHeading.textContent = formatScheduleHeading(selectedDate);

  if (selectedDateSchedules === null) {
    todayCount.textContent = "—件";
    renderScheduleStatus("予定を読み込んでいます…");
    return;
  }

  const schedules = [...selectedDateSchedules].sort((first, second) => {
    const typeOrder = { visit: 0, outing: 1, overnight: 2 };
    const typeDifference = typeOrder[first.schedule_type] - typeOrder[second.schedule_type];
    if (typeDifference !== 0) {
      return typeDifference;
    }
    if (first.schedule_type === "visit") {
      return first.visit_time.localeCompare(second.visit_time);
    }
    if (first.schedule_type === "outing") {
      return first.resident_name.localeCompare(second.resident_name, "ja");
    }
    return first.start_date.localeCompare(second.start_date)
      || first.resident_name.localeCompare(second.resident_name, "ja");
  });

  todayCount.textContent = `${schedules.length}件`;
  todayScheduleList.replaceChildren();
  todayScheduleList.classList.toggle("schedule-list--populated", schedules.length > 0);

  if (schedules.length === 0) {
    renderEmptySchedule(selectedDate);
    return;
  }

  const schedulesByType = {
    visit: schedules.filter((schedule) => schedule.schedule_type === "visit"),
    outing: schedules.filter((schedule) => schedule.schedule_type === "outing"),
    overnight: schedules.filter((schedule) => schedule.schedule_type === "overnight"),
  };
  Object.entries(schedulesByType).forEach(([type, typeSchedules]) => {
    if (typeSchedules.length === 0) {
      return;
    }

    const section = document.createElement("section");
    section.className = `schedule-group schedule-group--${type}`;
    const heading = document.createElement("h3");
    heading.className = "schedule-group__heading";
    heading.textContent = SCHEDULE_TYPES[type].label;
    const items = document.createElement("div");
    items.className = `schedule-group__items schedule-group__items--${type}`;
    section.append(heading, items);
    todayScheduleList.append(section);
    typeSchedules.forEach((schedule) => renderScheduleItem(schedule, items));
  });
}

function updateCalendarSelection() {
  calendarDays.forEach((day) => {
    const isSelected = day.dataset.date === selectedDate;
    day.classList.toggle("selected", isSelected);
    day.setAttribute("aria-selected", String(isSelected));
  });
}

function selectCalendarDate(day) {
  showRegistrationView(day.dataset.date);
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
      if (schedule.schedule_type === "visit") {
        return schedule.visit_date === dateValue;
      }
      if (schedule.schedule_type === "outing") {
        return schedule.outing_date === dateValue;
      }
      return schedule.start_date <= dateValue && dateValue < schedule.return_date;
    }).length;

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

async function loadManagedSchedules() {
  const dateValue = scheduleManagementDate.value;
  const status = document.createElement("p");
  status.textContent = dateValue ? "予定を読み込んでいます…" : "日付を選択してください。";
  managedScheduleList.replaceChildren(status);
  if (!dateValue) return;

  let session;
  try {
    session = getScheduleSession();
    const groups = await Promise.all(Object.entries(SCHEDULE_TYPES).map(async ([type, config]) => {
      const schedules = await callVisitRpc(config.byDateRpc, {
        p_token: session.token,
        ...scheduleDateParameter(type, dateValue),
      });
      if (!Array.isArray(schedules)) throw new Error("取得データの形式が正しくありません。");
      return { type, schedules: schedulesWithType(schedules, type) };
    }));
    if (scheduleManagementDate.value !== dateValue || currentAuthSession?.token !== session.token) return;

    managedScheduleList.replaceChildren();
    groups.forEach(({ type, schedules }) => {
      if (schedules.length === 0) return;
      const section = document.createElement("section");
      section.className = `schedule-group schedule-group--${type}`;
      const heading = document.createElement("h3");
      heading.className = "schedule-group__heading";
      heading.textContent = SCHEDULE_TYPES[type].label;
      const items = document.createElement("div");
      items.className = `schedule-group__items schedule-group__items--${type}`;
      section.append(heading, items);
      managedScheduleList.append(section);
      schedules.forEach((schedule) => renderScheduleItem(schedule, items, true));
    });
    if (managedScheduleList.children.length === 0) {
      status.textContent = "この日の予定はありません。";
      managedScheduleList.append(status);
    }
  } catch (error) {
    if (scheduleManagementDate.value !== dateValue || (session && currentAuthSession?.token !== session.token)) return;
    status.textContent = `予定を読み込めませんでした。${error.message ? ` ${error.message}` : ""}`;
    managedScheduleList.replaceChildren(status);
    if (isScheduleAuthenticationError(error)) {
      await handleScheduleError(error, "予定を読み込めませんでした。");
    }
  }
}

function showScheduleManagementView() {
  mainView.hidden = true;
  scheduleManagementView.hidden = false;
  scheduleManagementDate.value = selectedDate;
  loadManagedSchedules();
  window.scrollTo(0, 0);
  scheduleManagementHeading.focus();
}

function showRegistrationView(dateValue = getTodayForDateInput()) {
  currentScheduleType = "visit";
  const typeLabel = SCHEDULE_TYPES[currentScheduleType].label;
  editingScheduleId = null;
  registrationForm.reset();
  clearValidationErrors();
  scheduleTypeButtons.forEach((button) => {
    button.disabled = false;
  });
  updateScheduleTypeUi();
  configureRegistrationFields();
  visitDateInput.value = dateValue;
  returnDateInput.value = "";
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
  scheduleManagementView.hidden = true;
  currentScheduleType = schedule.schedule_type;
  const typeLabel = SCHEDULE_TYPES[currentScheduleType].label;
  editingScheduleId = schedule.id;
  registrationForm.reset();
  clearValidationErrors();
  scheduleTypeButtons.forEach((button) => {
    button.disabled = true;
  });
  updateScheduleTypeUi();
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
  scheduleManagementView.hidden = true;
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

async function hasDuplicateSchedule(type, parameters) {
  try {
    const schedules = await callVisitRpc(
      type === "overnight" ? "overnight_schedules_all" : SCHEDULE_TYPES[type].byDateRpc,
      type === "overnight"
        ? { p_token: parameters.p_token }
        : {
          p_token: parameters.p_token,
          ...scheduleDateParameter(type, parameters.p_visit_date || parameters.p_outing_date),
        },
    );
    if (!Array.isArray(schedules)) {
      throw new Error("取得データの形式が正しくありません。");
    }

    return schedules.some((schedule) => (
      schedule.id !== parameters.p_id
      && schedule.resident_name.trim() === parameters.p_resident_name
      && (type !== "overnight" || (
        parameters.p_start_date < schedule.return_date
        && schedule.start_date < parameters.p_return_date
      ))
    ));
  } catch (error) {
    if (isScheduleAuthenticationError(error)) throw error;
    console.error("予定の重複確認に失敗しました。", error);
    formError.textContent = `重複確認に失敗しました。保存処理は続行します。${error?.message ? ` ${error.message}` : ""}`;
    formError.hidden = false;
    return false;
  }
}

async function registerSchedule(event) {
  event.preventDefault();
  if (saveScheduleButton.disabled) return;

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
    if (await hasDuplicateSchedule(currentScheduleType, parameters)) {
      const message = currentScheduleType === "overnight"
        ? "この利用者は同じ期間に外泊予定が登録されています。\nそれでも登録しますか？"
        : `同じ利用者の${typeConfig.label}予定がすでに登録されています。\nそれでも登録しますか？`;
      if (!window.confirm(message)) return;
    }
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

openRegistrationButton.addEventListener("click", () => showRegistrationView());
openScheduleManagementButton.addEventListener("click", showScheduleManagementView);
backFromScheduleManagementButton.addEventListener("click", showMainView);
scheduleManagementDate.addEventListener("change", loadManagedSchedules);
scheduleTypeButtons.forEach((button) => {
  button.addEventListener("click", () => switchScheduleType(button.dataset.registrationType));
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
