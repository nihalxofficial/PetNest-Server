<div align="center">

<img src="https://img.shields.io/badge/PetNest-Server-darkgreen?style=for-the-badge" alt="Server">
<img src="https://img.shields.io/badge/Node.js-Express-black?style=for-the-badge&logo=nodedotjs" alt="Node">
<img src="https://img.shields.io/badge/Database-MongoDB%20Atlas-green?style=for-the-badge&logo=mongodb" alt="MongoDB">
<img src="https://img.shields.io/badge/Auth-JWT-orange?style=for-the-badge" alt="JWT">

# 🐾 PetNest — Server

### *REST API backend for the PetNest Pet Adoption Platform*

Handles all data operations, JWT-based authentication, and protected routes for the PetNest client application.

[🌐 Live Client](https://petnest-olive.vercel.app/) · [🖥️ Live Server](https://petnest-server-sepia.vercel.app/) · [📁 Client Repo](https://github.com/nihalxofficial/PetNest-Client)

</div>

---

## 📌 Purpose

This is the backend REST API for PetNest — a full-stack pet adoption platform. It exposes endpoints for managing pets and adoption requests, issues JWT tokens stored in HTTPOnly cookies, and protects private routes via a verification middleware.

---

## 📦 NPM Packages Used

| Package | Purpose |
|---|---|
| `express` | Web framework & routing |
| `mongodb` | Official MongoDB driver for Atlas |
| `cors` | Cross-origin request handling |
| `dotenv` | Environment variable management |
| `nodemon` | Auto-restart during development |
| `jsonwebtoken` | JWT signing and verification |
| `cookie-parser` | Parsing HTTPOnly cookies from requests |

> **Note on `jwt-cjs`:** Used as a CommonJS-compatible fallback for environments where the standard `jsonwebtoken` ESM interop causes issues.

---

## 📁 Project Structure

```
PetNest-Server/
├── index.js              # Entry point — Express app, DB connection, all routes
├── middleware/
│   └── verifyToken.js    # JWT verification middleware
├── .env                  # Environment variables (never commit this)
├── .gitignore
└── package.json
```

---

## 🔐 JWT Flow — How It Works

```
POST /auth/jwt → sign token → set HTTPOnly cookie → protected routes read cookie → verifyToken middleware → access granted
```

### 1. Generating the Token

```js
// index.js
app.post('/auth/jwt', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res
    .cookie('petnest_token', token, {
      httpOnly: true,                               // JS cannot read this cookie
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',                             // required for cross-origin (Vercel → Vercel)
      maxAge: 7 * 24 * 60 * 60 * 1000              // 7 days
    })
    .json({ success: true });
});
```

### 2. Verifying the Token (Middleware)

```js
// middleware/verifyToken.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies?.petnest_token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { email, iat, exp }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Forbidden: Invalid or expired token' });
  }
};

module.exports = verifyToken;
```

### 3. Protecting Routes

```js
// Any private endpoint wraps verifyToken
app.post('/pets', verifyToken, async (req, res) => {
  // req.user.email is available here from the decoded token
  const pet = { ...req.body, ownerEmail: req.user.email };
  const result = await petsCollection.insertOne(pet);
  res.json(result);
});

app.post('/adoptions', verifyToken, async (req, res) => {
  const adoption = { ...req.body, userEmail: req.user.email };
  const result = await adoptionsCollection.insertOne(adoption);
  res.json(result);
});
```

### 4. Logout — Clearing the Cookie

```js
app.post('/auth/logout', (req, res) => {
  res
    .clearCookie('petnest_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    })
    .json({ success: true });
});
```

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/jwt` | Public | Generate JWT, set HTTPOnly cookie |
| POST | `/auth/logout` | Public | Clear the token cookie |

### Pets
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/pets` | Public | Get all pets (supports `?search=` and `?species=`) |
| GET | `/pets/:id` | Public | Get single pet details |
| POST | `/pets` | 🔒 Private | Add a new pet listing |
| PATCH | `/pets/:id` | 🔒 Private | Update a pet listing |
| DELETE | `/pets/:id` | 🔒 Private | Delete a pet listing |

### Adoptions
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/adoptions` | 🔒 Private | Submit an adoption request |
| GET | `/adoptions/my` | 🔒 Private | Get current user's requests |
| GET | `/adoptions/pet/:id` | 🔒 Private | Get all requests for a pet (owner only) |
| PATCH | `/adoptions/:id` | 🔒 Private | Approve or reject a request |
| DELETE | `/adoptions/:id` | 🔒 Private | Cancel a request |

---

## ⚙️ Environment Variables

Create a `.env` file in the root:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_strong_jwt_secret_key
CLIENT_URL=https://petnest-olive.vercel.app
PORT=5000
NODE_ENV=production
```

> ⚠️ Never commit `.env` to GitHub. Add it to `.gitignore`.

---

## 🚀 Getting Started Locally

```bash
# 1. Clone the repo
git clone https://github.com/nihalxofficial/PetNest-Server
cd PetNest-Server

# 2. Install dependencies
npm install

# 3. Add your .env file (see above)

# 4. Start development server
npm run dev    # uses nodemon

# 5. Or start production server
npm start
```

---

## 🔧 CORS Configuration

Required for cross-origin requests between the Vercel-hosted client and server:

```js
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,    // ← required to allow cookies cross-origin
}));

app.use(cookieParser());
```

> `credentials: true` on both the server CORS config and the client `fetch` calls (`credentials: 'include'`) is what makes the HTTPOnly cookie travel across origins.

---

## 🌐 Live Links

| Resource | URL |
|---|---|
| 🖥️ Live Server | https://petnest-server-sepia.vercel.app/ |
| 🌍 Live Client | https://petnest-olive.vercel.app/ |
| 📁 Server Repo | https://github.com/nihalxofficial/PetNest-Server |
| 📁 Client Repo | https://github.com/nihalxofficial/PetNest-Client |

---

<div align="center">
Made with ❤️ by <a href="https://github.com/nihalxofficial">nihalxofficial</a>
</div>