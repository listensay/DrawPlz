import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {

  const handleSetImg = async () => {
    try {
      // 使用完整的图片路径
      const imagePath = window.location.origin + '/webp.jpg';
      await invoke('show_image_overlay', { imagePath });
      console.log('图片已设置为顶层显示');
    } catch (error) {
      console.error('设置图片顶层失败:', error);
    }
  }

  return (
    <main className="container">
      <div className="my-4">
        <img src="/webp.jpg" alt="" className="w-96 mx-auto cursor-pointer" onClick={handleSetImg} />
      </div>
      <div className="w-full">
        <button onClick={ handleSetImg }>设置图片顶层</button>
      </div>
    </main>
  );
}

export default App;
