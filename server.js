require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();
const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const dataDir = path.join(ROOT, "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "eletroprime.db"));

const uploadDir = path.join(ROOT, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-only-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 8 }
}));
app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(ROOT, "public")));

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  description TEXT DEFAULT '',
  specs TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  sale_price REAL,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  video TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cpf TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
        CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      UNIQUE(customer_id, product_id),

      FOREIGN KEY(customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

      FOREIGN KEY(product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  button_text TEXT DEFAULT 'Comprar agora',
  link TEXT DEFAULT '#',
  media TEXT DEFAULT '',
  media_type TEXT DEFAULT 'image',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aguardando pagamento',
  items_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const countProducts = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
if (!countProducts) {
  const insert = db.prepare(`
    INSERT INTO products
    (name, category, brand, sku, description, specs, price, sale_price, stock, min_stock, image, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const demo = [
    ["Fone Bluetooth Pro", "Áudio", "Eletro Prime", "EP-FONE-001", "Fone sem fio com estojo de carregamento.", "Bluetooth; microfone; bateria de longa duração", 199.90, 159.90, 18, 5, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85"],
    ["Smartwatch Ultra", "Smartwatches", "Eletro Prime", "EP-WATCH-001", "Smartwatch moderno para rotina e esporte.", "Tela colorida; notificações; monitoramento", 399.90, 329.90, 12, 4, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85"],
    ["Teclado Mecânico RGB", "Informática", "Eletro Prime", "EP-KEY-001", "Teclado mecânico com iluminação RGB.", "USB; switches mecânicos; RGB", 299.90, 249.90, 9, 3, "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85"],
    ["Caixa de Som Bluetooth", "Áudio", "Eletro Prime", "EP-SOUND-001", "Caixa portátil para ambientes internos e externos.", "Bluetooth; bateria recarregável", 259.90, 219.90, 20, 5, "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85"]
  ];
  for (const p of demo) insert.run(...p);
}

const countBanners = db.prepare("SELECT COUNT(*) AS c FROM banners").get().c;
if (!countBanners) {
  const insert = db.prepare(`
    INSERT INTO banners (title, subtitle, button_text, link, media, media_type, active, sort_order)
    VALUES (?, ?, ?, ?, ?, 'image', 1, ?)
  `);
  insert.run("Tecnologia para o seu lar", "Ofertas especiais em eletrônicos", "Ver ofertas", "#ofertas",
    "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=1600&q=85", 1);
  insert.run("Seu próximo upgrade está aqui", "Produtos selecionados para você", "Comprar agora", "#produtos",
    "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1600&q=85", 2);
  insert.run("Áudio, games e acessórios", "Novidades na Eletro Prime", "Explorar", "#categorias",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1600&q=85", 3);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safe = Date.now() + "-" + Math.random().toString(36).slice(2, 9) + ext;
      cb(null, safe);
    }
  }),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/webm", "video/quicktime"
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

function adminOnly(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: "Não autorizado" });
  next();
}

app.get("/api/products", (req, res) => {
  const q = String(req.query.q || "").trim();
  const category = String(req.query.category || "").trim();
  const sort = String(req.query.sort || "relevant");
  let sql = "SELECT * FROM products WHERE active = 1";
  const params = [];
  if (q) {
    sql += " AND (name LIKE ? OR category LIKE ? OR brand LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (sort === "price_asc") sql += " ORDER BY COALESCE(sale_price, price) ASC";
  else if (sort === "price_desc") sql += " ORDER BY COALESCE(sale_price, price) DESC";
  else if (sort === "new") sql += " ORDER BY id DESC";
  else sql += " ORDER BY id DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get("/api/categories", (_, res) => {
  res.json(db.prepare("SELECT DISTINCT category FROM products WHERE active=1 ORDER BY category").all().map(x => x.category));
});

app.get("/api/banners", (_, res) => {
  res.json(db.prepare("SELECT * FROM banners WHERE active=1 ORDER BY sort_order, id").all());
});

app.post("/api/register", async (req, res) => {

  try {

    const {
      name,
      cpf,
      phone,
      email,
      password
    } = req.body || {};

    if (!name || !cpf || !phone || !email || !password) {
      return res.status(400).json({
        error: "Preencha todos os campos."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "A senha deve ter pelo menos 6 caracteres."
      });
    }

    const existingEmail = db
      .prepare("SELECT id FROM customers WHERE email = ?")
      .get(email.trim().toLowerCase());

    if (existingEmail) {
      return res.status(409).json({
        error: "Este e-mail já está cadastrado."
      });
    }

    const existingCpf = db
      .prepare("SELECT id FROM customers WHERE cpf = ?")
      .get(cpf.trim());

    if (existingCpf) {
      return res.status(409).json({
        error: "Este CPF já está cadastrado."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO customers
      (name, cpf, phone, email, password)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      cpf.trim(),
      phone.trim(),
      email.trim().toLowerCase(),
      hashedPassword
    );

    res.status(201).json({
      success: true,
      customer: {
        id: result.lastInsertRowid,
        name: name.trim(),
        email: email.trim().toLowerCase()
      }
    });

  } catch (error) {

    console.error("Erro ao cadastrar cliente:", error);

    res.status(500).json({
      error: "Não foi possível criar sua conta."
    });

  }

});
app.post("/api/login", async (req, res) => {

  try {

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Informe seu e-mail e sua senha."
      });
    }

    const customer = db
      .prepare(`
        SELECT id, name, email, password
        FROM customers
        WHERE email = ?
      `)
      .get(email.trim().toLowerCase());

    if (!customer) {
      return res.status(401).json({
        error: "E-mail ou senha incorretos."
      });
    }

    const passwordOk = await bcrypt.compare(
      password,
      customer.password
    );

    if (!passwordOk) {
      return res.status(401).json({
        error: "E-mail ou senha incorretos."
      });
    }

    req.session.customer = {
      id: customer.id,
      name: customer.name,
      email: customer.email
    };

    res.json({
      success: true,
      customer: req.session.customer
    });

  } catch (error) {

    console.error("Erro ao fazer login:", error);

    res.status(500).json({
      error: "Não foi possível fazer login."
    });

  }

});
app.get("/api/customer/me", (req, res) => {

  if (!req.session.customer) {
    return res.status(401).json({
      error: "Cliente não está logado."
    });
  }

  const customer = db
    .prepare(`
      SELECT id, name, cpf, phone, email
      FROM customers
      WHERE id = ?
    `)
    .get(req.session.customer.id);

  if (!customer) {
    return res.status(404).json({
      error: "Cliente não encontrado."
    });
  }

  res.json({
    customer
  });

});
// ================= FAVORITOS =================

app.get("/api/favorites", (req, res) => {

  if (!req.session.customer) {
    return res.status(401).json({
      error: "Faça login para acessar seus favoritos."
    });
  }

  const favorites = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.price,
      p.sale_price,
      p.image,
      p.category,
      p.brand
    FROM favorites f
    INNER JOIN products p
      ON p.id = f.product_id
    WHERE f.customer_id = ?
    ORDER BY f.created_at DESC
  `).all(req.session.customer.id);

  res.json({
    favorites
  });

});


app.post("/api/favorites", (req, res) => {

  if (!req.session.customer) {
    return res.status(401).json({
      error: "Faça login para salvar favoritos."
    });
  }

  const { product_id } = req.body;

  if (!product_id) {
    return res.status(400).json({
      error: "Produto não informado."
    });
  }

  const product = db
    .prepare("SELECT id FROM products WHERE id = ?")
    .get(product_id);

  if (!product) {
    return res.status(404).json({
      error: "Produto não encontrado."
    });
  }

  const existing = db
    .prepare(`
      SELECT id
      FROM favorites
      WHERE customer_id = ?
      AND product_id = ?
    `)
    .get(
      req.session.customer.id,
      product_id
    );

  if (existing) {

    db.prepare(`
      DELETE FROM favorites
      WHERE customer_id = ?
      AND product_id = ?
    `).run(
      req.session.customer.id,
      product_id
    );

    return res.json({
      favorited: false
    });

  }

  db.prepare(`
    INSERT INTO favorites (
      customer_id,
      product_id
    )
    VALUES (?, ?)
  `).run(
    req.session.customer.id,
    product_id
  );

  res.json({
    favorited: true
  });

});

app.post("/api/admin/login", async (req, res) => {
  const email = String(req.body.email || "");;
  const password = String(req.body.password || "");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@eletroprime.com.br";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }
  req.session.admin = { email };
  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/admin/me", (req, res) => {
  res.json({ authenticated: !!req.session.admin, email: req.session.admin?.email || null });
});

app.get("/api/admin/products", adminOnly, (_, res) => {
  res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all());
});

