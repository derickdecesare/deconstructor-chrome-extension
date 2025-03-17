# Deconstructor Chrome Extension

A Chrome extension that helps you understand words by breaking them down into their etymological components. This extension is based on the [Word Deconstructor](https://github.com/hyusap/deconstructor) project.

## Features

- Highlight any single word on a webpage, right-click, and select "Deconstruct" to analyze it
- Use the keyboard shortcut (Option+D) to analyze the currently selected word
- View a visual breakdown of the word's etymology and meaning
- Interactive graph showing word parts, origins, and combinations
- Customizable settings to enable/disable keyboard shortcuts and hover icons
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
3. Use the extension in one of two ways:
   - **Method 1**: Highlight a single word on any webpage, and a small icon will appear near it. Click this icon to view the word's etymology.
   - **Method 2**: Highlight a single word and press `Option+D` (macOS) or `Alt+D` (Windows) to analyze it immediately.
     - Note: On some macOS keyboard layouts, Option+D produces the "∂" (delta) character, which is also supported.
4. Customize settings in the popup:
   - Enable/disable the keyboard shortcut
   - Enable/disable the hover icon that appears when text is selected

## Privacy

- Your OpenAI API key is stored locally on your device
- API requests are made directly from your browser to OpenAI
- No data is sent to any third-party servers

## Acknowledgments

This extension is based on the [Word Deconstructor](https://github.com/hyusap/deconstructor) project by hyusap. Please visit the original project at:

- GitHub: https://github.com/hyusap/deconstructor
- Live site: https://deconstructor.vercel.app

## License

ISC
