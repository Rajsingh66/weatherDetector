# Weather Detection App

A modern, robust weather dashboard application built with React, TypeScript, and Tailwind CSS. This application provides real-time weather data, city search functionality, and interactive forecast visualizations wrapped in a beautiful, responsive UI.

## 🌟 Features

-   **Real-time Weather Data**: Fetches current temperature, humidity, wind speed, and weather conditions.
-   **City Search**: Seamlessly search for any city globally using Open-Meteo's Geocoding API.
-   **Interactive Forecast**: Visualizes temperature trends for the next 24 hours using an interactive Area Chart.
-   **Modern UI/UX**:
    -   Glassmorphism design aesthetic.
    -   Responsive layout for all devices.
    -   Smooth animations and transitions.
    -   Dynamic background gradients.
-   **Robust Error Handling**: informative error messages for invalid cities or network issues.

## 🛠️ Tech Stack

-   **Core**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Charts**: [Recharts](https://recharts.org/)
-   **API**: [Open-Meteo](https://open-meteo.com/) (Free, no API key required)

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
-   Node.js (v16.0.0 or higher)
-   npm or yarn

### Installation

1.  **Clone the repository** (if applicable) or navigate to the project directory.

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npm run dev
    ```

4.  **Open in Browser**:
    Visit `http://localhost:5173` (or the URL shown in your terminal).

## 📁 Project Structure

```bash
Weather detection/
├── src/
│   ├── App.tsx          # Main application wrapper with background layout
│   ├── weather.tsx      # Core weather component (Logic, API, UI)
│   ├── main.tsx         # Entry point rendering App
│   └── index.css        # Tailwind directives and global styles
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## 📜 Scripts

-   `npm run dev`: Starts the local development server.
-   `npm run build`: Type-checks and builds the app for production.
-   `npm run preview`: Locally previews the production build.
-   `npm run lint`: Runs ESLint to check code quality.

## 🔧 Dependencies

-   `lucide-react`: For icon components (Search, MapPin, Wind, etc.).
-   `recharts`: For rendering the temperature forecast chart.
-   `react` & `react-dom`: UI library.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any enhancements or bug fixes.

---
Built with ❤️ using React & Tailwind CSS
