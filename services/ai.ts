
import { GoogleGenAI, Type } from "@google/genai";
import { CategoryItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ScannedReceipt {
  amount: number | null;
  date: string | null;
  isExpense: boolean;
  type: string | null;
  category: string | null;
}

export const AIService = {
  scanReceipt: async (base64Image: string, availableCategories: CategoryItem[]): Promise<ScannedReceipt> => {
    try {
      // Prepare a simplified list of categories for the model to choose from
      const categoriesContext = availableCategories.map(c => 
        `{ "type": "${c.type}", "category": "${c.category}", "isExpense": ${c.isExpense} }`
      ).join(",\n");

      const prompt = `
        Analyze this receipt image and extract the following information in JSON format:
        1. "amount": The total amount of the transaction (numeric, positive).
        2. "date": The date of the transaction in 'YYYY-MM-DD' format.
        3. "isExpense": Boolean, true if it's a receipt/expense, false if it looks like income.
        4. "type" & "category": Choose the BEST matching entry from the provided list below based on the receipt content. If unsure, leave null.

        Categories List to choose from:
        [
          ${categoriesContext}
        ]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, nullable: true },
              date: { type: Type.STRING, nullable: true },
              isExpense: { type: Type.BOOLEAN },
              type: { type: Type.STRING, nullable: true },
              category: { type: Type.STRING, nullable: true },
            }
          }
        }
      });

      const result = JSON.parse(response.text);
      return {
          amount: result.amount || null,
          date: result.date || null,
          isExpense: result.isExpense ?? true, // Default to expense if unsure
          type: result.type || null,
          category: result.category || null
      };

    } catch (error) {
      console.error("Error scanning receipt with Gemini:", error);
      throw new Error("Falha ao analisar o recibo.");
    }
  }
};
