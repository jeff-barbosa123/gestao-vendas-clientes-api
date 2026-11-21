// Descricao amigavel do dispositivo a partir do User-Agent (sem dependencias).
function describeDevice(ua) {
  const s = String(ua || "");
  if (!s) return "Dispositivo desconhecido";
  let browser = "Navegador";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s)) browser = "Safari";
  let os = "";
  if (/Windows/.test(s)) os = "Windows";
  else if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iOS/.test(s)) os = "iOS";
  else if (/Mac OS X|Macintosh/.test(s)) os = "macOS";
  else if (/Linux/.test(s)) os = "Linux";
  return os ? browser + " em " + os : browser;
}

module.exports = { describeDevice };
