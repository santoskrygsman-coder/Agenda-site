import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (relPath) =>
  fs.readFileSync(path.join(ROOT, relPath), "utf8");

test("1. Viewport, Safe Area & Global Mobile-Only CSS Rules (320px - 430px)", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /viewportFit:\s*"cover"/, "layout.tsx deve ter viewportFit: cover");
  assert.match(layout, /width:\s*"device-width"/, "layout.tsx deve ter width: device-width");

  const css = read("src/app/globals.css");
  assert.match(css, /overflow-x:\s*hidden/, "globals.css deve bloquear rolagem horizontal indesejada");
  assert.match(css, /touch-action:\s*manipulation/, "globals.css deve incluir touch-action: manipulation");
  assert.match(css, /env\(safe-area-inset-top/, "globals.css deve respeitar safe-area-inset-top");
  assert.match(css, /env\(safe-area-inset-bottom/, "globals.css deve respeitar safe-area-inset-bottom");

  const container = read("src/components/ui/MobileContainer.tsx");
  assert.match(container, /max-w-\[430px\]/, "MobileContainer deve suportar larguras até 430px");
  assert.match(container, /min-h-dvh/, "MobileContainer deve usar min-h-dvh");
});

test("2. Touch Targets (>= 44px) & Navegação Vertical / Inferior em 320px-430px", () => {
  const header = read("src/components/ui/PageHeader.tsx");
  assert.match(header, /w-11 h-11/, "Botões do PageHeader devem ter 44x44px (w-11 h-11)");

  const bottomNav = read("src/components/ui/BottomNavAdmin.tsx");
  assert.match(bottomNav, /grid-cols-5/, "BottomNavAdmin deve usar grid-cols-5 para caber em 320px sem overflow");
  assert.match(bottomNav, /min-h-\[48px\]/, "Itens do BottomNavAdmin devem ter min-h-[48px]");

  const primaryBtn = read("src/components/ui/PrimaryButton.tsx");
  assert.match(primaryBtn, /min-h-\[48px\]/, "PrimaryButton deve ter min-h-[48px]");

  const formField = read("src/components/ui/FormField.tsx");
  assert.match(formField, /min-h-\[48px\]/, "FormField deve ter min-h-[48px]");
});

test("3. Formulários Mobile-First (Teclado Adequado, Modais Roláveis e Validação Inline)", () => {
  const clientData = read("src/app/agendar/dados/page.tsx");
  assert.match(clientData, /inputMode="tel"/, "Campo WhatsApp da cliente deve usar inputMode='tel'");
  assert.match(clientData, /inputMode="email"/, "Campo E-mail da cliente deve usar inputMode='email'");
  assert.match(clientData, /enterKeyHint=/, "Formulário da cliente deve configurar enterKeyHint");

  const adminAgenda = read("src/app/admin/agenda/page.tsx");
  assert.match(adminAgenda, /max-h-\[88dvh\] overflow-y-auto/, "Modal de novo agendamento deve ser rolável para o teclado não esconder o botão salvar");
  assert.match(adminAgenda, /inputMode="tel"/, "Modal de novo agendamento deve usar inputMode='tel'");

  const adminClientes = read("src/app/admin/clientes/page.tsx");
  assert.match(adminClientes, /max-h-\[88dvh\] overflow-y-auto/, "Modal de nova cliente deve ter max-h-[88dvh] overflow-y-auto");
  assert.match(adminClientes, /maskBrazilianPhone/, "Modal de nova cliente deve aplicar máscara de telefone");

  const adminServicos = read("src/app/admin/servicos/page.tsx");
  assert.match(adminServicos, /inputMode="decimal"/, "Campo de preço de serviço deve usar inputMode='decimal'");

  const adminFinanceiro = read("src/app/admin/financeiro/page.tsx");
  assert.match(adminFinanceiro, /inputMode="decimal"/, "Campo de valor de despesa deve usar inputMode='decimal'");
  assert.match(adminFinanceiro, /max-h-\[88dvh\] overflow-y-auto/, "Modal de despesa deve ter max-h-[88dvh] overflow-y-auto");

  const adminMais = read("src/app/admin/mais/page.tsx");
  assert.match(adminMais, /inputMode="tel"/, "Configuração de WhatsApp deve usar inputMode='tel'");
  assert.match(adminMais, /inputMode="numeric"/, "Campos numéricos de configuração devem usar inputMode='numeric'");
});

test("4. Preservação Integral da Identidade Visual (Paleta e Tipografia)", () => {
  const css = read("src/app/globals.css");
  const container = read("src/components/ui/MobileContainer.tsx");
  const home = read("src/app/page.tsx");
  assert.match(container, /#F4EAE3/i, "Paleta bege/creme (#F4EAE3) preservada");
  assert.match(home, /#FAF5F1/i, "Paleta marfim (#FAF5F1) preservada");
  assert.match(home, /#B87472/i, "Paleta rosé queimado (#B87472) preservada");
  assert.match(css, /#2D1C18/i, "Paleta marrom-escuro (#2D1C18) preservada");
  assert.match(css, /Playfair Display/, "Tipografia Playfair Display preservada");
  assert.match(css, /Plus Jakarta Sans/, "Tipografia Plus Jakarta Sans preservada");
});

test("5. Renderização HTTP de Todas as Telas da Cliente e Login (HTTP 200)", async () => {
  const routes = [
    "/",
    "/servicos",
    "/agendar/data",
    "/agendar/dados",
    "/agendar/resumo",
    "/login",
  ];
  for (const route of routes) {
    const res = await fetch(`http://localhost:3000${route}`);
    assert.equal(res.status, 200, `Rota ${route} deve responder HTTP 200`);
    const html = await res.text();
    assert.ok(html.includes("max-w-[430px]"), `Rota ${route} deve renderizar o MobileContainer (max-w-[430px])`);
  }
});
