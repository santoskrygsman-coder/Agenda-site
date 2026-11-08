import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function run(cmd, options = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    stdio: options.silent ? "pipe" : "inherit",
    encoding: "utf-8",
    ...options,
  });
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const vars = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

async function main() {
  console.log("==============================================================");
  console.log("🚀 AUTOMAÇÃO DE DEPLOY: EMILE LASH DESIGNER -> NETLIFY");
  console.log("==============================================================");

  // 1. Verificar autenticação no Netlify CLI
  console.log("\n▶️  1/4 Verificando autenticação no Netlify CLI...");
  let statusOut = "";
  try {
    statusOut = run("npx netlify-cli status", { silent: true });
  } catch {
    statusOut = "Not logged in";
  }

  if (statusOut.includes("Not logged in")) {
    console.log("🔐 Abrindo navegador para autorizar sua conta Netlify...");
    run("npx netlify-cli login");
  } else {
    console.log("✅ Conta Netlify autenticada.");
  }

  // 2. Garantir site criado e vinculado (.netlify/state.json)
  console.log("\n▶️  2/4 Verificando vínculo do site no Netlify...");
  const statePath = path.join(ROOT, ".netlify", "state.json");
  let siteId = "";
  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
      siteId = state.siteId || "";
    } catch {
      siteId = "";
    }
  }

  let siteUrl = "";
  if (!siteId) {
    console.log("🌐 Criando novo site no Netlify para Emile Lash Designer...");
    const accountsJson = run("npx netlify-cli api listAccountsForUser", {
      silent: true,
    });
    const accounts = JSON.parse(accountsJson);
    const accountSlug = accounts?.[0]?.slug;

    const candidateNames = [
      "emile-lash-designer",
      "emiledesiigner-agenda",
      `emile-lash-${Math.floor(1000 + Math.random() * 9000)}`,
    ];

    let createdSite = null;
    for (const name of candidateNames) {
      try {
        const createCmd = accountSlug
          ? `npx netlify-cli sites:create --name ${name} --account-slug ${accountSlug}`
          : `npx netlify-cli sites:create --name ${name}`;
        run(createCmd);
        break;
      } catch {
        // Tenta próximo nome caso já exista
      }
    }

    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
      siteId = state.siteId || "";
    }

    if (siteId) {
      const siteInfoRaw = run(
        `npx netlify-cli api getSite --data "{\\"site_id\\":\\"${siteId}\\"}"`,
        { silent: true }
      );
      createdSite = JSON.parse(siteInfoRaw);
      siteUrl = createdSite.ssl_url || createdSite.url || "";
    }
  } else {
    const siteInfoRaw = run(
      `npx netlify-cli api getSite --data "{\\"site_id\\":\\"${siteId}\\"}"`,
      { silent: true }
    );
    const siteInfo = JSON.parse(siteInfoRaw);
    siteUrl = siteInfo.ssl_url || siteInfo.url || "";
  }

  console.log(`✅ Site vinculado: ${siteUrl || siteId}`);

  // 3. Sincronizar variáveis de ambiente do .env para o Netlify
  console.log("\n▶️  3/4 Sincronizando variáveis de ambiente de produção no Netlify...");
  const envPath = path.join(ROOT, ".env");
  const envVars = parseEnvFile(envPath);
  if (siteUrl) {
    envVars.NEXTAUTH_URL = siteUrl.replace(/\/+$/, "");
  }

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;
    console.log(`   • Configurando ${key}...`);
    run(`npx netlify-cli env:set ${key} "${value.replace(/"/g, '\\"')}"`, {
      silent: true,
    });
  }
  console.log("✅ Todas as variáveis de ambiente foram sincronizadas no Netlify.");

  // 4. Executar build e deploy em produção
  console.log("\n▶️  4/4 Executando build e deploy de produção no Netlify...");
  run("npx netlify-cli deploy --build --prod --skip-functions-cache");

  console.log("\n==============================================================");
  console.log(`🎉 DEPLOY DE PRODUÇÃO CONCLUÍDO COM SUCESSO!`);
  if (siteUrl) {
    console.log(`🔗 URL Oficial: ${siteUrl}`);
  }
  console.log("==============================================================");
}

main().catch((err) => {
  console.error("❌ Erro no deploy automático:", err.message || err);
  process.exit(1);
});
