const API_BASE_URL = "https://expense-tracker-cyan-alpha.vercel.app";

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const authStatusEl = document.getElementById("auth-status");

const expenseForm = document.getElementById("expense-form");
const messageEl = document.getElementById("message");
const expenseListEl = document.getElementById("expense-list");
const loadExpensesBtn = document.getElementById("load-expenses-btn");
const formHeading = document.getElementById("form-heading");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const filterCategoryEl = document.getElementById("filter-category");
const categoryTotalsListEl = document.getElementById("category-totals-list");

let editingExpenseId = null;
let accessToken = "";
let currentUserEmail = "";

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function updateAuthUI() {
  const loggedIn = Boolean(accessToken);

  authStatusEl.textContent = loggedIn
    ? `Logged in as ${currentUserEmail}`
    : "Not logged in.";

  logoutBtn.classList.toggle("hidden", !loggedIn);

  if (!loggedIn) {
    expenseListEl.innerHTML = "<p class='empty-state'>Log in to load expenses.</p>";
    categoryTotalsListEl.innerHTML = "<p class='empty-state'>Log in to see totals.</p>";
    filterCategoryEl.innerHTML = `<option value="">All categories</option>`;
  }
}

function getAuthHeaders(includeJson = true) {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  return headers;
}

function setCreateMode() {
  editingExpenseId = null;
  formHeading.textContent = "Add Expense";
  submitBtn.textContent = "Add Expense";
  cancelEditBtn.classList.add("hidden");
  expenseForm.reset();
}

function setEditMode(expense) {
  editingExpenseId = expense.id;
  formHeading.textContent = "Edit Expense";
  submitBtn.textContent = "Update Expense";
  cancelEditBtn.classList.remove("hidden");

  document.getElementById("title").value = expense.title;
  document.getElementById("amount").value = expense.amount;
  document.getElementById("category").value = expense.category;
  document.getElementById("date").value = expense.date;
  document.getElementById("notes").value = expense.notes ?? "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function requireLogin() {
  if (!accessToken) {
    showMessage("Please log in first.", "error");
    return false;
  }
  return true;
}

cancelEditBtn.addEventListener("click", () => {
  setCreateMode();
  showMessage("Edit cancelled.", "success");
});

logoutBtn.addEventListener("click", () => {
  accessToken = "";
  currentUserEmail = "";
  editingExpenseId = null;
  setCreateMode();
  updateAuthUI();
  showMessage("Logged out successfully.", "success");
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("register-email").value.trim().toLowerCase();
  const password = document.getElementById("register-password").value;

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Registration failed");
    }

    registerForm.reset();
    showMessage("Registration successful. You can now log in.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  try {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Login failed");
    }

    const data = await response.json();
    accessToken = data.access_token;
    currentUserEmail = email;

    loginForm.reset();
    updateAuthUI();
    showMessage("Login successful.", "success");

    await loadCategories();
    await loadExpenses();
    await loadCategoryTotals();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!requireLogin()) return;

  const expenseData = {
    title: document.getElementById("title").value.trim(),
    amount: Number(document.getElementById("amount").value),
    category: document.getElementById("category").value.trim(),
    date: document.getElementById("date").value,
    notes: document.getElementById("notes").value.trim() || null
  };

  const isEditing = editingExpenseId !== null;
  const url = isEditing
    ? `${API_BASE_URL}/expenses/${editingExpenseId}`
    : `${API_BASE_URL}/expenses`;

  const method = isEditing ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: getAuthHeaders(true),
      body: JSON.stringify(expenseData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || (isEditing ? "Failed to update expense" : "Failed to create expense")
      );
    }

    const savedExpense = await response.json();

    showMessage(
      isEditing
        ? `Updated expense: ${savedExpense.title}`
        : `Added expense: ${savedExpense.title}`,
      "success"
    );

    setCreateMode();
    await loadCategories();
    await loadExpenses();
    await loadCategoryTotals();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

