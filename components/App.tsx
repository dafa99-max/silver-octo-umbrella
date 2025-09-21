import React from 'react';
import ImageProcessor from './ImageProcessor';
import { GithubIcon } from './Icon';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            AI Photo Ratio Converter
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Ubah rasio aspek foto Anda dan biarkan AI mengisi kekosongan secara cerdas.
          </p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl shadow-indigo-500/10 p-4 sm:p-8 border border-gray-700">
          <ImageProcessor />
        </main>

        <footer className="text-center mt-8 text-gray-500">
          <p>
            Didukung oleh Gemini API dengan model <code className="text-xs bg-gray-700/50 text-gray-400 rounded px-1 py-0.5">gemini-2.5-flash-image-preview</code>.
          </p>
          <a href="https://github.com/google/gemini-api" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-indigo-400 transition-colors mt-2">
            <GithubIcon className="w-5 h-5" />
            <span>Lihat di GitHub</span>
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;