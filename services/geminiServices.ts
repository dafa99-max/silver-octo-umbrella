import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// Assume process.env.API_KEY is available
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this context, we'll throw an error to make it clear.
  console.error("API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const fillImageWithAI = async (base64Image: string, mimeType: string, userPrompt: string): Promise<string> => {
  const basePrompt = 'This image has blank areas (black padding). Please fill these blank areas with content that seamlessly extends the original image, maintaining the same style and context. Do not alter the original part of the image. Generate a new image with the exact same dimensions.';
  const finalPrompt = userPrompt ? `${basePrompt} The user has provided additional instructions: "${userPrompt}"` : basePrompt;
  
  try {
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
      return `data:${newMimeType};base64,${newBase64}`;
    } else {
      const textResponse = response.text;
      console.error("API response text:", textResponse);
      throw new Error("AI did not return an image. It might have refused the request. " + (textResponse || ""));
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image with AI: ${error.message}`);
    }
    throw new Error("Failed to generate image with AI. Please check the console for more details.");
  }
};
