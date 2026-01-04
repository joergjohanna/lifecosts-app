/* ====================== STATE + STORAGE ====================== */
const state = { expenses: [], income: [], fixed: [] };
let currentType = "survive";

function save() {
  localStorage.setItem("lifeCosts", JSON.stringify(state));
}

function load() {
  const data = localStorage.getItem("lifeCosts");
  if (data) Object.assign(state, JSON.parse(data));
}

load();

/* ====================== SCREEN HANDLING ====================== */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const screen = document.getElementById(id);
  screen.classList.add("active");
  document.body.className = screen.dataset.mode;
}

function showHome() { showScreen("home"); }
function openExpense(type) {
  currentType = type;
  document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
  document.querySelector(`.pill[onclick="openExpense('${type}')"]`).classList.add("active");
  document.getElementById("expense-title").innerText = type;
  document.getElementById("date").value = today();
  document.getElementById("amount").value = "";
  document.getElementById("note").value = "";
  showScreen("expense");
}
function openIncome() {
  document.getElementById("income-date").value = today();
  document.getElementById("income-amount").value = "";
  document.getElementById("income-source").value = "";
  showScreen("income");
}
function openFixed() {
  renderFixed();
  showScreen("fixed");
}
function openMovements() {
  document.getElementById("detail-month").value = today().slice(0, 7);
  renderMovements();
  showScreen("movements");
}
function openBalance() {
  document.getElementById("balance-month").value = today().slice(0, 7);
  document.getElementById("balance-year").checked = false;
  calculateBalance();
  showScreen("balance");
}

/* ====================== SAVE DATA ====================== */
function saveExpense() {
  const amount = Math.round(Number(document.getElementById("amount").value));
  if (!amount) return;
  state.expenses.push({
    date: document.getElementById("date").value,
    amount,
    note: document.getElementById("note").value,
    type: currentType
  });
  save();
  showHome();
}

function saveIncome() {
  const amount = Math.round(Number(document.getElementById("income-amount").value));
  if (!amount) return;
  state.income.push({
    date: document.getElementById("income-date").value,
    amount,
    source: document.getElementById("income-source").value
  });
  save();
  showHome();
}

function saveFixed() {
  const name = document.getElementById("fixed-name").value;
  const amount = Math.round(Number(document.getElementById("fixed-amount").value));
  const cycle = document.getElementById("fixed-cycle").value;
  if (!name || !amount) return;
  state.fixed.push({ id: Date.now(), name, amount, cycle });
  save();
  renderFixed();
  document.getElementById("fixed-name").value = "";
  document.getElementById("fixed-amount").value = "";
}

/* ====================== RENDER FIXED ====================== */
function renderFixed() {
  const box = document.getElementById("fixed-list");
  box.innerHTML = "";
  state.fixed.forEach(f => {
    box.innerHTML += `<div class="row split">
      <span>${f.name}</span>
      <span>${f.amount} €</span>
      <span>${f.cycle}</span>
      <span style="cursor:pointer;color:#222222" onclick="deleteFixed(${f.id})">x</span>
    </div>`;
  });
}

function deleteFixed(id) {
  state.fixed = state.fixed.filter(f => f.id !== id);
  save();
  renderFixed();
}

/* ====================== MOVEMENTS ====================== */
function renderMovements() {
  const month = document.getElementById("detail-month").value;
  const categories = [...document.querySelectorAll(".dropdown input:checked")].map(i => i.value);
  const box = document.getElementById("details-list");
  box.innerHTML = "";

  state.expenses.forEach((e, idx) => {
    if (e.date.startsWith(month) && categories.includes(e.type)) {
      box.innerHTML += `<div class="row split">
        <span>${e.note || "—"}</span>
        <span>${e.amount} €</span>
        <span style="cursor:pointer;color:white" onclick="deleteExpense(${idx})">x</span>
      </div>`;
    }
  });

  state.income.forEach((i, idx) => {
    if (i.date.startsWith(month) && categories.includes("income")) {
      box.innerHTML += `<div class="row split">
        <span>—</span>
        <span>${i.amount} €</span>
        <span style="cursor:pointer;color:white" onclick="deleteIncome(${idx})">x</span>
      </div>`;
    }
  });
}

function deleteExpense(idx) { state.expenses.splice(idx, 1); save(); renderMovements(); }
function deleteIncome(idx) { state.income.splice(idx, 1); save(); renderMovements(); }

/* ====================== BALANCE ====================== */
function calculateBalance() {
  const month = document.getElementById("balance-month").value;
  const fullYear = document.getElementById("balance-year").checked;
  const match = date => fullYear ? date.startsWith(month.slice(0, 4)) : date.startsWith(month);

  const sum = (arr, fn) => arr.filter(fn).reduce((a, b) => a + b.amount, 0);

  const survive = sum(state.expenses, e => e.type === "survive" && match(e.date));
  const fun = sum(state.expenses, e => e.type === "fun" && match(e.date));
  const income = sum(state.income, i => match(i.date));

  const fixed = state.fixed.reduce((acc, f) => {
    if (fullYear) {
      if (f.cycle === "monthly") return acc + f.amount * 12;
      if (f.cycle === "yearly") return acc + f.amount;
      return acc;
    } else {
      if (f.cycle === "monthly") return acc + f.amount;
      if (f.cycle === "yearly") return acc + f.amount / 12;
      return acc;
    }
  }, 0);

  set("b-survive", survive);
  set("b-fun", fun);
  set("b-fixed", fixed);
  set("b-expenses", survive + fun + fixed);
  set("b-income", income);
  set("b-balance", income - (survive + fun + fixed));
}

/* ====================== HELPERS ====================== */
function set(id, val) { document.getElementById(id).innerText = Math.round(val) + " €"; }
function today() { return new Date().toISOString().slice(0, 10); }

/* ====================== HOME MENU: IMPORT / EXPORT ====================== */
function toggleHomeMenu() {
  const menu = document.getElementById("home-menu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lifeCosts.json";
  a.click();
  URL.revokeObjectURL(url);
  toggleHomeMenu();
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.expenses && imported.income && imported.fixed) {
          Object.assign(state, imported);
          save();
          alert("Daten erfolgreich importiert!");
          showHome();
        } else {
          alert("Ungültiges Format!");
        }
      } catch {
        alert("Fehler beim Einlesen der Datei!");
      }
    };
    reader.readAsText(file);
  };
  input.click();
  toggleHomeMenu();
}
