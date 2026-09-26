# Blog Management System

A full-stack web application built for the Utsanova technical internship assignment, featuring a public-facing blog reader interface and a secure administrative dashboard for managing content.

## 🏛️ Architecture & Technology Choices

- **Frontend (React + Vite):** Chosen for its component-based architecture, fast rendering speeds, and seamless single-page application (SPA) routing.
- **Backend (Node.js & Express.js):** Provides a robust, scalable RESTful API architecture with lightweight asynchronous execution.
- **Database (MongoDB Atlas):** Cloud-hosted NoSQL database chosen for flexible document structuring (blogs and admins) and easy scalability.
- **Security:** Implements **JWT (JSON Web Tokens)** for secure admin session handling and **bcryptjs** for password encryption.

## 🛠️ Tech Stack

- **Frontend:** React, React Router, Axios, Lucide React, CSS
- **Backend:** Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcryptjs
- **Database:** MongoDB Atlas

## ✨ Features

- **Public Home Page:** Browse published blogs, search by keywords/title, and filter by tags.
- **Blog Detail View:** Read full article content, tags, and conclusions.
- **Admin Authentication:** Secure JWT-based login for administrators.
- **Admin Dashboard:** View real-time stats and manage full CRUD operations (Create, Read, Update, Delete) for blog posts.

## 🔌 API Documentation

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/blogs` | Fetch all published blogs (supports search & tags) | Public |
| **GET** | `/api/blogs/:id` | Fetch single blog details by ID | Public |
| **POST** | `/api/admin/login` | Admin login and JWT generation | Public |
| **GET** | `/api/admin/stats` | Get dashboard statistics (Total, Published, Drafts) | Protected (JWT) |
| **GET** | `/api/admin/blogs` | Get all blogs for admin management | Protected (JWT) |
| **POST** | `/api/admin/blogs` | Create a new blog post | Protected (JWT) |
| **PUT** | `/api/admin/blogs/:id` | Update an existing blog post | Protected (JWT) |
| **DELETE** | `/api/admin/blogs/:id` | Delete a blog post | Protected (JWT) |

## 🚀 Setup & Installation Instructions

### Prerequisites
- Node.js installed on your machine
- MongoDB Atlas account/connection string

### 1. Clone the Repository
```bash
git clone [https://github.com/Ajmerikhatoon549/College-Event-Management.git](https://github.com/Ajmerikhatoon549/College-Event-Management.git)
utsanova-blog

```

### 2. Backend Setup

```bash
cd backend
npm install

```

Create a `.env` file in the `backend` folder and add:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key

```

Start the backend server:

```bash
npm start

```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev

```

## 👩‍💻 Author

**Ajmeri Khatoon**
