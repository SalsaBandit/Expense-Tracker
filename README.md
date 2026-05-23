# Expense Tracker

A full-stack expense tracking web app with user authentication, registration, per-user data isolation, and category-based spending totals.


**NOTE:** due to the tier of Render's free plan, the backend may take **30 seconds** to wake up if it has been idle. This is a common issue with free hosting platforms that use sleep mode to save resources. Once the backend is awake, it should respond normally. the postgresql database is only available for a limited time on the free plan and will be deleted after that time, so the backend may not work after a certain date (e.g., 30 days after creation). To run the backend locally, follow the installation instructions below.

## Demo
- Live Frontend: https://expense-tracker-cyan-alpha.vercel.app
- Backend API: https://expense-tracker-gk20.onrender.com
- Backend API Documentation: https://expense-tracker-gk20.onrender.com/docs

## Overview
This project is a full-stack expense tracker built to practice real-world web development concepts such as authentication, REST APIs, database design, frontend-backend integration, and deployment. Users can register, log in, create and manage their own expenses, filter expenses by category, and view total spending grouped by category. Each user only sees their own data.

## Features
- User registration and login
- JWT-based authentication
- Create, read, update, and delete expenses
- Per-user expense isolation
- Filter expenses by category
- View total spending per category
- Deployed frontend and backend

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Python, FastAPI, SQLModel
- Database: PostgreSQL
- Authentication: JWT, Passlib, bcrypt
- Deployment: Vercel (frontend), Render (backend)

## Architecture
The frontend is a JavaScript app that sends HTTP requests to the FastAPI backend using `fetch()`.

The backend handles authentication, validates requests, connects to PostgreSQL, and returns JSON responses. Expense records are linked to users through the `owner_id` field, and protected routes use JWT bearer tokens to identify the current user.

## Database Tables

### user
- `id`
- `email`
- `hashed_password`

### expense
- `id`
- `title`
- `amount`
- `category`
- `date`
- `notes`
- `owner_id`

## Screenshots


<img width="855" height="658" alt="Screenshot 2026-05-22 at 10 00 41 PM" src="https://github.com/user-attachments/assets/6f47def0-0bad-4333-a6a4-8bd1f28cf346" />
<img width="851" height="742" alt="Screenshot 2026-05-22 at 10 00 50 PM" src="https://github.com/user-attachments/assets/5ea6e307-2a1c-45bd-a572-a854a0bc39fa" />
<img width="852" height="437" alt="Screenshot 2026-05-22 at 10 00 59 PM" src="https://github.com/user-attachments/assets/20d77f7c-5203-4ecb-8990-46d571a17834" />


## Installation


### Backend setup
Modify secret_key in your environment for increased security
Add an environment variable `DATABASE_URL` with your PostgreSQL connection string, then run the backend server. modify main.py origins variable to allow your frontend origin.

```bash
cd backend
pip install -r REQUIREMENTS.txt
uvicorn main:app --reload
```

### Frontend setup
modify the API URL in `frontend/script.js` to point to your backend server, then
Open the frontend with Live Server in VS Code, or serve it locally.

Example:
```bash
cd frontend
python -m http.server 5500
```

## API Endpoints
- `POST /register` — create a new user
- `POST /token` — log in and receive JWT token
- `GET /expenses` — get current user's expenses
- `POST /expenses` — create a new expense
- `PATCH /expenses/{expense_id}` — update an expense
- `DELETE /expenses/{expense_id}` — delete an expense
- `GET /categories` — get distinct categories for current user
- `GET /expenses/category-totals` — get total spending grouped by category

## Challenges and Learnings
This project helped strengthen my understanding of full-stack development beyond basic CRUD and API design.

Key things learned:
- How user separation works in a multi-user app with JWT   authentication
- How JWT authentication works in FastAPI
- How to separate request, response, and database models
- How to link expenses to users with a foreign key
- How to calculate grouped totals
- How to debug deployment and dependency issues in Render
- How to deploy a FastAPI backend and static frontend separately on different platforms and connect them
- How to use environment variables for configuration in deployment
- How to use postgresql with SQLModel and FastAPI
- How to use CORS middleware to allow cross-origin requests from the frontend to the backend

One major issue during development was password hashing failing in deployment due to a bcrypt compatibility problem. Fixing that required checking logs, understanding the error, and pinning a compatible dependency version.

## Future Improvements
- Add charts for monthly spending trends
- Add pagination and sorting
- Add form validation messages in the UI
- Persist login state more elegantly
- Add profile management and password reset

## Author
Avi Aaron Batchu
