import fs from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "public/uploads");

// Create uploads directory
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function action({ request }) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return Response.json({
        success: false,
        message: "No file uploaded",
      });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Unique filename
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const filePath = path.join(uploadDir, fileName);

    // Save file
    fs.writeFileSync(filePath, buffer);

    // Public URL
    const fileUrl = `/uploads/${fileName}`;

    return Response.json({
      success: true,
      url: fileUrl,
      fileName,
      mediaType: file.type,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}

export default function ApiFiles() {
  return null;
}