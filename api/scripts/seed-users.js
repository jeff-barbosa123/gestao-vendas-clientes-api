const { pool } = require("../src/db");

async function seedUsers() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@negocio.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const otherEmail = process.env.OTHER_USER_EMAIL || "user@negocio.com";
  const otherPassword = process.env.OTHER_USER_PASSWORD || "user123";

  const users = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      email: adminEmail,
      password: adminPassword,
      name: "Admin",
      status: "ATIVO",
      blocked: false,
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      email: otherEmail,
      password: otherPassword,
      name: "User",
      status: "ATIVO",
      blocked: false,
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      email: "placeholder@local",
      password: "placeholder",
      name: "Placeholder User",
      status: "ATIVO",
      blocked: false,
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      email: "bloqueado@teste.com",
      password: "123456",
      name: "Bloqueado",
      status: "BLOQUEADO",
      blocked: true,
    },
  ];

  for (const user of users) {
    await pool.query(
      `INSERT INTO users
        (id, email, password, name, status_usuario, data_ultimo_login, tentativas_falha, blocked, created_at)
       VALUES ($1,$2,$3,$4,$5,NULL,0,$6,NOW())
       ON CONFLICT (id) DO NOTHING`,
      [user.id, user.email, user.password, user.name, user.status, user.blocked]
    );
  }
}

seedUsers()
  .then(() => {
    console.log("Seed users ok");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
