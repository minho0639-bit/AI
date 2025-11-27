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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DEFAULT_RECIPIENT_TAXONOMY = [
  {
    name: "엔터테인먼트",
    subcategories: ["아이돌", "가수", "배우", "모델"],
  },
  {
    name: "스포츠",
    subcategories: ["축구", "야구", "e스포츠"],
  },
];
const DEFAULT_STATIONERY = [
  {
    name: "기본 편지지",
    description: "가장 깔끔하게 연출되는 기본 디자인",
    previewImageUrl: "assets/stationery/기본편지지_선택.png",
    isActive: true,
  },
];

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fanletter_post",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

initializeBootstrapTasks().catch((error) => {
  console.error("Startup bootstrap failed:", error);
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
    const [rows] = await pool.query(
      "SELECT id, email, name, password_hash, is_admin FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: "일치하는 계정을 찾을 수 없습니다." });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
    }
    req.session.userId = user.id;
    req.session.isAdmin = !!user.is_admin;
    res.json({
      message: "로그인되었습니다.",
      user: { id: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다." });
  }
});

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "이메일과 비밀번호를 입력해 주세요." });
  }
  try {
    const [rows] = await pool.query(
      "SELECT id, email, name, password_hash, is_admin FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0 || !rows[0].is_admin) {
      return res.status(403).json({ message: "관리자 계정을 찾을 수 없습니다." });
    }
    const adminUser = rows[0];
    const match = await bcrypt.compare(password, adminUser.password_hash);
    if (!match) {
      return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
    }
    req.session.userId = adminUser.id;
    req.session.isAdmin = true;
    res.json({
      message: "관리자 로그인되었습니다.",
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        isAdmin: true,
      },
    });
  } catch (error) {
    console.error("admin login error:", error);
    res.status(500).json({ message: "관리자 로그인 처리 중 오류가 발생했습니다." });
  }
});

app.get("/api/admin/session", (req, res) => {
  if (req.session.userId && req.session.isAdmin) {
    return res.json({ loggedIn: true });
  }
  res.status(401).json({ loggedIn: false });
});

function requireAdmin(req, res, next) {
  if (!req.session?.userId || !req.session?.isAdmin) {
    return res.status(403).json({ message: "관리자 권한이 필요합니다." });
  }
  next();
}

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  try {
    const [rows] = await pool.query(
      `SELECT
         l.id,
         l.recipient_name,
         l.recipient_group,
         l.status,
         l.submitted_at,
         l.created_at,
         u.email AS user_email,
         u.name AS user_name,
         p.status AS payment_status,
         p.amount AS payment_amount,
         p.method AS payment_method,
         s.status AS shipment_status,
         s.tracking_code,
         s.carrier
       FROM letters l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN payments p ON p.letter_id = l.id
       LEFT JOIN shipments s ON s.letter_id = l.id
       ORDER BY l.created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (error) {
    console.error("admin orders fetch error:", error);
    res.status(500).json({ message: "주문 목록을 불러오는 중 오류가 발생했습니다." });
  }
});

app.get("/api/admin/recipient-meta", requireAdmin, async (req, res) => {
  try {
    const [categories] = await pool.query(
      "SELECT id, name FROM recipient_categories ORDER BY id ASC"
    );
    const [subcategories] = await pool.query(
      "SELECT id, category_id, name FROM recipient_subcategories ORDER BY id ASC"
    );
    res.json({ categories, subcategories });
  } catch (error) {
    console.error("admin recipient meta fetch error:", error);
    res.status(500).json({ message: "수령인 분류 정보를 불러오는 중 오류가 발생했습니다." });
  }
});

app.get("/api/admin/recipients", requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
  try {
    const [rows] = await pool.query(
      `SELECT
         r.id,
         r.name,
         rc.name AS category,
         rs.name AS subcategory,
         a.name AS agency,
         rg.name AS group_name,
         r.notes AS address,
         r.is_active,
         r.updated_at
       FROM recipients r
       LEFT JOIN recipient_categories rc ON rc.id = r.category_id
       LEFT JOIN recipient_subcategories rs ON rs.id = r.subcategory_id
       LEFT JOIN agencies a ON a.id = r.agency_id
       LEFT JOIN recipient_groups rg ON rg.id = r.group_id
       ORDER BY r.name ASC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (error) {
    console.error("admin recipients fetch error:", error);
    res.status(500).json({ message: "수령인 목록을 불러오는 중 오류가 발생했습니다." });
  }
});

