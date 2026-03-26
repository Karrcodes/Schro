import { connect } from "framer-api";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const FRAMER_API_TOKEN = process.env.FRAMER_API_TOKEN;
const fullUrl = "https://framer.com/projects/Studio-Karrtesian--ybvHR8xck0Rwd2IVEVe7-8W7cX";
const uuidOnly = "ybvHR8xck0Rwd2IVEVe7-8W7cX";
const nameAndUuid = "Studio-Karrtesian--ybvHR8xck0Rwd2IVEVe7-8W7cX";

async function test(id, label) {
    try {
        console.log(`Testing [${label}]: ${id}`);
        const framer = await connect(id, FRAMER_API_TOKEN);
        const info = await framer.getProjectInfo();
        console.log(`✅ Success [${label}]: ${info.name}`);
        await framer.disconnect();
    } catch (e) {
        console.log(`❌ Failed [${label}]: ${e.message}`);
    }
}

async function run() {
    await test(fullUrl, "Full URL");
    await test(uuidOnly, "UUID Only");
    await test(nameAndUuid, "Name--UUID");
}

run();
