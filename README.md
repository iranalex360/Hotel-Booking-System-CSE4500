# Hotel-Booking-System-CSE4500

# Teammate Setup Guide

## Project Overview

This project is a hotel booking system with:

- a SQL Server database
- a Node.js backend
- a frontend built with HTML, JavaScript, and Tailwind CSS

To reproduce the project, each teammate needs to set up the database first, then the backend, then the frontend.

---

## Required Software

Each teammate should install:

- Git
- VS Code
- Node.js
- SQL Server Management Studio 2022
- SQL Server Express or another local SQL Server instance
- Live Server extension in VS Code
- Thunder Client extension in VS Code

---

## Project Folder Structure

The repo should contain folders similar to these:

```text
backend/
frontend/
database/
docs/
```

Important files include:

```text
database/full-setup.sql
database/schema.sql
database/sample-data.sql
database/image-updates.sql
backend/server.js
frontend/src/index.html
frontend/src/js/api.js
frontend/src/js/home.js
```

---

## Step 1: Clone the Repository

Clone the GitHub repository:

```bash
git clone https://github.com/iranalex360/Hotel-Booking-System-CSE4500
```

Then open the project in VS Code.

---

## Step 2: Set Up the Database in SQL Server

### 2.1 Open SQL Server

Open SQL Server Management Studio and connect to your local SQL Server instance.

Example server name:

```text
LAPTOP-JMATS8MC\SQLEXPRESS
```

Authentication used in this project:

```text
Windows Authentication
```

### 2.2 Create the Database

If the database does not already exist, create it in SSMS.

Example database name:

```text
Hotel Booking System
```

### 2.3 Run the SQL Files

Run the SQL files in this order.

#### Option A: If using a combined setup file

Run:

```text
database/full-setup.sql
```

Then run:

```text
database/image-updates.sql
```

#### Option B: If using separate files

Run:

```text
database/schema.sql
database/sample-data.sql
database/image-updates.sql
```

### 2.4 What These Files Do

- `schema.sql` creates the tables and relationships
- `sample-data.sql` inserts the base data
- `image-updates.sql` adds the hotel image URLs
- `full-setup.sql` may already include both schema and base data

### 2.5 Verify the Database

After running the scripts, test these queries:

```sql
SELECT * FROM dbo.hotel;
SELECT * FROM dbo.hotel_image;
SELECT * FROM dbo.room;
```

Also verify that hotel images are present:

```sql
SELECT hotel_id, urls, image
FROM dbo.hotel_image
ORDER BY hotel_id;
```

---

## Step 3: Set Up the Backend

### 3.1 Open the Backend Folder

In the VS Code terminal:

```bash
cd backend
```

### 3.2 Install Dependencies

Run:

```bash
npm install
```

### 3.3 Create the `.env` File

Create a file named `.env` inside the `backend` folder.

Example:

```env
DB_SERVER=LAPTOP-JMATS8MC
DB_INSTANCE=SQLEXPRESS
DB_DATABASE=Hotel Booking System
PORT=3000
```

### 3.4 Important Note About Authentication

This project uses SQL Server with Windows Authentication.

The backend is configured to connect through the SQL Server driver that supports Windows Authentication.

### 3.5 Start the Backend

Run:

```bash
npm run dev
```

If successful, the terminal should show something like:

```text
Server running on http://localhost:3000
```

### 3.6 Test the Backend

Open a browser and test:

```text
http://localhost:3000/api/hotels
```

It should return hotel data as JSON.

---

## Step 4: Set Up the Frontend

### 4.1 Open the Frontend Folder

In a new terminal:

```bash
cd frontend
```

### 4.2 Install Frontend Dependencies

If needed, run:

```bash
npm install
```

### 4.3 Start Tailwind Watch

Run:

```bash
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch
```

Keep this terminal open while working.

### 4.4 Open the Homepage

Open:

```text
frontend/src/index.html
```

using the Live Server extension in VS Code.

The page should open in the browser at a local address similar to:

```text
http://127.0.0.1:5500/frontend/src/index.html
```

---

## Step 5: Verify the Full Project

To confirm everything is working:

1. The backend is running on port 3000
2. Tailwind watch is running
3. `index.html` is open with Live Server
4. The homepage loads the featured hotels
5. Hotel cards display images from the database
6. Descriptions and addresses display correctly

---

## API Routes Used by the Homepage

### Hotels

```text
GET /api/hotels
GET /api/hotels/:id
GET /api/hotels/:id/rooms
GET /api/hotels/:id/reviews
```

### Image Candidate Routes

```text
POST /api/image-candidates
POST /api/image-candidates/hotels/:id/save
POST /api/image-candidates/fill-all
```

### Bookings

```text
POST /api/bookings
```

---

## How Hotel Images Work

This project uses the `dbo.hotel_image` table.

### Important Columns

- `urls` stores the original source page URL
- `image` stores the final image URL used on the homepage

The homepage loads the image from:

```sql
dbo.hotel_image.image
```

If image links are missing, the homepage may show fallback images or no images.

That is why `image-updates.sql` is important for reproducing the project.

---

## Recommended Setup Order for Teammates

### Database

1. Create or open the database
2. Run `full-setup.sql` or `schema.sql` and `sample-data.sql`
3. Run `image-updates.sql`

### Backend

1. Go to `backend`
2. Run `npm install`
3. Create `.env`
4. Run `npm run dev`

### Frontend

1. Go to `frontend`
2. Run Tailwind watch
3. Open `frontend/src/index.html` with Live Server

---

## Troubleshooting

### Backend Does Not Connect to SQL Server

Check:

- SQL Server is running
- the database name is correct
- the server name is correct
- the `.env` values are correct
- Windows Authentication is being used correctly

### `Cannot GET /api/...`

This usually means:

- the backend is not running
- the route is not registered
- the wrong request method is being used

### `req.body` Is Undefined

Check:

- `app.use(express.json())` is in `server.js`
- Thunder Client is sending JSON
- the request method is `POST` if required

### Tailwind Looks Stuck

This is normal if `--watch` is being used.

If the terminal shows repeated messages like:

```text
Done in 5ms
```

Tailwind is running correctly.

### Frontend Changes Are Not Appearing

Try:

- saving the file
- hard refreshing the browser with `Ctrl + Shift + R`
- making sure Live Server is serving the correct file
- making sure Tailwind watch is still running

### Images Are Missing

Check:

- `dbo.hotel_image.image` contains valid image URLs
- `/api/hotels` returns `image_url`
- the homepage is using the correct `home.js`

---

## GitHub Notes

When pushing to GitHub:

### Include

- backend code
- frontend code
- database SQL files
- setup guide
- image update SQL file

### Do Not Include

- `.env`
- `node_modules`
- private secrets

Suggested `.gitignore`:

```gitignore
node_modules/
.env
.vscode/
```

---

## Quick Start Summary

If a teammate is setting up the project from scratch:

1. Clone the repo
2. Run the SQL setup files in SSMS
3. Create the backend `.env`
4. Run `npm install` in `backend`
5. Run `npm run dev` in `backend`
6. Run Tailwind watch in `frontend`
7. Open `frontend/src/index.html` with Live Server

---

## Optional Helpful Commands

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch
```

---

## Notes About Reproducing the Homepage

The most important part for reproducing the homepage is making sure the database includes the hotel image links.

Without the SQL image updates, the cards may not display the correct images.

If setup is done correctly, the teammate should be able to reproduce the same homepage and backend behavior locally.
