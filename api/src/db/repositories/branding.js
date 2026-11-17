const { query } = require("../index");

const COLUMNS = "owner_id, company_name, primary_color, background_color, text_color, (logo_data IS NOT NULL) AS has_logo, logo_mime, logo_version, updated_at";

async function getSettings(ownerId) {
  const r = await query(`SELECT ${COLUMNS} FROM company_settings WHERE owner_id = $1`, [ownerId]);
  return r.rows[0] || null;
}

async function upsertSettings(ownerId, { companyName, primaryColor, backgroundColor, textColor }) {
  const r = await query(
    `INSERT INTO company_settings (owner_id, company_name, primary_color, background_color, text_color)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (owner_id) DO UPDATE
       SET company_name = EXCLUDED.company_name,
           primary_color = EXCLUDED.primary_color,
           background_color = EXCLUDED.background_color,
           text_color = EXCLUDED.text_color,
           updated_at = NOW()
     RETURNING ${COLUMNS}`,
    [ownerId, companyName || null, primaryColor, backgroundColor, textColor]
  );
  return r.rows[0];
}

async function setLogo(ownerId, buffer, mime) {
  const r = await query(
    `INSERT INTO company_settings (owner_id, logo_data, logo_mime, logo_version)
     VALUES ($1,$2,$3,1)
     ON CONFLICT (owner_id) DO UPDATE
       SET logo_data = EXCLUDED.logo_data,
           logo_mime = EXCLUDED.logo_mime,
           logo_version = company_settings.logo_version + 1,
           updated_at = NOW()
     RETURNING ${COLUMNS}`,
    [ownerId, buffer, mime]
  );
  return r.rows[0];
}

async function clearLogo(ownerId) {
  const r = await query(
    `UPDATE company_settings
        SET logo_data = NULL, logo_mime = NULL, logo_version = logo_version + 1, updated_at = NOW()
      WHERE owner_id = $1
      RETURNING ${COLUMNS}`,
    [ownerId]
  );
  return r.rows[0] || null;
}

async function getLogo(ownerId) {
  const r = await query(
    "SELECT logo_data, logo_mime, logo_version FROM company_settings WHERE owner_id = $1 AND logo_data IS NOT NULL",
    [ownerId]
  );
  return r.rows[0] || null;
}

async function deleteSettings(ownerId) {
  await query("DELETE FROM company_settings WHERE owner_id = $1", [ownerId]);
}

module.exports = { getSettings, upsertSettings, setLogo, clearLogo, getLogo, deleteSettings };