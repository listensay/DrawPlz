import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { PhysicalSize } from '@tauri-apps/api/dpi';
import { listen } from '@tauri-apps/api/event';

function ImageOverlay() {
  const [opacity, setOpacity] = useState(0.7);
  const [isPenetrable, setIsPenetrable] = useState(false);
  
  // 切换穿透模式（放在组件级别）
  const togglePenetrable = async () => {
    try {
      const newState = await invoke<boolean>('toggle_penetrable');
      setIsPenetrable(newState);
    } catch (error) {
      console.error('切换穿透模式失败:', error);
    }
  };
  
  useEffect(() => {
    const currentWindow = getCurrentWindow();
    
    // 监听后端穿透状态变化
    const unlistenPenetrable = listen('penetrable-changed', (event) => {
      setIsPenetrable(event.payload as boolean);
    });
    
    // 获取URL参数
    const params = new URLSearchParams(window.location.search);
    const imagePath = params.get('img');
    
    if (imagePath) {
      const decodedPath = decodeURIComponent(imagePath);
      const imgElement = document.getElementById('overlay-image') as HTMLImageElement;
      if (imgElement) {
        imgElement.src = decodedPath;
        
        // 图片加载完成后，根据图片尺寸调整窗口大小
        imgElement.onload = async () => {
          try {
            // 获取图片的自然尺寸
            const naturalWidth = imgElement.naturalWidth;
            const naturalHeight = imgElement.naturalHeight;
            
            // 获取屏幕尺寸作为限制
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            
            // 计算合适的窗口尺寸（限制在屏幕的80%内）
            const maxWidth = screenWidth * 0.8;
            const maxHeight = screenHeight * 0.8;
            
            let windowWidth = naturalWidth;
            let windowHeight = naturalHeight;
            
            // 如果图片太大，按比例缩放
            if (naturalWidth > maxWidth || naturalHeight > maxHeight) {
              const scaleX = maxWidth / naturalWidth;
              const scaleY = maxHeight / naturalHeight;
              const scale = Math.min(scaleX, scaleY);
              
              windowWidth = Math.round(naturalWidth * scale);
              windowHeight = Math.round(naturalHeight * scale);
            }
            
            // 设置窗口大小
            await currentWindow.setSize(new PhysicalSize(windowWidth, windowHeight));
            // 重新居中窗口
            await currentWindow.center();
          } catch (error) {
            console.error('Failed to resize window to fit image:', error);
          }
        };
      }
    }
    
    // 关闭函数
    const closeWindow = async () => {
      try {
        await invoke('close_image_overlay');
      } catch (error) {
        console.error('关闭窗口失败:', error);
        // 备用方法
        try {
          await currentWindow.close();
        } catch (closeError) {
          console.error('备用关闭失败:', closeError);
        }
      }
    };
    
    // 键盘监听
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeWindow();
      } else if (e.key === 'ArrowUp') {
        // 增加透明度（减少不透明度）
        e.preventDefault();
        setOpacity(prev => Math.max(0.1, prev - 0.1));
      } else if (e.key === 'ArrowDown') {
        // 减少透明度（增加不透明度）
        e.preventDefault();
        setOpacity(prev => Math.min(1, prev + 0.1));
      }
    };
    
    // 鼠标滚轮缩放窗口
    const handleWheel = async (e: WheelEvent) => {
      e.preventDefault();
      try {
        const size = await currentWindow.innerSize();
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        
        // 保持宽高比的缩放
        const newWidth = Math.max(200, Math.min(3000, size.width * scaleFactor));
        const newHeight = Math.max(150, Math.min(2000, size.height * scaleFactor));
        
        await currentWindow.setSize(new PhysicalSize(Math.round(newWidth), Math.round(newHeight)));
      } catch (error) {
        console.error('Failed to resize window:', error);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    // 不再绑定关闭按钮（已移除）
    
    // 双击图片关闭
    const handleDoubleClick = () => {
      closeWindow();
    };
    
    setTimeout(() => {
      const imgElement = document.getElementById('overlay-image');
      if (imgElement) {
        imgElement.addEventListener('dblclick', handleDoubleClick);
      }
    }, 100);
    
    // 清理事件监听
    return () => {
      unlistenPenetrable.then(fn => fn());
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
      const imgElement = document.getElementById('overlay-image');
      if (imgElement) {
        imgElement.removeEventListener('dblclick', handleDoubleClick);
      }
    };
  }, []);
  
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'transparent',
      position: 'relative',
      overflow: 'auto'
    }}>
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '12px',
        padding: '5px 10px',
        background: isPenetrable ? 'rgba(255, 50, 50, 0.7)' : 'rgba(0, 0, 0, 0.5)',
        borderRadius: '5px',
        userSelect: 'none',
        pointerEvents: 'auto',  // 控制栏始终可交互
        zIndex: 1000,
        border: isPenetrable ? '1px solid rgba(255, 100, 100, 0.8)' : 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}
      onClick={togglePenetrable}
      >
        <span style={{ pointerEvents: 'none' }}>
          {isPenetrable ? (
            <>⚠️ 图片穿透中 | 按 Cmd+1 恢复</>
          ) : (
            <>点击启用穿透 | Cmd+1 切换 | ESC关闭 | ↑↓透明度 | 滚轮缩放 | 透明度: {Math.round(opacity * 100)}%</>
          )}
        </span>
      </div>
      <img 
        id="overlay-image"
        data-tauri-drag-region={!isPenetrable}
        src="/webp.jpg" 
        alt="展示图片"
        style={{
          display: 'block',
          cursor: isPenetrable ? 'default' : 'move',
          outline: 'none',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: opacity,
          pointerEvents: isPenetrable ? 'none' : 'auto'
        }}
      />
    </div>
  );
}

export default ImageOverlay;