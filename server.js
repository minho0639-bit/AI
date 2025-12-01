require("dotenv").config();
const path = require("path");
const fs = require("fs").promises;
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
    previewImageUrl: "assets/stationery/basic.jpg",
    isActive: true,
  },
];

const LETTER_STATUSES = Object.freeze(["draft", "submitted", "printing", "shipped"]);
const LETTER_STATUS_SET = new Set(LETTER_STATUSES);
const SHIPMENT_STATUSES = Object.freeze(["pending", "pickup", "in_transit", "delivered", "returned"]);
const SHIPMENT_STATUS_SET = new Set(SHIPMENT_STATUSES);
const LETTER_FONT_CLASSES = Object.freeze(["default", "serif", "handwriting", "gaegu", "dongle", "singleDay"]);
const LETTER_FONT_SET = new Set(LETTER_FONT_CLASSES);
const DEFAULT_WELCOME_COUPON = Object.freeze({
  code: "WELCOME-FREE",
  name: "첫 결제 무료 쿠폰",
  description: "기본 요금 2,000원 할인",
  discountType: "amount",
  discountValue: 2000,
});

let couponSetupPromise = null;

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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
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

    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, marketing_consent)
       VALUES (?, ?, ?, ?, ?)`,
      [email, passwordHash, name || null, phone || null, marketingConsent ? 1 : 0]
    );

    const userId = result.insertId;
    try {
      await grantWelcomeCouponToUser(userId);
    } catch (couponError) {
      console.error("welcome coupon issue error:", couponError);
    }

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

function requireLogin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
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
         l.status AS letter_status,
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

app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
  const letterId = Number(req.params.id);
  if (!letterId) {
    return res.status(400).json({ message: "잘못된 주문 ID입니다." });
  }
  try {
    const order = await getAdminOrderDetail(letterId);
    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }
    res.json(order);
  } catch (error) {
    console.error("admin order detail error:", error);
    res.status(500).json({ message: "주문 상세를 불러오는 중 오류가 발생했습니다." });
  }
});

app.put("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  const letterId = Number(req.params.id);
  if (!letterId) {
    return res.status(400).json({ message: "잘못된 주문 ID입니다." });
  }
  const normalizedStatus = normalizeLetterStatus(req.body?.status);
  if (!normalizedStatus) {
    return res.status(400).json({ message: "유효한 편지 상태를 입력해 주세요." });
  }
  try {
    const [result] = await pool.query("UPDATE letters SET status = ? WHERE id = ?", [
      normalizedStatus,
      letterId,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }
    const order = await getAdminOrderDetail(letterId);
    res.json(order);
  } catch (error) {
    console.error("admin order status update error:", error);
    res.status(500).json({ message: "편지 상태를 업데이트하지 못했습니다." });
  }
});

app.put("/api/admin/orders/:id/shipment", requireAdmin, async (req, res) => {
  const letterId = Number(req.params.id);
  if (!letterId) {
    return res.status(400).json({ message: "잘못된 주문 ID입니다." });
  }
  const payload = req.body || {};
  const normalizedStatus = normalizeShipmentStatus(payload.status);
  if (!normalizedStatus) {
    return res.status(400).json({ message: "유효한 배송 상태를 입력해 주세요." });
  }
  const trackingCode = payload.trackingCode?.trim() || null;
  const carrier = payload.carrier?.trim() || null;
  const shippedAt = parseDateInput(payload.shippedAt);
  const deliveredAt = parseDateInput(payload.deliveredAt);
  try {
    const [letterRows] = await pool.query("SELECT id FROM letters WHERE id = ? LIMIT 1", [letterId]);
    if (letterRows.length === 0) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }
    const [existing] = await pool.query(
      "SELECT id, shipped_at, delivered_at FROM shipments WHERE letter_id = ? LIMIT 1",
      [letterId]
    );
    const appliedShippedAt =
      shippedAt !== null ? shippedAt : existing.length ? existing[0].shipped_at : null;
    const appliedDeliveredAt =
      deliveredAt !== null ? deliveredAt : existing.length ? existing[0].delivered_at : null;
    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO shipments
         (letter_id, tracking_code, carrier, status, shipped_at, delivered_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          letterId,
          trackingCode,
          carrier,
          normalizedStatus,
          appliedShippedAt,
          appliedDeliveredAt,
        ]
      );
    } else {
      await pool.query(
        `UPDATE shipments
         SET tracking_code = ?, carrier = ?, status = ?, shipped_at = ?, delivered_at = ?
         WHERE id = ?`,
        [
          trackingCode,
          carrier,
          normalizedStatus,
          appliedShippedAt,
          appliedDeliveredAt,
          existing[0].id,
        ]
      );
    }
    const order = await getAdminOrderDetail(letterId);
    res.json(order);
  } catch (error) {
    console.error("admin shipment update error:", error);
    res.status(500).json({ message: "배송 정보를 업데이트하지 못했습니다." });
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
         r.image_url AS image_url,
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
  const { name, categoryId, subcategoryId, agencyName, groupName, isActive, address, imageData, agencyImageData, groupImageData } = req.body;
  if (!name?.trim() || !categoryId) {
    return res.status(400).json({ message: "이름과 대분류는 필수입니다." });
  }
  if (!subcategoryId) {
    return res.status(400).json({ message: "중분류를 선택해 주세요." });
  }
  try {
    const agencyId = await findOrCreateAgency(agencyName, agencyImageData);
    const groupId = await findOrCreateGroup(groupName, agencyId, groupImageData);
    const payload = [
      name.trim(),
      Number(categoryId),
      subcategoryId ? Number(subcategoryId) : null,
      agencyId,
      groupId,
      typeof isActive === "boolean" ? (isActive ? 1 : 0) : 1,
      address?.trim() ? address.trim() : null,
      null, // image_url은 나중에 업데이트
    ];
    const [result] = await pool.query(
      `INSERT INTO recipients
       (name, category_id, subcategory_id, agency_id, group_id, is_active, notes, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      payload
    );
    const insertedId = result.insertId;
    
    let imageUrl = null;
    if (imageData) {
      imageUrl = await saveRecipientImage(insertedId, imageData);
      if (imageUrl) {
        await pool.query("UPDATE recipients SET image_url = ? WHERE id = ?", [imageUrl, insertedId]);
      }
    }
    
    const [rows] = await pool.query(
      `SELECT
         r.id,
         r.name,
         rc.name AS category,
         rs.name AS subcategory,
         a.name AS agency,
         rg.name AS group_name,
         r.notes AS address,
         r.image_url AS image_url,
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

// 소속사 관리 API
app.get("/api/admin/agencies", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         id,
         name,
         image_url,
         (SELECT COUNT(*) FROM recipients WHERE agency_id = agencies.id) AS recipient_count,
         created_at,
         updated_at
       FROM agencies
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error("admin agencies fetch error:", error);
    res.status(500).json({ message: "소속사 목록을 불러오는 중 오류가 발생했습니다." });
  }
});

app.post("/api/admin/agencies", requireAdmin, async (req, res) => {
  const { name, imageData } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "소속사 이름을 입력해 주세요." });
  }
  try {
    const [result] = await pool.query("INSERT INTO agencies (name) VALUES (?)", [name.trim()]);
    const agencyId = result.insertId;
    
    let imageUrl = null;
    if (imageData) {
      imageUrl = await saveAgencyImage(agencyId, imageData);
      if (imageUrl) {
        await pool.query("UPDATE agencies SET image_url = ? WHERE id = ?", [imageUrl, agencyId]);
      }
    }
    
    const [rows] = await pool.query(
      `SELECT
         id,
         name,
         image_url,
         (SELECT COUNT(*) FROM recipients WHERE agency_id = agencies.id) AS recipient_count,
         created_at,
         updated_at
       FROM agencies
       WHERE id = ?`,
      [agencyId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("admin agency create error:", error);
    res.status(500).json({ message: "소속사를 추가하는 중 오류가 발생했습니다." });
  }
});

app.put("/api/admin/agencies/:id", requireAdmin, async (req, res) => {
  const agencyId = Number(req.params.id);
  const { name, imageData } = req.body;
  if (!agencyId) {
    return res.status(400).json({ message: "잘못된 소속사 ID입니다." });
  }
  if (!name?.trim()) {
    return res.status(400).json({ message: "소속사 이름을 입력해 주세요." });
  }
  try {
    await pool.query("UPDATE agencies SET name = ? WHERE id = ?", [name.trim(), agencyId]);
    
    if (imageData) {
      const imageUrl = await saveAgencyImage(agencyId, imageData);
      if (imageUrl) {
        await pool.query("UPDATE agencies SET image_url = ? WHERE id = ?", [imageUrl, agencyId]);
      }
    }
    
    const [rows] = await pool.query(
      `SELECT
         id,
         name,
         image_url,
         (SELECT COUNT(*) FROM recipients WHERE agency_id = agencies.id) AS recipient_count,
         created_at,
         updated_at
       FROM agencies
       WHERE id = ?`,
      [agencyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "소속사를 찾을 수 없습니다." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("admin agency update error:", error);
    res.status(500).json({ message: "소속사를 수정하는 중 오류가 발생했습니다." });
  }
});

app.delete("/api/admin/agencies/:id", requireAdmin, async (req, res) => {
  const agencyId = Number(req.params.id);
  if (!agencyId) {
    return res.status(400).json({ message: "잘못된 소속사 ID입니다." });
  }
  try {
    const [recipients] = await pool.query("SELECT COUNT(*) as count FROM recipients WHERE agency_id = ?", [agencyId]);
    if (recipients[0].count > 0) {
      return res.status(409).json({ message: "이 소속사에 속한 수령인이 있어 삭제할 수 없습니다." });
    }
    const [result] = await pool.query("DELETE FROM agencies WHERE id = ?", [agencyId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "소속사를 찾을 수 없습니다." });
    }
    res.json({ message: "소속사를 삭제했습니다." });
  } catch (error) {
    console.error("admin agency delete error:", error);
    res.status(500).json({ message: "소속사를 삭제하는 중 오류가 발생했습니다." });
  }
});

// 그룹/팀 관리 API
app.get("/api/admin/groups", requireAdmin, async (req, res) => {
  const agencyId = req.query.agencyId ? Number(req.query.agencyId) : null;
  try {
    let query = `
      SELECT
        rg.id,
        rg.name,
        rg.image_url,
        rg.agency_id,
        a.name AS agency_name,
        (SELECT COUNT(*) FROM recipients WHERE group_id = rg.id) AS recipient_count,
        rg.created_at,
        rg.updated_at
      FROM recipient_groups rg
      LEFT JOIN agencies a ON a.id = rg.agency_id
    `;
    const params = [];
    if (agencyId) {
      query += " WHERE rg.agency_id = ?";
      params.push(agencyId);
    }
    query += " ORDER BY a.name ASC, rg.name ASC";
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("admin groups fetch error:", error);
    res.status(500).json({ message: "그룹/팀 목록을 불러오는 중 오류가 발생했습니다." });
  }
});

app.post("/api/admin/groups", requireAdmin, async (req, res) => {
  const { name, agencyId, imageData } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "그룹/팀 이름을 입력해 주세요." });
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO recipient_groups (name, agency_id) VALUES (?, ?)",
      [name.trim(), agencyId ? Number(agencyId) : null]
    );
    const groupId = result.insertId;
    
    let imageUrl = null;
    if (imageData) {
      imageUrl = await saveGroupImage(groupId, imageData);
      if (imageUrl) {
        await pool.query("UPDATE recipient_groups SET image_url = ? WHERE id = ?", [imageUrl, groupId]);
      }
    }
    
    const [rows] = await pool.query(
      `SELECT
        rg.id,
        rg.name,
        rg.image_url,
        rg.agency_id,
        a.name AS agency_name,
        (SELECT COUNT(*) FROM recipients WHERE group_id = rg.id) AS recipient_count,
        rg.created_at,
        rg.updated_at
      FROM recipient_groups rg
      LEFT JOIN agencies a ON a.id = rg.agency_id
      WHERE rg.id = ?`,
      [groupId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("admin group create error:", error);
    res.status(500).json({ message: "그룹/팀을 추가하는 중 오류가 발생했습니다." });
  }
});

app.put("/api/admin/groups/:id", requireAdmin, async (req, res) => {
  const groupId = Number(req.params.id);
  const { name, agencyId, imageData } = req.body;
  if (!groupId) {
    return res.status(400).json({ message: "잘못된 그룹/팀 ID입니다." });
  }
  if (!name?.trim()) {
    return res.status(400).json({ message: "그룹/팀 이름을 입력해 주세요." });
  }
  try {
    await pool.query(
      "UPDATE recipient_groups SET name = ?, agency_id = ? WHERE id = ?",
      [name.trim(), agencyId ? Number(agencyId) : null, groupId]
    );
    
    if (imageData) {
      const imageUrl = await saveGroupImage(groupId, imageData);
      if (imageUrl) {
        await pool.query("UPDATE recipient_groups SET image_url = ? WHERE id = ?", [imageUrl, groupId]);
      }
    }
    
    const [rows] = await pool.query(
      `SELECT
        rg.id,
        rg.name,
        rg.image_url,
        rg.agency_id,
        a.name AS agency_name,
        (SELECT COUNT(*) FROM recipients WHERE group_id = rg.id) AS recipient_count,
        rg.created_at,
        rg.updated_at
      FROM recipient_groups rg
      LEFT JOIN agencies a ON a.id = rg.agency_id
      WHERE rg.id = ?`,
      [groupId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "그룹/팀을 찾을 수 없습니다." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("admin group update error:", error);
    res.status(500).json({ message: "그룹/팀을 수정하는 중 오류가 발생했습니다." });
  }
});

app.delete("/api/admin/groups/:id", requireAdmin, async (req, res) => {
  const groupId = Number(req.params.id);
  if (!groupId) {
    return res.status(400).json({ message: "잘못된 그룹/팀 ID입니다." });
  }
  try {
    const [recipients] = await pool.query("SELECT COUNT(*) as count FROM recipients WHERE group_id = ?", [groupId]);
    if (recipients[0].count > 0) {
      return res.status(409).json({ message: "이 그룹/팀에 속한 수령인이 있어 삭제할 수 없습니다." });
    }
    const [result] = await pool.query("DELETE FROM recipient_groups WHERE id = ?", [groupId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "그룹/팀을 찾을 수 없습니다." });
    }
    res.json({ message: "그룹/팀을 삭제했습니다." });
  } catch (error) {
    console.error("admin group delete error:", error);
    res.status(500).json({ message: "그룹/팀을 삭제하는 중 오류가 발생했습니다." });
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

app.get("/api/admin/coupons", requireAdmin, async (req, res) => {
  try {
    await ensureCouponSetup();
    const [couponRows] = await pool.query(
      `SELECT
         c.*,
         COUNT(uc.id) AS total_issued,
         SUM(uc.status = 'issued') AS active_count,
         SUM(uc.status = 'used') AS used_count
       FROM coupons c
       LEFT JOIN user_coupons uc ON uc.coupon_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    const [issueRows] = await pool.query(
      `SELECT
         uc.id,
         uc.user_id,
         uc.coupon_id,
         uc.status,
         uc.issued_at,
         uc.used_at,
         uc.expires_at,
         uc.notes,
         u.email AS user_email,
         u.name AS user_name,
         c.code AS coupon_code,
         c.name AS coupon_name,
         c.discount_type,
         c.discount_value
       FROM user_coupons uc
       INNER JOIN users u ON u.id = uc.user_id
       INNER JOIN coupons c ON c.id = uc.coupon_id
       ORDER BY uc.created_at DESC
       LIMIT 100`
    );
    res.json({
      coupons: couponRows.map(mapAdminCouponDefinition),
      issues: issueRows.map(mapAdminCouponIssue),
    });
  } catch (error) {
    console.error("admin coupons fetch error:", error);
    res.status(500).json({ message: "쿠폰 정보를 불러오는 중 오류가 발생했습니다." });
  }
});

