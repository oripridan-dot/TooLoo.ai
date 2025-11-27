import "dotenv/config";
import { visualCortex } from "../src/cortex/imagination/visual-cortex.js";
import { visualValidator } from "../src/cortex/imagination/validator.js";

async function testVisualLoop() {
  console.log("🧪 Testing Visual Feedback Loop...");

  // 1. Test Validator Directly
  console.log("\n1. Testing Validator Logic:");
  const invalidComponent = JSON.stringify({ type: "div" }); // Missing props
  const val1 = await visualValidator.validate({
    type: "component",
    data: invalidComponent,
  });
  console.log(
    "Invalid Component Check:",
    val1.isValid === false ? "✅ Passed" : "❌ Failed",
  );
  if (!val1.isValid) console.log("   Issues:", val1.issues);

  const validComponent = JSON.stringify({
    type: "button",
    props: { className: "btn" },
    children: ["Click me"],
  });
  const val2 = await visualValidator.validate({
    type: "component",
    data: validComponent,
  });
  console.log(
    "Valid Component Check:",
    val2.isValid === true ? "✅ Passed" : "❌ Failed",
  );

  // 2. Test Visual Cortex Design Loop (Integration)
  console.log("\n2. Testing Visual Cortex Design Loop (Live API):");
  try {
    const result = await visualCortex.design(
      "A blue primary button",
      "component",
    );
    console.log("Result:", JSON.stringify(result, null, 2));

    if (result.type && result.props) {
      console.log("✅ Live Generation Passed Validation");
    } else {
      console.log("❌ Live Generation Failed Validation Structure");
    }
  } catch (e) {
    console.error("❌ Live Test Failed:", e);
  }

  process.exit(0);
}

testVisualLoop();
