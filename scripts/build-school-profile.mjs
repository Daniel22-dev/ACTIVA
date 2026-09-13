import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const buildTime = process.env.GHRAB_BUILD_TIME || new Date().toISOString();
const sourceDist = path.join(root, "dist");
const targetDist = path.join(root, "dist-school-server");
if (!fs.existsSync(sourceDist)) throw new Error("Chybí dist/. Nejprve spusťte standardní build.");
fs.rmSync(targetDist, { recursive: true, force: true });
fs.cpSync(sourceDist, targetDist, { recursive: true });

// Source QA pages belong to the developer/static artifact, not to the school-server runtime deployment.
for (const rel of ["tests", "test-results", "qa-results"]) {
  fs.rmSync(path.join(targetDist, rel), { recursive: true, force: true });
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function trailingSlash(value) { return String(value || "/").replace(/\/+$/, "") + "/"; }

let files = walk(targetDist);
const schoolProfiles = files.filter((file) => file.endsWith(`${path.sep}config${path.sep}deployment.school-server.json`));
if (!schoolProfiles.length) throw new Error("Build neobsahuje config/deployment.school-server.json.");
for (const profile of schoolProfiles) fs.copyFileSync(profile, path.join(path.dirname(profile), "deployment.json"));

files = walk(targetDist);
for (const runtimeProfile of files.filter((file) => file.endsWith(`${path.sep}runtime-config.school-server.js`))) {
  fs.copyFileSync(runtimeProfile, path.join(path.dirname(runtimeProfile), "runtime-config.js"));
}
for (const manifestPath of files.filter((file) => file.endsWith(`${path.sep}manifest.webmanifest`))) {
  const manifest = readJson(manifestPath);
  manifest.id = "./";
  manifest.start_url = "./";
  manifest.scope = "./";
  writeJson(manifestPath, manifest);
}

const deployment = readJson(path.join(path.dirname(schoolProfiles[0]), "deployment.json"));
if (!deployment.appId || deployment.profile !== "school-server" || deployment.authMode !== "server-session") {
  throw new Error("Aktivní school-server deployment kontrakt není úplný.");
}
const appBaseUrl = trailingSlash(deployment.appBaseUrl || deployment.appBaseUrls?.[deployment.appId]);
if (!appBaseUrl.startsWith("/")) throw new Error("School-server appBaseUrl musí být same-origin absolutní cesta.");

for (const manifestPath of files.filter((file) => file.endsWith(`${path.sep}studio-manifest.json`))) {
  const manifest = readJson(manifestPath);
  manifest.deploymentProfile = "school-server";
  manifest.serverReadyPhase = "prepared-not-connected";
  manifest.launchUrl = appBaseUrl;
  manifest.manualUrl = `${appBaseUrl}manual/`;
  manifest.capabilities = (manifest.capabilities || []).filter((item) => item !== "internal-self-tests");
  if (manifest.description?.cs) manifest.description.cs = manifest.description.cs.replace(/,? interní testovací centrum/iu, "");
  if (manifest.description?.en) manifest.description.en = manifest.description.en.replace(/,? an internal test centre/iu, "");
  if (manifest.aiCore?.status === "integrated-p1" || manifest.aiCore?.coreVersion) {
    manifest.aiCore.operationsManifestUrl = `${appBaseUrl}ai-operations.json`;
  } else if (manifest.aiCore && typeof manifest.aiCore === "object") {
    delete manifest.aiCore.operationsManifestUrl;
  }
  writeJson(manifestPath, manifest);
}

for (const file of walk(targetDist)) {
  if (file.endsWith('.html')) {
    let text = fs.readFileSync(file, 'utf8');
    text = text.replace(/<a\b[^>]*href=(['"])[^'"]*tests\/[^'"]*\1[^>]*>([\s\S]*?)<\/a>/gi, '$2');
    fs.writeFileSync(file, text);
  }
}
const schoolAppJs = path.join(targetDist, 'app.js');
if (fs.existsSync(schoolAppJs)) {
  let text = fs.readFileSync(schoolAppJs, 'utf8');
  text = text.replace('testsUrl:resolveProductionTestsUrl()', 'testsUrl:null');
  fs.writeFileSync(schoolAppJs, text);
}

for (const stale of files.filter((file) => file.endsWith(`${path.sep}deployment.school-server-p0.json`))) {
  fs.rmSync(stale, { force: true });
}

const pkg = readJson(path.join(root, "package.json"));
writeJson(path.join(targetDist, "server-ready-build-info.json"), {
  schema: "ghrab-server-ready-build-v1",
  app: pkg.name,
  appId: deployment.appId,
  version: pkg.version,
  phase: "prepared-not-connected",
  profile: "school-server",
  builtAt: buildTime,
  activeAuthMode: deployment.authMode,
  activeAiTransport: deployment.aiTransport,
  telemetryMode: deployment.telemetryMode,
  appBaseUrl,
  apiBaseUrl: deployment.apiBaseUrl,
  containsSecrets: false,
  serverConnected: deployment.features?.schoolServerConnected === true,
  liveServerValidationRequired: deployment.features?.liveServerValidationRequired === true,
  localProviderKeysAllowed: false,
  serverSessionReady: deployment.features?.serverSessionReady === true,
  schoolGatewayReady: deployment.aiTransport === "school-gateway" ? deployment.features?.schoolGatewayReady === true : null,
  aiCoreVersion: deployment.aiTransport === "school-gateway" ? "1.0.0" : null,
  contractVersion: deployment.aiTransport === "school-gateway" ? "1" : null,
});
console.log(`${pkg.name} ${pkg.version}: dist-school-server/ sestaven jako připravený same-origin school-server profil; živý server není tímto buildem potvrzen.`);
