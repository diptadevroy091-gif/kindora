# 🌱 Kindora — Social Development Events Platform

Kindora is a full-stack web application designed to connect people through social development events and community activities. Users can explore upcoming events, create events, manage their profiles, and participate in meaningful community initiatives.

## 🌐 Live Demo

- **Frontend:** https://kindora-lime.vercel.app
- **Backend API:** https://kindora-api-vb9y.onrender.com
- **GitHub Repository:** https://github.com/diptadevroy091-gif/kindora

## ✨ Key Features

- **User Authentication:** Register and log in using email and password.
- **Google OAuth:** Secure authentication using Google accounts.
- **GitHub OAuth:** Sign in using GitHub authentication.
- **User Profiles:** Manage and update personal profile information.
- **Create Events:** Authenticated users can create social development events.
- **Upcoming Events:** Browse available and upcoming community events.
- **Event Management:** Event owners can manage their own events.
- **Protected Routes:** Authentication is required to access restricted features.
- **Form Validation:** Validate user input before submitting forms.
- **Database Integration:** Store application data using MongoDB.

## 🛠️ Technologies Used

### Frontend

- Next.js 16
- React 19
- Tailwind CSS 4
- JavaScript

### Backend

- Node.js
- Express.js 5
- MongoDB
- JSON Web Token (JWT)
- Passport.js
- bcryptjs
- Google OAuth 2.0
- GitHub OAuth

### Deployment

- Vercel — Frontend Hosting
- Render — Backend Hosting
- MongoDB — Database

## 📁 Project Structure

```text
Assigement-08/
│
├── client/
│   ├── src/
│   │   └── app/
│   │       ├── auth/
│   │       ├── create-event/
│   │       ├── events/
│   │       ├── login/
│   │       ├── profile/
│   │       ├── register/
│   │       └── upcoming-events/
│   │
│   └── package.json
│
├── server/
│   ├── server.js
│   └── package.json
│
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- MongoDB database
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/diptadevroy091-gif/kindora.git

cd kindora
```

### 2. Setup the Backend

```bash
cd server

npm install
```

Create a `.env` file inside the `server` directory.

Add the following environment variables:

```env
PORT=5000
NODE_ENV=development

CLIENT_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
OAUTH_SESSION_SECRET=your_oauth_session_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

Start the backend:

```bash
npm run dev
```

### 3. Setup the Frontend

Open another terminal:

```bash
cd client

npm install
```

Create a `.env.local` file inside the `client` directory.

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open your browser:

```text
http://localhost:3000
```

## 🔐 Authentication

Kindora supports:

- Email and password authentication.
- Google OAuth authentication.
- GitHub OAuth authentication.
- JWT-based protected API access.

OAuth credentials must be configured in the Google and GitHub developer dashboards. The callback URLs must match the backend configuration.

Never commit real API credentials, database connection strings, or secret keys to GitHub.

## 🚀 Deployment

The application is deployed using:

| Component | Platform |
| --------- | -------- |
| Frontend  | Vercel   |
| Backend   | Render   |
| Database  | MongoDB  |

## 🎯 Project Goal

The main goal of Kindora is to make community engagement easier by providing a platform where people can discover, organize, and manage social development events.

## 👨‍💻 Author

**Dipta Dev Roy**

GitHub: [@diptadevroy091-gif](https://github.com/diptadevroy091-gif)

---

⭐ If you find this project useful, consider giving it a star!
