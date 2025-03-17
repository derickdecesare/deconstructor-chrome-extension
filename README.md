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

## Known Issues

- **Layout Shift**: When the extension is first loaded on a page, it may cause a slight layout shift in some websites. This occurs during extension initialization and persists until the extension is disabled and the page is reloaded. If you'd like to help fix this issue:
  1. The issue seems to be related to the initial style injection when the extension loads
  2. Previous attempts to fix this have focused on CSS isolation and style scoping
  3. The challenge is to prevent the extension's styles from affecting the page layout while maintaining full extension functionality
  4. Pull requests addressing this issue are welcome!

## To Do

- Fix layout shift issue that occurs on extension initialization
- Add support for customizing language of explanations (e.g., Spanish)
- Expand model support to include Anthropic, Google, and other providers
- Add keyboard shortcut customization
- Add a proper extension icon
- Add language customization for explanations (e.g., Spanish)

## Contributing

Contributions are welcome! Some specific areas where help is needed:

1. **Layout Shift Bug**: Help fix the layout shift that occurs when the extension initializes. This requires careful handling of CSS injection and style isolation.
2. **Language Support**: Add support for multiple languages in word explanations.
3. **Model Integration**: Help integrate additional AI models.

To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC
