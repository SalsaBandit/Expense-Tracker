const API_BASE_URL = "http://127.0.0.1:8000";

const expenseForm = document.getElementById("expense-form");
const messageEl = document.getElementById("message");
const expenseListEl = document.getElementById("expense-list");
const loadExpensesBtn = document.getElementById("load-expenses-btn");
const formHeading = document.getElementById("form-heading");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

let editingExpenseId = null;

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
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

cancelEditBtn.addEventListener("click", () => {
  setCreateMode();
  showMessage("Edit cancelled.", "success");
});

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(expenseData)
    });

    if (!response.ok) {
      throw new Error(isEditing ? "Failed to update expense" : "Failed to create expense");
    }

    const savedExpense = await response.json();

    showMessage(
      isEditing
        ? `Updated expense: ${savedExpense.title}`
        : `Added expense: ${savedExpense.title}`,
      "success"
    );

    setCreateMode();
    await loadExpenses();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

async function deleteExpense(expenseId) {
  const confirmed = window.confirm("Are you sure you want to delete this expense?");

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Failed to delete expense");
    }

    showMessage("Expense deleted successfully.", "success");

    if (editingExpenseId === expenseId) {
      setCreateMode();
    }

    await loadExpenses();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function loadExpenses() {
  expenseListEl.innerHTML = "<p class='empty-state'>Loading expenses...</p>";

  try {
    const response = await fetch(`${API_BASE_URL}/expenses`);

    if (!response.ok) {
      throw new Error("Failed to load expenses");
    }

    const expenses = await response.json();

    if (expenses.length === 0) {
      expenseListEl.innerHTML = "<p class='empty-state'>No expenses yet.</p>";
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

loadExpensesBtn.addEventListener("click", loadExpenses);

setCreateMode();
loadExpenses();