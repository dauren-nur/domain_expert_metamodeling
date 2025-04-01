// Example of how to use the InstanceLoader in a Node.js environment
import InstanceLoader from "./InstanceLoader.js";
import fs from "fs/promises";
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";
async function loadAndProcessInstance(filePath) {
  const XMLdata = await fs.readFile(filePath, "utf8");
  const parser = new XMLParser();
  let jObj = parser.parse(XMLdata);

//   const builder = new XMLBuilder();
//   const xmlContent = builder.build(jObj);
  console.log("XML Content: ", jObj);
}

// Run the example
loadAndProcessInstance(
  "C:/Users/daure/code/domain_expert_metamodeling/src/test_files/instance.xmi"
);