app.post("/api/admin/coupons", requireAdmin, async (req, res) => {
  const payload = req.body || {};
  const code = payload.code?.trim();
  const name = payload.name?.trim();
  const discountType = payload.discountType === "percent" ? "percent" : "amount";
  const discountValue = Number(payload.discountValue);
  if (!code || !name) {
    return res.status(400).json({ message: "코드와 이름을 입력해 주세요." });
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return res.status(400).json({ message: "할인 금액/비율이 올바르지 않습니다." });
  }
  const minOrderTotal =
    payload.minOrderTotal === "" || payload.minOrderTotal == null
      ? null
      : Number(payload.minOrderTotal);
  const maxDiscount =
    payload.maxDiscount === "" || payload.maxDiscount == null
      ? null
      : Number(payload.maxDiscount);
  const usageLimit =
    payload.usageLimit === "" || payload.usageLimit == null ? null : Number(payload.usageLimit);
  if (
    (minOrderTotal != null && (!Number.isFinite(minOrderTotal) || minOrderTotal < 0)) ||
    (maxDiscount != null && (!Number.isFinite(maxDiscount) || maxDiscount < 0)) ||
    (usageLimit != null && (!Number.isFinite(usageLimit) || usageLimit < 0))
  ) {
    return res.status(400).json({ message: "조건 값이 올바르지 않습니다." });
  }
  let startsAt = null;
  let expiresAt = null;
  if (payload.startsAt) {
    const parsed = new Date(payload.startsAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "시작 시각 형식이 올바르지 않습니다." });
    }
    startsAt = parsed;
  }
  if (payload.expiresAt) {
    const parsed = new Date(payload.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "만료 시각 형식이 올바르지 않습니다." });
    }
    expiresAt = parsed;
  }
  try {
    await ensureCouponSetup();
    const [result] = await pool.query(
      `INSERT INTO coupons
         (code, name, description, discount_type, discount_value, min_order_total, max_discount, starts_at, expires_at, usage_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        name,
        payload.description?.trim() || null,
        discountType,
        discountValue,
        minOrderTotal,
        maxDiscount,
        startsAt,
        expiresAt,
        usageLimit,
      ]
    );
    const [rows] = await pool.query("SELECT * FROM coupons WHERE id = ?", [result.insertId]);
    const created = rows.length ? rows[0] : null;
    res
      .status(201)
      .json(
        created ? mapAdminCouponDefinition({ ...created, total_issued: 0, active_count: 0, used_count: 0 }) : null
      );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "이미 존재하는 쿠폰 코드입니다." });
    }
    console.error("admin coupon create error:", error);
    res.status(500).json({ message: "쿠폰을 생성하지 못했습니다." });
  }
});

app.delete("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
  const couponId = Number(req.params.id);
  if (!couponId) {
    return res.status(400).json({ message: "잘못된 쿠폰 ID입니다." });
  }
  try {
    await ensureCouponSetup();
    const [result] = await pool.query("DELETE FROM coupons WHERE id = ?", [couponId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "쿠폰을 찾을 수 없습니다." });
    }
    res.json({ message: "쿠폰을 삭제했습니다." });
  } catch (error) {
    console.error("admin coupon delete error:", error);
    res.status(500).json({ message: "쿠폰을 삭제하지 못했습니다." });
  }
});

app.post("/api/admin/coupons/issue", requireAdmin, async (req, res) => {
  const { couponId, userId, userEmail, expiresAt, notes } = req.body || {};
  const parsedCouponId = Number(couponId);
  if (!parsedCouponId) {
    return res.status(400).json({ message: "쿠폰을 선택해 주세요." });
  }
  let targetUserId = Number(userId);
  try {
    await ensureCouponSetup();
    const [couponRows] = await pool.query("SELECT id, code FROM coupons WHERE id = ? LIMIT 1", [
      parsedCouponId,
    ]);
    if (couponRows.length === 0) {
      return res.status(404).json({ message: "쿠폰을 찾을 수 없습니다." });
    }
    if (!targetUserId && userEmail) {
      const [userByEmail] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [
        userEmail.trim(),
      ]);
      if (userByEmail.length > 0) {
        targetUserId = userByEmail[0].id;
      }
    }
    if (!targetUserId) {
      return res
        .status(400)
        .json({ message: "발급할 회원 ID 또는 이메일을 입력해 주세요." });
    }
    const [userRows] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [targetUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: "회원 정보를 찾을 수 없습니다." });
    }
    const [activeRows] = await pool.query(
      `SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ? AND status = 'issued' LIMIT 1`,
      [targetUserId, couponRows[0].id]
    );
    if (activeRows.length > 0) {
      return res.status(409).json({ message: "이미 발급된 쿠폰이 있습니다." });
    }
    let customExpires = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: "만료 시각 형식이 올바르지 않습니다." });
      }
      customExpires = parsed;
    }
    const issueId = await issueCouponToUser(targetUserId, couponRows[0].code, {
      expiresAt: customExpires || undefined,
      notes: notes?.trim() || null,
    });
    const [rows] = await pool.query(
      `SELECT
         uc.id,
         uc.user_id,
         uc.coupon_id,
         uc.status,
         uc.issued_at,
         uc.used_at,
         uc.expires_at,
         uc.notes,
         u.email AS user_email,
         u.name AS user_name,
         c.code AS coupon_code,
         c.name AS coupon_name,
         c.discount_type,
         c.discount_value
       FROM user_coupons uc
       INNER JOIN users u ON u.id = uc.user_id
       INNER JOIN coupons c ON c.id = uc.coupon_id
       WHERE uc.id = ?`,
      [issueId]
    );
    res.status(201).json(mapAdminCouponIssue(rows[0]));
  } catch (error) {
    console.error("admin coupon issue error:", error);
    res.status(500).json({ message: "쿠폰을 발급하지 못했습니다." });
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
         r.image_url AS image_url,
         COALESCE(a.name, "") AS agency,
         a.image_url AS agency_image_url,
         COALESCE(rg.name, "") AS group_name,
         rg.image_url AS group_image_url
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

app.get("/api/orders/my", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  try {
    const [rows] = await pool.query(
      `SELECT
         l.id,
         l.recipient_name,
         l.status AS letter_status,
         l.created_at,
         p.status AS payment_status,
         p.amount AS payment_amount,
         s.status AS shipment_status,
         s.tracking_code
       FROM letters l
       LEFT JOIN payments p ON p.letter_id = l.id
       LEFT JOIN shipments s ON s.letter_id = l.id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC
       LIMIT 20`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error("my orders fetch error:", error);
    res.status(500).json({ message: "주문 내역을 불러오는 중 오류가 발생했습니다." });
  }
});

app.post("/api/orders", requireLogin, async (req, res) => {
  const payload = req.body || {};
  const draft = payload.draft || {};
  const target = draft.target || payload.target || {};
  const payment = payload.payment || {};

  const plainText = (draft.text || "").trim();
  const formattedText = draft.formattedText || "";
  if (!plainText && !formattedText) {
    return res.status(400).json({ message: "편지 내용을 찾을 수 없습니다." });
  }

  const recipientNameRaw =
    target.recipientName ||
    target.name ||
    payload.recipientName ||
    payload.recipient?.name ||
    "";
  const recipientName = truncate(recipientNameRaw.trim(), 120);
  if (!recipientName) {
    return res.status(400).json({ message: "수령인 정보를 찾을 수 없습니다." });
  }

  const sanitizedContent = sanitizeLetterContent(formattedText);
  const letterContent = sanitizedContent || convertPlainTextToHtml(plainText);
  if (!letterContent) {
    return res.status(400).json({ message: "편지 내용을 저장할 수 없습니다." });
  }

  const recipientGroup = buildRecipientGroup({
    agency: target.agency || payload.agency || null,
    team: target.team || payload.team || null,
  });
  const paperOption = draft.stationery ? truncate(draft.stationery, 60) : null;
  const fontStyle = draft.font && LETTER_FONT_SET.has(draft.font) ? draft.font : "default";
  const textColor = draft.color ? truncate(draft.color, 20) : null;
  const paymentAmount = Math.max(0, Math.round(Number(payment.amount) || 0));
  const paymentMethod = normalizePaymentMethod(payment.method);
  const paymentStatus = normalizePaymentStatus(payment.status);
  const pgTransactionId = payment.pgTransactionId ? truncate(payment.pgTransactionId, 190) : null;
  const submittedAt = new Date();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [letterResult] = await connection.query(
      `INSERT INTO letters
        (user_id, recipient_name, recipient_group, content, paper_option, font_style, text_color, attachment_url, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'submitted', ?)`,
      [
        req.session.userId,
        recipientName,
        recipientGroup,
        letterContent,
        paperOption,
        fontStyle,
        textColor,
        submittedAt,
      ]
    );
    const letterId = letterResult.insertId;

    await connection.query(
      `INSERT INTO payments
        (letter_id, method, amount, currency, pg_transaction_id, status, paid_at)
       VALUES (?, ?, ?, 'KRW', ?, ?, ?)`,
      [
        letterId,
        paymentMethod,
        paymentAmount,
        pgTransactionId,
        paymentStatus,
        paymentStatus === "paid" ? submittedAt : null,
      ]
    );

    if (payment.couponCode) {
      const couponResult = await consumeCouponForUser(connection, req.session.userId, payment.couponCode);
      if (couponResult.status !== "consumed") {
        const couponError = new Error(
          couponResult.status === "not_found"
            ? "쿠폰 정보를 찾을 수 없습니다."
            : "이미 사용했거나 사용할 수 없는 쿠폰입니다."
        );
        couponError.statusCode = couponResult.status === "not_found" ? 404 : 409;
        throw couponError;
      }
    }

    let attachmentUrl = null;
    if (payload.letterImage) {
      try {
        attachmentUrl = await saveLetterImage(req.session.userId, letterId, payload.letterImage);
        if (attachmentUrl) {
          await connection.query("UPDATE letters SET attachment_url = ? WHERE id = ?", [
            attachmentUrl,
            letterId,
          ]);
        }
      } catch (imageError) {
        console.error("letter image save error:", imageError);
      }
    }

    await connection.commit();
    res.status(201).json({ id: letterId, status: "submitted", attachmentUrl });
  } catch (error) {
    await connection.rollback();
    console.error("order create error:", error);
    const statusCode = error.statusCode || 500;
    res
      .status(statusCode)
      .json({ message: error.message || "주문을 저장하는 중 오류가 발생했습니다." });
  } finally {
    connection.release();
  }
});

app.get("/api/coupons/me", requireLogin, async (req, res) => {
  try {
    const coupons = await getUserCoupons(req.session.userId);
    res.json(coupons);
  } catch (error) {
    console.error("user coupons fetch error:", error);
    res.status(500).json({ message: "쿠폰 정보를 불러오지 못했습니다." });
  }
});

app.post("/api/coupons/consume", requireLogin, async (req, res) => {
  const code = req.body?.code?.trim();
  if (!code) {
    return res.status(400).json({ message: "쿠폰 코드를 입력해 주세요." });
  }
  try {
    const result = await consumeUserCoupon(req.session.userId, code);
    if (result.status === "not_found") {
      return res.status(404).json({ message: "쿠폰을 찾을 수 없습니다." });
    }
    if (result.status === "invalid_status") {
      return res.status(409).json({ message: "이미 사용했거나 사용할 수 없는 쿠폰입니다." });
    }
    res.json({ message: "쿠폰이 사용 처리되었습니다." });
  } catch (error) {
    console.error("coupon consume error:", error);
    res.status(500).json({ message: "쿠폰을 사용 처리하는 중 오류가 발생했습니다." });
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
    try {
      await grantWelcomeCouponToUser(userId);
    } catch (couponError) {
      console.error("social welcome coupon issue error:", couponError);
    }
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
  await ensureLetterSchemaExtensions();
  await ensureRecipientSchemaExtensions();
  await ensureCouponSetup();
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
    if (rows.length > 0) {
      const templateId = rows[0].id;
      await pool.query(
        `UPDATE stationery_templates
         SET description = ?, preview_image_url = ?, is_active = ?
         WHERE id = ?`,
        [
          template.description || null,
          template.previewImageUrl || null,
          template.isActive ? 1 : 0,
          templateId,
        ]
      );
    }
  }
}

async function ensureLetterSchemaExtensions() {
  try {
    await pool.query("ALTER TABLE letters ADD COLUMN font_style VARCHAR(60) NULL DEFAULT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("letters font_style alter warn:", error.message || error);
    }
  }
  try {
    await pool.query("ALTER TABLE letters ADD COLUMN text_color VARCHAR(20) NULL DEFAULT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("letters text_color alter warn:", error.message || error);
    }
  }
}

async function ensureRecipientSchemaExtensions() {
  try {
    await pool.query("ALTER TABLE recipients ADD COLUMN image_url VARCHAR(255) NULL DEFAULT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("recipients image_url alter warn:", error.message || error);
    }
  }
  try {
    await pool.query("ALTER TABLE agencies ADD COLUMN image_url VARCHAR(255) NULL DEFAULT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("agencies image_url alter warn:", error.message || error);
    }
  }
  try {
    await pool.query("ALTER TABLE recipient_groups ADD COLUMN image_url VARCHAR(255) NULL DEFAULT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("recipient_groups image_url alter warn:", error.message || error);
    }
  }
  try {
    await pool.query("ALTER TABLE agencies ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("agencies created_at alter warn:", error.message || error);
    }
  }
  try {
    await pool.query("ALTER TABLE agencies ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("agencies updated_at alter warn:", error.message || error);
    }
  }
  try {
    await pool.query("ALTER TABLE recipient_groups ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("recipient_groups created_at alter warn:", error.message || error);
    }
  }
  try {
    await pool.query("ALTER TABLE recipient_groups ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") {
      console.warn("recipient_groups updated_at alter warn:", error.message || error);
    }
  }
}

async function findOrCreateAgency(name, imageData = null) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const [rows] = await pool.query("SELECT id, image_url FROM agencies WHERE name = ?", [trimmed]);
  let agencyId;
  if (rows.length > 0) {
    agencyId = rows[0].id;
    // 이미지가 제공되면 항상 업데이트 (기존 이미지가 없거나 새 이미지를 제공한 경우)
    if (imageData) {
      const imageUrl = await saveAgencyImage(agencyId, imageData);
      if (imageUrl) {
        await pool.query("UPDATE agencies SET image_url = ? WHERE id = ?", [imageUrl, agencyId]);
      }
    }
  } else {
    const [result] = await pool.query("INSERT INTO agencies (name) VALUES (?)", [trimmed]);
    agencyId = result.insertId;
    if (imageData && agencyId) {
      const imageUrl = await saveAgencyImage(agencyId, imageData);
      if (imageUrl) {
        await pool.query("UPDATE agencies SET image_url = ? WHERE id = ?", [imageUrl, agencyId]);
      }
    }
  }
  
  return agencyId;
}

async function findOrCreateGroup(name, agencyId, imageData = null) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const params = agencyId ? [trimmed, agencyId] : [trimmed];
  const query = agencyId
    ? "SELECT id, image_url FROM recipient_groups WHERE name = ? AND agency_id = ?"
    : "SELECT id, image_url FROM recipient_groups WHERE name = ? AND agency_id IS NULL";
  const [rows] = await pool.query(query, params);
  let groupId;
  if (rows.length > 0) {
    groupId = rows[0].id;
    // 이미지가 제공되면 항상 업데이트 (기존 이미지가 없거나 새 이미지를 제공한 경우)
    if (imageData) {
      const imageUrl = await saveGroupImage(groupId, imageData);
      if (imageUrl) {
        await pool.query("UPDATE recipient_groups SET image_url = ? WHERE id = ?", [imageUrl, groupId]);
      }
    }
  } else {
    const [result] = await pool.query(
      "INSERT INTO recipient_groups (name, agency_id) VALUES (?, ?)",
      [trimmed, agencyId || null]
    );
    groupId = result.insertId;
    if (imageData && groupId) {
      const imageUrl = await saveGroupImage(groupId, imageData);
      if (imageUrl) {
        await pool.query("UPDATE recipient_groups SET image_url = ? WHERE id = ?", [imageUrl, groupId]);
      }
    }
  }
  
  return groupId;
}


function formatDateValue(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function mapAdminCouponDefinition(row = {}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value || 0),
    minOrderTotal: row.min_order_total != null ? Number(row.min_order_total) : null,
    maxDiscount: row.max_discount != null ? Number(row.max_discount) : null,
    startsAt: formatDateValue(row.starts_at),
    expiresAt: formatDateValue(row.expires_at),
    usageLimit: row.usage_limit != null ? Number(row.usage_limit) : null,
    totalIssued: Number(row.total_issued || 0),
    activeCount: Number(row.active_count || 0),
    usedCount: Number(row.used_count || 0),
    createdAt: formatDateValue(row.created_at),
    updatedAt: formatDateValue(row.updated_at),
  };
}

function mapAdminCouponIssue(row = {}) {
  return {
    id: row.id,
    couponId: row.coupon_id,
    couponCode: row.coupon_code,
    couponName: row.coupon_name,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    status: row.status,
    issuedAt: formatDateValue(row.issued_at),
    usedAt: formatDateValue(row.used_at),
    expiresAt: formatDateValue(row.expires_at),
    notes: row.notes,
    discountType: row.discount_type,
    discountValue: row.discount_value != null ? Number(row.discount_value) : null,
  };
}

function sanitizeLetterContent(input) {
  if (!input) return "";
  let sanitized = String(input);
  sanitized = sanitized.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  sanitized = sanitized.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, "");
  sanitized = sanitized.replace(/javascript:/gi, "");
  return sanitized;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function convertPlainTextToHtml(text) {
  if (!text) return "";
  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}

function truncate(value, maxLength) {
  if (!value && value !== 0) return null;
  const stringValue = String(value);
  if (stringValue.length <= maxLength) return stringValue;
  return stringValue.slice(0, maxLength);
}

function buildRecipientGroup(target = {}) {
  const parts = [target.agency, target.team].filter(Boolean);
  if (!parts.length) return null;
  return truncate(parts.join(" · "), 120);
}

function normalizePaymentMethod(value) {
  const normalized = String(value || "card").toLowerCase();
  if (["card", "transfer", "virtual_account", "mobile"].includes(normalized)) {
    return normalized;
  }
  if (normalized === "virtual-account" || normalized === "virtualaccount") {
    return "virtual_account";
  }
  if (normalized === "mobile_phone" || normalized === "phone") {
    return "mobile";
  }
  return "card";
}

function normalizePaymentStatus(value) {
  const normalized = String(value || "paid").toLowerCase();
  if (["pending", "paid", "failed", "refunded"].includes(normalized)) {
    return normalized;
  }
  return "paid";
}

function normalizeLetterStatus(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  return LETTER_STATUS_SET.has(normalized) ? normalized : null;
}

function normalizeShipmentStatus(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  return SHIPMENT_STATUS_SET.has(normalized) ? normalized : null;
}

function parseDateInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

async function getAdminOrderDetail(letterId) {
  const [rows] = await pool.query(
    `SELECT
       l.id,
       l.user_id,
       l.recipient_name,
       l.recipient_group,
       l.content,
       l.paper_option,
       l.font_style,
       l.text_color,
       l.attachment_url,
       l.status AS letter_status,
       l.submitted_at,
       l.created_at,
       l.updated_at,
       u.email AS user_email,
       u.name AS user_name,
       u.phone AS user_phone,
       p.method AS payment_method,
       p.amount AS payment_amount,
       p.status AS payment_status,
       p.pg_transaction_id,
       p.paid_at,
       s.id AS shipment_id,
       s.status AS shipment_status,
       s.tracking_code,
       s.carrier,
       s.shipped_at,
       s.delivered_at
     FROM letters l
     LEFT JOIN users u ON l.user_id = u.id
     LEFT JOIN payments p ON p.letter_id = l.id
     LEFT JOIN shipments s ON s.letter_id = l.id
     WHERE l.id = ?
     LIMIT 1`,
    [letterId]
  );
  if (rows.length === 0) {
    return null;
  }
  const row = rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    recipientName: row.recipient_name,
    recipientGroup: row.recipient_group,
    letterStatus: row.letter_status,
    letterContent: row.content,
    paperOption: row.paper_option,
    fontStyle: row.font_style,
    textColor: row.text_color,
    attachmentUrl: row.attachment_url,
    submittedAt: formatDateValue(row.submitted_at),
    createdAt: formatDateValue(row.created_at),
    updatedAt: formatDateValue(row.updated_at),
    user: {
      email: row.user_email,
      name: row.user_name,
      phone: row.user_phone,
    },
    payment: {
      method: row.payment_method,
      amount: row.payment_amount,
      status: row.payment_status,
      transactionId: row.pg_transaction_id,
      paidAt: formatDateValue(row.paid_at),
    },
    shipment: row.shipment_id
      ? {
          id: row.shipment_id,
          status: row.shipment_status,
          trackingCode: row.tracking_code,
          carrier: row.carrier,
          shippedAt: formatDateValue(row.shipped_at),
          deliveredAt: formatDateValue(row.delivered_at),
        }
      : null,
  };
}

async function ensureCouponSetup() {
  if (!couponSetupPromise) {
    couponSetupPromise = (async () => {
      await ensureCouponInfrastructure();
      await ensureWelcomeCouponDefinition();
    })().catch((error) => {
      couponSetupPromise = null;
      throw error;
    });
  }
  return couponSetupPromise;
}

async function ensureCouponInfrastructure() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS coupons (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      description TEXT,
      discount_type ENUM('amount','percent') NOT NULL DEFAULT 'amount',
      discount_value INT UNSIGNED NOT NULL,
      min_order_total INT UNSIGNED,
      max_discount INT UNSIGNED,
      starts_at DATETIME,
      expires_at DATETIME,
      usage_limit INT UNSIGNED,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS user_coupons (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      coupon_id BIGINT UNSIGNED NOT NULL,
      status ENUM('issued','used','expired','revoked') NOT NULL DEFAULT 'issued',
      issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      used_at DATETIME,
      expires_at DATETIME,
      notes VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_user_coupons_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_coupons_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  try {
    await pool.query(
      "ALTER TABLE user_coupons DROP INDEX uq_user_coupon"
    );
  } catch (error) {
    if (error.code !== "ER_CANT_DROP_FIELD_OR_KEY" && error.code !== "ER_DUP_KEYNAME") {
      console.warn("user_coupons drop index warn:", error.message || error);
    }
  }

  try {
    await pool.query(
      "CREATE INDEX idx_user_coupons_user_coupon_status ON user_coupons (user_id, coupon_id, status)"
    );
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") {
      console.warn("user_coupons add index warn:", error.message || error);
    }
  }
}

async function ensureWelcomeCouponDefinition() {
  const [rows] = await pool.query("SELECT id FROM coupons WHERE code = ? LIMIT 1", [
    DEFAULT_WELCOME_COUPON.code,
  ]);
  if (rows.length === 0) {
    await pool.query(
      `INSERT INTO coupons
        (code, name, description, discount_type, discount_value, min_order_total, max_discount, starts_at, expires_at, usage_limit)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 1)`,
      [
        DEFAULT_WELCOME_COUPON.code,
        DEFAULT_WELCOME_COUPON.name,
        DEFAULT_WELCOME_COUPON.description,
        DEFAULT_WELCOME_COUPON.discountType,
        DEFAULT_WELCOME_COUPON.discountValue,
      ]
    );
  }
}

async function grantWelcomeCouponToUser(userId) {
  if (!userId) return;
  await ensureCouponSetup();
  await issueCouponToUser(userId, DEFAULT_WELCOME_COUPON.code);
}

async function issueCouponToUser(userId, couponCode, options = {}) {
  if (!userId || !couponCode) return null;
  await ensureCouponSetup();
  const [couponRows] = await pool.query(
    `SELECT id, code, expires_at FROM coupons WHERE code = ? LIMIT 1`,
    [couponCode]
  );
  if (couponRows.length === 0) {
    throw new Error(`coupon code ${couponCode} not found`);
  }
  const coupon = couponRows[0];
  const [existing] = await pool.query(
    `SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ? AND status = 'issued' LIMIT 1`,
    [userId, coupon.id]
  );
  if (existing.length > 0) {
    return existing[0].id;
  }
  const expiresAt =
    options.expiresAt instanceof Date
      ? options.expiresAt
      : options.expiresAt
      ? new Date(options.expiresAt)
      : coupon.expires_at || null;
  if (expiresAt && expiresAt instanceof Date && Number.isNaN(expiresAt.getTime())) {
    throw new Error("invalid expiresAt value");
  }
  const [result] = await pool.query(
    `INSERT INTO user_coupons (user_id, coupon_id, status, expires_at, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      coupon.id,
      options.status || "issued",
      expiresAt instanceof Date ? expiresAt : expiresAt || null,
      options.notes || null,
    ]
  );
  return result.insertId;
}

