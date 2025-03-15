# Deconstructor Chrome Extension

A Chrome extension that helps you understand words by breaking them down into their etymological components.

## Features

- Highlight any single word on a webpage, right-click, and select "Deconstruct" to analyze it
- View a visual breakdown of the word's etymology and meaning
- Interactive graph showing word parts, origins, and combinations
- Requires an OpenAI API key (stored locally on your device)

## Installation

### Development Mode

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the extension:
   ```
   npm run build
   ```
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the `dist` folder from this project

### Development Workflow

- Run in watch mode to automatically rebuild on changes:
  ```
  npm start
  ```

## Usage

1. Click the extension icon to open the popup
2. Enter your OpenAI API key and save it
3. Highlight a single word on any webpage
4. Right-click and select "Deconstruct" from the context menu
5. View the word's etymology in the popup that appears

## Privacy

- Your OpenAI API key is stored locally on your device
- API requests are made directly from your browser to OpenAI
- No data is sent to any third-party servers

## License

ISC
