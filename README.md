# Engineering Assessment

Welcome, candidate! This project contains **intentional issues** that mimic real‑world scenarios.
Your task is to refactor, optimize, and fix these problems.

---

> ### 📋 Submission — start here
>
> **[SOLUTION.md](SOLUTION.md)** documents every change, the measurements behind
> the performance work, and the bugs found beyond this brief.
>
> ```bash
> cd backend  && npm install && npm run seed && npm start   # :4001
> cd frontend && npm install && npm start                   # :3000
> cd backend  && npm test                                   # 31 tests
> ```
>
> `npm run seed` is worth running: the repo ships 5 items, which is too few to
> see pagination or virtualization do anything. It keeps those 5 as the head of
> the list and appends generated rows.

---

## Objectives

### 💻 Frontend (React)

1. **Memory Leak**  
   - `Items.js` leaks memory if the component unmounts before fetch completes. Fix it.

2. **Pagination & Search**  
   - Implement paginated list with server‑side search (`q` param). Contribute to both client and server.

3. **Performance**  
   - The list can grow large. Integrate **virtualization** (e.g., `react-window`) to keep UI smooth.

4. **UI/UX Polish(optional)**  
   - Feel free to enhance styling, accessibility, and add loading/skeleton states.

### 🔧 Backend (Node.js)

1. **Refactor blocking I/O**  
   - `src/routes/items.js` uses `fs.readFileSync`. Replace with non‑blocking async operations.

2. **Performance**  
   - `GET /api/stats` recalculates stats on every request. Cache results, watch file changes, or introduce a smarter strategy.


## ⏰ Time Expectation

- Estimated time to complete: **1–2 hours**.

## 📤 Submission

Once completed, submit one of the following:

- **short video** recording your work.
- **Github Link** where your assessment result were pushed.

---

## Quick Start

node version: 20.XX
```bash
nvm install 20
nvm use 20

# Terminal 1
cd backend
npm install
npm start

# Terminal 2
cd frontend
npm install
npm start
```


