
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// API Key is securely accessed from Vercel's environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { base64Image, mimeType, userPrompt } = req.body;

    if (!base64Image || !mimeType) {
        return res.status(400).json({ error: 'Missing base64Image or mimeType in request body' });
    }

    const basePrompt = 'This image has blank areas (black padding). Please fill these blank areas with content that seamlessly extends the original image, maintaining the same style and context. Do not alter the original part of the image. Generate a new image with the exact same dimensions.';
    const finalPrompt = userPrompt ? `${basePrompt} The user has provided additional instructions: "${userPrompt}"` : basePrompt;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType: mimeType,
              },
            },
            {
              text: finalPrompt,
            },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });
  
      const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
  
      if (imagePart && imagePart.inlineData) {
        const newBase64 = imagePart.inlineData.data;
        const newMimeType = imagePart.inlineData.mimeType;
        const finalImageSrc = `data:${newMimeType};base64,${newBase64}`;
        return res.status(200).json({ finalImageSrc });
      } else {
        const textResponse = response.text;
        console.error("API response text:", textResponse);
        return res.status(500).json({ error: "AI did not return an image. It might have refused the request.", details: textResponse || "" });
      }

  } catch (error: any) {
    console.error("Error in API route:", error);
    return res.status(500).json({ error: "Failed to generate image with AI.", details: error.message });
  }
}