app.post("/api/admin/recipients", requireAdmin, async (req, res) => {
  const { name, categoryId, subcategoryId, agencyName, groupName, isActive, address } = req.body;
  if (!name?.trim() || !categoryId) {
    return res.status(400).json({ message: "이름과 대분류는 필수입니다." });
  }
  if (!subcategoryId) {
    return res.status(400).json({ message: "중분류를 선택해 주세요." });
  }
  try {
    const agencyId = await findOrCreateAgency(agencyName);
    const groupId = await findOrCreateGroup(groupName, agencyId);
    const payload = [
      name.trim(),
      Number(categoryId),
      subcategoryId ? Number(subcategoryId) : null,
      agencyId,
      groupId,
      typeof isActive === "boolean" ? (isActive ? 1 : 0) : 1,
      address?.trim() ? address.trim() : null,
    ];
    const [result] = await pool.query(
      `INSERT INTO recipients
       (name, category_id, subcategory_id, agency_id, group_id, is_active, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      payload
    );
    const insertedId = result.insertId;
    const [rows] = await pool.query(
      `SELECT
         r.id,
         r.name,
         rc.name AS category,
         rs.name AS subcategory,
         a.name AS agency,
         rg.name AS group_name,
         r.notes AS address,
         r.is_active,
         r.updated_at
       FROM recipients r
       LEFT JOIN recipient_categories rc ON rc.id = r.category_id
       LEFT JOIN recipient_subcategories rs ON rs.id = r.subcategory_id
       LEFT JOIN agencies a ON a.id = r.agency_id
       LEFT JOIN recipient_groups rg ON rg.id = r.group_id
       WHERE r.id = ?`,
      [insertedId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("admin recipient create error:", error);
    res.status(500).json({ message: "수령인을 추가하는 중 오류가 발생했습니다." });
  }
});

app.delete("/api/admin/recipients/:id", requireAdmin, async (req, res) => {
  const recipientId = Number(req.params.id);
  if (!recipientId) {
    return res.status(400).json({ message: "잘못된 수령인 ID입니다." });
  }
  try {
    const [result] = await pool.query("DELETE FROM recipients WHERE id = ?", [recipientId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "수령인을 찾을 수 없습니다." });
    }
    res.json({ message: "수령인을 삭제했습니다." });
  } catch (error) {
    console.error("admin recipient delete error:", error);
    res.status(500).json({ message: "수령인을 삭제하는 중 오류가 발생했습니다." });
  }
});

app.get("/api/admin/stationery", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         id,
         name,
         description,
         preview_image_url AS previewImageUrl,
         is_active AS isActive,
         created_at,
         updated_at
       FROM stationery_templates
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error("admin stationery fetch error:", error);
    res.status(500).json({ message: "편지지 목록을 불러오는 중 오류가 발생했습니다." });
  }
});

app.post("/api/admin/stationery", requireAdmin, async (req, res) => {
  const { name, description, previewImageUrl, isActive } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "편지지 이름을 입력해 주세요." });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO stationery_templates (name, description, preview_image_url, is_active)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), description?.trim() || null, previewImageUrl?.trim() || null, isActive ? 1 : 0]
    );
    const [rows] = await pool.query(
      `SELECT
         id,
         name,
         description,
         preview_image_url AS previewImageUrl,
         is_active AS isActive,
         created_at,
         updated_at
       FROM stationery_templates
       WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("admin stationery create error:", error);
    res.status(500).json({ message: "편지지를 추가하는 중 오류가 발생했습니다." });
  }
});

app.put("/api/admin/stationery/:id", requireAdmin, async (req, res) => {
  const templateId = Number(req.params.id);
  if (!templateId) {
    return res.status(400).json({ message: "잘못된 편지지 ID입니다." });
  }
  const { name, description, previewImageUrl, isActive } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "편지지 이름을 입력해 주세요." });
  }
  try {
    await pool.query(
      `UPDATE stationery_templates
       SET name = ?, description = ?, preview_image_url = ?, is_active = ?
       WHERE id = ?`,
      [name.trim(), description?.trim() || null, previewImageUrl?.trim() || null, isActive ? 1 : 0, templateId]
    );
    const [rows] = await pool.query(
      `SELECT
         id,
         name,
         description,
         preview_image_url AS previewImageUrl,
         is_active AS isActive,
         created_at,
         updated_at
       FROM stationery_templates
       WHERE id = ?`,
      [templateId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "편지지를 찾을 수 없습니다." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("admin stationery update error:", error);
    res.status(500).json({ message: "편지지를 수정하는 중 오류가 발생했습니다." });
  }
});

