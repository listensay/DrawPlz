import "./App.css";

function App() {

  const handleSetImg = () => {
    console.log('first')
  }

  return (
    <main className="container">
      <div className="my-4">
        <img src="/webp.jpg" alt="" className="w-96 mx-auto" />
      </div>
      <div className="w-full">
        <button onClick={ handleSetImg }>设置图片顶层</button>
      </div>
    </main>
  );
}

export default App;
