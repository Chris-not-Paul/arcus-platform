import {
  upsertUser,
} from "../server/userStore.js";
import { validRoles } from "../server/accessPolicy.js";

function readArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) =>
    item.startsWith(prefix)
  );

  return arg ? arg.slice(prefix.length) : fallback;
}

const username = readArg("username");
const password = readArg("password");
const role = readArg("role", "professional");

if (!username || !password) {
  console.error(
    `Usage: node scripts/create-user.js --username=name --password=secret [--role=${validRoles.join("|")}]`
  );
  process.exit(1);
}

if (!validRoles.includes(role)) {
  console.error(
    `Invalid role. Use one of: ${validRoles.join(", ")}`
  );
  process.exit(1);
}

const user = await upsertUser({
  password,
  role,
  username,
});

console.log(
  `ARCUS user ${user.created ? "created" : "updated"}: ${user.username} (${user.role})`
);
