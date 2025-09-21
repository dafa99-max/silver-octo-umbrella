
import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// API Key is securely accessed from Netlify's environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This will cause the function to fail safely if the API key is not set
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  try {
    // Netlify functions receive the body as a string, so it needs parsing.
    const body = JSON.parse(event.body || '{}');
    const { base64Image, mimeType, userPrompt } = body;

    if (!base64Image || !mimeType) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing base64Image or mimeType in request body' }),
            headers: { 'Content-Type': 'application/json' },
        };
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
        return {
            statusCode: 200,
            body: JSON.stringify({ finalImageSrc }),
            headers: { 'Content-Type': 'application/json' },
        };
      } else {
        const textResponse = response.text;
        console.error("API response text:", textResponse);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "AI did not return an image. It might have refused the request.", details: textResponse || "" }),
            headers: { 'Content-Type': 'application/json' },
        };
      }

  } catch (error: any) {
    console.error("Error in Netlify function:", error);
    return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to generate image with AI.", details: error.message }),
        headers: { 'Content-Type': 'application/json' },
    };
  }
};

export { handler };
