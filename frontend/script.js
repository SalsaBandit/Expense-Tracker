const API_BASE_URL = "http://127.0.0.1:8000";

const expenseForm = document.getElementById("expense-form");
const messageEl = document.getElementById("message");
const expenseListEl = document.getElementById("expense-list");
const loadExpensesBtn = document.getElementById("load-expenses-btn");

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const expenseData = {
    title: document.getElementById("title").value.trim(),
    amount: Number(document.getElementById("amount").value),
    category: document.getElementById("category").value.trim(),
    date: document.getElementById("date").value,
    notes: document.getElementById("notes").value.trim() || null
  };

  try {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(expenseData)
    });

    if (!response.ok) {
      throw new Error("Failed to create expense");
    }

    const createdExpense = await response.json();
    showMessage(`Added expense: ${createdExpense.title}`, "success");

    expenseForm.reset();
    loadExpenses();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

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
          </article>
        `;
      })
      .join("");
  } catch (error) {
    expenseListEl.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

loadExpensesBtn.addEventListener("click", loadExpenses);

loadExpenses();