import Storage from "@google-cloud/storage";
import path from "path";

const __dirname = path.resolve()

const googleCloud = new Storage.Storage({
    keyFilename: path.join(__dirname,"config/rising-field-278708-347ec97a4cea.json"),
    projectId: "rising-field-278708",
  });

export default googleCloud  