app.delete("/api/admin/stationery/:id", requireAdmin, async (req, res) => {
  const templateId = Number(req.params.id);
  if (!templateId) {
    return res.status(400).json({ message: "잘못된 편지지 ID입니다." });
  }
  try {
    const [result] = await pool.query("DELETE FROM stationery_templates WHERE id = ?", [templateId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "편지지를 찾을 수 없습니다." });
    }
    res.json({ message: "편지지를 삭제했습니다." });
  } catch (error) {
    console.error("admin stationery delete error:", error);
    res.status(500).json({ message: "편지지를 삭제하는 중 오류가 발생했습니다." });
  }
});

app.get("/api/stationery", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         id,
         name,
         description,
         preview_image_url AS previewImageUrl
       FROM stationery_templates
       WHERE is_active = 1
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error("public stationery fetch error:", error);
    res.status(500).json({ message: "편지지 목록을 불러오는 중 오류가 발생했습니다." });
  }
});

app.get("/api/recipients/categories", async (req, res) => {
  try {
    const [categories] = await pool.query(
      "SELECT id, name FROM recipient_categories ORDER BY id ASC"
    );
    const [subcategories] = await pool.query(
      "SELECT id, category_id, name FROM recipient_subcategories ORDER BY id ASC"
    );
    res.json({ categories, subcategories });
  } catch (error) {
    console.error("public recipient categories error:", error);
    res.status(500).json({ message: "수령인 분류 정보를 불러오지 못했습니다." });
  }
});

app.get("/api/recipients/by-subcategory/:subcategoryId", async (req, res) => {
  const subcategoryId = Number(req.params.subcategoryId);
  if (!subcategoryId) {
    return res.status(400).json({ message: "잘못된 중분류 ID입니다." });
  }
  try {
    const [rows] = await pool.query(
      `SELECT
         r.id,
         r.name,
         r.is_active,
         COALESCE(a.name, "") AS agency,
         COALESCE(rg.name, "") AS group_name
       FROM recipients r
       LEFT JOIN agencies a ON a.id = r.agency_id
       LEFT JOIN recipient_groups rg ON rg.id = r.group_id
       WHERE r.subcategory_id = ? AND r.is_active = 1
       ORDER BY r.name ASC`,
      [subcategoryId]
    );
    res.json(rows);
  } catch (error) {
    console.error("public recipients fetch error:", error);
    res.status(500).json({ message: "수령인 데이터를 불러오지 못했습니다." });
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  try {
    const [rows] = await pool.query(
      `SELECT id, email, name, phone, is_admin, marketing_consent, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (error) {
    console.error("admin users fetch error:", error);
    res.status(500).json({ message: "회원 목록을 불러오는 중 오류가 발생했습니다." });
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
    req.session.isAdmin = !!user.is_admin;
    res.json({
      loggedIn: true,
      user: { id: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin },
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
  const [rows] = await pool.query(
    "SELECT id, email, name, is_admin FROM users WHERE id = ?",
    [userId]
  );
  return rows[0];
}

async function initializeBootstrapTasks() {
  await ensureAdminUser();
  await ensureRecipientTaxonomy();
  await ensureStationeryTemplates();
}

async function ensureAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn("ADMIN_EMAIL 또는 ADMIN_PASSWORD 환경 변수가 설정되지 않았습니다.");
    return;
  }
  const [rows] = await pool.query(
    "SELECT id, password_hash, is_admin FROM users WHERE email = ?",
    [ADMIN_EMAIL]
  );
  if (rows.length === 0) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, is_admin, marketing_consent)
       VALUES (?, ?, ?, 1, 0)`,
      [ADMIN_EMAIL, passwordHash, "관리자"]
    );
    console.log("초기 관리자 계정을 생성했습니다.");
  } else {
    const adminRecord = rows[0];
    if (!adminRecord.is_admin) {
      await pool.query("UPDATE users SET is_admin = 1 WHERE id = ?", [adminRecord.id]);
    }

    const passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, adminRecord.password_hash);
    if (!passwordMatches) {
      const newHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, adminRecord.id]);
      console.log("환경 변수에 맞춰 관리자 비밀번호를 갱신했습니다.");
    }
  }
}

