const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function test() {
    const notificationText = `Revolut\nLavazza, Cardiff Wales\n£6.00`;
    const prompt = `You are a financial parsing assistant. The user has provided an Apple Pay / Revolut transaction notification text.
Extract the transaction details and determine the correct budget pocket and spending category.

Available Pockets (ONLY choose one of these two):
1. "Daily Essentials 🍔" (for groceries, ALL food and drinks, coffee shops (e.g. Lavazza, Starbucks), convenience stores, taxis, ride booking apps, pharmacies)
2. "Fun 🛍️" (for clothes shopping, Amazon, electronics, expressly sit-down restaurants, pubs, takeaways, entertainment)

Available Categories (ONLY choose one): 'food', 'transport', 'housing', 'shopping', 'entertainment', 'utilities', 'health', 'other'

Notification Text:
"""
${notificationText}
"""

Return ONLY a valid JSON object with the following keys, no markdown, no explanation:
{
  "amount": number (extracted numerical amount, e.g. 1.35),
  "merchant": string (clean merchant name without location/city/country, e.g. "Tesco Express"),
  "target_pocket": string (must be exactly "Daily Essentials 🍔" or "Fun 🛍️"),
  "category": string (one of the allowed categories)
}`;

    console.log("Testing Prompt...");
    const result = await model.generateContent(prompt);
    console.log("Response:", result.response.text());

    const parsed = JSON.parse(result.response.text().replace(/```json?/g, '').replace(/```/g, '').trim());

    // 1. Get Pocket
    const { data: pocketData } = await supabase
        .from('fin_pockets')
        .select('id, balance')
        .eq('profile', 'personal')
        .ilike('name', parsed.target_pocket)
        .single();

    console.log("Resolved Pocket:", pocketData);

    // 2. Insert Transaction
    const transactionData = {
        amount: parsed.amount,
        description: parsed.merchant,
        date: new Date().toISOString(),
        type: 'spend',
        category: parsed.category,
        pocket_id: pocketData ? pocketData.id : null,
        profile: 'personal',
    };

    const { data, error } = await supabase.from('fin_transactions').insert(transactionData).select();
    console.log("Inserted Transaction:", data, error);
}

test().catch(console.error);
