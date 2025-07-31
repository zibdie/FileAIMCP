#!/usr/bin/env node

/**
 * File.ai MCP Server - Simple MVP
 * Provides File.ai document processing capabilities through MCP
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { promises as fs } from "fs";
import path from "path";

class FileAIMCPServer {
  constructor() {
    this.apiKey = process.env.FILEAI_API_KEY;
    this.baseUrl = "https://api.orion.file.ai/prod/v1";

    if (!this.apiKey) {
      console.error("⚠️  FILEAI_API_KEY environment variable not set");
    }

    this.server = new Server(
      {
        name: "fileai-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "upload_and_process",
          description:
            "Upload a document to File.ai and get AI-extracted information",
          inputSchema: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description: "Path to the file to upload and process",
              },
            },
            required: ["filePath"],
          },
        },
        {
          name: "list_files",
          description:
            "List all files in File.ai with their processing status and summaries",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_file_details",
          description:
            "Get detailed information about a specific processed file",
          inputSchema: {
            type: "object",
            properties: {
              fileName: {
                type: "string",
                description: "Name of the file to get details for",
              },
            },
            required: ["fileName"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "upload_and_process":
            return await this.uploadAndProcess(args.filePath);
          case "list_files":
            return await this.listFiles();
          case "get_file_details":
            return await this.getFileDetails(args.fileName);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async uploadAndProcess(filePath) {
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();

    // Determine file type
    const fileTypeMap = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".csv": "text/csv",
    };

    const fileType = fileTypeMap[fileExt] || "application/octet-stream";

    // Step 1: Get presigned upload URL
    const uploadResponse = await fetch(`${this.baseUrl}/files/upload`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fileName: fileName,
        fileType: fileType,
        isSplit: true,
        schemaLocking: true,
      }),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `Upload request failed: ${uploadResponse.status} - ${errorText}`
      );
    }

    const uploadData = await uploadResponse.json();

    // Step 2: Upload file to S3
    const fileBuffer = await fs.readFile(filePath);
    const putResponse = await fetch(uploadData.presignedUploadURL, {
      method: "PUT",
      body: fileBuffer,
      headers: {
        "Content-Type": fileType,
      },
    });

    if (!putResponse.ok) {
      throw new Error(`File upload failed: ${putResponse.status}`);
    }

    // Step 3: Wait and check for processing
    let attempts = 0;
    const maxAttempts = 20; // 5 minutes max

    let processedFile = null;
    while (attempts < maxAttempts && !processedFile) {
      await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait 15 seconds

      const files = await this.getAllFiles();
      processedFile = files.find(
        (f) =>
          f.fileName.includes(fileName.replace(/\.[^/.]+$/, "")) ||
          f.uploadId === uploadData.uploadId
      );

      if (processedFile && processedFile.status === "processed") {
        break;
      }

      attempts++;
    }

    if (processedFile && processedFile.status === "processed") {
      return {
        content: [
          {
            type: "text",
            text: `🎉 File processed successfully!

📄 **File:** ${processedFile.fileName}
📊 **Classification:** ${processedFile.fileClass || "Unknown"}
🏢 **Organization:** ${processedFile.fileContactName || "Unknown"}
📝 **AI Summary:**
${processedFile.summary || "No summary available"}

⚙️ **Technical Details:**
- Upload ID: ${uploadData.uploadId}
- File ID: ${processedFile.fileId}
- File Size: ${processedFile.fileSize} bytes
- Processing Status: ${processedFile.status}
- Created: ${processedFile.createdAt}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `✅ File uploaded successfully! (Upload ID: ${uploadData.uploadId})
⏳ File is still processing. Use 'list_files' to check status later.`,
          },
        ],
      };
    }
  }

  async listFiles() {
    const files = await this.getAllFiles();

    if (files.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "📂 No files found in your File.ai account.",
          },
        ],
      };
    }

    const fileList = files
      .map((file, index) => {
        const status = file.status === "processed" ? "✅" : "⏳";
        const summary = file.summary
          ? `${file.summary.substring(0, 150)}${
              file.summary.length > 150 ? "..." : ""
            }`
          : "No summary available";

        return `${index + 1}. ${status} **${file.fileName}**
   📊 ${file.fileClass || "Unknown type"}
   📝 ${summary}
   📅 ${file.createdAt}`;
      })
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `📁 **Your File.ai Documents (${files.length} total):**

${fileList}`,
        },
      ],
    };
  }

  async getFileDetails(fileName) {
    const files = await this.getAllFiles();
    const file = files.find((f) =>
      f.fileName.toLowerCase().includes(fileName.toLowerCase())
    );

    if (!file) {
      throw new Error(`File not found: ${fileName}`);
    }

    return {
      content: [
        {
          type: "text",
          text: `📄 **File Details: ${file.fileName}**

📊 **Classification:** ${file.fileClass || "Unknown"}
🏢 **Organization:** ${file.fileContactName || "Unknown"}
📈 **Status:** ${file.status}
📦 **Size:** ${file.fileSize} bytes
🆔 **File ID:** ${file.fileId}
📅 **Created:** ${file.createdAt}
🔄 **Updated:** ${file.updatedAt}

📝 **AI-Generated Summary:**
${file.summary || "No summary available"}

🔧 **Technical Metadata:**
- Upload ID: ${file.uploadId}
- Schema ID: ${file.schemaId}
- Reference ID: ${file.referenceId}
- Is Duplicate: ${file.isDuplicate}
- File Hash: ${file.fileHash}
- Storage Path: ${file.fileStoragePath}`,
        },
      ],
    };
  }

  async getAllFiles() {
    const response = await fetch(`${this.baseUrl}/files`, {
      headers: {
        "x-api-key": this.apiKey,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get files: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    return result.files || [];
  }
}

// Start the server
async function main() {
  const server = new FileAIMCPServer();
  const transport = new StdioServerTransport();
  await server.server.connect(transport);
  console.error("🚀 File.ai MCP Server is running...");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