async function getUserCoupons(userId) {
  if (!userId) return [];
  await ensureCouponSetup();
  const [rows] = await pool.query(
    `SELECT
       c.code,
       c.name,
       c.description,
       c.discount_type,
       c.discount_value,
       c.min_order_total,
       c.max_discount,
       uc.status,
       uc.issued_at,
       uc.used_at,
       uc.expires_at
     FROM user_coupons uc
     INNER JOIN coupons c ON c.id = uc.coupon_id
     WHERE uc.user_id = ?
     ORDER BY uc.issued_at DESC, uc.id DESC`,
    [userId]
  );
  return rows.map(mapCouponRow);
}

function mapCouponRow(row) {
  const issuedAt = row.issued_at ? new Date(row.issued_at) : null;
  const usedAt = row.used_at ? new Date(row.used_at) : null;
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const now = Date.now();
  const canUse = row.status === "issued" && (!expiresAt || expiresAt.getTime() > now);
  return {
    code: row.code,
    name: row.name,
    description: row.description,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrderTotal: row.min_order_total,
    maxDiscount: row.max_discount,
    status: row.status,
    issuedAt: issuedAt ? issuedAt.toISOString() : null,
    usedAt: usedAt ? usedAt.toISOString() : null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    canUse,
  };
}

async function consumeCouponForUser(connection, userId, couponCode) {
  if (!userId || !couponCode) {
    return { status: "missing" };
  }
  await ensureCouponSetup();
  const [rows] = await connection.query(
    `SELECT
       uc.id,
       uc.status,
       uc.expires_at
     FROM user_coupons uc
     INNER JOIN coupons c ON c.id = uc.coupon_id
     WHERE uc.user_id = ? AND c.code = ?
     FOR UPDATE`,
    [userId, couponCode]
  );
  if (rows.length === 0) {
    return { status: "not_found" };
  }
  const coupon = rows[0];
  const isExpired =
    coupon.expires_at && new Date(coupon.expires_at).getTime() <= Date.now();
  if (coupon.status !== "issued" || isExpired) {
    return { status: "invalid_status" };
  }
  await connection.query(
    `UPDATE user_coupons
     SET status = 'used', used_at = NOW()
     WHERE id = ?`,
    [coupon.id]
  );
  return { status: "consumed", couponId: coupon.id };
}

