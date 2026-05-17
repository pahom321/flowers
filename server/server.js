const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validate } = require("validate.js");
const knex = require("knex")(require("./knexfile"));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const JWT_SECRET = process.env.JWT_SECRET || "flowers-secret-key";

const checkAuthData = async (req, res, next) => {
  const constraints = {
    username: { presence: true, length: { minimum: 4, maximum: 20 } },
    password: { presence: true, length: { minimum: 4, maximum: 20 } },
  };
  const errors = validate(req.body, constraints);
  if (errors) return res.status(400).json({ error: "Ошибка валидации", details: errors });

  const exists = await knex("users")
    .where({ username: req.body.username })
    .orWhere({ email: req.body.email })
    .first();
  if (exists) return res.status(400).json({ error: "Логин или Email уже заняты" });
  next();
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ error: "Неверный или просроченный токен" });
  }
};

app.post("/api/auth/signup", checkAuthData, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const targetRole = role || "User";
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await knex.transaction(async (trx) => {
      const [insertedUser] = await trx("users")
        .insert({ username, email, password: hashedPassword })
        .returning("*");
      const userId = insertedUser.id;
      const roleRecord = await trx("roles").where({ name: targetRole }).first();
      if (!roleRecord) throw new Error("Роль не найдена");
      await trx("user_roles").insert({ user_id: userId, role_id: roleRecord.id });
      return { id: userId, username, email, role: roleRecord.name };
    });

    const token = jwt.sign({ id: result.id, username: result.username }, JWT_SECRET, { expiresIn: "24h" });
    res.status(201).json({ message: "Регистрация успешна", token, user: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await knex("users").where({ username }).first();
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Неверный пароль" });

    const roles = await knex("user_roles")
      .join("roles", "user_roles.role_id", "roles.id")
      .where("user_roles.user_id", user.id)
      .pluck("roles.name");

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ message: "Вход выполнен", token, user: { id: user.id, username: user.username, email: user.email, roles } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await knex("products").select("id", "name", "description", "price", "stock");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Ошибка загрузки каталога" });
  }
});

app.post("/api/orders", verifyToken, async (req, res) => {
  try {
    const { items, total_amount } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Корзина пуста" });
    }
    const [order] = await knex("orders")
      .insert({ user_id: req.user.id, total_amount, items: JSON.stringify(items) })
      .returning(["id", "total_amount", "status", "created_at"]);
    res.status(201).json({ message: "Заказ оформлен", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка оформления заказа" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await knex("users").select("id", "username", "email");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));