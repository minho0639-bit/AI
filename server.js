require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Fanletter Post server listening on http://localhost:${PORT}`);
});
