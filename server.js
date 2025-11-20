require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
const session = require("express-session");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_REDIRECT_URI =
  process.env.KAKAO_REDIRECT_URI || `http://localhost:${PORT}/auth/kakao/callback`;

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fanletter_post",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(cors());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fanletter-post-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.post("/api/signup", async (req, res) => {
  const { email, password, name, phone, marketingConsent } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "이메일과 비밀번호를 입력해 주세요." });
  }

  try {
    const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length > 0) {
      return res.status(409).json({ message: "이미 가입된 이메일입니다." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, marketing_consent)
       VALUES (?, ?, ?, ?, ?)`,
      [email, passwordHash, name || null, phone || null, marketingConsent ? 1 : 0]
    );

    res.status(201).json({ message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error("signup error:", error);
    res.status(500).json({ message: "회원가입 처리 중 오류가 발생했습니다." });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "이메일과 비밀번호를 입력해 주세요." });
  }
  try {
    const [rows] = await pool.query("SELECT id, email, name, password_hash FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "일치하는 계정을 찾을 수 없습니다." });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
    }
    req.session.userId = user.id;
    res.json({
      message: "로그인되었습니다.",
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다." });
  }
});

app.get("/api/me", async (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }
  try {
    const user = await getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.json({ loggedIn: false });
    }
    res.json({
      loggedIn: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("me endpoint error:", error);
    res.status(500).json({ loggedIn: false });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("logout error:", err);
      return res.status(500).json({ message: "로그아웃 중 오류가 발생했습니다." });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "로그아웃 되었습니다." });
  });
});

app.get("/auth/kakao", (req, res) => {
  if (!KAKAO_CLIENT_ID) {
    return res.status(500).send("Kakao OAuth 설정이 필요합니다.");
  }
  const state = crypto.randomBytes(16).toString("hex");
  req.session.kakaoState = state;
  const authorizeUrl =
    "https://kauth.kakao.com/oauth/authorize" +
    `?response_type=code&client_id=${encodeURIComponent(KAKAO_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}` +
    `&state=${state}`;
  res.redirect(authorizeUrl);
});

app.get("/auth/kakao/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || state !== req.session.kakaoState) {
    return res.status(400).send("잘못된 요청입니다.");
  }
  delete req.session.kakaoState;

  try {
    const tokenResponse = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: KAKAO_CLIENT_ID,
          redirect_uri: KAKAO_REDIRECT_URI,
          code,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const profileResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const kakaoUser = profileResponse.data;
    const providerUserId = String(kakaoUser.id);
    const kakaoAccount = kakaoUser.kakao_account || {};
    const profile = kakaoAccount.profile || {};
    const email = kakaoAccount.email || `${providerUserId}@kakao-user.fanletter`;
    const nickname = profile.nickname || "카카오 사용자";

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    const userId = await findOrCreateSocialUser("kakao", providerUserId, {
      email,
      nickname,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt,
    });

    req.session.userId = userId;
    res.redirect("/");
  } catch (error) {
    console.error("kakao oauth error:", error.response?.data || error.message);
    res.redirect("/?login=failed");
  }
});

async function findOrCreateSocialUser(provider, providerUserId, payload) {
  const { email, nickname, accessToken, refreshToken, tokenExpiresAt } = payload;
  const [socialRows] = await pool.query(
    "SELECT user_id FROM social_accounts WHERE provider = ? AND provider_user_id = ?",
    [provider, providerUserId]
  );
  if (socialRows.length > 0) {
    const userId = socialRows[0].user_id;
    await pool.query(
      `UPDATE social_accounts
       SET access_token = ?, refresh_token = ?, token_expires_at = ?
       WHERE provider = ? AND provider_user_id = ?`,
      [accessToken || null, refreshToken || null, tokenExpiresAt, provider, providerUserId]
    );
    return userId;
  }

  let userId;
  const [existingUsers] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
  } else {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    const [userInsert] = await pool.query(
      "INSERT INTO users (email, password_hash, name, marketing_consent) VALUES (?, ?, ?, 0)",
      [email, passwordHash, nickname || null]
    );
    userId = userInsert.insertId;
  }

  await pool.query(
    `INSERT INTO social_accounts
     (user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, provider, providerUserId, accessToken || null, refreshToken || null, tokenExpiresAt]
  );

  return userId;
}

async function getUserById(userId) {
  const [rows] = await pool.query("SELECT id, email, name FROM users WHERE id = ?", [userId]);
  return rows[0];
}

app.listen(PORT, () => {
  console.log(`Fanletter Post server listening on http://localhost:${PORT}`);
});