async function consumeUserCoupon(userId, couponCode) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await consumeCouponForUser(connection, userId, couponCode);
    if (result.status === "consumed") {
      await connection.commit();
    } else {
      await connection.rollback();
    }
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function saveLetterImage(userId, letterId, base64Image) {
  try {
    if (!base64Image || typeof base64Image !== "string") {
      return null;
    }
    const base64Data = base64Image.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const userDir = path.join(__dirname, "assets", "letters", `user${userId}`);
    await fs.mkdir(userDir, { recursive: true });

    const filename = `letter-${letterId}-${Date.now()}.png`;
    const filepath = path.join(userDir, filename);
    await fs.writeFile(filepath, buffer);

    const relativePath = `assets/letters/user${userId}/${filename}`;
    return relativePath;
  } catch (error) {
    console.error("saveLetterImage error:", error);
    return null;
  }
}

async function saveRecipientImage(recipientId, base64Image) {
  try {
    if (!base64Image || typeof base64Image !== "string") {
      return null;
    }
    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const recipientsDir = path.join(__dirname, "assets", "recipients");
    await fs.mkdir(recipientsDir, { recursive: true });

    const filename = `recipient-${recipientId}-${Date.now()}.png`;
    const filepath = path.join(recipientsDir, filename);
    await fs.writeFile(filepath, buffer);

    const relativePath = `assets/recipients/${filename}`;
    return relativePath;
  } catch (error) {
    console.error("saveRecipientImage error:", error);
    return null;
  }
}

