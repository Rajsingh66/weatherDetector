import { useState } from 'react'
import Weather from './weather'

function App() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-400 to-indigo-600 p-8 flex items-center justify-center">
            <Weather />
        </div>
    )
}

export default App
