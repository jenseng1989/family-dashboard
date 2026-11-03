// Kör med: node --test tests/dashboard-session.test.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const crypto = require("node:crypto");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../lib/dashboard-session.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exportsObject = {};
const context = {
  exports: exportsObject, require, Buffer, Date,
  process: { env: { DASHBOARD_SESSION_TOKEN: crypto.randomBytes(32).toString("hex") } },
};
vm.runInNewContext(compiled, context);
const { createDashboardSession, verifyDashboardSession, hasDashboardSession } = exportsObject;

function sign(data) {
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto.createHmac("sha256", context.process.env.DASHBOARD_SESSION_TOKEN)
    .update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

test("ny session är giltig och unik", () => {
  const first = createDashboardSession();
  const second = createDashboardSession();
  assert.equal(verifyDashboardSession(first), true);
  assert.notEqual(first, second);
});
test("manipulerad och osignerad session nekas", () => {
  const token = createDashboardSession();
  assert.equal(verifyDashboardSession(token + "x"), false);
  assert.equal(verifyDashboardSession("nonsens"), false);
  assert.equal(verifyDashboardSession(undefined), false);
});
test("utgången och framtida session nekas", () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(verifyDashboardSession(sign({v:1,iat:now-100,exp:now-1,nonce:"a".repeat(32)})), false);
  assert.equal(verifyDashboardSession(sign({v:1,iat:now+3600,exp:now+7200,nonce:"a".repeat(32)})), false);
});
test("cookie verifieras, saknad cookie nekas", () => {
  const token = createDashboardSession();
  assert.equal(hasDashboardSession(new Request("http://localhost", {headers:{cookie:`family-dashboard-auth=${token}`}})), true);
  assert.equal(hasDashboardSession(new Request("http://localhost")), false);
});
