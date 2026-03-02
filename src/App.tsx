import Weather from './weather'

function App() {
    return (
        <div className="aurora-shell min-h-screen p-4 sm:p-8 flex items-center justify-center overflow-hidden">
            <div className="aurora-blob aurora-blob-1" />
            <div className="aurora-blob aurora-blob-2" />
            <div className="aurora-blob aurora-blob-3" />
            <Weather />
        </div>
    )
}

export default App
