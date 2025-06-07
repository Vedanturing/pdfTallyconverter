# PDF Tally Converter

A React TypeScript application that converts PDF files and provides data validation capabilities.

## Features

- PDF file conversion
- Data preview and validation
- Multiple export formats support
- Interactive data validation interface
- Real-time progress tracking

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

## Project Structure

```
pdfTallyConverter/
├── src/
│   ├── components/
│   │   ├── FileConverter/
│   │   └── [other components]
│   ├── types/
│   └── [other source files]
├── public/
├── package.json
└── tsconfig.json
```

## Backend API Requirements

The application requires a backend server running on `http://localhost:8000` with the following endpoints:
- `/upload` - File upload endpoint
- `/convert/{fileId}` - File conversion endpoint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 