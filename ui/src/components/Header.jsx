export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🧠</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TooLoo.ai V2</h1>
              <p className="text-xs text-gray-500">Your Personal Product Factory</p>
            </div>
          </div>
          
          <nav className="flex items-center space-x-4">
            <button className="text-sm text-gray-600 hover:text-gray-900">
              Workshop
            </button>
            <button className="text-sm text-gray-600 hover:text-gray-900">
              Knowledge
            </button>
            <button className="btn-primary text-sm">
              New Idea
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