async function deleteExpense(expenseId) {
  if (!requireLogin()) return;

  const confirmed = window.confirm("Are you sure you want to delete this expense?");
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
      method: "DELETE",
      headers: getAuthHeaders(false)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to delete expense");
    }

    showMessage("Expense deleted successfully.", "success");

    if (editingExpenseId === expenseId) {
      setCreateMode();
    }

    await loadCategories();
    await loadExpenses();
    await loadCategoryTotals();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function loadCategories() {
  if (!accessToken) {
    filterCategoryEl.innerHTML = `<option value="">All categories</option>`;
    return;
  }

  try {
    const currentValue = filterCategoryEl.value;

    const response = await fetch(`${API_BASE_URL}/categories`, {
      headers: getAuthHeaders(false)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to load categories");
    }

    const categories = await response.json();

    filterCategoryEl.innerHTML = `<option value="">All categories</option>`;

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      filterCategoryEl.appendChild(option);
    });

    if ([...filterCategoryEl.options].some((option) => option.value === currentValue)) {
      filterCategoryEl.value = currentValue;
    }
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function loadExpenses() {
  if (!accessToken) {
    expenseListEl.innerHTML = "<p class='empty-state'>Log in to load expenses.</p>";
    return;
  }

  expenseListEl.innerHTML = "<p class='empty-state'>Loading expenses...</p>";

  try {
    const selectedCategory = filterCategoryEl.value;
    const url = selectedCategory
      ? `${API_BASE_URL}/expenses?${new URLSearchParams({ category: selectedCategory }).toString()}`
      : `${API_BASE_URL}/expenses`;

    const response = await fetch(url, {
      headers: getAuthHeaders(false)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to load expenses");
    }

    const expenses = await response.json();

    if (expenses.length === 0) {
      expenseListEl.innerHTML = "<p class='empty-state'>No expenses found.</p>";
      return;
    }

    expenseListEl.innerHTML = expenses
      .map((expense) => {
        return `
          <article class="expense-item">
            <h3>${expense.title}</h3>
            <p><strong>Amount:</strong> $${Number(expense.amount).toFixed(2)}</p>
            <p class="expense-meta"><strong>Category:</strong> ${expense.category}</p>
            <p class="expense-meta"><strong>Date:</strong> ${expense.date}</p>
            <p class="expense-meta"><strong>Notes:</strong> ${expense.notes ?? "None"}</p>

            <div class="expense-actions">
              <button class="action-btn edit-btn" type="button" data-id="${expense.id}">
                Edit
              </button>
              <button class="action-btn delete-btn" type="button" data-id="${expense.id}">
                Delete
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const expenseId = Number(button.dataset.id);
        const expenseToEdit = expenses.find((expense) => expense.id === expenseId);

        if (!expenseToEdit) {
          showMessage("Could not find expense to edit.", "error");
          return;
        }

        setEditMode(expenseToEdit);
      });
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const expenseId = Number(button.dataset.id);
        await deleteExpense(expenseId);
      });
    });
  } catch (error) {
    expenseListEl.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

async function loadCategoryTotals() {
  if (!accessToken) {
    categoryTotalsListEl.innerHTML = "<p class='empty-state'>Log in to see totals.</p>";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/expenses/category-totals`, {
      headers: getAuthHeaders(false)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to load category totals");
    }

    const totals = await response.json();

    if (totals.length === 0) {
      categoryTotalsListEl.innerHTML = "<p class='empty-state'>No totals available yet.</p>";
      return;
    }

    categoryTotalsListEl.innerHTML = totals
      .map(
        (item) => `
          <article class="expense-item">
            <h3>${item.category}</h3>
            <p><strong>Total:</strong> $${Number(item.total).toFixed(2)}</p>
          </article>
        `
      )
      .join("");
  } catch (error) {
    categoryTotalsListEl.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

loadExpensesBtn.addEventListener("click", async () => {
  if (!requireLogin()) return;
  await loadExpenses();
  await loadCategoryTotals();
});

filterCategoryEl.addEventListener("change", async () => {
  if (!requireLogin()) return;
  await loadExpenses();
});

setCreateMode();
updateAuthUI();