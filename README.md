# File.ai MCP Server

> **⚠️ PROOF OF CONCEPT** - This is a demonstration MCP server created to showcase File.ai integration capabilities. Not intended for production use.

A Model Context Protocol (MCP) server that integrates File.ai's document processing capabilities with Claude Desktop and other MCP-compatible tools.

## Features

- **Upload & Process**: Upload documents and get AI-extracted information
- **List Files**: View all processed files with summaries and status
- **File Details**: Get comprehensive details about specific documents
- **Real-time Processing**: Automatic polling for document processing completion

## Prerequisites

- Node.js 18+ installed
- File.ai API key (get one at [file.ai](https://file.ai))
- Claude Desktop or other MCP-compatible client

## Installation

### 1. Install Dependencies

**Windows:**

```cmd
cd fileai-mcp-server
cmd /c "npm install"
```

**Mac/Linux:**

```bash
cd fileai-mcp-server
npm install
```

### 2. Get Your File.ai API Key

1. Sign up at [file.ai](https://file.ai)
2. Navigate to your API settings
3. Generate a new API key
4. Copy the key (starts with `sk-`)

## Configuration

### Claude Desktop Setup

#### Windows

1. Open your Claude Desktop config file:

   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Add the File.ai MCP server to your `mcpServers` section:
   ```json
   {
     "mcpServers": {
       "fileai": {
         "command": "node",
         "args": [
           "C:\\path\\to\\your\\fileai-mcp-server\\fileai-mcp-server.js"
         ],
         "env": {
           "FILEAI_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

#### Mac/Linux

1. Open your Claude Desktop config file:

   ```
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

2. Add the File.ai MCP server to your `mcpServers` section:
   ```json
   {
     "mcpServers": {
       "fileai": {
         "command": "node",
         "args": ["/full/path/to/your/fileai-mcp-server/fileai-mcp-server.js"],
         "env": {
           "FILEAI_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

### Environment Variable Setup (Alternative)

Instead of putting the API key in the config file, you can set it as an environment variable:

**Windows:**

```cmd
setx FILEAI_API_KEY "your-api-key-here"
```

**Mac/Linux:**

```bash
export FILEAI_API_KEY="your-api-key-here"
# Add to ~/.bashrc or ~/.zshrc to make it permanent
echo 'export FILEAI_API_KEY="your-api-key-here"' >> ~/.bashrc
```

## Usage

### 1. Restart Claude Desktop

After adding the configuration, restart Claude Desktop to load the MCP server.

### 2. Available Commands

Once configured, you can use these natural language commands in Claude Desktop:

#### Upload and Process Documents

```
"Upload and process this PDF file: /path/to/document.pdf"
"Process this document and tell me what's in it: ~/Downloads/report.pdf"
```

#### List All Files

```
"Show me all my processed documents"
"List all files in File.ai"
"What documents do I have?"
```

#### Get File Details

```
"Get details about my report.pdf file"
"Show me more information about the contract document"
"What did the AI extract from filename.pdf?"
```

### 3. Supported File Types

- **PDF** documents
- **Images** (JPG, JPEG, PNG)
- **Word** documents (DOCX)
- **Excel** spreadsheets (XLSX)
- **CSV** files

## Testing the Installation

### Manual Test (Windows)

```cmd
cd fileai-mcp-server
set FILEAI_API_KEY=your-api-key-here
node fileai-mcp-server.js
```

### Manual Test (Mac/Linux)

```bash
cd fileai-mcp-server
FILEAI_API_KEY=your-api-key-here node fileai-mcp-server.js
```

You should see: `🚀 File.ai MCP Server is running...`

Press `Ctrl+C` to stop the test.

## Troubleshooting

### Common Issues

#### "FILEAI_API_KEY environment variable not set"

- Double-check your API key in the Claude Desktop config
- Ensure there are no extra spaces or quotes around the key
- Try setting it as an environment variable instead

#### "Failed to start server"

- Verify Node.js is installed: `node --version`
- Check that all dependencies are installed: `npm install`
- Ensure the file path in Claude Desktop config is correct

#### "File upload failed"

- Check your internet connection
- Verify your File.ai API key is valid and has upload permissions
- Ensure the file exists and is readable

#### Files not processing

- File.ai processing can take 1-5 minutes depending on file size
- Use the "list files" command to check processing status
- ✅ = Processed, ⏳ = Still processing

### Debugging

#### Windows Debug Mode

```cmd
set DEBUG=* && node fileai-mcp-server.js
```

#### Mac/Linux Debug Mode

```bash
DEBUG=* node fileai-mcp-server.js
```

## File Structure

```
fileai-mcp-server/
├── fileai-mcp-server.js    # Main MCP server code
├── package.json            # Node.js dependencies
├── node_modules/           # Installed dependencies
└── README.md              # This file
```

## API Reference

The MCP server provides three tools:

1. **upload_and_process**: Upload and process a document

   - Input: `filePath` (string)
   - Returns: Processing results with AI summary

2. **list_files**: List all processed files

   - Input: None
   - Returns: List of files with summaries and status

3. **get_file_details**: Get detailed file information
   - Input: `fileName` (string)
   - Returns: Comprehensive file details and metadata

## Security Notes

- Keep your File.ai API key secure and never commit it to version control
- The server only processes files you explicitly request
- All communication uses HTTPS encryption
- Files are processed by File.ai's secure cloud infrastructure

## Support

- For File.ai API issues: Contact File.ai support
- For MCP server issues: Check the troubleshooting section above
- For Claude Desktop issues: Visit [Claude Desktop documentation](https://docs.anthropic.com/claude/docs)

## License

This is a demo MCP server for educational and testing purposes. This is not created by file.ai. Read their developer documentation [here](https://developers.file.ai/docs/getting-started#/).
