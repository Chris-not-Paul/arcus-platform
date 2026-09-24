import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

assert.equal(fs.existsSync(dist), true, "dist must exist before boundary validation");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const files = walk(dist);
const relative = (file) => path.relative(dist, file).replaceAll("\\", "/");

const forbiddenFileNames = [
  /AdminPage/i,
  /CollapseIntelligencePage/i,
  /PremiumAnalyticsPage/i,
  /ProfessionalAccountPage/i,
  /ProfessionalLoginPage/i,
];

const forbiddenSignatures = [
  "/api/auth/",
  "/api/contributions",
  "/api/professional/",
  "collapse-intelligence-results",
  "failure-learning-feedback",
  "private-data",
  "professionalHazardExposurePoint",
  "professionalMitigationIntelligence",
  "requestProfessionalCancellation",
];

for (const file of files) {
  const name = relative(file);

  assert.equal(
    name.endsWith(".map"),
    false,
    `Open deploy must not publish source maps: ${name}`
  );

  for (const pattern of forbiddenFileNames) {
    assert.equal(
      pattern.test(name),
      false,
      `Open deploy contains a reserved application bundle: ${name}`
    );
  }

  if (!/\.(?:css|html|js|json|txt|xml)$/i.test(name)) continue;

  const content = fs.readFileSync(file, "utf8");
  for (const signature of forbiddenSignatures) {
    assert.equal(
      content.includes(signature),
      false,
      `Open deploy leaks reserved implementation signature ${signature} in ${name}`
    );
  }
}

const rightsPage = files.find((file) => /assets\/RightsPage-[^/]+\.js$/i.test(relative(file)));
assert.ok(rightsPage, "Open deploy must include the public rights and reuse page");

const sitemap = fs.readFileSync(path.join(dist, "sitemap.xml"), "utf8");
assert.match(sitemap, /https:\/\/www\.arcusbridges\.org\/rights/);

console.log(
  `ARCUS Open code boundary passed: ${files.length} deploy files inspected; reserved routes, endpoints, implementation signatures and source maps excluded.`
);