app.post("/api/admin/products", adminOnly, (req, res) => {
  const p = req.body || {};
  if (!p.name || !p.category) return res.status(400).json({ error: "Nome e categoria são obrigatórios." });
  const result = db.prepare(`
    INSERT INTO products
    (name, category, brand, sku, description, specs, price, sale_price, stock, min_stock, image, video, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    p.name, p.category, p.brand || "", p.sku || "", p.description || "", p.specs || "",
    Number(p.price || 0), p.sale_price === "" || p.sale_price == null ? null : Number(p.sale_price),
    Number(p.stock || 0), Number(p.min_stock || 0), p.image || "", p.video || "", p.active === false ? 0 : 1
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put("/api/admin/products/:id", adminOnly, (req, res) => {
  const p = req.body || {};
  db.prepare(`
    UPDATE products SET
      name=?, category=?, brand=?, sku=?, description=?, specs=?,
      price=?, sale_price=?, stock=?, min_stock=?, image=?, video=?, active=?
    WHERE id=?
  `).run(
    p.name, p.category, p.brand || "", p.sku || "", p.description || "", p.specs || "",
    Number(p.price || 0), p.sale_price === "" || p.sale_price == null ? null : Number(p.sale_price),
    Number(p.stock || 0), Number(p.min_stock || 0), p.image || "", p.video || "", p.active ? 1 : 0,
    req.params.id
  );
  res.json({ ok: true });
});

app.delete("/api/admin/products/:id", adminOnly, (req, res) => {
  db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/banners", adminOnly, (_, res) => {
  res.json(db.prepare("SELECT * FROM banners ORDER BY sort_order, id").all());
});

app.post("/api/admin/banners", adminOnly, (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: "Título obrigatório." });
  const result = db.prepare(`
    INSERT INTO banners (title, subtitle, button_text, link, media, media_type, active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.title, b.subtitle || "", b.button_text || "Comprar agora", b.link || "#",
    b.media || "", b.media_type || "image", b.active ? 1 : 0, Number(b.sort_order || 0)
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put("/api/admin/banners/:id", adminOnly, (req, res) => {
  const b = req.body || {};
  db.prepare(`
    UPDATE banners SET title=?, subtitle=?, button_text=?, link=?, media=?, media_type=?, active=?, sort_order=?
    WHERE id=?
  `).run(
    b.title, b.subtitle || "", b.button_text || "Comprar agora", b.link || "#",
    b.media || "", b.media_type || "image", b.active ? 1 : 0, Number(b.sort_order || 0),
    req.params.id
  );
  res.json({ ok: true });
});

app.delete("/api/admin/banners/:id", adminOnly, (req, res) => {
  db.prepare("DELETE FROM banners WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/orders", adminOnly, (_, res) => {
  res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all());
});

app.put("/api/admin/orders/:id", adminOnly, (req, res) => {
  const statuses = ["Aguardando pagamento", "Pagamento aprovado", "Em preparação", "Enviado", "Entregue", "Cancelado"];
  if (!statuses.includes(req.body.status)) return res.status(400).json({ error: "Status inválido." });
  db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status, req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/upload", adminOnly, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Arquivo inválido." });
  res.json({
    url: `/uploads/${req.file.filename}`,
    type: req.file.mimetype.startsWith("video/") ? "video" : "image"
  });
});

app.get("/api/admin/stats", adminOnly, (_, res) => {
  const products = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  const orders = db.prepare("SELECT COUNT(*) c FROM orders").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) v FROM orders WHERE status != 'Cancelado'").get().v;
  const lowStock = db.prepare("SELECT COUNT(*) c FROM products WHERE stock <= min_stock").get().c;
  res.json({ products, orders, revenue, lowStock });
});

app.get("/admin", (_, res) => {
  res.sendFile(path.join(ROOT, "public", "admin.html"));
});


app.post("/api/orders", (req, res) => {
  const {
    customer_name,
    email,
    total,
    payment_method,
    items
  } = req.body || {};

  if (
    !customer_name ||
    !email ||
    !Number.isFinite(Number(total)) ||
    !payment_method ||
    !Array.isArray(items) ||
    !items.length
  ) {
    return res.status(400).json({
      error: "Dados do pedido incompletos."
    });
  }

  const allowed = ["pix", "credit", "debit"];

  if (!allowed.includes(payment_method)) {
    return res.status(400).json({
      error: "Método de pagamento inválido."
    });
  }

  const result = db.prepare(`
    INSERT INTO orders (
      customer_name,
      email,
      total,
      payment_method,
      items_json
    )
    VALUES (?, ?, ?, ?, ?)
  `).run(
    customer_name,
    email,
    Number(total),
    payment_method,
    JSON.stringify(items)
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    status: "Aguardando pagamento",
    message: "Pedido criado."
  });
});
app.post("/api/mercadopago/preference", async (req, res) => {
  try {
    const { items } = req.body || {};

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        error: "Nenhum produto foi enviado."
      });
    }

    const preference = new Preference(mpClient);

    const response = await preference.create({
      body: {
        items: items.map(item => ({
          id: String(item.id),
          title: String(item.title),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          currency_id: "BRL"
        }))
      }
    });

    res.json({
      id: response.id,
      init_point: response.init_point
    });

  } catch (error) {
    console.error("Erro ao criar preferência Mercado Pago:", error);

    res.status(500).json({
      error: "Não foi possível criar o pagamento."
    });
  }
});

app.put("/api/account/password", async (req, res) => {
  try {
    if (!req.session.customer) {
      return res.status(401).json({
        error: "Você precisa estar logado."
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: "Preencha todos os campos."
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: "A confirmação da nova senha não confere."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "A nova senha deve ter pelo menos 6 caracteres."
      });
    }

    const customer = db.prepare(`
      SELECT id, password
      FROM customers
      WHERE id = ?
    `).get(req.session.customer.id);

    if (!customer) {
      return res.status(404).json({
        error: "Cliente não encontrado."
      });
    }

    const passwordOk = await bcrypt.compare(
      currentPassword,
      customer.password
    );

    if (!passwordOk) {
      return res.status(401).json({
        error: "A senha atual está incorreta."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.prepare(`
      UPDATE customers
      SET password = ?
      WHERE id = ?
    `).run(hashedPassword, customer.id);

    res.json({
      success: true,
      message: "Senha alterada com sucesso!"
    });

  } catch (error) {
    console.error("Erro ao alterar senha:", error);

    res.status(500).json({
      error: "Não foi possível alterar a senha."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Eletro Prime rodando em http://localhost:${PORT}`);
});
