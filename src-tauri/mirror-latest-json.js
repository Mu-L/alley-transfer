import fs from "fs";
import path from "path";

const run = async () => {
  const text = process.env.TEXT;
  const mirror = text.replaceAll(
    "https://github.com/",
    "https://kkgithub.com/",
  );

  const dir = process.cwd();

  const filepath = path.join(dir, "latest.json");

  console.log("mirror latest json path: ", filepath);

  fs.writeFileSync(filepath, mirror);
};

run();
