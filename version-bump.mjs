import { readFileSync, writeFileSync } from "fs";

// Read package.json
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const targetVersion = packageJson.version;

// Read manifest.json
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

// Update versions.json
let versions = {};
try {
  const versionsData = readFileSync("versions.json", "utf8");
  versions = JSON.parse(versionsData);
} catch (e) {
  console.log("Creating new versions.json");
}
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, 2) + "\n");

console.log(`Bumped version to ${targetVersion}`);
