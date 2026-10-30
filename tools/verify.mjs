import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `node ${args.join(" ")} failed`)
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
assert.ok(manifest.version && manifest.magpie?.page?.file, "package.json needs version and magpie.page.file")
for (const file of [manifest.main, manifest.magpie.page.file, manifest.magpie.page.icon, "README.md", "LICENSE"]) {
  assert.ok(file && !file.split(/[\\/]/).includes("..") && fs.existsSync(path.join(root, file)), `Missing ${file}`)
}
for (const file of [manifest.main, "page/app.js", "verification/run-browser.mjs"]) run(["--check", file])
run(["verification/backend-speed.mjs"])
const html = fs.readFileSync(path.join(root, manifest.magpie.page.file), "utf8")
const dataBuild = html.match(/<html[^>]*\sdata-build="([^"]+)"/)?.[1]
const badge = html.match(/id="build"[^>]*>v([^<]+)</)?.[1]
assert.equal(dataBuild, manifest.version, `page data-build ${dataBuild} does not match package.json ${manifest.version}`)
assert.equal(badge, manifest.version, `page build badge ${badge} does not match package.json ${manifest.version}`)
assert.ok(html.includes('id="tabs"') && html.includes('id="detailTabs"'), "Both cards need range controls")
assert.ok(!/<form\b/i.test(html), "The host sandbox blocks forms")
assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(html), "The host requires external script files")
const app = fs.readFileSync(path.join(root, "page/app.js"), "utf8")
assert.ok(!/\b(?:fetch|WebSocket|EventSource)\s*\(/.test(app), "Page network access is blocked by Magpie")
console.log(`Verified ${manifest.name}@${manifest.version}`)