async function ensureRecipientTaxonomy() {
  for (const category of DEFAULT_RECIPIENT_TAXONOMY) {
    const [existingCategories] = await pool.query(
      "SELECT id FROM recipient_categories WHERE name = ?",
      [category.name]
    );
    let categoryId;
    if (existingCategories.length === 0) {
      const [insertResult] = await pool.query(
        "INSERT INTO recipient_categories (name) VALUES (?)",
        [category.name]
      );
      categoryId = insertResult.insertId;
    } else {
      categoryId = existingCategories[0].id;
    }

    for (const subcategoryName of category.subcategories) {
      const [existingSub] = await pool.query(
        "SELECT id FROM recipient_subcategories WHERE name = ? AND category_id = ?",
        [subcategoryName, categoryId]
      );
      if (existingSub.length === 0) {
        await pool.query(
          "INSERT INTO recipient_subcategories (category_id, name) VALUES (?, ?)",
          [categoryId, subcategoryName]
        );
      }
    }
  }
}

async function ensureStationeryTemplates() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS stationery_templates (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(255),
      preview_image_url VARCHAR(255),
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  for (const template of DEFAULT_STATIONERY) {
    const [rows] = await pool.query(
      "SELECT id FROM stationery_templates WHERE name = ? LIMIT 1",
      [template.name]
    );
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO stationery_templates (name, description, preview_image_url, is_active)
         VALUES (?, ?, ?, ?)`,
        [
          template.name,
          template.description || null,
          template.previewImageUrl || null,
          template.isActive ? 1 : 0,
        ]
      );
    }
  }
}

async function findOrCreateAgency(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const [rows] = await pool.query("SELECT id FROM agencies WHERE name = ?", [trimmed]);
  if (rows.length > 0) {
    return rows[0].id;
  }
  const [result] = await pool.query("INSERT INTO agencies (name) VALUES (?)", [trimmed]);
  return result.insertId;
}

async function findOrCreateGroup(name, agencyId) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const params = agencyId ? [trimmed, agencyId] : [trimmed];
  const query = agencyId
    ? "SELECT id FROM recipient_groups WHERE name = ? AND agency_id = ?"
    : "SELECT id FROM recipient_groups WHERE name = ? AND agency_id IS NULL";
  const [rows] = await pool.query(query, params);
  if (rows.length > 0) {
    return rows[0].id;
  }
  const [result] = await pool.query(
    "INSERT INTO recipient_groups (name, agency_id) VALUES (?, ?)",
    [trimmed, agencyId || null]
  );
  return result.insertId;
}

app.listen(PORT, () => {
  console.log(`Fanletter Post server listening on http://localhost:${PORT}`);
});