async function saveAgencyImage(agencyId, base64Image) {
  try {
    if (!base64Image || typeof base64Image !== "string") {
      return null;
    }
    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const agenciesDir = path.join(__dirname, "assets", "agencies");
    await fs.mkdir(agenciesDir, { recursive: true });

    const filename = `agency-${agencyId}-${Date.now()}.png`;
    const filepath = path.join(agenciesDir, filename);
    await fs.writeFile(filepath, buffer);

    const relativePath = `assets/agencies/${filename}`;
    return relativePath;
  } catch (error) {
    console.error("saveAgencyImage error:", error);
    return null;
  }
}

async function saveGroupImage(groupId, base64Image) {
  try {
    if (!base64Image || typeof base64Image !== "string") {
      return null;
    }
    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const groupsDir = path.join(__dirname, "assets", "groups");
    await fs.mkdir(groupsDir, { recursive: true });

    const filename = `group-${groupId}-${Date.now()}.png`;
    const filepath = path.join(groupsDir, filename);
    await fs.writeFile(filepath, buffer);

    const relativePath = `assets/groups/${filename}`;
    return relativePath;
  } catch (error) {
    console.error("saveGroupImage error:", error);
    return null;
  }
}

app.listen(PORT, () => {
  console.log(`Fanletter Post server listening on http://localhost:${PORT}`);
});
